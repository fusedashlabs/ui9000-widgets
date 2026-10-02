import { drag, type D3DragEvent } from 'd3-drag';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { select, type Selection } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';

import type { WidgetTheme } from '../../../types/index.js';
import { fdColors } from '../../../utils/fusedash-visual.js';
import {
  INITIAL_NODE_RADIUS_RATIO,
  LABEL_ALWAYS_ABOVE,
  LINK_COLORS,
  LINK_LABEL_COLORS,
  LINK_WIDTH,
  NODE_BORDER_WIDTH,
  NODE_COLORS,
  NODE_LABEL_COLORS,
  formatLinkValue,
  formatNodeValue,
  networkForces,
  nodeColor,
  nodeRadius,
  scaleLinkWidthByMax,
  shadowRadius,
  type NetworkGraphModel,
  type NetworkLink,
  type NetworkNode,
} from '../lib/index.js';

/** Node label box (client `createNodeLabel`). */
const LABEL_PADDING_TOP = 14;
const LABEL_PADDING_BOTTOM = 4;
const LABEL_PADDING_GAP = 5;
const LABEL_TITLE_SIZE = 12;
const LABEL_TITLE_LINE = 16;
const LABEL_VALUE_SIZE = 10;
const LABEL_VALUE_LINE = 14;
/** Link pill (client `createLinkLabelBackground`). */
const LINK_LABEL_SIZE = 8;
const LINK_LABEL_PAD_X = 2;
const LINK_LABEL_PAD_Y = 1;
const LINK_LABEL_OFFSET = 10;
/** Invisible grab ring around each node (client `.node-drag-area`). */
const DRAG_AREA_PAD = 10;
/** Pointer travel that turns a click into a drag (client). */
const DRAG_SLOP = 5;
const ZOOM_EXTENT: [number, number] = [0.3, 4];
/**
 * The client animates the layout in from the canvas centre. A chat card is read
 * at a glance, so the simulation is stepped to rest before the first paint and
 * then left idle — dragging a node restarts it, exactly as in the client.
 */
const PRESETTLE_TICKS = 250;
/** Padding kept around the graph when it is fitted to the container. */
const FIT_PADDING = 32;
/** Fitting may enlarge a sparse graph, but never past readable label sizes. */
const FIT_SCALE_EXTENT: [number, number] = [0.4, 1.25];
/** Even seed ring so the first frame is reproducible across renders. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

type SimNode = NetworkNode & SimulationNodeDatum;
type SimLink = Omit<NetworkLink, 'source' | 'target'> &
  SimulationLinkDatum<SimNode> & { source: string | SimNode; target: string | SimNode };

export interface RenderNetworkGraphOptions {
  model: NetworkGraphModel;
  /** `null` shows every node; otherwise only these ids stay visible. */
  visibleIds: Set<string> | null;
  width: number;
  height: number;
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  /** Selection carried across a redraw (legend filtering keeps it). */
  activeNodeId?: string | null;
  /** Fired when a node is clicked; `null` when the same node is clicked again. */
  onSelect?: (id: string | null) => void;
  /** Drag-to-pan plus ctrl/cmd + wheel zoom. */
  enableZoom?: boolean;
}

interface NodeParts {
  datum: SimNode;
  group: SVGGElement;
  background: SVGCircleElement;
  /** Invisible ring that carries the pointer handlers. */
  grab: SVGCircleElement | null;
  label: SVGGElement | null;
  labelBg: SVGRectElement | null;
  labelTitle: SVGTextElement | null;
  labelValue: SVGTextElement | null;
  radius: number;
  hasImage: boolean;
  alwaysLabelled: boolean;
}

/** How far a node's always-on label reaches past the circle itself. */
interface LabelExtent {
  right: number;
  half: number;
}

interface LinkParts {
  datum: SimLink;
  line: SVGLineElement;
  label: SVGGElement | null;
  visible: boolean;
}

/**
 * Live handle on a mounted graph. The element keeps this so the legend filter
 * and container resizes can update the plot in place instead of rebuilding it.
 */
