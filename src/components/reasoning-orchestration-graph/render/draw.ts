import { select, type Selection } from 'd3-selection';

import {
  formatStageMetric,
  layoutOrchestration,
  pathToNode,
  type OrchestrationLayout,
  type ReasoningNode,
  type ReasoningOrchestrationModel,
  type ReasoningPath,
  type ReasoningStage,
} from '../lib/index.js';
import { CHART_TYPE } from '../../../utils/chart-theme.js';
import { chainEndColor, isDropped, modelColors, orchestrationPalette, pathMid, type OrchestrationPalette } from './palette.js';

/** Same family as bar, line, and lollipop. Text fit still assumes a 0.6em advance. */
export const MONO_FONT = `var(--ui9000-font-family, ${CHART_TYPE.fontFamily})`;
/** Advance of one character, in em. */
export const MONO_ADVANCE = 0.6;
/** Notes and stage names are capitals in the subtitle style (body/xs), as the other graphs' labels. */
const NOTE_FONT = CHART_TYPE.subtitle;
const NOTE_LINE = CHART_TYPE.subtitleLine;
const NOTE_PAD_X = 9;
const NOTE_PAD_Y = 7;
const NOTE_ACCENT = 3;
const NOTE_MAX_CHARS = 46;
const NOTE_GAP = 10;
const READOUT_FONT = CHART_TYPE.subtitle;
/** Strength of the hover preview against the highlight. */
const PREVIEW_OPACITY = 0.5;
/** A pointer this close to a node hovers it. */
const HOVER_RADIUS = 14;

export interface OrchestrationSelection {
  pathId: string | null;
  nodeId: string | null;
}

export interface OrchestrationHandlers {
  onNodeHover?: (node: ReasoningNode, event: MouseEvent) => void;
  onPathHover?: (path: ReasoningPath, event: MouseEvent | FocusEvent) => void;
  /** Hover on a stage name down the right edge. */
  onStageHover?: (stage: ReasoningStage, event: MouseEvent) => void;
  /** A click on a stage name down the right edge. */
  onStageClick?: (stage: ReasoningStage, event: MouseEvent) => void;
  onLeave?: () => void;
  /**
   * A click on a node or a path, or on empty plot (both null). A click on the
   * highlighted path sends the current selection again, or the active path's
   * id when nothing is selected.
   */
  onSelect?: (selection: OrchestrationSelection) => void;
}

export interface RenderOrchestrationOptions {
  model: ReasoningOrchestrationModel;
  width: number;
  height: number;
  themeMode: 'light' | 'dark';
  /** Page style (`default`, `palette1` …). Models without their own colour use it. */
  styleId?: string;
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

/** A click this close to the highlighted path's line picks the path. */
const LINE_HIT = 6;

/** The point lies within LINE_HIT of the polyline. */
function nearLine(point: { x: number; y: number }, line: { x: number; y: number }[]): boolean {
  for (let i = 1; i < line.length; i += 1) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
    if ((a.x + t * dx - point.x) ** 2 + (a.y + t * dy - point.y) ** 2 <= LINE_HIT * LINE_HIT) return true;
  }
  return false;
}

