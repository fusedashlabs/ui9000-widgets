import { sankey, type SankeyLink, type SankeyNode } from 'd3-sankey';
import { select } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import { FD } from '../../../utils/fusedash-visual.js';
import {
  connectedLinkKeys,
  formatAxisTick,
  formatFlowValue,
  formatShare,
  neutralColor,
  severityColor,
  wrapFlowLabel,
  type FlowLinkDatum,
  type FlowNodeDatum,
  type FlowSankeyModel,
} from '../lib/index.js';

type NodeExtra = FlowNodeDatum;
type LinkExtra = { value: number; severity: FlowLinkDatum['severity'] };
type LaidNode = SankeyNode<NodeExtra, LinkExtra>;
type LaidLink = SankeyLink<NodeExtra, LinkExtra>;

/** Smallest frame that still fits the gutter, two columns and a ribbon. */
const MIN_WIDTH = 220;
const MIN_HEIGHT = 140;
/** Right gutter kept free for the last column's label blocks. */
const LABEL_GUTTER = 108;
/** Below this band height a node's label block is dropped (Figma rule 12). */
const MIN_LABEL_HEIGHT = 13;
/** Points used to trace a bowed edge. */
const BOW_SAMPLES = 12;
/** Ribbons thinner than this would vanish once drawn as an area. */
const MIN_RIBBON_WIDTH = 1;
/** Left-gutter tick stub. */
const AXIS_STUB = 26;
/** Gap between the stub and its label, and the pad outside the label. */
const AXIS_GAP = 4;
const AXIS_PAD = 2;
/** Rough advance width per character at the axis label size. */
const AXIS_CHAR_RATIO = 0.62;
/** Label block metrics: text leading, the trailing value row, the icon gap. */
const LABEL_LINE = 13;
const LABEL_VALUE_ROW = 14;
const LABEL_ICON_GAP = 5;
/** Smallest gap left between two label blocks in the same column. */
const LABEL_GAP = 6;
/** Headroom above the plot a label may use before it reaches the stage header. */
const LABEL_TOP_SLACK = 10;
const LABEL_BOTTOM_PAD = 4;
/** Share of the plot height the inter-node gaps may consume in total. */
const PADDING_BUDGET = 0.45;
const MIN_NODE_PADDING = 2;

export interface FlowLinkHover {
  sourceLabel: string;
  targetLabel: string;
  value: number;
  event: MouseEvent;
}

export interface FlowNodeHover {
  label: string;
  stageLabel: string;
  value: number;
  share: number;
  event: MouseEvent;
}

export interface RenderFlowSankeyOptions {
  model: FlowSankeyModel;
  width: number;
  height: number;
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  showGrid?: boolean;
  /** Node id pre-selected by the host, mirroring the Figma highlight state. */
  selectedId?: string | null;
  onLinkHover?: (payload: FlowLinkHover) => void;
  onLinkLeave?: () => void;
  onNodeHover?: (payload: FlowNodeHover) => void;
  onNodeLeave?: () => void;
  onSelect?: (nodeId: string | null) => void;
}

interface LinkView {
  key: string;
  path: string;
  color: string;
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  value: number;
}

interface NodeView {
  id: string;
  datum: FlowNodeDatum;
  path: string;
  /** Label anchor, already bowed. */
  labelX: number;
  centerY: number;
  bandHeight: number;
  color: string;
  showLabel: boolean;
}

function linkKey(link: FlowLinkDatum, index: number): string {
  return `${link.source}>${link.target}#${index}`;
}

/**
 * Stage columns bow left at mid-height. Rails, node bars and ribbon endpoints
 * all run through this, so the marks stay joined wherever they meet.
 */
function makeBow(top: number, height: number, bow: number) {
  return (y: number): number => {
    if (height <= 0) return 0;
    const t = Math.min(1, Math.max(0, (y - top) / height));
    return -bow * Math.sin(Math.PI * t);
  };
}

/**
 * Points down a bowed vertical edge at un-bowed x, from yFrom to yTo. Rails,
 * node bars and both ends of every ribbon are cut from this one sampler, so a
 * ribbon meets its rail at every y rather than only on its centre line.
 */
