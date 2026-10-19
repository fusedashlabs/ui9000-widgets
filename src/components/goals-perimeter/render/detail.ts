import { pointer, select, type Selection } from 'd3-selection';

import {
  arcPath,
  detailGeometry,
  detailSpecks,
  diamondPath,
  exceptionTickCount,
  formatAgents,
  formatBlocker,
  formatCount,
  formatHealth,
  goalRelations,
  goalSummary,
  MAX_DIAMONDS,
  polarPoint,
  sectorAt,
  sectorLabelAngles,
  separateLabelBoxes,
  stateSectors,
  summaryAvoid,
  tickSegments,
  type AgentState,
  type BoardLayout,
  type DetailRelation,
  type DetailSector,
  type GoalsPerimeterModel,
  type Particle,
  type PerimeterGoal,
} from '../lib/index.js';
import type { GoalsPerimeterHandlers } from './draw.js';
import { appendBlockedGlyph, appendDegradedGlyph, appendFailedGlyph, appendResourceGlyph } from './icons.js';
import { perimeterPalette, stateColor } from './palette.js';

type G = Selection<SVGGElement, unknown, null, undefined>;
type Pointer = MouseEvent | FocusEvent;

const STATE_NAME: Record<AgentState, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  blocked: 'Blocked',
  failed: 'Failed',
  idle: 'Idle',
};
/** Exception rows listed under a sector label before "+n more". */
const MAX_REASONS = 3;
const ROW = 17;
const MAX_AGENT_LINKS = 240;

export interface GoalDetailOptions {
  model: GoalsPerimeterModel;
  layout: BoardLayout;
  goal: PerimeterGoal;
  width: number;
  height: number;
  themeMode: 'light' | 'dark';
  /** Gradient id for the cloud glow. */
  glowId: string;
  /** A resource group to show as selected. */
  groupId?: string;
  handlers: GoalsPerimeterHandlers;
}

const f = (n: number) => Number(n.toFixed(2));

function activate(run: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    run();
  };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Text anchor for a label at this angle: away from the perimeter. */
function anchorAt(angle: number): 'start' | 'middle' | 'end' {
  const x = Math.sin(angle);
  if (x > 0.2) return 'start';
  if (x < -0.2) return 'end';
  return 'middle';
}

function sectorArc(r: number, sector: DetailSector): string {
  if (sector.end - sector.start >= Math.PI * 2 - 1e-6) return arcPath(0, 0, r, 1);
  const a = polarPoint(r, sector.start);
  const b = polarPoint(r, sector.end);
  const large = sector.end - sector.start > Math.PI ? 1 : 0;
  return `M${f(a.x)},${f(a.y)}A${f(r)},${f(r)} 0 ${large} 1 ${f(b.x)},${f(b.y)}`;
}

function appendExceptionGlyph(parent: G, state: AgentState, size: number): void {
  if (state === 'failed') appendFailedGlyph(parent, size);
  else if (state === 'blocked') appendBlockedGlyph(parent, size);
  else appendDegradedGlyph(parent, size);
}

/** Rendered width when layout exists, an estimate otherwise (jsdom, detached). */
function textWidth(node: SVGTextElement | null, size: number): number {
  if (!node) return 0;
  try {
    const width = node.getComputedTextLength();
    if (width > 0) return width;
  } catch {
    /* no layout */
  }
  return (node.textContent ?? '').length * size * 0.56;
}

interface PlacedLabel {
  group: G;
  /** The label's anchor beside the perimeter. */
  x: number;
  top: number;
  box: { x0: number; x1: number; y0: number; y1: number };
  /** Middle of the sector it names, and whether it moved off it. */
  mid: number;
  offSector: boolean;
}

/**
 * Sector label, then the reasons behind it; above the anchor in the top half,
 * below it in the bottom half. Returns its block so overlapping labels can be
 * pulled apart before it is placed.
 */
