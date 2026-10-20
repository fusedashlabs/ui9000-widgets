import type { BoardLayout } from './layout.js';
import { hashSeed, seededRandom, speckGrain, speckPlan, type Particle } from './scatter.js';
import type {
  AgentNode,
  AgentState,
  ConnectionStatus,
  ExternalDependency,
  GoalConnection,
  GoalException,
  GoalsPerimeterModel,
  PerimeterGoal,
} from './types.js';

/**
 * The open goal: its perimeter fills the plot and its agents are regrouped by
 * health state, one sector each, so the share of every state reads at once.
 * Everything here is in plot px around the centre (0, 0); angles run
 * clockwise from 12 o'clock, like the perimeter arc.
 */

const DEG = Math.PI / 180;
/** Sectors in this order, clockwise from 12 o'clock. */
export const SECTOR_ORDER: AgentState[] = ['healthy', 'degraded', 'blocked', 'failed', 'idle'];
const SECTOR_GAP = 3 * DEG;
/** An exceptional state never shrinks below this, so a handful of failures stays visible. */
const MIN_SECTOR = 22 * DEG;
/** Specks keep clear of the diamond row in the centre. */
const INNER = 0.3;

export interface DetailSector {
  state: AgentState;
  count: number;
  start: number;
  end: number;
  /** The goal's exception groups in this state, largest first. */
  exceptions: GoalException[];
}

export function stateSectors(goal: PerimeterGoal): DetailSector[] {
  const present = SECTOR_ORDER.filter((state) => goal.agents[state] > 0);
  if (!present.length) return [];
  if (present.length === 1) {
    const state = present[0]!;
    return [{ state, count: goal.agents[state], start: 0, end: Math.PI * 2, exceptions: exceptionsOf(goal, state) }];
  }
  const total = present.reduce((sum, state) => sum + goal.agents[state], 0);
  const room = Math.PI * 2 - SECTOR_GAP * present.length;
  const raw = present.map((state) => Math.max(MIN_SECTOR, (goal.agents[state] / total) * room));
  const fit = room / raw.reduce((a, b) => a + b, 0);
  let at = SECTOR_GAP / 2;
  return present.map((state, i) => {
    const span = raw[i]! * fit;
    const sector = { state, count: goal.agents[state], start: at, end: at + span, exceptions: exceptionsOf(goal, state) };
    at += span + SECTOR_GAP;
    return sector;
  });
}

function exceptionsOf(goal: PerimeterGoal, state: AgentState): GoalException[] {
  return goal.exceptions.filter((e) => e.state === state).sort((a, b) => b.count - a.count);
}

/**
 * The state whose sector is under a point (plot px from the centre): inside
 * the ring band, outside the hub where the resource groups sit. In the thin
 * gap between two sectors the nearer one counts, so the focus never flickers.
 */
export function sectorAt(
  sectors: readonly DetailSector[],
  x: number,
  y: number,
  r: number,
): AgentState | null {
  const dist = Math.hypot(x, y);
  if (!sectors.length || dist < r * INNER * 0.85 || dist > r + 10) return null;
  const angle = norm(Math.atan2(x, -y));
  let best: AgentState | null = null;
  let nearest = Infinity;
  for (const sector of sectors) {
    if (angle >= sector.start && angle <= sector.end) return sector.state;
    const off = Math.min(Math.abs(turnBetween(angle, sector.start)), Math.abs(turnBetween(angle, sector.end)));
    if (off < nearest) {
      nearest = off;
      best = sector.state;
    }
  }
  return best;
}

function turnBetween(a: number, b: number): number {
  const d = norm(a - b);
  return d > Math.PI ? d - Math.PI * 2 : d;
}

/** Clockwise-from-12 angle → point. */
export function polarPoint(r: number, angle: number): { x: number; y: number } {
  return { x: r * Math.sin(angle), y: -r * Math.cos(angle) };
}

/** Another goal or an external dependency joined to the open goal. */
export interface DetailRelation {
  id: string;
  kind: 'goal' | 'external';
  label: string;
  /** The other goal, for `kind: 'goal'`. */
  goalId?: string;
  /** Worst status across the links. */
  status: ConnectionStatus;
  /** Lines that are not down. */
  strands: number;
  /** The link that is down, when one is. */
  down?: GoalConnection;
  dependency?: ExternalDependency;
  /** Where it sits, clockwise from 12 o'clock: its direction on the board. */
  angle: number;
}