function bowedEdge(
  x: number,
  yFrom: number,
  yTo: number,
  bowAt: (y: number) => number,
): string[] {
  const span = yTo - yFrom;
  const steps = Math.max(
    2,
    Math.min(BOW_SAMPLES, Math.ceil(Math.abs(span) / 8) + 1),
  );
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const y = yFrom + (span * i) / steps;
    points.push(`${(x + bowAt(y)).toFixed(2)},${y.toFixed(2)}`);
  }
  return points;
}

/** Closed path for a vertical band whose two edges follow the bow. */
function bowedBandPath(
  x0: number,
  x1: number,
  yTop: number,
  yBottom: number,
  bowAt: (y: number) => number,
): string {
  const left = bowedEdge(x0, yTop, yBottom, bowAt);
  const right = bowedEdge(x1, yBottom, yTop, bowAt);
  return `M${left.join('L')}L${right.join('L')}Z`;
}

/**
 * A ribbon as a filled area rather than a thick stroke: the two long edges are
 * the usual sankey S-curves, but each end is cut along the bowed rail edge, so
 * the ribbon stays joined to the node across its whole thickness.
 */
function ribbonAreaPath(
  sourceX: number,
  targetX: number,
  sourceTop: number,
  targetTop: number,
  width: number,
  bowAt: (y: number) => number,
): string {
  const sourceBottom = sourceTop + width;
  const targetBottom = targetTop + width;

  const curve = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): string => {
    const mid = ((fromX + toX) / 2).toFixed(2);
    return `C${mid},${fromY.toFixed(2)} ${mid},${toY.toFixed(2)} ${toX.toFixed(
      2,
    )},${toY.toFixed(2)}`;
  };

  const sTopX = sourceX + bowAt(sourceTop);
  const tTopX = targetX + bowAt(targetTop);
  const tBottomX = targetX + bowAt(targetBottom);
  const sBottomX = sourceX + bowAt(sourceBottom);

  return [
    `M${sTopX.toFixed(2)},${sourceTop.toFixed(2)}`,
    curve(sTopX, sourceTop, tTopX, targetTop),
    // Down the target rail edge, then back along the bottom to the source.
    `L${bowedEdge(targetX, targetTop, targetBottom, bowAt).join('L')}`,
    curve(tBottomX, targetBottom, sBottomX, sourceBottom),
    // Up the source rail edge to where we started.
    `L${bowedEdge(sourceX, sourceBottom, sourceTop, bowAt).join('L')}`,
    'Z',
  ].join('');
}

interface LabelView {
  node: NodeView;
  lines: string[];
  height: number;
  top: number;
}

/**
 * Place each label on its node's centre, then de-collide the column: push the
 * blocks down in order, pull them back up if the column overran, and clamp to
 * the canvas so the last one is never cut off the bottom. A column too crowded
 * to hold every block drops its smallest values first, which is the Figma rule
 * that only important nodes carry labels.
 */
function layoutLabels(
  nodes: NodeView[],
  bounds: { top: number; bottom: number },
): LabelView[] {
  const byStage = new Map<number, LabelView[]>();

  for (const node of nodes) {
    if (!node.showLabel) continue;
    const lines = wrapFlowLabel(node.datum.label);
    const icon = node.datum.icon ? FD.flowSankeyIconSize + LABEL_ICON_GAP : 0;
    const height = icon + lines.length * LABEL_LINE + LABEL_VALUE_ROW;
    const view: LabelView = {
      node,
      lines,
      height,
      top: node.centerY - height / 2,
    };
    const group = byStage.get(node.datum.stage);
    if (group) group.push(view);
    else byStage.set(node.datum.stage, [view]);
  }

  const placed: LabelView[] = [];
  const available = bounds.bottom - bounds.top;

  for (const group of byStage.values()) {
    group.sort((a, b) => a.top - b.top);

    let needed =
      group.reduce((sum, v) => sum + v.height, 0) + LABEL_GAP * (group.length - 1);
    while (needed > available && group.length > 1) {
      const weakest = group.reduce((min, v) =>
        v.node.datum.value < min.node.datum.value ? v : min,
      );
      needed -= weakest.height + LABEL_GAP;
      group.splice(group.indexOf(weakest), 1);
    }

    let cursor = bounds.top;
    for (const view of group) {
      view.top = Math.max(view.top, cursor);
      cursor = view.top + view.height + LABEL_GAP;
    }

    let limit = bounds.bottom;
    for (let i = group.length - 1; i >= 0; i -= 1) {
      group[i].top = Math.min(group[i].top, limit - group[i].height);
      limit = group[i].top - LABEL_GAP;
    }

    placed.push(...group);
  }

  return placed;
}