function drawSectorLabel(
  layer: G,
  goal: PerimeterGoal,
  sector: DetailSector,
  r: number,
  mode: 'light' | 'dark',
  on: GoalsPerimeterHandlers,
  halfWidth: number,
  angle: number,
): PlacedLabel {
  const mid = (sector.start + sector.end) / 2;
  const full = sector.end - sector.start >= Math.PI * 2 - 1e-6;
  const at = polarPoint(r + 30, angle);
  const anchor = anchorAt(angle);
  // Characters that fit between the label and the plot edge on its side.
  const room = anchor === 'middle' ? halfWidth * 2 - 24 : halfWidth - Math.abs(at.x) - 24;
  const fits = Math.max(8, Math.floor(room / (12 * 0.56)));
  const reasons = sector.exceptions.slice(0, MAX_REASONS);
  const more = sector.exceptions.length - reasons.length;
  const lines = 1 + reasons.length + (more > 0 ? 1 : 0);
  const top = at.y < 0 ? at.y - (lines - 1) * ROW : at.y;
  const g = layer
    .append('g')
    .attr('class', `sector-label ${sector.state}`)
    .attr('data-state', sector.state)
    .attr('transform', `translate(${f(at.x)} ${f(top)})`);
  const title = g
    .append('text')
    .attr('class', 'sector-title')
    .attr('text-anchor', anchor)
    .attr('dy', '0.35em')
    .style('fill', stateColor(mode, sector.state))
    .text(`${STATE_NAME[sector.state]} · ${formatCount(sector.count)}`);
  let widest = textWidth(title.node(), 13);

  reasons.forEach((exception, i) => {
    const y = (i + 1) * ROW;
    const row = g
      .append('g')
      .attr('class', `reason ${exception.state}`)
      .attr('transform', `translate(0 ${y})`)
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', `${exception.count} ${exception.state}${exception.reason ? `: ${exception.reason}` : ''}`)
      .on('pointerenter', (event: Pointer) => on.onMarkerHover?.(goal, exception, event))
      .on('pointermove', (event: Pointer) => on.onMarkerHover?.(goal, exception, event))
      .on('pointerleave', () => on.onLeave?.())
      .on('focus', (event: Pointer) => on.onMarkerHover?.(goal, exception, event))
      .on('blur', () => on.onLeave?.());
    const blocker = exception.blocker ? ` · ${formatBlocker(exception.blocker)}` : '';
    const lead = `${formatCount(exception.count)}  `;
    const reason = truncate(exception.reason || 'No reason given', Math.max(6, Math.min(42, fits - lead.length - blocker.length)));
    const text = row
      .append('text')
      .attr('text-anchor', anchor)
      .attr('dy', '0.35em')
      .text(`${lead}${reason}${blocker}`);
    const width = textWidth(text.node(), 12);
    widest = Math.max(widest, width + 14);
    // The glyph sits on the side the text grows from.
    const glyph = row.append('g').attr('class', 'reason-glyph');
    if (anchor === 'middle') {
      text.attr('x', 7);
      glyph.attr('transform', `translate(${f(7 - width / 2 - 9)} 0)`);
    } else {
      glyph.attr('transform', `translate(${anchor === 'end' ? 10 : -10} 0)`);
    }
    appendExceptionGlyph(glyph, exception.state, 4);
  });
  if (more > 0) {
    g.append('text')
      .attr('class', 'reason-more')
      .attr('text-anchor', anchor)
      .attr('dy', '0.35em')
      .attr('y', (reasons.length + 1) * ROW)
      .text(`+${more} more`);
  }

  const x0 = anchor === 'start' ? at.x - 16 : anchor === 'end' ? at.x - widest : at.x - widest / 2;
  const x1 = anchor === 'start' ? at.x + widest : anchor === 'end' ? at.x + 16 : at.x + widest / 2;
  return {
    group: g,
    x: at.x,
    top,
    box: { x0, x1, y0: top - 9, y1: top + (lines - 1) * ROW + 9 },
    mid,
    offSector: !full && Math.abs(angle - mid) > 0.08,
  };
}