export interface NetworkGraphController {
  /**
   * Legend filter — hides nodes/links in place. Isolated visible nodes stay
   * pinned in their zone; ghost links to hidden nodes leave the force.
   */
  setVisibleIds(visibleIds: Set<string> | null): void;
  /** Container resize — re-frames the settled layout, runs no new force ticks. */
  resize(width: number, height: number): void;
}

interface GraphState {
  simulation: Simulation<SimNode, SimLink> | null;
  positions: Map<string, { x: number; y: number }>;
  controller: NetworkGraphController | null;
}

const GRAPHS = new WeakMap<HTMLElement, GraphState>();

let instanceCount = 0;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function endpointId(end: string | SimNode): string {
  return typeof end === 'string' ? end : end.id;
}

/** `getBBox` is unavailable outside a real layout engine (jsdom, detached DOM). */
function measure(el: SVGGraphicsElement | null): DOMRect | null {
  if (!el || typeof el.getBBox !== 'function') return null;
  try {
    return el.getBBox();
  } catch {
    return null;
  }
}

/**
 * Client `getLinkPoint` — pull an endpoint out to the rim of its node so the
 * stroke starts where the circle ends.
 */
function rimPoint(
  x: number,
  y: number,
  towardX: number,
  towardY: number,
  radius: number,
): { x: number; y: number } {
  const dx = towardX - x;
  const dy = towardY - y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return { x, y };
  return { x: x + (dx / distance) * radius, y: y + (dy / distance) * radius };
}

/** Stop the simulation attached to `container`, keeping its layout for the next draw. */
export function stopNetworkGraph(container: HTMLElement): void {
  const state = GRAPHS.get(container);
  if (!state) return;
  state.controller = null;
  if (!state.simulation) return;
  for (const node of state.simulation.nodes()) {
    if (typeof node.x === 'number' && typeof node.y === 'number') {
      state.positions.set(node.id, { x: node.x, y: node.y });
    }
  }
  state.simulation.stop();
  state.simulation = null;
}

/**
 * Legend filter. Returns `false` when no graph is mounted so the caller can fall
 * back to a full render; on success nothing is rebuilt and the camera holds.
 */
export function updateNetworkGraphVisibility(
  container: HTMLElement,
  visibleIds: Set<string> | null,
): boolean {
  const controller = GRAPHS.get(container)?.controller;
  if (!controller) return false;
  controller.setVisibleIds(visibleIds);
  return true;
}

/**
 * Container resize. Returns `false` when no graph is mounted; otherwise the
 * settled layout is re-framed without re-running the force simulation.
 */
export function resizeNetworkGraph(
  container: HTMLElement,
  width: number,
  height: number,
): boolean {
  const controller = GRAPHS.get(container)?.controller;
  if (!controller || width <= 0 || height <= 0) return false;
  controller.resize(width, height);
  return true;
}

/**
 * FuseDash NetworkGraph — a d3-force layout of image/colour nodes joined by
 * value-weighted links. The client lays out on a fixed 2000x1375 canvas and
 * zooms into it; chat gives the chart its container instead, so the simulation
 * runs in container coordinates with the spatial forces scaled to match.
 */