const RANK: Record<ConnectionStatus, number> = { active: 0, degraded: 1, unavailable: 2 };
/** Neighbours closer than this are fanned apart. */
const MIN_RELATION_GAP = 26 * DEG;
/** Sector labels closer than this are fanned apart. */
const MIN_LABEL_GAP = 24 * DEG;
/** A neighbour keeps this far, around the perimeter, from every sector label. */
export const LABEL_CLEARANCE = 30 * DEG;
/** Least half-width of the zone under the perimeter kept for the goal's title and summary. */
export const SUMMARY_AVOID = 40 * DEG;

/**
 * Half the angle, around 6 o'clock, that a block `halfWidth` px wide under the
 * perimeter covers at `radius`. Labels and neighbours stay out of it.
 */
export function summaryAvoid(halfWidth: number, radius: number): number {
  return Math.max(SUMMARY_AVOID, Math.asin(Math.min(1, halfWidth / Math.max(1, radius))));
}

/** An angle inside the zone under the perimeter moves to the nearer edge of it. */
function outOfSummary(angle: number, avoid: number): number {
  const a = norm(angle);
  if (a <= Math.PI - avoid || a >= Math.PI + avoid) return a;
  return a < Math.PI ? Math.PI - avoid : Math.PI + avoid;
}

/** Signed shortest turn from `b` to `a`. */
function turn(a: number, b: number): number {
  const d = norm(a - b);
  return d > Math.PI ? d - Math.PI * 2 : d;
}

/**
 * Pushes angles at least `gap` apart, keeping their order around the circle,
 * keeps every one out of the zone under the perimeter, and at least
 * `clearance` from each `fixed` angle (labels already placed).
 */
function fan(
  angles: number[],
  gap: number,
  avoid: number,
  fixed: readonly number[] = [],
  clearance = 0,
): number[] {
  const out = angles.map((a) => outOfSummary(a, avoid));
  const order = out.map((_, i) => i).sort((a, b) => out[a]! - out[b]!);
  for (let pass = 0; pass < 12; pass += 1) {
    for (let j = 1; j < order.length; j += 1) {
      const a = order[j - 1]!;
      const b = order[j]!;
      const d = out[b]! - out[a]!;
      if (d < gap) {
        const push = (gap - d) / 2;
        out[a] = out[a]! - push;
        out[b] = out[b]! + push;
      }
    }
    for (let i = 0; i < out.length; i += 1) {
      for (const at of fixed) {
        const d = turn(out[i]!, at);
        if (Math.abs(d) < clearance) out[i] = at + (d < 0 ? -clearance : clearance);
      }
      out[i] = outOfSummary(out[i]!, avoid);
    }
  }
  return out;
}

/**
 * Where each sector's label goes: the middle of its sector, unless that falls
 * under the perimeter where the goal's title and summary sit, or too close to
 * another label. A full circle (one state) is labelled at 12 o'clock.
 */
export function sectorLabelAngles(sectors: readonly DetailSector[], avoid = SUMMARY_AVOID): number[] {
  const wanted = sectors.map((sector) =>
    sector.end - sector.start >= Math.PI * 2 - 1e-6 ? 0 : (sector.start + sector.end) / 2,
  );
  return fan(wanted, MIN_LABEL_GAP, avoid);
}

/** Board direction from one point to another, as a clockwise-from-12 angle. */
function boardAngle(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.atan2(to.x - from.x, -(to.y - from.y));
}

export function goalRelations(
  model: GoalsPerimeterModel,
  layout: BoardLayout,
  goalId: string,
  avoid = SUMMARY_AVOID,
  labelAngles: readonly number[] = [],
): DetailRelation[] {
  const at = layout.byId.get(goalId);
  if (!at) return [];
  const byGoal = new Map<string, DetailRelation>();
  for (const connection of model.connections) {
    if (connection.source !== goalId && connection.target !== goalId) continue;
    const other = connection.source === goalId ? connection.target : connection.source;
    const goal = model.goals.find((g) => g.id === other);
    const there = layout.byId.get(other);
    if (!goal || !there) continue;
    const relation = byGoal.get(other) ?? {
      id: `goal:${other}`,
      kind: 'goal' as const,
      label: goal.name,
      goalId: other,
      status: 'active' as ConnectionStatus,
      strands: 0,
      angle: boardAngle(at, there),
    };
    if (RANK[connection.status] > RANK[relation.status]) relation.status = connection.status;
    if (connection.status === 'unavailable') relation.down ??= connection;
    else relation.strands += connection.strands;
    byGoal.set(other, relation);
  }

  const relations: DetailRelation[] = [...byGoal.values()];
  for (const dependency of model.externals) {
    if (dependency.goalId !== goalId) continue;
    const there = layout.externals.get(dependency.id);
    relations.push({
      id: `external:${dependency.id}`,
      kind: 'external',
      label: dependency.label,
      status: dependency.status,
      strands: dependency.status === 'unavailable' ? 0 : 1,
      dependency,
      angle: there ? boardAngle(at, there) : 0,
    });
  }
  return spread(relations, avoid, labelAngles);
}

