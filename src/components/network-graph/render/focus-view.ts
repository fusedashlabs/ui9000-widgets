import { select, type Selection } from 'd3-selection';

import {
  measureTextWidth,
  wrapLabel,
  type MeasureText,
} from '../../matrix-chart/lib/heatmap-layout.js';
import { GRAPH_ACCENT, GRAPH_FOCUS_COLORS, type NetworkLink, type NetworkNode } from '../lib/index.js';

// Sizes in px, from the design.
const MAX_ITEMS = 18;
const ARC_SPAN_DEG = 76;
const CENTER_RADIUS = 30;
const CENTER_RING = 5;
const HALO_RADIUS = 95;
const ITEM_DOT = 5;
const LABEL_GAP = 10;
const LABEL_FONT = 13;
const LABEL_WIDTH = 150;
const CENTER_FONT = 14;
const CENTER_LINE = 17;
const SIDE_ROOM = 180;
const TICK = 11;
const ANCHOR_DOT = 2.5;
/** The curve of a linked node ends left of its ring. */
const ANCHOR_OFFSET = ITEM_DOT + 3;
const HIT_HEIGHT = 22;

interface Item {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
}

export interface RenderFocusViewOptions {
  node: NetworkNode;
  nodes: NetworkNode[];
  links: NetworkLink[];
  width: number;
  height: number;
  themeMode?: 'light' | 'dark';
  /** Linked node shown in the card next to the view. */
  selectedId: string | null;
  measure?: MeasureText;
  onSelect: (id: string) => void;
  /** Opens the focus view of another node. */
  onOpen: (id: string) => void;
  onClose: () => void;
  /** The whole text of an item whose label is cut. */
  onLabelHover?: (text: string, event: MouseEvent) => void;
  onLabelLeave?: () => void;
}

export function arcAngles(count: number): number[] {
  return count === 1
    ? [0]
    : Array.from(
        { length: count },
        (_, index) => -ARC_SPAN_DEG + (2 * ARC_SPAN_DEG * index) / (count - 1),
      );
}

function curve(x0: number, y0: number, x1: number, y1: number): string {
  const dx = x1 - x0;
  return `M${x0} ${y0} C${x0 + dx * 0.45} ${y0} ${x1 - dx * 0.35} ${y1} ${x1} ${y1}`;
}

/** Cross tick where the ring meets an axis. */
function tick(x: number, y: number, horizontal: boolean): string {
  return horizontal
    ? `M${x - TICK} ${y}H${x + TICK}M${x} ${y - TICK / 2}V${y + TICK / 2}`
    : `M${x} ${y - TICK}V${y + TICK}M${x - TICK / 2} ${y}H${x + TICK / 2}`;
}

/**
 * Focus view of the design: the node in the middle, its events on a left arc
 * and its linked nodes on a right arc, each joined to it by a curve.
 */
