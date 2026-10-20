import { select, type Selection } from 'd3-selection';

import {
  layoutOrchestration,
  pathToNode,
  type OrchestrationLayout,
  type ReasoningNode,
  type ReasoningOrchestrationModel,
  type ReasoningPath,
} from '../lib/index.js';
import { modelColors, orchestrationPalette, type OrchestrationPalette } from './palette.js';

/** Monospace readouts, as on the design board. Charts measure text by this width. */
export const MONO_FONT =
  "var(--ui9000-font-family-mono, ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace)";
/** Advance of one monospace character, in em. */
export const MONO_ADVANCE = 0.6;
const NOTE_FONT = 10;
const NOTE_LINE = 14;
const NOTE_PAD_X = 9;
const NOTE_PAD_Y = 7;
const NOTE_ACCENT = 3;
const NOTE_MAX_CHARS = 46;
const NOTE_GAP = 10;
const READOUT_FONT = 9;
/** A pointer this close to a node hovers it. */
const HOVER_RADIUS = 14;

export interface OrchestrationSelection {
  pathId: string | null;
  nodeId: string | null;
}

export interface OrchestrationHandlers {
  onNodeHover?: (node: ReasoningNode, event: MouseEvent) => void;
  onPathHover?: (path: ReasoningPath, event: MouseEvent | FocusEvent) => void;
  onLeave?: () => void;
  /** A click on a node or a path, or on empty plot (both null). */
  onSelect?: (selection: OrchestrationSelection) => void;
}

export interface RenderOrchestrationOptions {
  model: ReasoningOrchestrationModel;
  width: number;
  height: number;
  themeMode: 'light' | 'dark';
  fontFamily?: string;
  /** What is highlighted. Both null highlights the active path. */
  selection?: OrchestrationSelection;
  showAnnotations?: boolean;
  /** Stage names on the right edge stay between these y values (clear of the labels and legend in the corners). */
  readoutCeiling?: number;
  readoutFloor?: number;
  handlers?: OrchestrationHandlers;
}

export interface OrchestrationController {
  readonly layout: OrchestrationLayout;
  /** Moves the highlight without redrawing the graph. */
  setSelection(selection: OrchestrationSelection): void;
  /** Node ids of the highlighted chain, root first. */
  highlighted(): string[];
}

type G = Selection<SVGGElement, unknown, null, undefined>;

let instanceCount = 0;