/** Fans neighbours that share a direction, keeping their order, clear of the goal's summary. */
function spread(relations: DetailRelation[], avoid: number, labelAngles: readonly number[]): DetailRelation[] {
  const sorted = [...relations].sort((a, b) => norm(a.angle) - norm(b.angle));
  const angles = fan(
    sorted.map((relation) => relation.angle),
    MIN_RELATION_GAP,
    avoid,
    labelAngles,
    LABEL_CLEARANCE,
  );
  sorted.forEach((relation, i) => {
    relation.angle = angles[i]!;
  });
  return sorted;
}

function norm(angle: number): number {
  const full = Math.PI * 2;
  return ((angle % full) + full) % full;
}

export interface LabelBox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * Vertical shifts that pull overlapping label blocks apart. Two blocks that
 * overlap sit mostly above the centre, so the higher one moves up, or mostly
 * below it, so the lower one moves down: labels move away from the
 * perimeter, never across it.
 */
export function separateLabelBoxes(boxes: readonly LabelBox[], pad = 6): number[] {
  const dy = boxes.map(() => 0);
  const at = (i: number) => ({ ...boxes[i]!, y0: boxes[i]!.y0 + dy[i]!, y1: boxes[i]!.y1 + dy[i]! });
  for (let pass = 0; pass < 40; pass += 1) {
    let moved = false;
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = at(i);
        const b = at(j);
        if (a.x0 >= b.x1 + pad || b.x0 >= a.x1 + pad || a.y0 >= b.y1 + pad || b.y0 >= a.y1 + pad) continue;
        const overlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + pad;
        const upper = a.y0 <= b.y0 ? i : j;
        const lower = upper === i ? j : i;
        if (a.y0 + a.y1 + b.y0 + b.y1 < 0) dy[upper] = dy[upper]! - overlap;
        else dy[lower] = dy[lower]! + overlap;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return dy;
}

/** Plot px kept clear at the top of an open goal, under the way back. */
export const DETAIL_TOP = 36;

export interface DetailGeometry {
  cx: number;
  cy: number;
  /** Perimeter radius. */
  r: number;
  /** Where neighbours sit. */
  relationRadius: number;
}

/**
 * The open goal's perimeter, centred, with room outside it for the sector
 * labels and the neighbours, and under it for the goal's summary.
 */
export function detailGeometry(width: number, height: number): DetailGeometry {
  // The top band stays clear for the "All goals" overlay.
  const usable = height - DETAIL_TOP;
  const r = Math.max(60, Math.min(width * 0.26, (usable - 110) * 0.36));
  return {
    cx: width / 2,
    cy: DETAIL_TOP + (usable - 70) / 2 + 10,
    r,
    // Neighbours stay inside the plot, with room for their label beside them.
    relationRadius: Math.max(r + 60, Math.min(r + 150, Math.max(r + 90, Math.min(width, height) * 0.46), width / 2 - 150)),
  };
}

/**
 * The open goal's specks, each in its state's sector, between the diamond
 * row and the sector band. Same plan as the cloud, so the same agents show.
 */
export function detailSpecks(
  goal: PerimeterGoal,
  nodes: readonly AgentNode[],
  sectors: readonly DetailSector[],
  r: number,
): Particle[] {
  const rand = seededRandom(hashSeed(`detail:${goal.id}`));
  const { specks, budget } = speckPlan(goal, nodes, 1, false);
  const grain = speckGrain(r, budget);
  const byState = new Map(sectors.map((sector) => [sector.state, sector]));
  const out: Particle[] = [];
  for (const s of specks) {
    const sector = byState.get(s.tone as AgentState);
    if (!sector) continue;
    const pad = Math.min(1.5 * DEG, (sector.end - sector.start) / 4);
    const angle = sector.start + pad + rand() * (sector.end - sector.start - pad * 2);
    const dist = r * (INNER + (0.86 - INNER) * Math.sqrt(rand()));
    const { x, y } = polarPoint(dist, angle);
    const speck: Particle = {
      x,
      y,
      size: (1 + rand() * 1.9) * grain,
      alpha: 0.45 + rand() * 0.5,
      tone: s.tone,
      shade: Math.floor(rand() * 4),
    };
    if (s.agentId) {
      speck.agentId = s.agentId;
      speck.size = Math.max(speck.size, 1.8 * grain);
      speck.alpha = Math.max(speck.alpha, 0.6);
    }
    out.push(speck);
  }
  return out;
}
