import { drag, type D3DragEvent } from 'd3-drag';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type ForceLink,
  type Simulation,
  type SimulationLinkDatum,
} from 'd3-force';
import { select, type Selection } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';

import { createTextMeasure, type MeasureText } from '../../matrix-chart/lib/heatmap-layout.js';
import { forceBoxCollide, forceDragPush, separateFootprints } from '../lib/box-collide.js';
import { forceCircleBounds } from '../lib/circle-bounds.js';
import { getCharge, getCircleFitTransform, getLayoutRadius, getLinkLength, getLinkPoint } from '../lib/fit.js';
import {
  ACTIVE_LINK_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CENTER_PULL,
  CIRCLE_BOUNDS_STRENGTH,
  COLLIDE_GAP,
  FOCUS_HALO_RATIO,
  INITIAL_NODE_RADIUS_RATIO,
  ISOLATED_NODE_PULL,
  LAYOUT_EDGE_GAP,
  LAYOUT_MAX_FILL,
  LAYOUT_RADIUS_RATIO,
  LINK_WIDTH,
  MAX_LINK_SHARE,
  MAX_ZOOM,
  MIN_LINK_SHARE,
  MIN_ZOOM,
  NODE_BORDER_WIDTH,
  NODE_DISPLAY_SCALE,
  NODE_HALO_WIDTH,
  NODE_LABEL_GAP,
  NODE_RING_SHARE,
  PLUS_BADGE_RADIUS,
  RING_NODE_MAX_SIZE,
  SELECTED_RING_WIDTH,
  VIEWBOX_OFFSET_X,
  VIEWBOX_OFFSET_Y,
  WARM_UP_TICKS,
} from '../lib/graph-constants.js';
import { getNodeArea, getNodeFootprint, getNodeLabelLayout, type Footprint } from '../lib/label-layout.js';
import type { SimNode } from '../lib/layout-types.js';
import {
  DEFAULT_NODE_COLOR,
  GRAPH_ACCENT,
  GRAPH_THEME_COLORS,
  NODE_SIZES,
  nodeRadius as bucketRadius,
  type GraphThemeColors,
  type NetworkGraphModel,
  type NetworkLink,
} from '../lib/index.js';
import { drawGraphDecor } from './decor.js';

type SimLink = SimulationLinkDatum<SimNode> & NetworkLink;
type NodeGroup = Selection<SVGGElement, SimNode, null, undefined>;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const DRAG_SLOP = 5;

export interface RenderNetworkGraphOptions {
  model: NetworkGraphModel;
  /** Nodes shown by the legend window and the timeline; null shows them all. */
  visibleIds: Set<string> | null;
  /** Links shown by the timeline; null shows every link between shown nodes. */
  visibleLinkIds?: Set<string> | null;
  themeMode?: 'light' | 'dark';
  fontFamily?: string;
  activeNodeId?: string | null;
  /** A plain wheel zooms; otherwise it needs Ctrl / Cmd and a plain wheel scrolls the page. */
  wheelZoom?: boolean;
  measure?: MeasureText;
  onSelect?: (id: string | null) => void;
  /** Click on the "+" of the selected node. */
  onOpenFocus?: (id: string) => void;
}

interface GraphState {
  simulation: Simulation<SimNode, SimLink>;
  svg: SVGSVGElement;
  zoomBehavior: ZoomBehavior<SVGSVGElement, unknown>;
  nodeElements: Map<string, SVGGElement>;
  refresh: () => void;
  setActive: (id: string | null) => void;
  setColors: (colors: GraphThemeColors) => void;
  setVisible: (ids: Set<string> | null, linkIds?: Set<string> | null) => void;
  dispose: () => void;
}

const GRAPHS = new WeakMap<HTMLElement, GraphState>();
let nextDecorId = 0;