export function renderNetworkGraph(
  container: HTMLElement,
  options: RenderNetworkGraphOptions,
): NetworkGraphController | null {
  const { model, theme, onSelect, themeMode = 'light' } = options;
  // Mutated in place by the controller — a filter or a resize must not rebuild.
  let visibleIds = options.visibleIds;
  let width = options.width;
  let height = options.height;

  stopNetworkGraph(container);
  container.replaceChildren();
  if (!model.nodes.length || width <= 0 || height <= 0) return null;

  const positions = GRAPHS.get(container)?.positions ?? new Map();
  const instance = ++instanceCount;
  const blurId = `ui9000-ng-blur-${instance}`;
  const shadowId = `ui9000-ng-shadow-${instance}`;

  const radiusById = new Map(
    model.nodes.map((node) => [node.id, nodeRadius(node, model.breakpoints)]),
  );
  const maxNodeRadius = Math.max(...radiusById.values());

  const simNodes: SimNode[] = model.nodes.map((node, index) => {
    const seed = positions.get(node.id) ?? seedPosition(index, model.nodes.length, width, height);
    return { ...node, x: seed.x, y: seed.y };
  });
  const nodeById = new Map(simNodes.map((node) => [node.id, node]));
  const simLinks: SimLink[] = model.links.map((link) => ({ ...link }));

  const isNodeVisible = (id: string): boolean => !visibleIds || visibleIds.has(id);
  const isLinkVisible = (link: SimLink): boolean =>
    isNodeVisible(endpointId(link.source)) && isNodeVisible(endpointId(link.target));

  const neighbours = new Map<string, Set<string>>();
  for (const link of simLinks) {
    const source = endpointId(link.source);
    const target = endpointId(link.target);
    if (!neighbours.has(source)) neighbours.set(source, new Set());
    if (!neighbours.has(target)) neighbours.set(target, new Set());
    neighbours.get(source)!.add(target);
    neighbours.get(target)!.add(source);
  }

  let activeNodeId = options.activeNodeId ?? null;
  let hoveredNodeId: string | null = null;

  const svg = select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  appendDefs(svg, blurId, shadowId);

  const root = svg.append('g').attr('class', 'graph-root');
  const linkLayer = root.append('g').attr('class', 'link-layer');
  const linkLabelLayer = root.append('g').attr('class', 'link-label-layer');
  const nodeLayer = root.append('g').attr('class', 'node-layer');

  const links = buildLinks(linkLayer, linkLabelLayer, simLinks);
  const nodes = buildNodes({
    layer: nodeLayer,
    simNodes,
    model,
    radiusById,
    blurId,
    shadowId,
    themeMode,
  });

  // Labels hang off the right of their node and are taller than a small circle,
  // so the camera has to allow for them or a narrow frame clips them.
  const labelExtent = new Map<string, LabelExtent>();
  for (const part of nodes) {
    if (!part.alwaysLabelled || !part.labelBg) continue;
    const right = Number(part.labelBg.getAttribute('width')) || 0;
    const half = (Number(part.labelBg.getAttribute('height')) || 0) / 2;
    if (right || half) labelExtent.set(part.datum.id, { right, half });
  }

  const forces = networkForces(width, height, maxNodeRadius);
  // Centring forces are kept by reference: a resize retargets them instead of
  // rebuilding the simulation.
  const centerForce = forceCenter<SimNode>(width / 2, height / 2).strength(0.1);
  const xForce = forceX<SimNode>(width / 2).strength(0.05);
  const yForce = forceY<SimNode>(height / 2).strength(0.05);
  // The first settle uses every link so each node lands in its network zone.
  // After a legend filter, only visible–visible edges stay in the force.
  const linkForce = forceLink<SimNode, SimLink>(simLinks)
    .id((d) => d.id)
    .distance(forces.linkDistance)
    .strength(0.5);
  const simulation = forceSimulation<SimNode>(simNodes)
    .stop()
    .force('link', linkForce)
    .force(
      'charge',
      forceManyBody<SimNode>().strength((d) => (isNodeVisible(d.id) ? forces.charge : 0)),
    )
    .force('center', centerForce)
    .force(
      'collision',
      forceCollide<SimNode>().radius((d) => (isNodeVisible(d.id) ? forces.collide : 0)),
    )
    .force('x', xForce)
    .force('y', yForce);

  /**
   * A node with no remaining visible edge stays where it is. Hidden nodes are
   * pinned too so they cannot pull or shove the rest of the graph.
   */
  function pinIndependentNodes(): void {
    const linked = new Set<string>();
    for (const link of simLinks) {
      if (!isLinkVisible(link)) continue;
      linked.add(endpointId(link.source));
      linked.add(endpointId(link.target));
    }
    for (const node of simNodes) {
      if (isNodeVisible(node.id) && linked.has(node.id)) {
        node.fx = null;
        node.fy = null;
      } else {
        node.fx = node.x;
        node.fy = node.y;
      }
    }
  }

  GRAPHS.set(container, { simulation, positions, controller: null });

  const isConnected = (id: string): boolean =>
    !!activeNodeId && activeNodeId !== id && !!neighbours.get(activeNodeId)?.has(id);

  const isLinkActive = (link: SimLink): boolean =>
    !!activeNodeId &&
    (endpointId(link.source) === activeNodeId || endpointId(link.target) === activeNodeId);

  /** Geometry — runs on every simulation tick. */
  function updateFrame(): void {
    for (const node of simNodes) {
      const radius = radiusById.get(node.id) ?? 0;
      node.x = clamp(node.x ?? width / 2, radius, width - radius);
      node.y = clamp(node.y ?? height / 2, radius, height - radius);
    }

    for (const part of links) {
      const source = nodeById.get(endpointId(part.datum.source));
      const target = nodeById.get(endpointId(part.datum.target));
      if (!source || !target) continue;

      const sx = source.x ?? 0;
      const sy = source.y ?? 0;
      const tx = target.x ?? 0;
      const ty = target.y ?? 0;
      const from = rimPoint(sx, sy, tx, ty, radiusById.get(source.id) ?? 0);
      const to = rimPoint(tx, ty, sx, sy, radiusById.get(target.id) ?? 0);

      part.line.setAttribute('x1', String(from.x));
      part.line.setAttribute('y1', String(from.y));
      part.line.setAttribute('x2', String(to.x));
      part.line.setAttribute('y2', String(to.y));

      if (!part.label) continue;
      const show = part.visible && isLinkActive(part.datum);
      part.label.style.opacity = show ? '1' : '0';
      if (!show) continue;

      const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
      const upright = angle > 90 || angle < -90 ? angle + 180 : angle;
      const perpendicular = ((angle - 90) * Math.PI) / 180;
      const cx = (from.x + to.x) / 2 + Math.cos(perpendicular) * LINK_LABEL_OFFSET;
      const cy = (from.y + to.y) / 2 + Math.sin(perpendicular) * LINK_LABEL_OFFSET;
      part.label.setAttribute('transform', `translate(${cx}, ${cy}) rotate(${upright})`);
    }

    for (const part of nodes) {
      part.group.setAttribute(
        'transform',
        `translate(${part.datum.x ?? 0}, ${part.datum.y ?? 0})`,
      );
    }
  }

  /** Selection / hover styling — runs only when the interaction state changes. */
  function applyState(): void {
    for (const part of nodes) {
      const id = part.datum.id;
      const active = activeNodeId === id;
      const hovered = hoveredNodeId === id;
      const connected = isConnected(id);

      part.background.setAttribute(
        'fill',
        active && !part.hasImage ? NODE_COLORS.activeFill : nodeColor(part.datum, themeMode),
      );

      if (!part.label) continue;
      const show = part.alwaysLabelled || active || hovered || connected;
      part.label.style.opacity = show ? '1' : '0';

      if (part.labelBg) {
        part.labelBg.setAttribute(
          'fill',
          active
            ? NODE_LABEL_COLORS.backgroundActive
            : hovered
              ? fdColors(themeMode).networkLabelHover
              : NODE_LABEL_COLORS.background,
        );
      }
      const textFill = active ? NODE_LABEL_COLORS.textActive : fdColors(themeMode).networkLabelText;
      part.labelTitle?.setAttribute('fill', textFill);
      part.labelTitle?.setAttribute('font-weight', active || connected ? '600' : '400');
      part.labelValue?.setAttribute('fill', textFill);
    }

    for (const part of links) {
      part.line.setAttribute(
        'stroke-width',
        String(
          isLinkActive(part.datum)
            ? scaleLinkWidthByMax(part.datum.value, model.maxLinkValue)
            : LINK_WIDTH,
        ),
      );
    }
  }

  function setActive(id: string | null): void {
    activeNodeId = id;
    applyState();
    updateFrame();
    onSelect?.(id);
  }

  /**
   * Legend filter. Hidden nodes and their edges leave the picture and the
   * force; remaining nodes keep their zone — isolated ones are pinned so the
   * centre forces cannot pile them together.
   */
  function applyVisibility(): void {
    for (const part of nodes) {
      const visible = isNodeVisible(part.datum.id);
      part.group.style.opacity = visible ? '1' : '0';
      part.group.style.pointerEvents = visible ? 'all' : 'none';
      if (part.grab) part.grab.style.pointerEvents = visible ? 'all' : 'none';
    }
    for (const part of links) {
      part.visible = isLinkVisible(part.datum);
      part.line.style.opacity = part.visible ? '1' : '0';
    }
    linkForce.links(simLinks.filter((link) => isLinkVisible(link)));
    pinIndependentNodes();
    // A node filtered out of view must not stay selected or hovered.
    if (hoveredNodeId && !isNodeVisible(hoveredNodeId)) hoveredNodeId = null;
    if (activeNodeId && !isNodeVisible(activeNodeId)) setActive(null);
    else {
      applyState();
      updateFrame();
    }
  }

  /** Centre the visible nodes in the current frame. */
  function applyFit(): void {
    const fitted = fitTransform(
      simNodes.filter((node) => isNodeVisible(node.id)),
      radiusById,
      width,
      height,
      labelExtent,
    );
    if (!fitted) return;
    if (zoomBehaviour) svg.call(zoomBehaviour.transform, fitted);
    else root.attr('transform', fitted.toString());
  }

  /**
   * Container resize. The settled layout is still good, so only the viewBox, the
   * clamp bounds, the centring force targets and the camera move — re-running
   * PRESETTLE_TICKS here would reshuffle the graph under the reader.
   */
  function resize(nextWidth: number, nextHeight: number): void {
    width = nextWidth;
    height = nextHeight;
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    centerForce.x(width / 2).y(height / 2);
    xForce.x(width / 2);
    yForce.y(height / 2);
    updateFrame();
    applyFit();
  }

  attachNodeInteractions({
    nodes,
    simulation,
    getBounds: () => ({ width, height }),
    radiusById,
    onHover: (id) => {
      hoveredNodeId = id;
      applyState();
    },
    onClick: (id) => setActive(activeNodeId === id ? null : id),
    onDragEnd: pinIndependentNodes,
  });

  let zoomBehaviour: ZoomBehavior<SVGSVGElement, unknown> | null = null;

  if (options.enableZoom !== false) {
    zoomBehaviour = zoom<SVGSVGElement, unknown>()
      .scaleExtent(ZOOM_EXTENT)
      .filter((event: Event & { ctrlKey?: boolean; metaKey?: boolean; button?: number }) => {
        // Chat scrolls the transcript — plain wheel must pass through.
        if (event.type === 'wheel') return !!(event.ctrlKey || event.metaKey);
        if (event.button != null && event.button !== 0) return false;
        return !(event.target as Element | null)?.closest?.('g.node');
      })
      .on('zoom', (event: { transform: ZoomTransform }) => {
        root.attr('transform', event.transform.toString());
      });
    svg.call(zoomBehaviour);
  }

  // The only place the layout is settled: first mount and data changes.
  simulation.tick(PRESETTLE_TICKS);
  applyVisibility();
  applyFit();
  simulation.on('tick', updateFrame);

  const controller: NetworkGraphController = {
    setVisibleIds(next) {
      visibleIds = next;
      applyVisibility();
    },
    resize,
  };
  GRAPHS.set(container, { simulation, positions, controller });
  return controller;
}