function drawRelation(
  layer: G,
  relation: DetailRelation,
  model: GoalsPerimeterModel,
  r: number,
  radius: number,
  on: GoalsPerimeterHandlers,
  halfWidth: number,
): void {
  const end = polarPoint(radius, relation.angle);
  const start = polarPoint(r + 10, relation.angle);
  const g = layer.append('g').attr('class', `relation ${relation.kind} ${relation.status}`).attr('data-relation', relation.id);

  // Lines that are not down: a few strands, bowed slightly apart.
  const lines = Math.min(5, relation.strands);
  for (let i = 0; i < lines; i += 1) {
    const bend = (i - (lines - 1) / 2) * 7;
    const mid = polarPoint((r + 10 + radius) / 2, relation.angle);
    const nx = Math.cos(relation.angle);
    const ny = Math.sin(relation.angle);
    g.append('path')
      .attr('class', `rel-strand ${relation.status === 'degraded' ? 'degraded' : ''}`)
      .attr('d', `M${f(start.x)},${f(start.y)}Q${f(mid.x + nx * bend)},${f(mid.y + ny * bend)} ${f(end.x)},${f(end.y)}`);
  }

  if (relation.down) {
    const down = relation.down;
    g.append('path')
      .attr('class', 'link-line')
      .attr('d', `M${f(start.x)},${f(start.y)}L${f(end.x)},${f(end.y)}`);
    const mid = polarPoint((r + 10 + radius) / 2, relation.angle);
    const hover = (event: Pointer) => on.onConnectionHover?.(down, event);
    const mark = g
      .append('g')
      .attr('class', 'link-mark')
      .attr('transform', `translate(${f(mid.x)} ${f(mid.y)})`)
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', `Connection to ${relation.label} unavailable`)
      .on('pointerenter', hover)
      .on('pointermove', hover)
      .on('pointerleave', () => on.onLeave?.())
      .on('focus', hover)
      .on('blur', () => on.onLeave?.());
    appendBlockedGlyph(mark, 11);
  } else if (relation.kind === 'external' && relation.status === 'unavailable') {
    // The dependency's own node carries the ⊘.
    g.append('path')
      .attr('class', 'link-line')
      .attr('d', `M${f(start.x)},${f(start.y)}L${f(end.x)},${f(end.y)}`);
  }

  const other = relation.goalId ? model.goals.find((goal) => goal.id === relation.goalId) : undefined;
  const node = g
    .append('g')
    .attr('class', other ? `rel-node goal ${other.status}` : `rel-node external ${relation.status}`)
    .attr('transform', `translate(${f(end.x)} ${f(end.y)})`)
    .attr('tabindex', 0)
    .attr('role', other ? 'button' : 'img')
    .attr('aria-label', other ? `${other.name}. Open goal.` : `${relation.label}, external dependency`);
  if (other) {
    const hover = (event: Pointer) => on.onGoalHover?.(other, event);
    const open = () => on.onOpen?.(other);
    node
      .on('pointerenter', hover)
      .on('pointermove', hover)
      .on('pointerleave', () => on.onLeave?.())
      .on('focus', hover)
      .on('blur', () => on.onLeave?.())
      .on('click', open)
      .on('keydown', activate(open));
    node.append('circle').attr('class', 'hit').attr('r', 16);
    node.append('circle').attr('class', 'rel-dot').attr('r', 9);
    node
      .append('path')
      .attr('class', 'rel-arc')
      .attr('d', arcPath(0, 0, 9, other.health));
  } else if (relation.dependency) {
    const dependency = relation.dependency;
    const hover = (event: Pointer) => on.onExternalHover?.(dependency, event);
    node
      .on('pointerenter', hover)
      .on('pointermove', hover)
      .on('pointerleave', () => on.onLeave?.())
      .on('focus', hover)
      .on('blur', () => on.onLeave?.());
    node.append('circle').attr('class', 'hit').attr('r', 14);
    if (relation.status === 'unavailable') appendBlockedGlyph(node, 7);
    else node.append('circle').attr('class', 'ext-dot').attr('r', 6);
  }

  const anchor = anchorAt(relation.angle);
  const dx = anchor === 'start' ? 16 : anchor === 'end' ? -16 : 0;
  const dy = anchor === 'middle' ? (Math.cos(relation.angle) > 0 ? -22 : 24) : -2;
  node
    .append('text')
    .attr('class', 'rel-label')
    .attr('text-anchor', anchor)
    .attr('x', dx)
    .attr('y', dy)
    .text(truncate(relation.label, Math.max(8, Math.min(36, Math.floor((anchor === 'middle' ? 220 : halfWidth - Math.abs(end.x) - 28) / (13 * 0.56))))));
  node
    .append('text')
    .attr('class', 'rel-meta')
    .attr('text-anchor', anchor)
    .attr('x', dx)
    .attr('y', dy + 15)
    .text(
      other
        ? `${formatAgents(other.agents.total)} · ${formatHealth(other.health)}`
        : relation.status === 'unavailable'
          ? 'Unavailable'
          : relation.status === 'degraded'
            ? 'Degraded'
            : 'External',
    );
}

/**
 * The open goal: its perimeter fills the plot, its agents are regrouped into
 * one sector per health state with the reasons beside each, its resource
 * groups are named, and the goals and dependencies it is joined to sit around
 * it in their direction on the board. A neighbouring goal opens on click.
 */
