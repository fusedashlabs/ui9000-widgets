import {
  apportion,
  arenaPoint,
  arenaPose,
  DEFAULT_CAMERA,
  hashString,
  PIVOT_X,
  PIVOT_Y,
  projector,
  rng,
  type AssetHealthTrouble,
  type FlowState,
  type Project,
  type Vec3,
} from '../../asset-health-overview/lib/index.js';
import type { CallSlot } from '../../goals-perimeter/lib/index.js';
import type { BurstGroup, GoalBurstModel } from './types.js';

/**
 * Geometry of a goal drawn as its traffic — the goal burst. The goal's
 * agents are a cloud in the middle; round it the floor is cut into one sector
 * per resource group the goal draws on, as wide as its share of the goal's
 * calls; and out of the cloud, into each sector, its calls are thrown as
 * spikes:
 *
 *   a spike     one call of the last moment, a sample of them — as many to a
 *               group as it takes of the goal's calls
 *   its length  how long the call took to be answered, on a time scale that
 *               doubles at every mark: the further out, the slower
 *   its colour  what happened to it, in the group's own mix — white where it
 *               went through, amber where it was throttled, and in the
 *               colour of what holds the agents where it did not get through
 *   the band    the group's assets, a tick each, on an arc round the sector
 *
 * A call that does not get through has no answer to measure: its spike runs
 * all the way out to the asset that stops it — so the calls held up on one
 * asset fan into it. A throttled call is answered late, towards the asset
 * that throttles it.
 *
 * Laid out in the design space about the pivot, on the same floor as the
 * asset health arena, so the burst turns in place and is seen from the same
 * height.
 */
export const BURST = {
  /** The cloud of the goal's agents. */
  core: 72,
  /** The time scale: where a call answered at `t0` seconds ends, and how much further out each doubling of the time reaches. */
  t0: 0.05,
  r0: 82,
  doubling: 30,
  /** Calls slower than the scale's last mark end here. */
  over: 250,
  /** The arc a group's assets stand on, and how far a tick reaches beyond it — a longer one for an asset known by name. */
  band: 266,
  tick: 4,
  named: 7,
  /** Where a label's leader starts, screen px beyond the ticks. */
  anchor: 12,
} as const;

/** The marks of the time scale, seconds. */
export const GUIDES = [0.1, 0.5, 1, 2] as const;

const TAU = Math.PI * 2;
/** The aisle between two sectors, radians. */
const AISLE = 0.08;
/** The narrowest sector, however few calls its group takes — room for its spikes and a reading of them. */
const MIN_SPAN = 0.3;
/** Spikes drawn for a goal, shared out by calls; and the fewest a group gets, so a trickle still reads. */
const SAMPLE = 300;
const MIN_SPIKES = 12;
/** A throttled call is answered this many times later than the group's usual. */
const THROTTLE = 2.6;

/** The flow states in the order a sector's mix is read: what flows first, then what does not. */
export const FLOW_ORDER: FlowState[] = ['flowing', 'throttled', 'awaiting', 'blocked', 'failed'];

/** The id the burst's one goal has in the agent field. */
export const BURST_GOAL = 'goal';

/** Where a call answered in `seconds` ends, design px from the middle. */
export const timeRadius = (seconds: number) =>
  Math.min(BURST.over, Math.max(BURST.core + 6, BURST.r0 + BURST.doubling * Math.log2(seconds / BURST.t0)));

/** `80ms`, `0.9s`, `2.1s`, `3m`, `15m`. */
export function formatSeconds(t: number): string {
  if (t < 0.095) return `${Math.round(t * 1000)}ms`;
  if (t < 60) return `${t < 10 ? (Math.round(t * 10) / 10).toString() : Math.round(t)}s`;
  return `${Math.round(t / 60)}m`;
}

/** The normal quantile of a share, near enough (Tukey's lambda). */
const probit = (q: number) => 4.91 * (q ** 0.14 - (1 - q) ** 0.14);

export interface Spike {
  from: Vec3;
  to: Vec3;
  state: FlowState;
  /** Seconds to its answer; null for a call that does not get through. */
  seconds: number | null;
  /** The asset in trouble it ends on, or was throttled by (its key). */
  trouble?: string;
  /** 0–1: its own brightness. */
  seed: number;
}

/** A resource group's sector of the burst. */
export interface BurstSector {
  group: BurstGroup;
  a0: number;
  a1: number;
  mid: number;
  spikes: Spike[];
  /** The 95th percentile of the calls answered, seconds; null when none is. */
  p95: number | null;
  /** Where each asset in trouble stands on the band. */
  marks: { trouble: AssetHealthTrouble; angle: number }[];
}

type Span = Pick<BurstSector, 'group' | 'a0' | 'a1' | 'mid'>;