/**
 * Centre the settled layout in the container. The client zooms into a fixed
 * canvas; here the canvas *is* the container, so a graph that condenses into a
 * corner is nudged back into view. Filtered-out nodes stay in the simulation to
 * hold the layout steady, so only the visible ones frame the camera.
 */
function fitTransform(
  nodes: SimNode[],
  radiusById: Map<string, number>,
  width: number,
  height: number,
  labelExtent: Map<string, LabelExtent>,
): ZoomTransform | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    if (typeof node.x !== 'number' || typeof node.y !== 'number') continue;
    const radius = radiusById.get(node.id) ?? 0;
    const label = labelExtent.get(node.id);
    const vertical = Math.max(radius, label?.half ?? 0);
    minX = Math.min(minX, node.x - radius);
    minY = Math.min(minY, node.y - vertical);
    maxX = Math.max(maxX, node.x + radius + (label?.right ?? 0));
    maxY = Math.max(maxY, node.y + vertical);
  }
  if (!Number.isFinite(minX)) return null;

  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = clamp(
    Math.min((width - FIT_PADDING * 2) / spanX, (height - FIT_PADDING * 2) / spanY),
    FIT_SCALE_EXTENT[0],
    FIT_SCALE_EXTENT[1],
  );

  return zoomIdentity
    .translate(width / 2 - ((minX + maxX) / 2) * scale, height / 2 - ((minY + maxY) / 2) * scale)
    .scale(scale);
}

