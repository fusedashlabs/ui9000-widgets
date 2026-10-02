import { sankey, type SankeyLink, type SankeyNode } from 'd3-sankey';
import { select } from 'd3-selection';
import { linkHorizontal } from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import { FD, fdColors, hexWithAlpha } from '../../../utils/fusedash-visual.js';
import {
  NODE_LABEL_MAX,
  pickRangeColor,
  truncateNodeLabel,
  type SankeyColorRange,
  type SankeyModel,
} from '../lib/index.js';

type NodeExtra = { name: string; label: string };
type LinkExtra = { value: number };
type LaidNode = SankeyNode<NodeExtra, LinkExtra>;
type LaidLink = SankeyLink<NodeExtra, LinkExtra>;

/** Smallest frame that still fits two node columns plus a ribbon. */
const MIN_WIDTH = 120;
const MIN_HEIGHT = 60;
const MIN_NODE_WIDTH = 20;

export interface SankeyLinkHover {
  sourceLabel: string;
  targetLabel: string;
  value: number;
  event: MouseEvent;
}

export interface SankeyLabelHover {
  label: string;
  event: MouseEvent;
}

export interface RenderSankeyOptions {
  model: SankeyModel;
  /** Value buckets → palette colors, built once by the element. */
  colorRanges: SankeyColorRange[];
  width: number;
  height: number;
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  onLinkHover?: (payload: SankeyLinkHover) => void;
  onLinkLeave?: () => void;
  onLabelHover?: (payload: SankeyLabelHover) => void;
  onLabelLeave?: () => void;
}

interface LinkView {
  key: string;
  path: string;
  color: string;
  strokeWidth: number;
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  value: number;
}

interface NodeView {
  id: string;
  label: string;
  x0: number;
  x1: number;
  y0: number;
  atMaxDepth: boolean;
  /** Keys of every ribbon touching this node. */
  linkKeys: string[];
}

function nodeIsActive(node: NodeView, active: Set<string> | null): boolean {
  if (!active || !node.linkKeys.length) return false;
  return node.linkKeys.every((key) => active.has(key));
}

/**
 * FuseDash Sankey plot — d3-sankey layout, ribbons coloured by value bucket.
 * Two node columns drawn as a hairline rule plus a label; no node rectangles.
 */