/** Width of a stage name on the right edge, with its tick. */
function readoutWidth(text: string): number {
  return text.length * READOUT_FONT * MONO_ADVANCE + 9;
}

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

  const palette = orchestrationPalette(themeMode, options.styleId);
  const colorOf = modelColors(palette, model.models);
  const layout = layoutOrchestration(model, width, height);
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  const at = (id: string) => layout.nodes.get(id);
  const instance = ++instanceCount;
  const glowId = `ui9000-ro-glow-${instance}`;
  const gradientId = `ui9000-ro-path-${instance}`;
  const previewGradientId = `ui9000-ro-preview-${instance}`;

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
  const previewGradient = defs
    .append('linearGradient')
    .attr('id', previewGradientId)
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
  // What a click on the hovered path or node would highlight, drawn like the highlight at half strength.
  const previewLayer = svg
    .append('g')
    .attr('class', 'ro-preview')
    .attr('pointer-events', 'none')
    .attr('opacity', PREVIEW_OPACITY);
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

  const readouts = drawRules(rules, model, layout, palette, options.readoutCeiling ?? 0, options.readoutFloor ?? height);
  // Above the hover overlay and the notes, so a stage name hovers even where the plot is dense.
  const stageHits = svg
    .append('g')
    .attr('class', 'ro-stage-hits')
    .selectAll<SVGRectElement, Readout>('rect')
    .data(readouts.filter((mark) => mark.stage))
    .join('rect')
    .attr('class', 'ro-stage-hit')
    .attr('data-stage', (mark) => mark.stage!.id)
    .attr('x', (mark) => width - 4 - readoutWidth(mark.text))
    .attr('y', (mark) => mark.y - 8)
    .attr('width', (mark) => readoutWidth(mark.text))
    .attr('height', 16)
    .attr('fill', 'transparent')
    .on('mousemove', (event: MouseEvent, mark) => handlers.onStageHover?.(mark.stage!, event))
    .on('mouseleave', () => handlers.onLeave?.())
    .on('click', (event: MouseEvent, mark) => handlers.onStageClick?.(mark.stage!, event));
  drawLinks(linkLayer, model, layout, palette, colorOf, nodeById);
  drawNodes(nodeLayer, model, layout, palette, colorOf);
  drawRoots(rootLayer, layout, palette);

  let selection: OrchestrationSelection = options.selection ?? { pathId: null, nodeId: null };
  let chain: string[] = [];
  // Notes do not move with the selection: drawn once, then shown or faded.
  const notes = options.showAnnotations !== false ? drawNotes(noteLayer, model, layout, palette, colorOf, width, height) : [];

  /** A chain's colour at its far end: red into a pruned node, else its path's model, else its end node's. */
  const endColorOf = (highlight: { nodes: string[]; path: ReasoningPath | null }) => {
    const endNode = nodeById.get(highlight.nodes[highlight.nodes.length - 1] ?? '');
    return chainEndColor(palette, endNode, colorOf(highlight.path?.modelId) ?? colorOf(endNode?.modelId));
  };
  let previewFor = '';
  /**
   * Previews what a click would highlight: a hovered candidate path, or the
   * path to a hovered node. Nothing for a node on the highlighted chain, as a
   * click there keeps it.
   */
  const preview = (target: OrchestrationSelection | null) => {
    const shown = target && !(target.nodeId && chain.includes(target.nodeId)) ? target : null;
    const key = shown ? `${shown.pathId ?? ''}|${shown.nodeId ?? ''}` : '';
    if (key === previewFor) return;
    previewFor = key;
    if (!shown) {
      previewLayer.selectAll('*').remove();
      return;
    }
    const next = highlightedChain(model, shown);
    drawHighlight(previewLayer, previewGradient, next.nodes, layout, palette, endColorOf(next), glowId, previewGradientId, 'ro-preview');
  };
  const pathHandlers: OrchestrationHandlers = {
    ...handlers,
    onPathHover: (path, event) => {
      preview({ pathId: path.id, nodeId: null });
      handlers.onPathHover?.(path, event);
    },
    onLeave: () => {
      preview(null);
      handlers.onLeave?.();
    },
  };

  const paint = () => {
    const highlight = highlightedChain(model, selection);
    chain = highlight.nodes;
    drawCandidatePaths(pathLayer, model, layout, colorOf, palette, highlight.path, pathHandlers);
    drawHighlight(highlightLayer, gradient, chain, layout, palette, endColorOf(highlight), glowId, gradientId);
    // The hovered node may now be on the highlighted chain.
    preview(null);
    // While the active path is highlighted every note shows. Another selection fades the notes off
    // its chain, so they cover nothing it may need; selecting the active path again, or clearing,
    // brings them back.
    const showsActive = selection.pathId
      ? selection.pathId === model.activePathId
      : !selection.nodeId;
    const shown = notes.filter((box) => showsActive || chain.includes(box.nodeId));
    const shownIds = new Set(shown.map((box) => box.nodeId));
    noteLayer.selectAll<SVGGElement, unknown>('g.ro-note').each(function () {
      const faded = !shownIds.has(this.getAttribute('data-node') ?? '');
      this.classList.toggle('is-faded', faded);
      this.style.opacity = faded ? '0' : '';
    });
    // A stage name a shown note covers would only peek out from behind it, and does not hover.
    const covered = (mark: Readout) => {
      const w = readoutWidth(mark.text);
      return shown.some(
        (box) => width - 4 - w < box.x + box.w && width - 4 > box.x && mark.y - 6 < box.y + box.h && mark.y + 6 > box.y,
      );
    };
    rules
      .selectAll<SVGGElement, Readout>('g.ro-readout')
      .attr('visibility', (mark) => (covered(mark) ? 'hidden' : null));
    stageHits.attr('display', (mark) => (covered(mark) ? 'none' : null));
  };
  paint();

  /** The pointer in plot coordinates. */
  const pointer = (event: MouseEvent): { x: number; y: number } => {
    const rect = (svg.node() as SVGSVGElement).getBoundingClientRect();
    const sx = rect.width ? width / rect.width : 1;
    const sy = rect.height ? height / rect.height : 1;
    return { x: (event.clientX - rect.left) * sx, y: (event.clientY - rect.top) * sy };
  };
  // One overlay finds the nearest node, so a dense frontier needs no hit target per node.
  const nearest = (event: MouseEvent): ReasoningNode | null => {
    const { x, y } = pointer(event);
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
      preview(node ? { pathId: null, nodeId: node.id } : null);
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
      preview(null);
      hover.attr('visibility', 'hidden');
      handlers.onLeave?.();
    })
    .on('click', (event: MouseEvent) => {
      const node = nearest(event);
      // The highlighted path has no hit target of its own (one would block hover on its nodes), so a
      // click on one of its nodes or near its line picks it again: the current selection, or the
      // active path when nothing is selected.
      const onHighlight =
        chain.length > 1 &&
        (node ? chain.includes(node.id) : nearLine(pointer(event), chain.map((id) => at(id)).filter((p) => !!p)));
      if (onHighlight) {
        const again = selection.pathId || selection.nodeId ? selection : { pathId: model.activePathId, nodeId: null };
        handlers.onSelect?.({ ...again });
        return;
      }
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

/** A stage name on the right edge: its stage (none for a plain depth tick), its text and its y. */
interface Readout {
  stage: ReasoningStage | null;
  text: string;
  y: number;
}

/**
 * Stage boundaries as faint arcs, and the stage names down the right edge,
 * each with its stage metric. Returns the names drawn.
 */
function drawRules(
  g: G,
  model: ReasoningOrchestrationModel,
  layout: OrchestrationLayout,
  palette: OrchestrationPalette,
  ceiling: number,
  floor: number,
): Readout[] {
  const arc = (rho: number) => {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= 48; i += 1) points.push(layout.point(rho, -Math.PI / 2 + (i / 48) * Math.PI));
    return polyline(points);
  };
  const metric = model.stageMetric;
  const marks = model.stages.length
    ? model.stages.map((stage) => {
        const range =
          stage.depthTo > stage.depthFrom
            ? `D${Math.round(stage.depthFrom)}–${Math.round(stage.depthTo)}`
            : `D${Math.round(stage.depthFrom)}`;
        const value = metric ? stage.metrics[metric.key] : undefined;
        const parts = [stage.label, range, ...(value === undefined ? [] : [formatStageMetric(metric!, value)])];
        return {
          boundary: stage.index > 0 ? layout.rhoOf(stage.depthFrom - 0.5) : null,
          apex: layout.rhoOf((stage.depthFrom + stage.depthTo) / 2),
          text: parts.join(' · ').toUpperCase(),
          status: stage.status,
          stage: stage as ReasoningStage | null,
        };
      })
    : depthTicks(model.maxDepth).map((d) => ({
        boundary: layout.rhoOf(d),
        apex: layout.rhoOf(d),
        text: `D${d}`,
        status: null,
        stage: null,
      }));

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
  const shown = marks
    .map((mark) => ({ ...mark, y: Number((layout.base - mark.apex * layout.ry).toFixed(1)) }))
    .filter((mark) => mark.y >= ceiling && mark.y <= floor);
  const readout = g
    .selectAll('g.ro-readout')
    .data(shown)
    .join('g')
    .attr('class', 'ro-readout')
    .attr('data-status', (mark) => mark.status ?? '')
    .attr('data-y', (mark) => mark.y)
    .attr('transform', (mark) => `translate(${right},${mark.y})`);
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
    .attr('letter-spacing', CHART_TYPE.subtitleTracking)
    .attr('fill', palette.label)
    .attr('fill-opacity', (mark) => (mark.status === 'pending' ? 0.55 : 1))
    .style('font-family', MONO_FONT)
    .style('paint-order', 'stroke')
    .style('stroke', `var(--ui9000-color-surface, ${palette.halo})`)
    .style('stroke-width', '3px')
    .text((mark) => mark.text);
  return shown;
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
    const dropped = isDropped(target);
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
      isDropped(node) ? palette.pruned : (colorOf(node.modelId) ?? palette.neutralNode),
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
  /** Class prefix of the marks: the highlight's, or the hover preview's. */
  prefix = 'ro-active',
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
  gradient.append('stop').attr('offset', '62%').attr('stop-color', pathMid(palette, endColor));
  gradient.append('stop').attr('offset', '100%').attr('stop-color', endColor);

  const d = polyline(points);
  g.append('path')
    .attr('class', `${prefix}-glow`)
    .attr('d', d)
    .attr('fill', 'none')
    .attr('stroke', endColor)
    .attr('stroke-width', 6)
    .attr('stroke-opacity', 0.35)
    .attr('stroke-linejoin', 'round')
    .attr('filter', `url(#${glowId})`);
  g.append('path')
    .attr('class', `${prefix}-line`)
    .attr('d', d)
    .attr('fill', 'none')
    .attr('stroke', `url(#${gradientId})`)
    .attr('stroke-width', 2.2)
    .attr('stroke-linejoin', 'round')
    .attr('stroke-linecap', 'round');
  g.selectAll(`circle.${prefix}-node`)
    .data(points.slice(1, -1))
    .join('circle')
    .attr('class', `${prefix}-node`)
    .attr('cx', (p) => p.x)
    .attr('cy', (p) => p.y)
    .attr('r', 1.7)
    .attr('fill', palette.pathStart);
  g.append('circle')
    .attr('class', `${prefix}-end`)
    .attr('cx', last.x)
    .attr('cy', last.y)
    .attr('r', 3.4)
    .attr('fill', endColor);
  g.append('circle')
    .attr('class', `${prefix}-end-ring`)
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
): { nodeId: string; x: number; y: number; w: number; h: number }[] {
  const placed: { nodeId: string; x: number; y: number; w: number; h: number }[] = [];
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
    placed.push({ nodeId: note.nodeId, x, y, w, h });
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
        .attr('letter-spacing', CHART_TYPE.subtitleTracking)
        .attr('font-weight', i === 0 ? 600 : 400)
        .attr('fill', i === 0 ? palette.noteText : i === 1 ? accent : palette.noteMuted)
        .style('font-family', MONO_FONT)
        .text(row);
    });
  }
  return placed;
}