function seedPosition(
  index: number,
  count: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const maxRadius = Math.min(width, height) * INITIAL_NODE_RADIUS_RATIO;
  const radius = maxRadius * Math.sqrt(count <= 1 ? 0 : index / (count - 1));
  const angle = index * GOLDEN_ANGLE;
  return {
    x: width / 2 + Math.cos(angle) * radius,
    y: height / 2 + Math.sin(angle) * radius,
  };
}

function appendDefs(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  blurId: string,
  shadowId: string,
): void {
  const defs = svg.append('defs');
  defs
    .append('filter')
    .attr('id', blurId)
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%')
    .append('feGaussianBlur')
    .attr('stdDeviation', 12);

  const radial = defs.append('radialGradient').attr('id', shadowId);
  radial
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', NODE_COLORS.shadowInner)
    .attr('stop-opacity', 1);
  radial
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', NODE_COLORS.shadowOuter)
    .attr('stop-opacity', 0.12);
}

/** Every link is built once; the legend filter only toggles what is painted. */
function buildLinks(
  linkLayer: Selection<SVGGElement, unknown, null, undefined>,
  labelLayer: Selection<SVGGElement, unknown, null, undefined>,
  simLinks: SimLink[],
): LinkParts[] {
  return simLinks.map((datum) => {
    const line = linkLayer
      .append('line')
      .attr('class', 'link-line')
      .attr('stroke', LINK_COLORS[datum.type])
      .attr('stroke-width', LINK_WIDTH)
      .attr('stroke-linecap', 'round')
      .style('opacity', 1)
      .style('pointer-events', 'none')
      .node() as SVGLineElement;

    let label: SVGGElement | null = null;
    {
      const group = labelLayer
        .append('g')
        .attr('class', 'link-label')
        .style('opacity', 0)
        .style('pointer-events', 'none');

      const background = group
        .append('rect')
        .attr('class', 'link-label-background')
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill', LINK_LABEL_COLORS.background);

      const text = group
        .append('text')
        .attr('class', 'link-label-text')
        .text(formatLinkValue(datum.value))
        .attr('font-size', LINK_LABEL_SIZE)
        .attr('fill', LINK_LABEL_COLORS.text)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle');

      const box = measure(text.node());
      if (box) {
        background
          .attr('x', box.x - LINK_LABEL_PAD_X)
          .attr('y', box.y - LINK_LABEL_PAD_Y)
          .attr('width', box.width + LINK_LABEL_PAD_X * 2)
          .attr('height', box.height + LINK_LABEL_PAD_Y * 2);
      }
      label = group.node();
    }

    return { datum, line, label, visible: true };
  });
}