export function drawGoalDetail(layer: G, options: GoalDetailOptions): void {
  const { model, layout, goal, width, height, themeMode, handlers: on } = options;
  const palette = perimeterPalette(themeMode);
  const geo = detailGeometry(width, height);
  const { r } = geo;
  const sectors = stateSectors(goal);
  const nodes = model.agents.filter((agent) => agent.goalId === goal.id);
  const agentById = new Map(nodes.map((agent) => [agent.id, agent]));

  const g = layer
    .append('g')
    .attr('class', 'gp-detail')
    .attr('data-goal', goal.id)
    .attr('role', 'group')
    .attr('aria-label', `${goal.name}, open`)
    .attr('transform', `translate(${f(geo.cx)} ${f(geo.cy)})`);

  // The goal's title and summary sit under the perimeter; labels and neighbours keep clear of them.
  const summaryHalf = Math.max(goal.name.length * 17, goalSummary(goal).length * 14) * 0.28 + 16;
  // Sector labels are placed first; neighbours keep clear of them.
  const labelAngles = sectorLabelAngles(sectors, summaryAvoid(summaryHalf, r + 30));
  const relationLayer = g.append('g').attr('class', 'relations');
  const relations = goalRelations(model, layout, goal.id, summaryAvoid(summaryHalf + 24, geo.relationRadius), labelAngles);
  for (const relation of relations) {
    drawRelation(relationLayer, relation, model, r, geo.relationRadius, on, width / 2);
  }

  g.append('circle').attr('class', 'glow').attr('r', f(r * 1.15)).attr('fill', `url(#${options.glowId})`);
  // Catches the pointer over the circle between the specks, for the sector focus below.
  g.append('circle').attr('class', 'sector-hit').attr('r', f(r + 10));

  // Agents, one sector per state.
  const specks = detailSpecks(goal, nodes, sectors, r);
  const at = new Map<string, Particle>();
  for (const speck of specks) if (speck.agentId) at.set(speck.agentId, speck);
  const linkLayer = g.append('g').attr('class', 'agent-links');
  let drawn = 0;
  for (const link of model.agentLinks) {
    if (link.goalId !== goal.id || drawn >= MAX_AGENT_LINKS) continue;
    const a = at.get(link.source);
    const b = at.get(link.target);
    if (!a || !b) continue;
    drawn += 1;
    linkLayer
      .append('line')
      .attr('class', `agent-link ${link.status}`)
      .attr('x1', f(a.x))
      .attr('y1', f(a.y))
      .attr('x2', f(b.x))
      .attr('y2', f(b.y));
  }
  const cloud = g.append('g').attr('class', 'detail-cloud');
  cloud
    .selectAll<SVGRectElement, Particle>('rect')
    .data(specks)
    .join('rect')
    .attr('class', (s) => (s.agentId ? `speck agent ${s.tone}` : `speck ${s.tone}`))
    .attr('x', (s) => f(s.x - s.size / 2))
    .attr('y', (s) => f(s.y - s.size / 2))
    .attr('width', (s) => f(s.size))
    .attr('height', (s) => f(s.size))
    .attr('fill', (s) => palette.particles[s.tone][s.shade]!)
    .attr('fill-opacity', (s) => f(s.alpha));
  if (nodes.length) {
    const hover = (event: MouseEvent) => {
      const datum = select<Element, Particle | undefined>(event.target as Element).datum();
      const agent = datum?.agentId ? agentById.get(datum.agentId) : undefined;
      if (agent) on.onAgentHover?.(goal, agent, event);
    };
    cloud.on('pointerover', hover).on('pointermove', hover).on('pointerout', () => on.onLeave?.());
  }

  // Sector band, the health perimeter and the exception ticks.
  const band = g.append('g').attr('class', 'sectors');
  for (const sector of sectors) {
    band
      .append('path')
      .attr('class', `sector ${sector.state}`)
      .attr('data-state', sector.state)
      .attr('d', sectorArc(r - 11, sector))
      .style('stroke', stateColor(themeMode, sector.state));
  }
  g.append('path').attr('class', `ring ${goal.status}`).attr('d', arcPath(0, 0, r, goal.health));
  const ticks = tickSegments({ id: goal.id, x: 0, y: 0, r, fringeAngle: 0, labelHalfWidth: 0, labelHeight: 0 }, exceptionTickCount(goal.impure));
  g.append('g')
    .attr('class', 'ticks')
    .selectAll('line')
    .data(ticks)
    .join('line')
    .attr('x1', (t) => t.x1)
    .attr('y1', (t) => t.y1)
    .attr('x2', (t) => t.x2)
    .attr('y2', (t) => t.y2);

  const labels = g.append('g').attr('class', 'sector-labels');
  const placed = sectors.map((sector, i) =>
    drawSectorLabel(labels, goal, sector, r, themeMode, on, width / 2, labelAngles[i]!),
  );
  // Blocks that still overlap (several reasons each, close together) are pulled apart.
  const shifts = separateLabelBoxes(placed.map((label) => label.box));
  placed.forEach((label, i) => {
    const sector = sectors[i]!;
    const dy = shifts[i]!;
    if (dy) label.group.attr('transform', `translate(${f(label.x)} ${f(label.top + dy)})`);
    // A label moved off its sector keeps a leader to it.
    if (!label.offSector && Math.abs(dy) < 1) return;
    const from = polarPoint(r + 6, label.mid);
    // To the block's edge nearest the perimeter, so the leader crosses none of its rows.
    const ty = label.top < 0 ? label.box.y1 + dy : label.box.y0 + dy;
    labels
      .insert('path', ':first-child')
      .attr('class', 'sector-leader')
      .attr('data-state', sector.state)
      .attr('d', `M${f(from.x)},${f(from.y)}L${f(label.x)},${f(ty)}`)
      .style('stroke', stateColor(themeMode, sector.state));
  });

  // Hovering a sector of the circle keeps it, its specks and its label at full
  // strength and dims the rest. Labels, neighbours and the hub do not.
  let focused: AgentState | null = null;
  const focusSector = (state: AgentState | null) => {
    if (state === focused) return;
    focused = state;
    g.classed('has-sector-focus', state !== null);
    g.selectAll<Element, unknown>('.sector, .sector-label, .sector-leader').classed('is-dimmed', function () {
      return state !== null && this.getAttribute('data-state') !== state;
    });
    cloud.selectAll<SVGRectElement, Particle>('rect').classed('is-dimmed', (s) => state !== null && s.tone !== state);
    linkLayer.classed('is-dimmed', state !== null);
  };
  g.on('pointermove.sector', (event: PointerEvent) => {
    const target = event.target as Element | null;
    if (target?.closest('.sector-label, .relation, .rg')) {
      focusSector(null);
      return;
    }
    const [x, y] = pointer(event, g.node());
    focusSector(sectorAt(sectors, x, y, r));
  }).on('pointerleave.sector', () => focusSector(null));

  // Resource groups, named, in the centre.
  const groups = goal.resourceGroups.slice(0, MAX_DIAMONDS);
  const e = Math.max(12, Math.min(28, r * 0.11));
  // Wide enough for the names under the diamonds, never wider than the ring.
  const step = groups.length > 1 ? Math.min(Math.max(e * 2.6, 124), (r * 1.5) / (groups.length - 1)) : 0;
  const nameFits = Math.max(6, Math.floor(((groups.length > 1 ? step : r * 1.5) - 8) / (12 * 0.56)));
  groups.forEach((group, i) => {
    const x = (i - (groups.length - 1) / 2) * step;
    const hover = (event: Pointer) => on.onGroupHover?.(goal, group, event);
    const rg = g
      .append('g')
      .attr('class', `rg ${group.state}`)
      .classed('is-selected', group.id === options.groupId)
      .attr('data-group', group.id)
      .attr('transform', `translate(${f(x)} 0)`)
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', `${group.name}, ${group.state}`)
      .on('pointerenter', hover)
      .on('pointermove', hover)
      .on('pointerleave', () => on.onLeave?.())
      .on('focus', hover)
      .on('blur', () => on.onLeave?.());
    rg.append('path').attr('class', 'rg-base').attr('d', diamondPath(e));
    rg.append('path').attr('class', 'rg-shape').attr('d', diamondPath(e));
    appendResourceGlyph(rg, group.icon, e);
    rg.append('text')
      .attr('class', 'rg-name')
      .attr('text-anchor', 'middle')
      .attr('y', f(e * 1.3 + 14))
      .text(truncate(group.name, Math.min(20, nameFits)));
  });

  // The goal's summary under the perimeter.
  const summary = g.append('g').attr('class', 'detail-summary').attr('transform', `translate(0 ${f(r + 38)})`);
  summary.append('text').attr('class', 'detail-title').attr('text-anchor', 'middle').text(goal.name);
  summary.append('text').attr('class', 'detail-meta').attr('text-anchor', 'middle').attr('y', 20).text(goalSummary(goal));
  if (goal.impure > 0) {
    summary
      .append('text')
      .attr('class', 'detail-impure')
      .attr('text-anchor', 'middle')
      .attr('y', 40)
      .text(`IMPURE · ${formatCount(goal.impure)}`);
  }
}