export function renderSankeyChart(
  container: HTMLElement,
  options: RenderSankeyOptions,
): void {
  const {
    model,
    colorRanges,
    width,
    height,
    theme,
    themeMode = 'light',
    onLinkHover,
    onLinkLeave,
    onLabelHover,
    onLabelLeave,
  } = options;

  container.replaceChildren();
  if (!model.links.length || width < MIN_WIDTH || height < MIN_HEIGHT) return;

  const pad = FD.sankeyPadding;
  const roomy = width > 400 && height > 270;
  // FuseDash picks 70 / 65; clamp so narrow chat frames still fit two columns.
  const nodeWidth = Math.max(
    MIN_NODE_WIDTH,
    Math.min(
      roomy ? FD.sankeyNodeWidth : FD.sankeyNodeWidthSmall,
      (width - pad * 2 - 24) / 2,
    ),
  );

  const graph = sankey<NodeExtra, LinkExtra>()
    .nodeId((d) => d.name)
    .nodeWidth(nodeWidth)
    .nodePadding(FD.sankeyNodePadding)
    // `null` keeps input order — the client passes a no-op comparator.
    .nodeSort(null)
    .extent([
      [pad, pad],
      [width - pad, height - pad * 2],
    ])({
    nodes: model.nodes.map((n) => ({ ...n })),
    links: model.links.map((l) => ({ ...l })),
  });

  const ribbon = linkHorizontal<
    { source: [number, number]; target: [number, number] },
    [number, number]
  >();
  const fallbackColor = model.colors[model.colors.length - 1] ?? FD.series[0];
  const keysByNode = new Map<string, string[]>();
  const linkViews: LinkView[] = [];

  graph.links.forEach((entry, index) => {
    const link = entry as LaidLink;
    const source = link.source as LaidNode;
    const target = link.target as LaidNode;
    const key = `${source.name.trim()}-${target.name.trim()}-${index}`;
    const path = ribbon({
      source: [source.x1 ?? 0, link.y0 ?? 0],
      target: [target.x0 ?? 0, link.y1 ?? 0],
    });
    if (!path) return;

    linkViews.push({
      key,
      path,
      color: pickRangeColor(colorRanges, link.value, fallbackColor),
      // FuseDash insets the ribbon by 3px; keep it drawable when it is thinner.
      strokeWidth: Math.max((link.width ?? 0) - FD.sankeyLinkInset, 1),
      sourceId: source.name,
      targetId: target.name,
      sourceLabel: source.label,
      targetLabel: target.label,
      value: link.value,
    });

    for (const id of [source.name, target.name]) {
      const keys = keysByNode.get(id);
      if (keys) keys.push(key);
      else keysByNode.set(id, [key]);
    }
  });

  if (!linkViews.length) return;

  const maxDepth = graph.nodes.reduce((max, n) => Math.max(max, n.depth ?? 0), 0);
  const nodeViews: NodeView[] = graph.nodes.map((node) => ({
    id: node.name,
    label: node.label,
    x0: node.x0 ?? 0,
    x1: node.x1 ?? 0,
    y0: node.y0 ?? 0,
    atMaxDepth: (node.depth ?? 0) === maxDepth,
    linkKeys: keysByNode.get(node.name) ?? [],
  }));

  // Label metrics copied from the client (font grows with the frame, capped at 10).
  const step = Math.floor(height / 35) + 1;
  const fontSize = Math.min(10, step + height / 30);
  const labelY = step - (height > 270 ? 0 : 0.5);
  // visx verticalAnchor: "end" sits on the baseline, "middle" drops half a cap.
  const labelDy = roomy ? 0 : 0.355;
  const showRules = Math.floor(height / 15) > 4;

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('role', 'img')
    .attr('aria-label', 'Sankey chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const linkPaths = svg
    .append('g')
    .attr('class', 'links')
    .selectAll<SVGPathElement, LinkView>('path')
    .data(linkViews)
    .join('path')
    .attr('d', (d) => d.path)
    .attr('fill', 'none')
    .attr('stroke-width', (d) => d.strokeWidth)
    // CSS transition only — no d3-transition on the hover hot path.
    .style('transition', 'opacity 0.3s, stroke 0.3s');

  const labels = svg
    .append('g')
    .attr('class', 'node-labels')
    .selectAll<SVGTextElement, NodeView>('text')
    .data(nodeViews)
    .join('text')
    .attr('x', (d) => (d.atMaxDepth ? d.x1 : d.x0))
    .attr('y', (d) => d.y0 + labelY)
    .attr('dy', `${labelDy}em`)
    .attr('text-anchor', (d) => (d.atMaxDepth ? 'end' : 'start'))
    .attr('font-size', fontSize)
    .attr('fill', theme.text)
    .style('cursor', 'pointer')
    .text((d) => truncateNodeLabel(d.label));

  const rules = showRules
    ? svg
        .append('g')
        .attr('class', 'node-rules')
        .selectAll<SVGLineElement, NodeView>('line')
        .data(nodeViews)
        .join('line')
        .attr('x1', (d) => d.x0)
        .attr('y1', (d) => d.y0)
        .attr('x2', (d) => d.x1)
        .attr('y2', (d) => d.y0)
    : null;

  let selectedId: string | null = null;
  let activeKeys: Set<string> | null = null;
  let hoveredKey: string | null = null;

  const apply = (): void => {
    const active = activeKeys;
    linkPaths
      .attr('opacity', (d) => {
        if (hoveredKey) return d.key === hoveredKey ? 1 : FD.sankeyDimOpacity;
        return active && !active.has(d.key) ? FD.sankeyDimOpacity : 1;
      })
      .attr('stroke', (d) =>
        active?.has(d.key) || d.key === hoveredKey
          ? d.color
          : hexWithAlpha(d.color, FD.sankeyLinkAlphaPct),
      );
    labels.attr('font-weight', (d) => (nodeIsActive(d, active) ? 600 : 400));
    rules?.attr('stroke', (d) =>
      nodeIsActive(d, active) ? fdColors(themeMode).sankeyNodeRuleActive : fdColors(themeMode).sankeyNodeRule,
    );
  };

  linkPaths
    .style('cursor', 'pointer')
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

  labels
    .on('click', (_event: MouseEvent, d) => {
      selectedId = selectedId === d.id ? null : d.id;
      activeKeys = selectedId
        ? new Set(
            linkViews
              .filter((v) => v.sourceId === selectedId || v.targetId === selectedId)
              .map((v) => v.key),
          )
        : null;
      apply();
    })
    .on('mouseenter', (event: MouseEvent, d) => {
      if (d.label.length > NODE_LABEL_MAX) onLabelHover?.({ label: d.label, event });
    })
    .on('mouseleave', () => onLabelLeave?.());

  apply();
}