function buildNodes(params: {
  layer: Selection<SVGGElement, unknown, null, undefined>;
  simNodes: SimNode[];
  model: NetworkGraphModel;
  radiusById: Map<string, number>;
  blurId: string;
  shadowId: string;
  themeMode: 'light' | 'dark';
}): NodeParts[] {
  const { layer, simNodes, model, radiusById, blurId, shadowId, themeMode } = params;

  return simNodes.map((datum) => {
    const radius = radiusById.get(datum.id) ?? 0;
    const shadow = shadowRadius(datum, model.breakpoints);
    const hasImage = !!datum.img;

    const group = layer
      .append('g')
      .datum(datum)
      .attr('class', 'node')
      .style('cursor', 'grab')
      .style('opacity', 1)
      .style('pointer-events', 'all');

    // Client stacking order: label behind the bloom, chrome on top of it.
    const label = appendNodeLabel(group, datum, radius, themeMode);

    group
      .append('circle')
      .attr('class', 'node-shadow-blue')
      .attr('r', shadow)
      .attr('fill', NODE_COLORS.glow)
      .attr('opacity', 0.15)
      .attr('filter', `url(#${blurId})`)
      .style('pointer-events', 'none');

    const grab = group
      .append('circle')
      .attr('class', 'node-drag-area')
      .attr('r', radius + NODE_BORDER_WIDTH + DRAG_AREA_PAD)
      .attr('fill', 'transparent')
      .style('cursor', 'grab')
      .style('pointer-events', 'all')
      .node() as SVGCircleElement;

    group
      .append('circle')
      .attr('class', 'node-shadow-dark')
      .attr('r', shadow)
      .attr('fill', `url(#${shadowId})`)
      .attr('opacity', 0.1)
      .attr('filter', `url(#${blurId})`)
      .style('pointer-events', 'none');

    const background = group
      .append('circle')
      .attr('class', 'node-background')
      .attr('r', radius)
      .attr('fill', nodeColor(datum, themeMode))
      .style('opacity', hasImage ? 0 : 1)
      .style('pointer-events', 'none')
      .node() as SVGCircleElement;

    group
      .append('circle')
      .attr('class', 'node-border-white')
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', NODE_COLORS.innerBorder)
      .attr('stroke-width', NODE_BORDER_WIDTH)
      .style('pointer-events', 'none');

    if (hasImage) {
      group
        .append('image')
        .attr('class', 'node-image')
        .attr('href', datum.img as string)
        .attr('width', radius * 2)
        .attr('height', radius * 2)
        .attr('x', -radius)
        .attr('y', -radius)
        .attr('clip-path', `circle(${radius}px at ${radius}px ${radius}px)`)
        .attr('preserveAspectRatio', 'xMidYMid slice')
        .style('pointer-events', 'none');
    }

    group
      .append('circle')
      .attr('class', 'node-border-purple')
      .attr('r', radius + NODE_BORDER_WIDTH)
      .attr('fill', 'none')
      .attr('stroke', NODE_COLORS.outerBorder)
      .attr('stroke-width', NODE_BORDER_WIDTH)
      .style('pointer-events', 'none');

    return {
      datum,
      group: group.node() as SVGGElement,
      background,
      grab,
      label: label.group,
      labelBg: label.background,
      labelTitle: label.title,
      labelValue: label.value,
      radius,
      hasImage,
      alwaysLabelled: radius > LABEL_ALWAYS_ABOVE,
    };
  });
}