/** A colour made `steps` darker, the way d3's `darker` does. */
function darken(color: string, steps: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
  if (!steps || !hex) return color;
  const factor = 0.7 ** steps;
  const channel = (index: number): string =>
    Math.round(parseInt(hex.slice(index, index + 2), 16) * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

const isRingNode = (radius: number): boolean => radius <= RING_NODE_MAX_SIZE;

function createNodeElements(group: NodeGroup, node: SimNode, radius: number): void {
  const visual = group.append('g').attr('class', 'node-visual').style('pointer-events', 'none');
  visual
    .append('circle')
    .attr('class', 'node-focus-halo')
    .attr('r', Math.max(radius * FOCUS_HALO_RATIO, 40))
    .style('opacity', 0);
  visual.append('circle').attr('class', 'node-halo').attr('r', radius + NODE_HALO_WIDTH);

  const ring = isRingNode(radius);
  visual
    .append('circle')
    .attr('class', 'node-background')
    .attr('data-ring', ring ? 'true' : 'false')
    .attr('r', ring ? radius * (1 - NODE_RING_SHARE / 2) : radius)
    .attr('stroke-width', ring ? radius * NODE_RING_SHARE : 0);

  if (node.img) {
    visual
      .append('image')
      .attr('class', 'node-image')
      .attr('href', node.img)
      .attr('preserveAspectRatio', 'xMidYMid slice')
      .attr('width', radius * 2)
      .attr('height', radius * 2)
      .attr('x', -radius)
      .attr('y', -radius)
      .attr('clip-path', `circle(${radius}px at ${radius}px ${radius}px)`);
  }

  visual
    .append('circle')
    .attr('class', 'node-selected-ring')
    .attr('r', radius + NODE_HALO_WIDTH)
    .attr('fill', 'none')
    .attr('stroke-width', SELECTED_RING_WIDTH)
    .style('opacity', 0);

  const offset = (radius + NODE_HALO_WIDTH) * Math.SQRT1_2;
  const plus = visual
    .append('g')
    .attr('class', 'node-plus')
    .attr('transform', `translate(${offset}, ${-offset})`)
    .style('opacity', 0);
  plus.append('circle').attr('r', PLUS_BADGE_RADIUS).attr('fill', GRAPH_ACCENT);
  plus
    .append('path')
    .attr('d', 'M-5 0 H5 M0 -5 V5')
    .attr('stroke', '#FFFFFF')
    .attr('stroke-width', 1.5)
    .attr('stroke-linecap', 'round');
}

/** Node name under the circle, on up to two lines. */
function createNodeLabel(
  group: NodeGroup,
  node: SimNode,
  radius: number,
  measure: MeasureText,
): void {
  const label = String(node.label ?? node.id);
  const { fontSize, lineHeight, lines } = getNodeLabelLayout(label, radius, measure);
  const labelGroup = group
    .select<SVGGElement>('.node-visual')
    .append('g')
    .attr('class', 'node-label')
    .attr('transform', `translate(0, ${radius + NODE_LABEL_GAP})`);
  // A cut name shows whole on hover.
  if (lines.join(' ') !== label.replace(/\s+/g, ' ').trim()) {
    labelGroup.append('title').text(label);
  }
  const text = labelGroup
    .append('text')
    .attr('class', 'node-label-title')
    .attr('font-size', fontSize)
    .attr('text-anchor', 'middle');
  lines.forEach((line, index) => {
    text
      .append('tspan')
      .attr('x', 0)
      .attr('y', index * lineHeight)
      .attr('dominant-baseline', 'hanging')
      .text(line);
  });
}

interface NodeVisualState {
  isActive: boolean;
  isHovered: boolean;
  isNeighbor: boolean;
  hasActive: boolean;
}

/** Colours and visibility of every layer of a node for its current state. */
function applyNodeState(
  group: NodeGroup,
  node: SimNode,
  radius: number,
  state: NodeVisualState,
  colors: GraphThemeColors,
): void {
  const { isActive, isHovered, isNeighbor, hasActive } = state;
  const ring = isRingNode(radius);
  const color = node.color ?? DEFAULT_NODE_COLOR;
  const related = isActive || isNeighbor;

  group
    .select('.node-visual')
    .style('opacity', hasActive && !related && !isHovered ? colors.dimmedOpacity : 1);
  group.select('.node-halo').attr('fill', colors.nodeHalo);

  let strength = ring ? colors.smallNodeRestOpacity : colors.nodeRestOpacity;
  if (related || isHovered) strength = 1;
  const background = group
    .select('.node-background')
    .attr('fill', ring ? colors.ringFill : color)
    .attr('fill-opacity', ring ? 1 : strength)
    .attr('stroke', darken(color, colors.nodeEdgeDarker))
    .attr('stroke-opacity', strength)
    .style('opacity', node.img ? 0 : 1);
  // A ring's width comes with its size.
  if (!ring) background.attr('stroke-width', colors.nodeEdgeWidth);

  group
    .select('.node-focus-halo')
    .attr('fill', colors.focusHalo)
    .style('opacity', isActive ? 1 : 0);
  group
    .select('.node-selected-ring')
    .attr('stroke', colors.selectedRing)
    .attr('stroke-opacity', isActive ? 1 : 0.6)
    .style('opacity', isActive || isHovered ? 1 : 0);
  group
    .select('.node-plus')
    .style('opacity', isActive ? 1 : 0)
    .style('pointer-events', isActive ? 'all' : 'none');

  let labelColor = colors.labelMuted;
  if (radius >= NODE_SIZES.lg * 1.5) labelColor = colors.label;
  else if (radius > RING_NODE_MAX_SIZE) labelColor = colors.labelMid;
  if (isNeighbor || isHovered) labelColor = colors.labelStrong;
  if (isActive) labelColor = colors.labelActive;
  group
    .select('.node-label-title')
    .attr('fill', labelColor)
    .attr('font-weight', isActive ? 600 : 400);
}

const endpoint = (end: string | SimNode): string => (typeof end === 'object' ? end.id : end);

function simulationSignature(nodeIds: Iterable<string>, links: SimLink[]): string {
  const nodes = Array.from(nodeIds).sort();
  const linkIds = links.map((link) => link.id).sort();
  return `${nodes.join('\u0001')}\u0002${linkIds.join('\u0001')}`;
}

export function stopNetworkGraph(container: HTMLElement): void {
  GRAPHS.get(container)?.dispose();
  GRAPHS.delete(container);
}

/** Applies the legend window and the timeline in place: no node moves unless the laid-out graph changes. */
export function updateNetworkGraphVisibility(
  container: HTMLElement,
  visibleIds: Set<string> | null,
  visibleLinkIds?: Set<string> | null,
): boolean {
  const state = GRAPHS.get(container);
  if (!state) return false;
  state.setVisible(visibleIds, visibleLinkIds);
  return true;
}

/** The SVG scales with its view box, so a resize never touches the layout. */
export function resizeNetworkGraph(container: HTMLElement, width: number, height: number): boolean {
  return GRAPHS.has(container) && width > 0 && height > 0;
}

/** Selection made outside the graph (heatmap row, connections panel). */
export function setNetworkGraphActive(container: HTMLElement, id: string | null): boolean {
  const state = GRAPHS.get(container);
  if (!state) return false;
  state.setActive(id);
  return true;
}

export function setNetworkGraphColors(container: HTMLElement, mode: 'light' | 'dark'): boolean {
  const state = GRAPHS.get(container);
  if (!state) return false;
  state.setColors(GRAPH_THEME_COLORS[mode]);
  return true;
}

/** Zooms around the centre of the canvas; `factor` > 1 zooms in. */
export function zoomNetworkGraph(container: HTMLElement, factor: number): void {
  const state = GRAPHS.get(container);
  if (state) select(state.svg).call(state.zoomBehavior.scaleBy, factor);
}

/** Circle of a node, used to anchor overlays to it. */
export function networkNodeElement(container: HTMLElement, id: string): SVGCircleElement | null {
  return GRAPHS.get(container)?.nodeElements.get(id)?.querySelector('.node-background') ?? null;
}

/**
 * Network design: the graph fills a dashed circle on a fixed canvas that the
 * SVG view box scales to the widget. Laid out before the first paint, so it
 * opens settled; dragging, the legend window and the theme keep the layout.
 */
export function renderNetworkGraph(
  container: HTMLElement,
  options: RenderNetworkGraphOptions,
): void {
  const { model, visibleIds, themeMode = 'light', fontFamily, onSelect, onOpenFocus } = options;
  const { visibleLinkIds = null, wheelZoom = false } = options;

  stopNetworkGraph(container);
  container.replaceChildren();
  if (!model.nodes.length) return;

  const width = CANVAS_WIDTH;
  const height = CANVAS_HEIGHT;
  const centerX = width / 2;
  const centerY = height / 2;
  let colors = GRAPH_THEME_COLORS[themeMode];
  let activeId = options.activeNodeId ?? null;
  let hoveredId: string | null = null;
  let dragging = false;
  let moved = false;
  let dragStart: { x: number; y: number } | null = null;

  const svgSelection = select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('role', 'img')
    .attr('aria-label', 'Network graph')
    .attr('viewBox', `${VIEWBOX_OFFSET_X} ${VIEWBOX_OFFSET_Y} ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('display', 'block');
  const svgNode = svgSelection.node() as SVGSVGElement;
  if (fontFamily) svgSelection.style('font-family', fontFamily);

  const measure = options.measure ?? createTextMeasure(fontFamily || 'sans-serif');
  const root = svgSelection.append('g').attr('class', 'graph-root');
  const decor = root.append('g').attr('class', 'graph-decor').style('pointer-events', 'none');
  const linkLayer = root.append('g').attr('class', 'link-layer');
  const nodeLayer = root.append('g').attr('class', 'node-layer');

  const radiusOf = (node: SimNode): number =>
    bucketRadius(node, model.breakpoints) * NODE_DISPLAY_SCALE;

  const maxStart = Math.min(width, height) * INITIAL_NODE_RADIUS_RATIO;
  const nodes: SimNode[] = model.nodes.map((node, index) => {
    const angle = index * GOLDEN_ANGLE;
    const distance = maxStart * Math.sqrt((index + 0.5) / model.nodes.length);
    return {
      ...node,
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
    };
  });
  const links: SimLink[] = model.links.map((link) => ({ ...link }));
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const neighborsOf = (id: string | null): Set<string> => {
    const neighbors = new Set<string>();
    if (!id) return neighbors;
    for (const link of links) {
      const source = endpoint(link.source as string | SimNode);
      const target = endpoint(link.target as string | SimNode);
      if (source === id) neighbors.add(target);
      if (target === id) neighbors.add(source);
    }
    return neighbors;
  };

  const lineElements = new Map<string, SVGLineElement>();
  for (const link of links) {
    const line = linkLayer
      .append('line')
      .attr('class', 'link-line')
      .attr('stroke-linecap', 'round')
      .node() as SVGLineElement;
    lineElements.set(link.id, line);
  }

  const nodeElements = new Map<string, SVGGElement>();
  const refresh = (): void => {
    decor.style('color', colors.decor);
    const neighbors = neighborsOf(activeId);
    for (const node of nodes) {
      const element = nodeElements.get(node.id);
      if (!element) continue;
      applyNodeState(
        select(element) as NodeGroup,
        node,
        radiusOf(node),
        {
          isActive: activeId === node.id,
          isHovered: hoveredId === node.id,
          isNeighbor: neighbors.has(node.id),
          hasActive: !!activeId,
        },
        colors,
      );
    }
    for (const link of links) {
      const source = endpoint(link.source as string | SimNode);
      const target = endpoint(link.target as string | SimNode);
      const active = !!activeId && (source === activeId || target === activeId);
      let stroke = colors.link;
      if (activeId) stroke = active ? colors.linkActive : colors.linkDimmed;
      lineElements
        .get(link.id)
        ?.setAttribute('stroke', stroke);
      lineElements
        .get(link.id)
        ?.setAttribute('stroke-width', String(active ? ACTIVE_LINK_WIDTH : LINK_WIDTH));
    }
  };

  const setActive = (id: string | null): void => {
    activeId = id;
    refresh();
  };
  const pick = (id: string | null): void => {
    setActive(id);
    onSelect?.(id);
  };

  const zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([MIN_ZOOM, MAX_ZOOM])
    .filter((event) => {
      // Chat-safe: left alone, a plain wheel scrolls the transcript.
      if (event.type === 'wheel' && !wheelZoom && !event.ctrlKey && !event.metaKey) {
        return false;
      }
      return !(event.target as SVGElement).closest?.('g.node');
    })
    .on('zoom', (event) => root.attr('transform', event.transform));
  svgSelection.call(zoomBehavior);
  // A click on the empty canvas clears the selection.
  svgSelection.on('click', (event: MouseEvent) => {
    if (!(event.target as SVGElement).closest?.('g.node') && activeId) pick(null);
  });

  let simulation: Simulation<SimNode, SimLink>;
  const dragBehavior = drag<SVGGElement, SimNode>()
    .filter((event: MouseEvent) => event.button === 0)
    .on('start', (event: D3DragEvent<SVGGElement, SimNode, unknown>, node) => {
      event.sourceEvent.stopPropagation();
      dragStart = { x: event.sourceEvent.clientX, y: event.sourceEvent.clientY };
      moved = false;
      if (!event.active) simulation.alphaTarget(0.3).restart();
      node.fx = node.x ?? centerX;
      node.fy = node.y ?? centerY;
      const element = nodeElements.get(node.id);
      if (element) element.style.cursor = 'grabbing';
    })
    .on('drag', (event: D3DragEvent<SVGGElement, SimNode, unknown>, node) => {
      if (dragStart) {
        const distance = Math.hypot(
          event.sourceEvent.clientX - dragStart.x,
          event.sourceEvent.clientY - dragStart.y,
        );
        if (distance > DRAG_SLOP) {
          moved = true;
          dragging = true;
        }
      }
      const size = radiusOf(node);
      const nextX = (node.fx ?? node.x ?? centerX) + event.dx;
      const nextY = (node.fy ?? node.y ?? centerY) + event.dy;
      node.fx = Math.max(size, Math.min(width - size, nextX));
      node.fy = Math.max(size, Math.min(height - size, nextY));
    })
    .on('end', (event: D3DragEvent<SVGGElement, SimNode, unknown>, node) => {
      if (!event.active) simulation.alphaTarget(0);
      node.fx = null;
      node.fy = null;
      dragging = false;
      dragStart = null;
      const element = nodeElements.get(node.id);
      if (element) element.style.cursor = 'grab';
    });

  for (const node of nodes) {
    const radius = radiusOf(node);
    const group = nodeLayer
      .append('g')
      .datum(node)
      .attr('class', 'node')
      .style('cursor', 'grab')
      .style('pointer-events', 'all') as unknown as NodeGroup;
    group.call(dragBehavior);
    nodeElements.set(node.id, group.node() as SVGGElement);

    group
      .append('circle')
      .attr('class', 'node-drag-area')
      .attr('r', radius + NODE_BORDER_WIDTH + 10)
      .attr('fill', 'transparent')
      .attr('opacity', 0)
      .style('cursor', 'grab')
      .style('pointer-events', 'all')
      .on('click', (event: MouseEvent) => {
        event.stopPropagation();
        if (!dragging && !moved) pick(activeId === node.id ? null : node.id);
        moved = false;
        dragStart = null;
      })
      .on('mouseenter', () => {
        hoveredId = node.id;
        refresh();
      })
      .on('mouseleave', () => {
        hoveredId = null;
        refresh();
      });

    createNodeElements(group, node, radius);
    createNodeLabel(group, node, radius, measure);
    group
      .select('.node-plus')
      .style('cursor', 'pointer')
      // Keep the press from starting a node drag.
      .on('mousedown', (event: MouseEvent) => event.stopPropagation())
      .on('click', (event: MouseEvent) => {
        event.stopPropagation();
        onOpenFocus?.(node.id);
      });
  }
  refresh();

  // Box of each node and its name, measured once per node.
  const footprints = new Map<string, Footprint>();
  const footprintOf = (node: SimNode): Footprint => {
    let footprint = footprints.get(node.id);
    if (!footprint) {
      footprint = getNodeFootprint(String(node.label ?? node.id), radiusOf(node), measure);
      footprints.set(node.id, footprint);
    }
    return footprint;
  };
  const layoutRadius = getLayoutRadius(
    Math.min(width, height) * LAYOUT_RADIUS_RATIO,
    nodes.map((node) => getNodeArea(radiusOf(node) + COLLIDE_GAP, footprintOf(node))),
    LAYOUT_EDGE_GAP,
    LAYOUT_MAX_FILL,
  );
  const limitOf = (node: SimNode): number => layoutRadius - radiusOf(node) - LAYOUT_EDGE_GAP;
  const keepInside = (node: SimNode): void => {
    if (node.x == null || node.y == null || node.fx != null || node.fy != null) return;
    const limit = limitOf(node);
    const dx = node.x - centerX;
    const dy = node.y - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > limit) {
      node.x = centerX + (dx / distance) * limit;
      node.y = centerY + (dy / distance) * limit;
    }
  };

  const renderPositions = (): void => {
    for (const link of links) {
      const source = link.source as SimNode;
      const target = link.target as SimNode;
      const line = lineElements.get(link.id);
      if (!line || typeof source !== 'object' || typeof target !== 'object') continue;
      const sx = source.x ?? centerX;
      const sy = source.y ?? centerY;
      const tx = target.x ?? centerX;
      const ty = target.y ?? centerY;
      const from = getLinkPoint(sx, sy, tx, ty, radiusOf(source));
      const to = getLinkPoint(tx, ty, sx, sy, radiusOf(target));
      line.setAttribute('x1', String(from.x));
      line.setAttribute('y1', String(from.y));
      line.setAttribute('x2', String(to.x));
      line.setAttribute('y2', String(to.y));
    }
    for (const node of nodes) {
      nodeElements
        .get(node.id)
        ?.setAttribute('transform', `translate(${node.x ?? centerX}, ${node.y ?? centerY})`);
    }
  };

  // Nodes the dragged one pushed in the last tick glide back instead of jumping.
  const pushedByDrag = new Set<string>();
  const pullFor = (shown: SimLink[]) => {
    const linked = new Set(
      shown.flatMap((link) => [
        endpoint(link.source as string | SimNode),
        endpoint(link.target as string | SimNode),
      ]),
    );
    return (node: SimNode): number => (linked.has(node.id) ? CENTER_PULL : ISOLATED_NODE_PULL);
  };
  const applyPull = (shown: SimLink[]): void => {
    const pull = pullFor(shown);
    simulation.force('x', forceX<SimNode>(centerX).strength(pull));
    simulation.force('y', forceY<SimNode>(centerY).strength(pull));
  };

  simulation = forceSimulation<SimNode, SimLink>(nodes)
    .force(
      'link',
      forceLink<SimNode, SimLink>(links)
        .id((node) => node.id)
        .distance((link) => getLinkLength(link, layoutRadius, MIN_LINK_SHARE, MAX_LINK_SHARE))
        .strength(0.3),
    )
    .force('charge', forceManyBody<SimNode>().strength(getCharge(layoutRadius, nodes.length)))
    .force('center', forceCenter<SimNode>(centerX, centerY).strength(0.05))
    .force(
      'collision',
      // Two passes per tick: stiffer, so nodes overlap less on the way.
      forceCollide<SimNode>()
        .radius((node) => radiusOf(node) + COLLIDE_GAP)
        .iterations(2),
    );
  applyPull(links);
  simulation
    // Names neither overlap each other nor lie on other nodes.
    .force('labels', forceBoxCollide(footprintOf))
    .force(
      'bounds',
      forceCircleBounds(centerX, centerY, limitOf, CIRCLE_BOUNDS_STRENGTH, (node) =>
        pushedByDrag.has(node.id),
      ),
    )
    // Last: a dragged node pushes what it meets out of its way.
    .force('drag', forceDragPush(footprintOf, pushedByDrag))
    .stop();

  // Lay the graph out before the first paint, so it opens settled and fitted.
  for (let i = 0; i < WARM_UP_TICKS; i += 1) {
    simulation.tick();
    nodes.forEach(keepInside);
  }
  // What the forces leave overlapping at the rim is moved apart at rest.
  const settle = (): void => separateFootprints(nodes, footprintOf, keepInside);
  settle();
  renderPositions();
  const fit = getCircleFitTransform(centerX, centerY, layoutRadius, {
    x: VIEWBOX_OFFSET_X,
    y: VIEWBOX_OFFSET_Y,
    width,
    height,
  });
  svgSelection.call(zoomBehavior.transform, zoomIdentity.translate(fit.x, fit.y).scale(fit.k));

  nextDecorId += 1;
  drawGraphDecor(decor, centerX, centerY, layoutRadius, `graph-decor-fade-${nextDecorId}`);

  let signature = simulationSignature(byId.keys(), links);
  const setVisible = (ids: Set<string> | null, linkIds: Set<string> | null = null): void => {
    const shownNodes = ids ?? new Set(byId.keys());
    for (const [id, element] of nodeElements) {
      const visible = shownNodes.has(id);
      element.style.opacity = visible ? '1' : '0';
      element.style.pointerEvents = visible ? 'all' : 'none';
      const area = element.querySelector<SVGCircleElement>('.node-drag-area');
      if (area) area.style.pointerEvents = visible ? 'all' : 'none';
    }
    const shownLinks: SimLink[] = [];
    for (const link of links) {
      const show =
        shownNodes.has(endpoint(link.source as string | SimNode)) &&
        shownNodes.has(endpoint(link.target as string | SimNode)) &&
        (!linkIds || linkIds.has(link.id));
      const line = lineElements.get(link.id);
      if (line) line.style.opacity = show ? '1' : '0';
      if (show) shownLinks.push(link);
    }
    // Hidden links stay in the layout unless the shown graph really changed;
    // restarting for nothing made every node drift on each step.
    const next = simulationSignature(shownNodes, shownLinks);
    if (next === signature) return;
    signature = next;
    (simulation.force('link') as ForceLink<SimNode, SimLink>).links(shownLinks);
    applyPull(shownLinks);
    simulation.alpha(0.3).restart();
  };
  setVisible(visibleIds, visibleLinkIds);

  simulation
    .on('tick', renderPositions)
    .on('end', () => {
      settle();
      renderPositions();
    })
    .restart();

  // The names' web font can arrive after this first layout: measure again and,
  // if the names changed size, draw them again and let the layout make room.
  const fonts = typeof document === 'undefined' ? undefined : document.fonts;
  const onFontsLoaded = (): void => {
    const resized = nodes.some((node) => {
      const before = footprints.get(node.id);
      if (!before) return false;
      const after = getNodeFootprint(String(node.label ?? node.id), radiusOf(node), measure);
      return (
        Math.abs(after.halfWidth - before.halfWidth) > 0.5 ||
        Math.abs(after.bottom - before.bottom) > 0.5
      );
    });
    if (!resized) return;
    for (const node of nodes) {
      const element = nodeElements.get(node.id);
      if (!element) continue;
      const group = select(element) as NodeGroup;
      group.select('.node-label').remove();
      createNodeLabel(group, node, radiusOf(node), measure);
    }
    refresh();
    footprints.clear();
    simulation.force('labels', forceBoxCollide(footprintOf));
    simulation.force('drag', forceDragPush(footprintOf, pushedByDrag));
    simulation.alpha(Math.max(simulation.alpha(), 0.3)).restart();
  };
  fonts?.addEventListener?.('loadingdone', onFontsLoaded);

  GRAPHS.set(container, {
    simulation,
    svg: svgNode,
    zoomBehavior,
    nodeElements,
    refresh,
    setActive,
    setColors: (next) => {
      colors = next;
      refresh();
    },
    setVisible,
    dispose: () => {
      fonts?.removeEventListener?.('loadingdone', onFontsLoaded);
      simulation.stop();
      svgSelection.on('click', null);
    },
  });
}