function truncate(value: string, max = NOTE_MAX_CHARS): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function segment(a: { x: number; y: number }, b: { x: number; y: number }): string {
  return `M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
}

function polyline(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
}

/** The chain to highlight: a selected path, the path to a selected node, else the active path. */
export function highlightedChain(model: ReasoningOrchestrationModel, selection?: OrchestrationSelection): {
  nodes: string[];
  path: ReasoningPath | null;
} {
  if (selection?.pathId) {
    const path = model.paths.find((item) => item.id === selection.pathId);
    if (path) return { nodes: path.nodes, path };
  }
  if (selection?.nodeId) {
    const chain = pathToNode(model, selection.nodeId);
    if (chain.length) {
      const path = model.paths.find((item) => item.nodes[item.nodes.length - 1] === selection.nodeId) ?? null;
      return { nodes: path ? path.nodes : chain, path };
    }
  }
  const active = model.paths.find((item) => item.id === model.activePathId) ?? null;
  return { nodes: active?.nodes ?? [], path: active };
}

/**
 * The reasoning orchestration graph. Stage boundaries are faint arcs with a
 * depth readout on the right; links are hairlines coloured by model, pruned
 * ones dashed red; candidate paths sit above them, subordinate; the
 * highlighted path is a glowing line from the root to its far end.
 */
export function renderReasoningOrchestration(
  container: HTMLElement,
  options: RenderOrchestrationOptions,
): OrchestrationController | null {
  const { model, width, height, themeMode, handlers = {} } = options;
  container.replaceChildren();
  if (model.empty || width <= 0 || height <= 0) return null;

  const palette = orchestrationPalette(themeMode);
  const colorOf = modelColors(palette, model.models);
  const layout = layoutOrchestration(model, width, height);
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  const at = (id: string) => layout.nodes.get(id);
  const instance = ++instanceCount;
  const glowId = `ui9000-ro-glow-${instance}`;
  const gradientId = `ui9000-ro-path-${instance}`;

  const svg = select(container)
    .append('svg')
    .attr('class', 'ro-svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', ariaSummary(model))
    .style('display', 'block')
    .style('font-family', options.fontFamily ?? 'inherit');

  const defs = svg.append('defs');
  defs
    .append('filter')
    .attr('id', glowId)
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%')
    .append('feGaussianBlur')
    .attr('stdDeviation', 3.2);
  const gradient = defs
    .append('linearGradient')
    .attr('id', gradientId)
    .attr('gradientUnits', 'userSpaceOnUse');

  const rules = svg.append('g').attr('class', 'ro-rules').attr('pointer-events', 'none');
  const linkLayer = svg.append('g').attr('class', 'ro-links').attr('pointer-events', 'none');
  const nodeLayer = svg.append('g').attr('class', 'ro-nodes').attr('pointer-events', 'none');
  const hit = svg
    .append('rect')
    .attr('class', 'ro-hit')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'transparent');
  const pathLayer = svg.append('g').attr('class', 'ro-paths');
  const highlightLayer = svg.append('g').attr('class', 'ro-highlight').attr('pointer-events', 'none');
  const rootLayer = svg.append('g').attr('class', 'ro-roots').attr('pointer-events', 'none');
  const hover = svg
    .append('circle')
    .attr('class', 'ro-hover')
    .attr('r', 4.5)
    .attr('fill', 'none')
    .attr('stroke', palette.root)
    .attr('stroke-width', 1)
    .attr('visibility', 'hidden')
    .attr('pointer-events', 'none');
  const noteLayer = svg.append('g').attr('class', 'ro-notes').attr('pointer-events', 'none');

  drawRules(rules, model, layout, palette, options.readoutCeiling ?? 0, options.readoutFloor ?? height);
  drawLinks(linkLayer, model, layout, palette, colorOf, nodeById);
  drawNodes(nodeLayer, model, layout, palette, colorOf);
  drawRoots(rootLayer, layout, palette);

  let selection: OrchestrationSelection = options.selection ?? { pathId: null, nodeId: null };
  let chain: string[] = [];

  const paint = () => {
    const highlight = highlightedChain(model, selection);
    chain = highlight.nodes;
    drawCandidatePaths(pathLayer, model, layout, colorOf, palette, highlight.path, handlers);
    const endNode = nodeById.get(chain[chain.length - 1] ?? '');
    const endColor =
      colorOf(highlight.path?.modelId) ?? colorOf(endNode?.modelId) ?? (themeMode === 'dark' ? palette.glow : palette.pathMid);
    drawHighlight(highlightLayer, gradient, chain, layout, palette, endColor, glowId, gradientId);
    noteLayer.selectAll('*').remove();
    const notes = options.showAnnotations !== false ? drawNotes(noteLayer, model, layout, palette, colorOf, width, height) : [];
    // A stage name a note covers would only peek out from behind it.
    rules.selectAll<SVGGElement, { text: string }>('g.ro-readout').attr('visibility', function (mark) {
      const y = Number(this.getAttribute('data-y'));
      const w = (mark.text.length * READOUT_FONT * MONO_ADVANCE) + 9;
      const covered = notes.some(
        (box) => width - 4 - w < box.x + box.w && width - 4 > box.x && y - 6 < box.y + box.h && y + 6 > box.y,
      );
      return covered ? 'hidden' : null;
    });
  };
  paint();

  // One overlay finds the nearest node, so a dense frontier needs no hit target per node.
  const nearest = (event: MouseEvent): ReasoningNode | null => {
    const rect = (svg.node() as SVGSVGElement).getBoundingClientRect();
    const sx = rect.width ? width / rect.width : 1;
    const sy = rect.height ? height / rect.height : 1;
    const x = (event.clientX - rect.left) * sx;
    const y = (event.clientY - rect.top) * sy;
    let best: ReasoningNode | null = null;
    let gap = HOVER_RADIUS * HOVER_RADIUS;
    for (const placed of layout.nodes.values()) {
      const d = (placed.x - x) ** 2 + (placed.y - y) ** 2;
      if (d < gap) {
        gap = d;
        best = nodeById.get(placed.id) ?? null;
      }
    }
    return best;
  };
  hit
    .on('mousemove', (event: MouseEvent) => {
      const node = nearest(event);
      if (!node) {
        hover.attr('visibility', 'hidden');
        handlers.onLeave?.();
        return;
      }
      const placed = at(node.id)!;
      hover.attr('cx', placed.x).attr('cy', placed.y).attr('visibility', 'visible');
      handlers.onNodeHover?.(node, event);
    })
    .on('mouseleave', () => {
      hover.attr('visibility', 'hidden');
      handlers.onLeave?.();
    })
    .on('click', (event: MouseEvent) => {
      const node = nearest(event);
      handlers.onSelect?.({ pathId: null, nodeId: node?.id ?? null });
    });

  return {
    layout,
    setSelection(next) {
      selection = next;
      paint();
    },
    highlighted: () => [...chain],
  };
}

function ariaSummary(model: ReasoningOrchestrationModel): string {
  const parts = [`Reasoning graph: ${model.nodes.length} nodes`];
  if (model.stages.length) parts.push(`${model.stages.length} stages`);
  if (model.paths.length) parts.push(`${model.paths.length} paths`);
  const active = model.paths.find((path) => path.id === model.activePathId);
  if (active) parts.push(`active path ${active.label}, ${active.nodes.length} steps`);
  return parts.join(', ');
}

/** Stage boundaries as faint arcs, and the stage names down the right edge. */
function drawRules(
  g: G,
  model: ReasoningOrchestrationModel,
  layout: OrchestrationLayout,
  palette: OrchestrationPalette,
  ceiling: number,
  floor: number,
): void {
  const arc = (rho: number) => {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= 48; i += 1) points.push(layout.point(rho, -Math.PI / 2 + (i / 48) * Math.PI));
    return polyline(points);
  };
  const marks = model.stages.length
    ? model.stages.map((stage) => {
        const range =
          stage.depthTo > stage.depthFrom
            ? `D${Math.round(stage.depthFrom)}–${Math.round(stage.depthTo)}`
            : `D${Math.round(stage.depthFrom)}`;
        return {
          boundary: stage.index > 0 ? layout.rhoOf(stage.depthFrom - 0.5) : null,
          apex: layout.rhoOf((stage.depthFrom + stage.depthTo) / 2),
          text: `${stage.label} · ${range}`.toUpperCase(),
          status: stage.status,
        };
      })
    : depthTicks(model.maxDepth).map((d) => ({ boundary: layout.rhoOf(d), apex: layout.rhoOf(d), text: `D${d}`, status: null }));

  g.selectAll('path.ro-stage-arc')
    .data(marks.filter((mark) => mark.boundary !== null && mark.boundary > 0))
    .join('path')
    .attr('class', 'ro-stage-arc')
    .attr('d', (mark) => arc(mark.boundary!))
    .attr('fill', 'none')
    .attr('stroke', palette.rule)
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '1 3');

  // Outer frame of the search space.
  g.append('path')
    .attr('class', 'ro-outer-arc')
    .attr('d', arc(1.02))
    .attr('fill', 'none')
    .attr('stroke', palette.rule)
    .attr('stroke-width', 1);

  const right = layout.width - 4;
  const readout = g
    .selectAll('g.ro-readout')
    .data(
      marks.filter((mark) => {
        const y = layout.base - mark.apex * layout.ry;
        return y >= ceiling && y <= floor;
      }),
    )
    .join('g')
    .attr('class', 'ro-readout')
    .attr('data-status', (mark) => mark.status ?? '')
    .attr('data-y', (mark) => (layout.base - mark.apex * layout.ry).toFixed(1))
    .attr('transform', (mark) => `translate(${right},${(layout.base - mark.apex * layout.ry).toFixed(1)})`);
  readout
    .append('line')
    .attr('x1', -6)
    .attr('x2', 0)
    .attr('stroke', palette.label)
    .attr('stroke-width', 1);
  readout
    .append('text')
    .attr('x', -9)
    .attr('dy', '0.32em')
    .attr('text-anchor', 'end')
    .attr('font-size', READOUT_FONT)
    .attr('letter-spacing', '0.04em')
    .attr('fill', palette.label)
    .attr('fill-opacity', (mark) => (mark.status === 'pending' ? 0.55 : 1))
    .style('font-family', MONO_FONT)
    .style('paint-order', 'stroke')
    .style('stroke', `var(--ui9000-color-surface, ${palette.halo})`)
    .style('stroke-width', '3px')
    .text((mark) => mark.text);
}

function depthTicks(maxDepth: number): number[] {
  const step = maxDepth <= 6 ? 1 : maxDepth <= 16 ? 2 : Math.ceil(maxDepth / 8);
  const out: number[] = [];
  for (let d = step; d <= maxDepth; d += step) out.push(d);
  return out;
}

/** Hairlines, batched by colour: neutral, by model, dashed red to a pruned node, fainter in resample fans. */
function drawLinks(
  g: G,
  model: ReasoningOrchestrationModel,
  layout: OrchestrationLayout,
  palette: OrchestrationPalette,
  colorOf: (id: string | null | undefined) => string | null,
  nodeById: Map<string, ReasoningNode>,
): void {
  const groups = new Map<string, { color: string; tier: string; d: string[] }>();
  for (const link of model.links) {
    const a = layout.nodes.get(link.source);
    const b = layout.nodes.get(link.target);
    if (!a || !b) continue;
    const target = nodeById.get(link.target);
    const dropped = target?.state === 'pruned' || target?.state === 'failed';
    const color = dropped ? palette.pruned : (colorOf(link.modelId ?? target?.modelId) ?? palette.neutralLink);
    const tier = dropped ? 'pruned' : b.fan >= 0 ? 'fan' : color === palette.neutralLink ? 'neutral' : 'model';
    const groupKey = `${tier}|${color}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { color, tier, d: [] });
    groups.get(groupKey)!.d.push(segment(a, b));
  }
  const style: Record<string, { width: number; opacity: number; dash: string | null }> = {
    neutral: { width: 0.6, opacity: 1, dash: null },
    model: { width: 0.75, opacity: 0.5, dash: null },
    fan: { width: 0.55, opacity: 0.35, dash: null },
    pruned: { width: 0.6, opacity: 0.2, dash: '2 2' },
  };
  g.selectAll('path')
    .data([...groups.values()])
    .join('path')
    .attr('class', (group) => `ro-link ro-link--${group.tier}`)
    .attr('d', (group) => group.d.join(''))
    .attr('fill', 'none')
    .attr('stroke', (group) => group.color)
    .attr('stroke-width', (group) => style[group.tier]!.width)
    .attr('stroke-opacity', (group) => style[group.tier]!.opacity)
    .attr('stroke-dasharray', (group) => style[group.tier]!.dash)
    .attr('stroke-linecap', 'round');
}