function appendNodeLabel(
  group: Selection<SVGGElement, SimNode, null, undefined>,
  datum: SimNode,
  radius: number,
  themeMode: 'light' | 'dark',
): {
  group: SVGGElement | null;
  background: SVGRectElement | null;
  title: SVGTextElement | null;
  value: SVGTextElement | null;
} {
  const valueText = formatNodeValue(datum.value);
  if (!datum.label && !valueText) {
    return { group: null, background: null, title: null, value: null };
  }

  const labelGroup = group
    .append('g')
    .attr('class', 'node-label')
    .attr('transform', 'translate(1, 0)')
    .style('opacity', 0)
    .style('pointer-events', 'none');

  const background = labelGroup
    .append('rect')
    .attr('class', 'node-label-background')
    .attr('rx', 4)
    .attr('ry', 4)
    .attr('fill', NODE_LABEL_COLORS.background);

  const title = labelGroup
    .append('text')
    .attr('class', 'node-label-title')
    .text(datum.label)
    .attr('font-size', LABEL_TITLE_SIZE)
    .attr('font-weight', '400')
    .attr('fill', fdColors(themeMode).networkLabelText)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'hanging');

  const value = labelGroup
    .append('text')
    .attr('class', 'node-label-value')
    .text(valueText)
    .attr('font-size', LABEL_VALUE_SIZE)
    .attr('fill', fdColors(themeMode).networkLabelText)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'hanging');

  const paddingX = radius + LABEL_PADDING_GAP;
  const titleBox = measure(title.node());
  const valueBox = measure(value.node());
  const contentWidth = Math.max(titleBox?.width ?? 0, valueBox?.width ?? 0);
  const boxWidth = paddingX * 2 + contentWidth;
  const boxHeight =
    LABEL_PADDING_TOP + LABEL_TITLE_LINE + LABEL_VALUE_LINE + LABEL_PADDING_BOTTOM;
  const centerX = paddingX + contentWidth / 2;

  background
    .attr('x', 0)
    .attr('y', -boxHeight / 2)
    .attr('width', boxWidth)
    .attr('height', boxHeight);
  title.attr('x', centerX).attr('y', -boxHeight / 2 + LABEL_PADDING_TOP);
  value
    .attr('x', centerX)
    .attr('y', -boxHeight / 2 + LABEL_PADDING_TOP + LABEL_TITLE_LINE);

  return {
    group: labelGroup.node(),
    background: background.node(),
    title: title.node(),
    value: value.node(),
  };
}