/**
 * Multi-stage flow Sankey (Figma 34:21521) — bowed stage rails, severity
 * ribbons, a percentage gutter and per-node label blocks.
 */
export function renderFlowSankeyChart(
  container: HTMLElement,
  options: RenderFlowSankeyOptions,
): void {
  const {
    model,
    width,
    height,
    theme,
    themeMode = 'light',
    showGrid = true,
    selectedId = null,
    onLinkHover,
    onLinkLeave,
    onNodeHover,
    onNodeLeave,
    onSelect,
  } = options;

  container.replaceChildren();
  if (!model.links.length || width < MIN_WIDTH || height < MIN_HEIGHT) return;

  const margin = FD.flowSankeyMargin;
  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;
  const plotHeight = plotBottom - plotTop;

  const ticks = Array.from(
    { length: FD.flowSankeyAxisTicks },
    (_, i) => i / (FD.flowSankeyAxisTicks - 1),
  );
  const tickLabels = ticks.map(formatAxisTick);

  // Size the gutter from the widest tick ("100%"), not a fixed margin: anchored
  // at its right edge, a label wider than the margin runs off the left of the
  // canvas and gets clipped.
  const widestTick = Math.max(...tickLabels.map((label) => label.length));
  const axisGutter = showGrid
    ? Math.ceil(widestTick * FD.flowSankeyAxisLabelSize * AXIS_CHAR_RATIO) +
      AXIS_STUB +
      AXIS_GAP +
      AXIS_PAD
    : 0;

  const plotLeft = Math.max(margin.left, axisGutter);
  const plotRight = width - margin.right - LABEL_GUTTER;
  if (plotHeight <= 0 || plotRight - plotLeft <= 0) return;

  const neutral = neutralColor(themeMode);
  const bowAt = makeBow(plotTop, plotHeight, FD.flowSankeyBow);

  // The busiest column sets the gap budget: at chat heights the full padding
  // would eat the whole frame and leave every band too thin to read.
  const perColumn = new Map<number, number>();
  for (const node of model.nodes) {
    perColumn.set(node.stage, (perColumn.get(node.stage) ?? 0) + 1);
  }
  const busiest = Math.max(...perColumn.values(), 1);
  const nodePadding =
    busiest > 1
      ? Math.max(
          MIN_NODE_PADDING,
          Math.min(
            FD.flowSankeyNodePadding,
            (plotHeight * PADDING_BUDGET) / (busiest - 1),
          ),
        )
      : FD.flowSankeyNodePadding;

  const graph = sankey<NodeExtra, LinkExtra>()
    .nodeId((d) => d.id)
    .nodeWidth(FD.flowSankeyNodeWidth)
    .nodePadding(nodePadding)
    .nodeSort(null)
    // Explicit columns: `lib/` already resolved every node's stage.
    .nodeAlign((node) => (node as LaidNode).stage)
    .extent([
      [plotLeft, plotTop],
      [plotRight, plotBottom],
    ])({
    nodes: model.nodes.map((n) => ({ ...n })),
    links: model.links.map((l) => ({ ...l })),
  });

  const linkViews: LinkView[] = [];
  graph.links.forEach((entry, index) => {
    const link = entry as LaidLink;
    const source = link.source as LaidNode;
    const target = link.target as LaidNode;
    // d3-sankey reports the centre of each end; the area wants the top edge.
    const width = Math.max(link.width ?? 0, MIN_RIBBON_WIDTH);
    const path = ribbonAreaPath(
      source.x1 ?? 0,
      target.x0 ?? 0,
      (link.y0 ?? 0) - width / 2,
      (link.y1 ?? 0) - width / 2,
      width,
      bowAt,
    );

    linkViews.push({
      key: `${source.id}>${target.id}#${index}`,
      path,
      color: severityColor(link.severity ?? null, neutral),
      sourceId: source.id,
      targetId: target.id,
      sourceLabel: source.label,
      targetLabel: target.label,
      value: link.value,
    });
  });

  if (!linkViews.length) return;

  const stageCount = model.stages.length;
  const columnX = new Map<number, { x0: number; x1: number }>();
  const nodeViews: NodeView[] = graph.nodes.map((entry) => {
    const node = entry as LaidNode;
    const x0 = node.x0 ?? 0;
    const x1 = node.x1 ?? 0;
    const y0 = node.y0 ?? 0;
    const y1 = node.y1 ?? 0;
    if (!columnX.has(node.stage)) columnX.set(node.stage, { x0, x1 });

    const bandHeight = y1 - y0;
    const centerY = (y0 + y1) / 2;
    return {
      id: node.id,
      datum: node,
      path: bowedBandPath(x0, x1, y0, y1, bowAt),
      labelX: x1 + bowAt(centerY) + FD.flowSankeyLabelGap,
      centerY,
      bandHeight,
      color: severityColor(node.severity, neutral),
      showLabel: bandHeight >= MIN_LABEL_HEIGHT,
    };
  });

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('role', 'img')
    .attr('aria-label', 'Flow Sankey chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  // One gradient per severity pair — at most 16, shared by every ribbon.
  const defs = svg.append('defs');
  const gradientIds = new Map<string, string>();
  const gradientFor = (from: string, to: string): string => {
    const key = `${from}|${to}`;
    const known = gradientIds.get(key);
    if (known) return known;
    const id = `fs-grad-${gradientIds.size}`;
    const gradient = defs
      .append('linearGradient')
      .attr('id', id)
      .attr('x1', '0')
      .attr('x2', '1')
      .attr('y1', '0')
      .attr('y2', '0');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', from);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', to);
    gradientIds.set(key, id);
    return id;
  };

  const colorById = new Map(nodeViews.map((n) => [n.id, n.color]));
  for (const view of linkViews) {
    const from = colorById.get(view.sourceId) ?? neutral;
    const to = view.color !== neutral ? view.color : colorById.get(view.targetId) ?? neutral;
    view.color = from === to ? from : `url(#${gradientFor(from, to)})`;
  }

  // ── Percentage gutter ────────────────────────────────────────────────────
  if (showGrid) {
    const axis = svg.append('g').attr('class', 'flow-axis');

    axis
      .selectAll('line')
      .data(ticks)
      .join('line')
      .attr('x1', plotLeft - AXIS_STUB)
      .attr('x2', plotLeft - AXIS_GAP - 2)
      .attr('y1', (t) => plotBottom - t * plotHeight)
      .attr('y2', (t) => plotBottom - t * plotHeight)
      .attr('stroke', FD.gridStroke)
      .attr('stroke-dasharray', FD.gridDash)
      .attr('opacity', 0.5);

    axis
      .selectAll('text')
      .data(ticks)
      .join('text')
      .attr('x', plotLeft - AXIS_STUB - AXIS_GAP)
      .attr('y', (t) => plotBottom - t * plotHeight)
      .attr('dy', '0.32em')
      .attr('text-anchor', 'end')
      .attr('font-size', FD.flowSankeyAxisLabelSize)
      .attr('fill', theme.textMuted)
      .text((_t, i) => tickLabels[i]);
  }

  // ── Stage headers ────────────────────────────────────────────────────────
  if (model.stages.some(Boolean)) {
    svg
      .append('g')
      .attr('class', 'flow-stages')
      .selectAll('text')
      .data(model.stages.map((label, stage) => ({ label, stage })))
      .join('text')
      .attr('x', (d) => {
        const column = columnX.get(d.stage);
        const center = column ? (column.x0 + column.x1) / 2 : plotLeft;
        return center + bowAt(plotTop);
      })
      .attr('y', plotTop - 14)
      .attr('text-anchor', (d) => (d.stage === stageCount - 1 ? 'end' : 'start'))
      .attr('font-size', FD.flowSankeyStageLabelSize)
      .attr('letter-spacing', FD.flowSankeyStageLabelTracking)
      .attr('fill', FD.flowSankeyStageLabelFill)
      .text((d) => d.label.toUpperCase());
  }

  // ── Rails ────────────────────────────────────────────────────────────────
  svg
    .append('g')
    .attr('class', 'flow-rails')
    .selectAll('path')
    .data([...columnX.entries()].map(([stage, column]) => ({ stage, column })))
    .join('path')
    .attr('d', (d) =>
      bowedBandPath(d.column.x0, d.column.x1, plotTop, plotBottom, bowAt),
    )
    .attr('fill', neutral)
    .attr('opacity', 0.28);

  // ── Ribbons ──────────────────────────────────────────────────────────────
  const linkPaths = svg
    .append('g')
    .attr('class', 'flow-links')
    .selectAll<SVGPathElement, LinkView>('path')
    .data(linkViews)
    .join('path')
    .attr('d', (d) => d.path)
    .attr('fill', (d) => d.color)
    .attr('stroke', 'none')
    .style('cursor', 'pointer')
    // CSS transition only — no d3-transition on the hover hot path.
    .style('transition', 'opacity 0.2s');

  // ── Node bars ────────────────────────────────────────────────────────────
  const nodeBars = svg
    .append('g')
    .attr('class', 'flow-nodes')
    .selectAll<SVGPathElement, NodeView>('path')
    .data(nodeViews)
    .join('path')
    .attr('d', (d) => d.path)
    .attr('fill', (d) => d.color)
    .attr('stroke', 'none')
    .style('cursor', 'pointer');

  // ── Label blocks ─────────────────────────────────────────────────────────
  const labelViews = layoutLabels(nodeViews, {
    top: plotTop - LABEL_TOP_SLACK,
    bottom: height - LABEL_BOTTOM_PAD,
  });

  const labelGroups = svg
    .append('g')
    .attr('class', 'flow-labels')
    .selectAll<SVGGElement, LabelView>('g')
    .data(labelViews)
    .join('g')
    .attr('class', 'flow-label')
    // The bow shifts each label's x, so the stage is the only reliable way to
    // tell which column a block belongs to.
    .attr('data-stage', (d) => d.node.datum.stage)
    .style('cursor', 'pointer');

  labelGroups.each(function (view) {
    const d = view.node;
    const group = select(this);
    let cursor = view.top;

    if (d.datum.icon) {
      group
        .append('rect')
        .attr('x', d.labelX)
        .attr('y', cursor)
        .attr('width', FD.flowSankeyIconSize)
        .attr('height', FD.flowSankeyIconSize)
        .attr('rx', FD.flowSankeyIconRadius)
        .attr('fill', d.color)
        .attr('opacity', 0.9);
      group
        .append('text')
        .attr('x', d.labelX + FD.flowSankeyIconSize / 2)
        .attr('y', cursor + FD.flowSankeyIconSize / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', FD.flowSankeyIconSize * 0.55)
        .text(d.datum.icon);
      cursor += FD.flowSankeyIconSize + LABEL_ICON_GAP;
    }

    view.lines.forEach((line, i) => {
      group
        .append('text')
        .attr('x', d.labelX)
        .attr('y', cursor + i * LABEL_LINE)
        .attr('dy', '0.75em')
        .attr('font-size', FD.flowSankeyLabelSize)
        .attr('font-weight', 500)
        .attr('fill', theme.text)
        .text(line);
    });

    const valueText = group
      .append('text')
      .attr('x', d.labelX)
      .attr('y', cursor + view.lines.length * LABEL_LINE)
      .attr('dy', '0.85em')
      .attr('font-size', FD.flowSankeyValueSize);
    valueText
      .append('tspan')
      .attr('font-weight', 700)
      .attr('fill', theme.text)
      .text(formatFlowValue(d.datum.value));
    const share = formatShare(d.datum.share);
    if (share) {
      valueText
        .append('tspan')
        .attr('dx', 4)
        .attr('font-size', FD.flowSankeyShareSize)
        .attr('fill', theme.textMuted)
        .text(share);
    }
  });

  // ── Interaction ──────────────────────────────────────────────────────────
  let selected = selectedId;
  let hoveredKey: string | null = null;

  /** Ribbons rest translucent and go opaque once they join the focused path. */
  const restingOpacity = FD.flowSankeyLinkAlphaPct / 100;
  const nodeKeys = new Map<string, string[]>();
  for (const view of linkViews) {
    for (const id of [view.sourceId, view.targetId]) {
      const keys = nodeKeys.get(id);
      if (keys) keys.push(view.key);
      else nodeKeys.set(id, [view.key]);
    }
  }

  const touchesActive = (node: NodeView, active: Set<string>): boolean =>
    (nodeKeys.get(node.id) ?? []).some((key) => active.has(key));

  const activeKeys = (): Set<string> | null => {
    if (hoveredKey) return new Set([hoveredKey]);
    if (!selected) return null;
    return connectedLinkKeys(model.links, linkKey, selected);
  };

  const apply = (): void => {
    const active = activeKeys();
    linkPaths.attr('opacity', (d) => {
      if (!active) return restingOpacity;
      return active.has(d.key) ? 1 : FD.flowSankeyDimOpacity;
    });
    const lit = (d: NodeView): number =>
      !active || d.id === selected || touchesActive(d, active) ? 1 : 0.45;
    nodeBars
      .attr('stroke', (d) => (d.id === selected ? theme.text : 'none'))
      .attr('stroke-width', (d) =>
        d.id === selected ? FD.flowSankeySelectedWidth : 0,
      )
      .attr('stroke-dasharray', (d) =>
        d.id === selected ? FD.flowSankeySelectedDash : null,
      )
      .attr('opacity', lit);
    labelGroups.attr('opacity', (d) => lit(d.node));
  };

  linkPaths
    .on('mouseenter', (event: MouseEvent, d) => {
      hoveredKey = d.key;
      apply();
      onLinkHover?.({
        sourceLabel: d.sourceLabel,
        targetLabel: d.targetLabel,
        value: d.value,
        event,
      });
    })
    .on('mousemove', (event: MouseEvent, d) => {
      onLinkHover?.({
        sourceLabel: d.sourceLabel,
        targetLabel: d.targetLabel,
        value: d.value,
        event,
      });
    })
    .on('mouseleave', () => {
      hoveredKey = null;
      apply();
      onLinkLeave?.();
    });

  const selectNode = (id: string): void => {
    selected = selected === id ? null : id;
    apply();
    onSelect?.(selected);
  };

  const hoverNode = (event: MouseEvent, d: NodeView): void => {
    onNodeHover?.({
      label: d.datum.label,
      stageLabel: model.stages[d.datum.stage] ?? '',
      value: d.datum.value,
      share: d.datum.share,
      event,
    });
  };

  const onNodeClick = (_event: MouseEvent, d: NodeView): void => selectNode(d.id);
  const onNodeOut = (): void => onNodeLeave?.();

  nodeBars
    .on('click', onNodeClick)
    .on('mouseenter', hoverNode)
    .on('mousemove', hoverNode)
    .on('mouseleave', onNodeOut);

  labelGroups
    .on('click', (_event: MouseEvent, d) => selectNode(d.node.id))
    .on('mouseenter', (event: MouseEvent, d) => hoverNode(event, d.node))
    .on('mousemove', (event: MouseEvent, d) => hoverNode(event, d.node))
    .on('mouseleave', onNodeOut);

  apply();
}