/** One dot per node: model colour, red when pruned, sized by score. */
function drawNodes(
  g: G,
  model: ReasoningOrchestrationModel,
  layout: OrchestrationLayout,
  palette: OrchestrationPalette,
  colorOf: (id: string | null | undefined) => string | null,
): void {
  g.selectAll('circle')
    .data(model.nodes.filter((node) => node.parent !== null))
    .join('circle')
    .attr('class', (node) => `ro-node ro-node--${node.state}`)
    .attr('data-id', (node) => node.id)
    .attr('cx', (node) => layout.nodes.get(node.id)!.x.toFixed(1))
    .attr('cy', (node) => layout.nodes.get(node.id)!.y.toFixed(1))
    .attr('r', (node) => (node.score === null ? 1.1 : 0.8 + node.score * 1.8).toFixed(2))
    .attr('fill', (node) =>
      node.state === 'pruned' || node.state === 'failed' ? palette.pruned : (colorOf(node.modelId) ?? palette.neutralNode),
    )
    .attr('fill-opacity', (node) => (node.state === 'pruned' ? 0.55 : node.state === 'failed' ? 0.85 : 0.9));
}

/** The main root glows at the bottom centre; resample roots are small dots on the baseline. */
function drawRoots(g: G, layout: OrchestrationLayout, palette: OrchestrationPalette): void {
  for (const fan of layout.fans) {
    const placed = layout.nodes.get(fan.root);
    if (!placed) continue;
    g.append('circle')
      .attr('class', 'ro-fan-root')
      .attr('cx', placed.x)
      .attr('cy', placed.y)
      .attr('r', 1.8)
      .attr('fill', palette.label);
  }
  const root = layout.primaryRoot ? layout.nodes.get(layout.primaryRoot) : undefined;
  if (!root) return;
  g.append('circle')
    .attr('class', 'ro-root-halo')
    .attr('cx', root.x)
    .attr('cy', root.y)
    .attr('r', 9)
    .attr('fill', 'none')
    .attr('stroke', palette.rootHalo)
    .attr('stroke-width', 1.4);
  g.append('circle')
    .attr('class', 'ro-root')
    .attr('cx', root.x)
    .attr('cy', root.y)
    .attr('r', 4.5)
    .attr('fill', palette.root);
}