function attachNodeInteractions(params: {
  nodes: NodeParts[];
  simulation: Simulation<SimNode, SimLink>;
  /** Read per event — the frame changes on resize without a rebuild. */
  getBounds: () => { width: number; height: number };
  radiusById: Map<string, number>;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  /** Re-pin isolated / hidden nodes after a drag so they keep their zone. */
  onDragEnd: () => void;
}): void {
  const { nodes, simulation, getBounds, radiusById, onHover, onClick, onDragEnd } = params;
  let moved = false;
  let start: { x: number; y: number } | null = null;

  const behaviour = drag<SVGGElement, SimNode>()
    .filter((event: MouseEvent) => event.button === 0)
    .on('start', (event: D3DragEvent<SVGGElement, SimNode, unknown>, d) => {
      event.sourceEvent.stopPropagation();
      start = { x: event.sourceEvent.clientX, y: event.sourceEvent.clientY };
      moved = false;
      if (!event.active) simulation.alphaTarget(0.3).restart();
      const { width, height } = getBounds();
      d.fx = d.x ?? width / 2;
      d.fy = d.y ?? height / 2;
    })
    .on('drag', (event: D3DragEvent<SVGGElement, SimNode, unknown>, d) => {
      if (start) {
        const dx = event.sourceEvent.clientX - start.x;
        const dy = event.sourceEvent.clientY - start.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_SLOP) moved = true;
      }
      const { width, height } = getBounds();
      const radius = radiusById.get(d.id) ?? 0;
      d.fx = clamp((d.fx ?? d.x ?? 0) + event.dx, radius, width - radius);
      d.fy = clamp((d.fy ?? d.y ?? 0) + event.dy, radius, height - radius);
    })
    .on('end', (event: D3DragEvent<SVGGElement, SimNode, unknown>, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.x = d.fx ?? d.x;
      d.y = d.fy ?? d.y;
      onDragEnd();
      start = null;
    });

  for (const part of nodes) {
    const group = select<SVGGElement, SimNode>(part.group);
    group.call(behaviour);

    const grab = group.select<SVGCircleElement>('.node-drag-area');
    grab.on('click', (event: MouseEvent) => {
      event.stopPropagation();
      if (moved) {
        moved = false;
        return;
      }
      onClick(part.datum.id);
    });
    grab.on('mouseenter', () => onHover(part.datum.id));
    grab.on('mouseleave', () => onHover(null));
  }
}