/** Where a sector's k-th asset stands on its band. */
export function assetAngle(sector: Span, k: number): number {
  const span = sector.a1 - sector.a0;
  const pad = Math.min(0.03, span * 0.06);
  return sector.a0 + pad + ((k + 0.5) / Math.max(1, sector.group.section.assets)) * (span - 2 * pad);
}

/** The room one asset takes on a sector's band, radians. */
const assetPitch = (sector: Span) => (sector.a1 - sector.a0) / Math.max(1, sector.group.section.assets);

/** A share of a section's traffic. */
const mixOf = (group: BurstGroup, state: FlowState) => group.section.mix.find((p) => p.state === state)?.share ?? 0;

/**
 * Where each group's sector lies: as wide as its share of the goal's calls.
 * Which way round the burst is turned says nothing, so it is turned to read
 * well at rest: the sectors keep their middles to the sides where their
 * labels are, the groups in trouble come to the front, the two sides carry
 * about as many labels each, and an aisle faces the viewer for the time
 * scale to be read along.
 */
function layoutSectors(groups: BurstGroup[]): Span[] {
  const n = groups.length;
  if (!n) return [];
  const room = TAU - n * AISLE;
  const raw = groups.map((g) => Math.max(MIN_SPAN, g.section.share * room));
  const total = raw.reduce((a, b) => a + b, 0);
  const spans = raw.map((v) => (v * room) / total);
  const at = (turn: number): Span[] => {
    let a = turn;
    return groups.map((group, i) => {
      const a0 = a;
      const a1 = a + spans[i]!;
      a = a1 + AISLE;
      return { group, a0, a1, mid: (a0 + a1) / 2 };
    });
  };
  let best: { sectors: Span[]; score: number } | undefined;
  for (let step = 0; step < 120; step++) {
    const sectors = at((step / 120) * TAU);
    let score = 0;
    let sides = 0;
    sectors.forEach((s, i) => {
      const x = Math.cos(s.mid);
      score += Math.min(Math.abs(x), 0.7);
      if (Math.abs(x) < 0.24) score -= 1.6;
      if (s.group.section.troubles.length) score -= 0.4 * Math.sin(s.mid);
      if (i === 0) score -= 0.12 * x;
      sides += x > 0 ? 1 : -1;
    });
    score -= 0.3 * Math.abs(sides);
    // the aisle nearest the viewer carries the time scale's figures
    score += 0.5 * Math.max(...sectors.map((s) => -Math.sin(s.a1 + AISLE / 2)));
    if (!best || score > best.score) best = { sectors, score };
  }
  return best!.sectors;
}

/** One call's spike: out of the cloud, from the side facing where it goes, to where it ends on the floor. */
function spikeFrom(angle: number, random: () => number): Vec3 {
  const az = angle + (random() - 0.5) * 0.3;
  const lat = (random() - 0.5) * 0.9;
  const c = BURST.core * 0.97;
  return [PIVOT_X + c * Math.cos(lat) * Math.cos(az), PIVOT_Y + c * Math.sin(lat), c * Math.cos(lat) * Math.sin(az)];
}