/** Candidate paths: model-coloured, above the hairlines, below the highlight. Each one hovers and selects. */
function drawCandidatePaths(
  g: G,
  model: ReasoningOrchestrationModel,
  layout: OrchestrationLayout,
  colorOf: (id: string | null | undefined) => string | null,
  palette: OrchestrationPalette,
  highlighted: ReasoningPath | null,
  handlers: OrchestrationHandlers,
): void {
  g.selectAll('*').remove();
  const others = model.paths.filter((path) => path !== highlighted);
  const line = (path: ReasoningPath) =>
    polyline(path.nodes.map((id) => layout.nodes.get(id)).filter((p): p is NonNullable<typeof p> => !!p));
  const groups = g
    .selectAll('g.ro-path')
    .data(others)
    .join('g')
    .attr('class', 'ro-path')
    .attr('data-path', (path) => path.id);
  groups
    .append('path')
    .attr('class', 'ro-path-line')
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', (path) => colorOf(path.modelId) ?? palette.label)
    .attr('stroke-width', 1.1)
    .attr('stroke-opacity', 0.62)
    .attr('stroke-linejoin', 'round');
  groups
    .append('path')
    .attr('class', 'ro-path-hit')
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', 'transparent')
    .attr('stroke-width', 10)
    .attr('pointer-events', 'stroke')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (path) => `Highlight ${path.label}`)
    .style('cursor', 'pointer')
    .style('outline', 'none')
    .on('mouseenter mousemove', function (this: SVGPathElement, event: MouseEvent, path: ReasoningPath) {
      select(this.parentNode as SVGGElement).classed('is-hover', true);
      handlers.onPathHover?.(path, event);
    })
    .on('focus', function (this: SVGPathElement, event: FocusEvent, path: ReasoningPath) {
      select(this.parentNode as SVGGElement).classed('is-hover', true);
      handlers.onPathHover?.(path, event);
    })
    .on('mouseleave blur', function (this: SVGPathElement) {
      select(this.parentNode as SVGGElement).classed('is-hover', false);
      handlers.onLeave?.();
    })
    .on('click', (event: MouseEvent, path: ReasoningPath) => {
      event.stopPropagation();
      handlers.onSelect?.({ pathId: path.id, nodeId: null });
    })
    .on('keydown', (event: KeyboardEvent, path: ReasoningPath) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      handlers.onSelect?.({ pathId: path.id, nodeId: null });
    });
}