export function renderFocusView(container: HTMLElement, options: RenderFocusViewOptions): void {
  const { node, nodes, links, width, height, selectedId, onSelect, onOpen, onClose } = options;
  const { themeMode = 'light', onLabelHover, onLabelLeave } = options;
  const measure = options.measure ?? measureTextWidth;
  const colors = GRAPH_FOCUS_COLORS[themeMode];

  container.replaceChildren();
  if (!width || !height) return;

  const shownLabel = (label: string): string =>
    wrapLabel(label, LABEL_WIDTH, LABEL_FONT, 1, measure)[0] ?? label;

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(120, Math.min(height * 0.36, width / 2 - SIDE_ROOM));

  // Linked nodes, strongest link first, then top to bottom in name order.
  const byId = new Map(nodes.map((item) => [item.id, item]));
  const weights = new Map<string, number>();
  for (const { source, target, value } of links) {
    const other = source === node.id ? target : target === node.id ? source : null;
    if (other && other !== node.id && byId.has(other)) {
      weights.set(other, (weights.get(other) ?? 0) + (Number(value) || 0));
    }
  }
  const neighbours = Array.from(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_ITEMS)
    .map(([id]) => byId.get(id) as NetworkNode)
    .sort((a, b) => a.label.localeCompare(b.label));

  const place = (angle: number, side: 1 | -1): { x: number; y: number } => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + side * radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };
  const right: Item[] = neighbours.map((item, index) => ({
    id: item.id,
    label: item.label,
    color: item.color ?? GRAPH_ACCENT,
    ...place(arcAngles(neighbours.length)[index], 1),
  }));
  const events = (node.events ?? []).slice(0, MAX_ITEMS);
  const left: Item[] = events.map((label, index) => ({
    id: `event-${index}`,
    label,
    color: GRAPH_ACCENT,
    ...place(arcAngles(events.length)[index], -1),
  }));

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('display', 'block')
    .style('position', 'absolute')
    .style('inset', '0');

  // Dashed ring the items sit on, with cross ticks, and the halo around the centre.
  svg
    .append('circle')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', radius)
    .attr('fill', 'none')
    .attr('stroke', colors.ring)
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '7 9');
  svg
    .append('path')
    .attr(
      'd',
      [
        tick(cx, cy - radius, false),
        tick(cx, cy + radius, false),
        tick(cx - radius, cy, true),
        tick(cx + radius, cy, true),
        `M${cx} ${cy - HALO_RADIUS - TICK / 2}V${cy - HALO_RADIUS + TICK / 2}`,
      ].join(''),
    )
    .attr('stroke', colors.ring)
    .attr('stroke-width', 1.5);
  svg
    .append('circle')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', HALO_RADIUS)
    .attr('fill', colors.halo)
    .attr('stroke', colors.haloStroke);

  const arcTitle = (text: string, x: number): void => {
    svg
      .append('text')
      .attr('class', 'focus-arc-title')
      .attr('x', x)
      .attr('y', cy - radius - 34)
      .attr('text-anchor', 'middle')
      .attr('font-size', 14)
      .attr('fill', colors.title)
      .text(`${text}:`);
  };
  if (left.length) arcTitle(node.eventsLabel ?? 'Events', cx - radius * 0.39);
  if (right.length) arcTitle(node.linksLabel ?? 'Connections', cx + radius * 0.45);

  // Links between the linked nodes: dotted curves on the right.
  const position = new Map(right.map((item) => [item.id, item]));
  for (const { source, target } of links) {
    const a = position.get(source);
    const b = position.get(target);
    if (!a || !b || source === target) continue;
    const ax = a.x - ANCHOR_OFFSET;
    const bx = b.x - ANCHOR_OFFSET;
    const bulge = 30 + Math.abs(a.y - b.y) * 0.35;
    svg
      .append('path')
      .attr('class', 'focus-between')
      .attr('d', `M${ax} ${a.y} C${ax - bulge} ${a.y} ${bx - bulge} ${b.y} ${bx} ${b.y}`)
      .attr('fill', 'none')
      .attr('stroke', colors.dotted)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2 3');
  }

  const curveById = new Map<string, Selection<SVGPathElement, unknown, null, undefined>>();
  const textById = new Map<string, Selection<SVGTextElement, unknown, null, undefined>>();
  const paintCurve = (id: string, active: boolean): void => {
    curveById
      .get(id)
      ?.attr('stroke', active ? GRAPH_ACCENT : colors.curve)
      .attr('stroke-width', active ? 2 : 1);
  };
  const paintText = (id: string, active: boolean): void => {
    textById
      .get(id)
      ?.attr('font-weight', active ? 600 : 400)
      .attr('fill', active ? colors.labelStrong : colors.label);
  };

  for (const item of [...left, ...right]) {
    const side = item.x < cx ? -1 : 1;
    const path = svg
      .append('path')
      .attr('class', 'focus-curve')
      .attr(
        'd',
        curve(cx + side * CENTER_RADIUS, cy, side === 1 ? item.x - ANCHOR_OFFSET : item.x, item.y),
      )
      .attr('fill', 'none') as unknown as Selection<SVGPathElement, unknown, null, undefined>;
    curveById.set(item.id, path);
    paintCurve(item.id, item.id === selectedId);
  }

  const drawItem = (item: Item, side: 1 | -1, isEvent: boolean): void => {
    const selected = !isEvent && selectedId === item.id;
    const group = svg.append('g').attr('class', isEvent ? 'focus-event' : 'focus-item');
    // The dot, the gap and the label all take the pointer.
    group
      .append('rect')
      .attr(
        'x',
        side === 1 ? item.x - ITEM_DOT - 4 : item.x - ITEM_DOT - LABEL_GAP - LABEL_WIDTH,
      )
      .attr('y', item.y - HIT_HEIGHT / 2)
      .attr('width', ITEM_DOT * 2 + 4 + LABEL_GAP + LABEL_WIDTH)
      .attr('height', HIT_HEIGHT)
      .attr('fill', 'transparent');
    if (isEvent) {
      group
        .append('circle')
        .attr('cx', item.x)
        .attr('cy', item.y)
        .attr('r', ITEM_DOT - 1)
        .attr('fill', GRAPH_ACCENT);
    } else {
      group
        .append('circle')
        .attr('cx', item.x)
        .attr('cy', item.y)
        .attr('r', ITEM_DOT + 3)
        .attr('fill', colors.canvas);
      group
        .append('circle')
        .attr('cx', item.x)
        .attr('cy', item.y)
        .attr('r', ITEM_DOT - 0.5)
        .attr('fill', colors.canvas)
        .attr('stroke', item.color)
        .attr('stroke-width', 2.5);
    }
    const shown = shownLabel(item.label);
    const text = group
      .append('text')
      .attr('x', item.x + side * (ITEM_DOT + LABEL_GAP))
      .attr('y', item.y)
      .attr('dominant-baseline', 'central')
      .attr('text-anchor', side === 1 ? 'start' : 'end')
      .attr('font-size', LABEL_FONT)
      .text(shown) as unknown as Selection<SVGTextElement, unknown, null, undefined>;
    textById.set(item.id, text);
    paintText(item.id, selected);

    const enter = (event?: MouseEvent): void => {
      paintText(item.id, true);
      if (!isEvent) paintCurve(item.id, true);
      if (event && shown !== item.label) onLabelHover?.(item.label, event);
    };
    const leave = (): void => {
      paintText(item.id, selected);
      if (!isEvent) paintCurve(item.id, selected);
      onLabelLeave?.();
    };
    group.on('mouseenter', (event: MouseEvent) => enter(event)).on('mouseleave', leave);

    if (isEvent) {
      group.attr('role', 'img').attr('aria-label', item.label);
      return;
    }
    // A click picks a linked node; a click on the picked one opens its own view.
    const pick = (): void => (selected ? onOpen(item.id) : onSelect(item.id));
    group
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('aria-pressed', String(selected))
      .attr('aria-label', selected ? `Open ${item.label}` : `Select ${item.label}`)
      .style('cursor', 'pointer')
      .style('outline', 'none')
      .on('focus', () => enter())
      .on('blur', leave)
      .on('click', (event: MouseEvent) => {
        event.stopPropagation();
        pick();
      })
      .on('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          pick();
        }
      });
  };
  left.forEach((item) => drawItem(item, -1, true));
  right.forEach((item) => drawItem(item, 1, false));

  const center = svg
    .append('g')
    .attr('class', 'focus-center')
    .attr('role', 'button')
    .attr('tabindex', 0)
    .attr('aria-label', 'Back to the network')
    .style('cursor', 'pointer')
    .style('outline', 'none')
    .on('click', (event: MouseEvent) => {
      event.stopPropagation();
      onClose();
    })
    .on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') onClose();
    });
  center
    .append('circle')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', CENTER_RADIUS)
    .attr('fill', GRAPH_ACCENT)
    .attr('stroke', colors.canvas)
    .attr('stroke-width', CENTER_RING);
  const name = center
    .append('text')
    .attr('x', cx)
    .attr('y', cy + CENTER_RADIUS + 20)
    .attr('text-anchor', 'middle')
    .attr('font-size', CENTER_FONT)
    .attr('font-weight', 600)
    .attr('fill', colors.labelStrong);
  wrapLabel(node.label, LABEL_WIDTH, CENTER_FONT, 3, measure).forEach((line, index) => {
    name
      .append('tspan')
      .attr('x', cx)
      .attr('dy', index ? CENTER_LINE : 0)
      .text(line);
  });

  // Where the curves meet the centre and the linked nodes.
  const picked = right.find((item) => item.id === selectedId) ?? null;
  const anchor = (x: number, y: number, r: number, active: boolean, fill: string): void => {
    svg
      .append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', r)
      .attr('fill', active ? '#FFFFFF' : fill)
      .attr('stroke', active ? GRAPH_ACCENT : 'none')
      .attr('stroke-width', active ? 2 : 0)
      .attr('pointer-events', 'none');
  };
  if (left.length) anchor(cx - CENTER_RADIUS, cy, ANCHOR_DOT, false, colors.curve);
  if (right.length) anchor(cx + CENTER_RADIUS, cy, ANCHOR_DOT, !!picked, colors.curve);
  for (const item of right) {
    const isPicked = item.id === picked?.id;
    anchor(
      item.x - ANCHOR_OFFSET,
      item.y,
      isPicked ? ANCHOR_DOT + 1 : ANCHOR_DOT - 0.5,
      isPicked,
      colors.anchor,
    );
  }
}