/** The spikes of one sector: its calls in the mix its traffic has, answered on its group's time, or run out to the asset that stops them. */
function sectorSpikes(goalKey: string, sector: Span): BurstSector {
  const g = sector.group;
  const s = g.section;
  const random = rng(hashString(`${goalKey}>${s.id}`, 977));
  const n = Math.max(MIN_SPIKES, Math.round(SAMPLE * s.share));
  const counts = apportion(
    FLOW_ORDER.map((state) => mixOf(g, state)),
    n,
  );
  const count = (state: FlowState) => counts[FLOW_ORDER.indexOf(state)] ?? 0;
  const { p50, p95 } = g.latency;
  const sigma = Math.log(p95 / p50) / 1.645;
  const span = sector.a1 - sector.a0;
  const pad = Math.min(0.04, span * 0.08);
  const marks = s.troubles.map((trouble) => ({ trouble, angle: assetAngle(sector, trouble.tick) }));
  const spikes: Spike[] = [];

  // what gets through: answered on the group's own time — the spikes are its quantiles, so they draw its spread exactly — at angles spread evenly over the sector
  const flowing = count('flowing');
  const times = Array.from({ length: flowing }, (_, k) => p50 * Math.exp(sigma * probit((k + 0.5) / flowing)));
  // dealt out at random, so where a spike stands says nothing about how long it took
  for (let k = times.length - 1; k > 0; k--) {
    const j = Math.floor(random() * (k + 1));
    [times[k], times[j]] = [times[j]!, times[k]!];
  }
  times.forEach((t, k) => {
    const angle = sector.a0 + pad + ((k + random()) / flowing) * (span - 2 * pad);
    spikes.push({ from: spikeFrom(angle, random), to: arenaPoint(timeRadius(t), angle), state: 'flowing', seconds: t, seed: random() });
  });

  // throttled: answered late, towards the asset that slows them
  const slow = marks.find((m) => m.trouble.state === 'slowed');
  const throttled = count('throttled');
  for (let k = 0; k < throttled; k++) {
    const t = p50 * THROTTLE * Math.exp(sigma * probit((k + 0.5) / throttled));
    const reach = Math.min(0.14, span / 3);
    const centre = slow ? slow.angle : sector.mid;
    const angle = Math.max(sector.a0 + pad, Math.min(sector.a1 - pad, centre + (random() - 0.5) * 2 * reach));
    spikes.push({ from: spikeFrom(angle, random), to: arenaPoint(timeRadius(t), angle), state: 'throttled', seconds: t, trouble: slow?.trouble.key, seed: random() });
  }

  // what does not get through runs out to the asset that stops it: the assets holding agents by how many they hold, else the one slowing the traffic, else one of the group's own
  const held = marks.filter((m) => m.trouble.agents > 0);
  const targets = held.length ? held : marks;
  const weights = held.length ? held.map((m) => m.trouble.agents) : targets.map(() => 1);
  for (const state of ['awaiting', 'blocked', 'failed'] as FlowState[]) {
    const m = count(state);
    if (!m) continue;
    const shares = targets.length ? apportion(weights, m) : [m];
    shares.forEach((share, ti) => {
      const mark = targets[ti];
      const angle = mark ? mark.angle : assetAngle(sector, Math.floor(random() * s.assets));
      const spread = Math.min(assetPitch(sector) * 0.35, 0.02);
      for (let k = 0; k < share; k++) {
        const to = arenaPoint(BURST.band - 2 - random() * 3, angle + (random() - 0.5) * 2 * spread);
        spikes.push({ from: spikeFrom(angle + (random() - 0.5) * 0.6, random), to, state, seconds: null, trouble: mark?.trouble.key, seed: random() });
      }
    });
  }

  const answered = spikes.flatMap((spike) => (spike.seconds == null ? [] : [spike.seconds])).sort((a, b) => a - b);
  const p95Seen = answered.length ? answered[Math.max(0, Math.ceil(answered.length * 0.95) - 1)]! : null;
  return { ...sector, spikes, p95: p95Seen, marks };
}

/** The goal's sectors, each with its spikes, the busiest group first. */
export function burstSectors(model: Pick<GoalBurstModel, 'goal' | 'groups'>): BurstSector[] {
  const goalKey = model.goal.id || model.goal.code || model.goal.name;
  const groups = [...model.groups].sort((a, b) => b.section.share - a.section.share);
  return layoutSectors(groups).map((sector) => sectorSpikes(goalKey, sector));
}

/**
 * The calls as the painter draws them, sparks out of the cloud: those that
 * get through to the middle of each sector, and those held up to the asset
 * that holds them, turned back in its colour.
 */
export function burstSlots(sectors: BurstSector[]): CallSlot[] {
  return sectors.flatMap((sector) => {
    const s = sector.group.section;
    const calls = s.calls ?? 0;
    const flow: CallSlot = { goal: BURST_GOAL, angle: sector.mid, calls: calls * mixOf(sector.group, 'flowing'), trouble: 0 };
    const held = sector.marks.map(
      ({ trouble, angle }): CallSlot => ({
        goal: BURST_GOAL,
        angle,
        calls: Math.max(1, (calls * s.slowed * (trouble.agents || 1)) / Math.max(1, s.crew.held || sector.marks.length)),
        trouble: 1,
        ...(trouble.state === 'slowed' ? {} : { hold: trouble.state }),
      }),
    );
    return [flow, ...held];
  });
}

/** What the burst takes of the stage, seen as at rest, design px from the pivot: half its width, and how far it reaches up and down. */
export function burstExtent(plan: boolean) {
  const out = BURST.band + BURST.named + 6;
  if (plan) return { half: out, up: out, down: out };
  const P: Project = projector(arenaPose(DEFAULT_CAMERA, plan));
  const rim = Array.from({ length: 64 }, (_, i) => P(...arenaPoint(out, (i / 64) * TAU)));
  const top = Math.min(...rim.map((p) => p.y), PIVOT_Y - BURST.core);
  const bottom = Math.max(...rim.map((p) => p.y), PIVOT_Y + BURST.core);
  return { half: out, up: PIVOT_Y - top, down: bottom - PIVOT_Y };
}

/** The aisle the time scale's figures stand in: of the gaps between sectors, the one nearest the viewer at rest. */
export function frontAisle(sectors: BurstSector[], plan: boolean): number {
  if (!sectors.length) return -Math.PI / 2;
  const rest = projector(arenaPose(DEFAULT_CAMERA, plan));
  const aisles = sectors.map((s, i) => {
    const next = sectors[(i + 1) % sectors.length]!;
    const a0 = next.a0 <= s.a1 ? next.a0 + TAU : next.a0;
    return (s.a1 + a0) / 2;
  });
  return aisles.reduce((best, a) => (rest(...arenaPoint(BURST.over, a)).y > rest(...arenaPoint(BURST.over, best)).y ? a : best));
}