/** The highlighted chain: a soft glow under a line that warms from the root to its model's colour. */
function drawHighlight(
  g: G,
  gradient: Selection<SVGLinearGradientElement, unknown, null, undefined>,
  chain: string[],
  layout: OrchestrationLayout,
  palette: OrchestrationPalette,
  endColor: string,
  glowId: string,
  gradientId: string,
): void {
  g.selectAll('*').remove();
  const points = chain.map((id) => layout.nodes.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  if (points.length < 2) return;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  gradient
    .attr('x1', first.x)
    .attr('y1', first.y)
    .attr('x2', last.x)
    .attr('y2', last.y === first.y ? first.y - 1 : last.y);
  gradient.selectAll('stop').remove();
  gradient.append('stop').attr('offset', '0%').attr('stop-color', palette.pathStart);
  gradient.append('stop').attr('offset', '62%').attr('stop-color', palette.pathMid);
  gradient.append('stop').attr('offset', '100%').attr('stop-color', endColor);

  const d = polyline(points);
  g.append('path')
    .attr('class', 'ro-active-glow')
    .attr('d', d)
    .attr('fill', 'none')
    .attr('stroke', endColor)
    .attr('stroke-width', 6)
    .attr('stroke-opacity', 0.35)
    .attr('stroke-linejoin', 'round')
    .attr('filter', `url(#${glowId})`);
  g.append('path')
    .attr('class', 'ro-active-line')
    .attr('d', d)
    .attr('fill', 'none')
    .attr('stroke', `url(#${gradientId})`)
    .attr('stroke-width', 2.2)
    .attr('stroke-linejoin', 'round')
    .attr('stroke-linecap', 'round');
  g.selectAll('circle.ro-active-node')
    .data(points.slice(1, -1))
    .join('circle')
    .attr('class', 'ro-active-node')
    .attr('cx', (p) => p.x)
    .attr('cy', (p) => p.y)
    .attr('r', 1.7)
    .attr('fill', palette.pathStart);
  g.append('circle')
    .attr('class', 'ro-active-end')
    .attr('cx', last.x)
    .attr('cy', last.y)
    .attr('r', 3.4)
    .attr('fill', endColor);
  g.append('circle')
    .attr('class', 'ro-active-end-ring')
    .attr('cx', last.x)
    .attr('cy', last.y)
    .attr('r', 6.5)
    .attr('fill', 'none')
    .attr('stroke', endColor)
    .attr('stroke-opacity', 0.55);
}

/**
 * Refinement notes beside their node: a title, up to three lines, an accent
 * bar in the model's colour. Placed right of the node, else left, and kept
 * inside the plot and clear of each other.
 */
function drawNotes(
  g: G,
  model: ReasoningOrchestrationModel,
  layout: OrchestrationLayout,
  palette: OrchestrationPalette,
  colorOf: (id: string | null | undefined) => string | null,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number }[] {
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const advance = NOTE_FONT * MONO_ADVANCE;
  for (const note of model.annotations) {
    const anchor = layout.nodes.get(note.nodeId);
    if (!anchor) continue;
    const rows = [truncate(note.title.toUpperCase()), ...note.lines.slice(0, 3).map((row) => truncate(row.toUpperCase()))];
    const chars = Math.max(...rows.map((row) => row.length));
    const w = Math.min(width - 8, chars * advance + NOTE_PAD_X * 2 + NOTE_ACCENT);
    const h = rows.length * NOTE_LINE + NOTE_PAD_Y * 2;
    let x = anchor.x + NOTE_GAP;
    if (x + w > width - 4) x = anchor.x - NOTE_GAP - w;
    x = Math.max(4, Math.min(width - 4 - w, x));
    let y = Math.max(4, Math.min(height - 4 - h, anchor.y - NOTE_LINE));
    for (const box of placed) {
      const overlaps = x < box.x + box.w && x + w > box.x && y < box.y + box.h && y + h > box.y;
      if (overlaps) y = Math.min(height - 4 - h, box.y + box.h + 6);
    }
    placed.push({ x, y, w, h });
    const accent = colorOf(note.modelId) ?? palette.glow;

    const box = g.append('g').attr('class', 'ro-note').attr('data-node', note.nodeId);
    const edgeX = x > anchor.x ? x : x + w;
    box
      .append('line')
      .attr('class', 'ro-note-leader')
      .attr('x1', anchor.x)
      .attr('y1', anchor.y)
      .attr('x2', edgeX)
      .attr('y2', Math.max(y + 4, Math.min(y + h - 4, anchor.y)))
      .attr('stroke', accent)
      .attr('stroke-opacity', 0.7)
      .attr('stroke-width', 1);
    box
      .append('rect')
      .attr('x', x)
      .attr('y', y)
      .attr('width', w)
      .attr('height', h)
      .attr('rx', 2)
      .attr('fill', palette.noteFill)
      .attr('stroke', palette.noteStroke);
    box
      .append('rect')
      .attr('class', 'ro-note-accent')
      .attr('x', x)
      .attr('y', y)
      .attr('width', NOTE_ACCENT)
      .attr('height', h)
      .attr('fill', accent);
    const textX = x + NOTE_ACCENT + NOTE_PAD_X;
    rows.forEach((row, i) => {
      box
        .append('text')
        .attr('class', i === 0 ? 'ro-note-title' : 'ro-note-line')
        .attr('x', textX)
        .attr('y', y + NOTE_PAD_Y + i * NOTE_LINE + NOTE_FONT)
        .attr('font-size', NOTE_FONT)
        .attr('font-weight', i === 0 ? 600 : 400)
        .attr('fill', i === 0 ? palette.noteText : i === 1 ? accent : palette.noteMuted)
        .style('font-family', MONO_FONT)
        .text(row);
    });
  }
  return placed;
}
