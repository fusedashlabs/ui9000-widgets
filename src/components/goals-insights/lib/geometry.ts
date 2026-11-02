import { rng } from '../../goals-perimeter/lib/random.js';

/**
 * Geometry of the evidence column ("tornado"), in viewBox units (1000 × 800),
 * as the Goals & insights design draws it. A cone opens under the goal at the
 * apex, then a body of strata narrows into the tail. Each stratum is one
 * 2-hour cycle, newest at the top; a claim sits on the stratum of the hour it
 * was filed.
 */
export const VIEW = { width: 1000, height: 800 } as const;
export const CX = 500;
export const APEX_Y = 118;
const CONE_BASE = 352;
export const TAIL_Y = 774;

/** Default opening of the strata: the ratio of a ring's height to its width. */
export const DEFAULT_TILT = 0.19;
export const TILT_RANGE = [0.02, 0.46] as const;
/** How far the wheel zooms the column, out and in. */
export const ZOOM_RANGE = [0.6, 2.4] as const;

export const CYCLE_HOURS = 2;
const CONE_RINGS = 14;
const BODY_RINGS = 18;
export const CYCLES = CONE_RINGS + 1 + BODY_RINGS;
/** Hours the column reaches back: older claims settle on its last ring. */
export const COLUMN_HOURS = CYCLES * CYCLE_HOURS;

/** Half-width of the column at height `y`. */
export function halfWidthAt(y: number): number {
  if (y <= CONE_BASE) return 26 + ((y - APEX_Y) / (CONE_BASE - APEX_Y)) * 172;
  const t = (y - CONE_BASE) / (TAIL_Y - CONE_BASE);
  return 198 + Math.sin(Math.min(1, t * 1.25) * Math.PI) * 78 - t * 150;
}

/** Where something filed `hours` ago stands: on the strata, between the rings of its cycle. */
export function hoursY(hours: number): number {
  const c = Math.min(CYCLES - 0.6, Math.max(0, hours) / CYCLE_HOURS);
  return c <= CONE_RINGS
    ? APEX_Y + ((CONE_BASE - APEX_Y) * c) / CONE_RINGS
    : CONE_BASE + ((TAIL_Y - CONE_BASE) * (c - CONE_RINGS)) / (BODY_RINGS + 1);
}

/** The cycle of something filed `hours` ago. */
export const cycleOf = (hours: number) => Math.min(CYCLES - 1, Math.floor(Math.max(0, hours) / CYCLE_HOURS));

/** A claim's diamond, half its diagonal, from its evidence volume: 5 for a usual claim, a little more with more records behind it. */
export const claimRadius = (records: number) => Math.max(4.5, Math.min(7, 2.4 + Math.log10(1 + records) * 1.4));

export interface Stratum {
  /** Cycle index, 0 = the most recent 2 hours. */
  cycle: number;
  y: number;
  rx: number;
  /** The oldest cycles in the tail step back. */
  old: boolean;
  opacity: number;
  /** Cycles that carry a time label ("now", "−8h"…): every fourth, eight hours. */
  labelled: boolean;
}

export const STRATA: Stratum[] = [
  ...Array.from({ length: CONE_RINGS + 1 }, (_, i) => {
    const y = APEX_Y + (CONE_BASE - APEX_Y) * (i / CONE_RINGS);
    return { cycle: i, y, rx: halfWidthAt(y), old: false, opacity: 0.14 + i * 0.036, labelled: i % 4 === 0 };
  }),
  ...Array.from({ length: BODY_RINGS }, (_, n) => {
    const i = n + 1;
    const y = CONE_BASE + (TAIL_Y - CONE_BASE) * (i / (BODY_RINGS + 1));
    const old = i > 12;
    return { cycle: CONE_RINGS + i, y, rx: halfWidthAt(y), old, opacity: old ? 0.55 : 0.42, labelled: (CONE_RINGS + i) % 4 === 0 };
  }),
];

/** The lit rings: every fourth. */
export const MAJOR_RINGS = STRATA.filter((s) => s.labelled).length;

/** Hours covered by a cycle: [from, to] hours ago. */
export const cycleSpan = (cycle: number): [number, number] => [cycle * CYCLE_HOURS, (cycle + 1) * CYCLE_HOURS];

/**
 * The blanket wrapped round the column: a translucent skin a little wider
 * than its rings, rounded over the ring of now and drawn in to a soft point
 * under the last ring. Its outline is the column's own, smoothed, so the skin
 * runs on in one sweep where the rings step.
 */
export const WRAP_TOP = APEX_Y - 10;
const WRAP_FLOOR = STRATA[STRATA.length - 1]!.y;
export const WRAP_BOTTOM = WRAP_FLOOR + 30;
/** Samples of the blanket's half-width, evenly from its top to its bottom. */
export const WRAP_SAMPLES = 128;

export const WRAP_PROFILE: number[] = (() => {
  const at = (i: number) => WRAP_TOP + ((WRAP_BOTTOM - WRAP_TOP) * i) / (WRAP_SAMPLES - 1);
  const raw = Array.from({ length: WRAP_SAMPLES }, (_, i) => halfWidthAt(Math.min(WRAP_FLOOR, Math.max(APEX_Y, at(i)))) * 1.05 + 5);
  // a gaussian across the samples, about 36 units either way, so the outline sweeps where the column steps
  const sigma = (36 / (WRAP_BOTTOM - WRAP_TOP)) * (WRAP_SAMPLES - 1);
  const blur = (xs: number[]) =>
    xs.map((_, i) => {
      let sum = 0;
      let weight = 0;
      for (let k = -3 * sigma; k <= 3 * sigma; k++) {
        const j = Math.min(WRAP_SAMPLES - 1, Math.max(0, Math.round(i + k)));
        const w = Math.exp(-(k * k) / (2 * sigma * sigma));
        sum += xs[j]! * w;
        weight += w;
      }
      return sum / weight;
    });
  // never inside a ring: where the smoothing cuts a bulge, the shortfall is spread out and smoothed in too
  let smooth = blur(raw);
  for (let pass = 0; pass < 4; pass++) {
    const short = raw.map((r, i) => Math.max(0, r - 2 - smooth[i]!));
    const reach = Math.ceil(sigma);
    const spread = short.map((_, i) => Math.max(...short.slice(Math.max(0, i - reach), i + reach + 1)));
    smooth = blur(spread).map((d, i) => smooth[i]! + d * 1.6);
  }
  return smooth.map((w, i) => {
    const y = at(i);
    // rounded over the ring of now; under the last ring it draws in to a soft point, as a drop does
    if (y < APEX_Y) return w * Math.sqrt(Math.max(0, 1 - ((APEX_Y - y) / (APEX_Y - WRAP_TOP)) ** 2));
    if (y > WRAP_FLOOR) return w * Math.pow(Math.max(0, 1 - (y - WRAP_FLOOR) / (WRAP_BOTTOM - WRAP_FLOOR)), 0.6);
    return w;
  });
})();

/** Half-width of the blanket at height `y`. */
export function wrapWidthAt(y: number): number {
  const at = ((y - WRAP_TOP) / (WRAP_BOTTOM - WRAP_TOP)) * (WRAP_SAMPLES - 1);
  if (at <= 0 || at >= WRAP_SAMPLES - 1) return 0;
  const i = Math.floor(at);
  return WRAP_PROFILE[i]! + (WRAP_PROFILE[i + 1]! - WRAP_PROFILE[i]!) * (at - i);
}

/** The blanket's outline, all the way round, for its rim and — where the light layer is off — its glass. */
export const WRAP_OUTLINE = (() => {
  const steps = 120;
  const right = Array.from({ length: steps + 1 }, (_, i) => {
    const y = WRAP_TOP + ((WRAP_BOTTOM - WRAP_TOP) * i) / steps;
    return [CX + wrapWidthAt(y), y] as const;
  });
  const left = [...right].reverse().map(([x, y]) => [2 * CX - x, y] as const);
  return [...right, ...left].map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('') + 'Z';
})();

export const TAIL_CURVE = `M ${CX - 26} ${TAIL_Y - 30} C ${CX - 10} ${TAIL_Y} ${CX + 10} ${TAIL_Y} ${CX + 26} ${TAIL_Y - 30}`;

/** The column's axis, tail to apex: the spine the sources rise along. */
export const AXIS = `M ${CX} ${TAIL_Y - 8} L ${CX} ${APEX_Y + 6}`;

export interface Mote {
  /** Place on the ring's disc, −1 … 1 of its radii. */
  ux: number;
  uy: number;
  r: number;
  opacity: number;
}

const motes = new Map<string, Mote[]>();

/** The dust standing in a ring's disc: `count` motes — the evidence records that came in during its cycle — gathered towards the axis. */
export function ringMotes(cycle: number, count: number): Mote[] {
  const key = `${cycle}|${count}`;
  let out = motes.get(key);
  if (!out) {
    // many payloads in one page would otherwise grow the cache without bound
    if (motes.size > 512) motes.clear();
    const r = rng(4100 + 13 * cycle);
    out = Array.from({ length: count }, () => {
      const d = 0.92 * Math.pow(r(), 1.5);
      const a = r() * Math.PI * 2;
      return { ux: d * Math.cos(a), uy: d * Math.sin(a), r: 0.5 + 0.8 * r(), opacity: 0.25 + 0.55 * r() };
    });
    motes.set(key, out);
  }
  return out;
}

/** A diamond of half-diagonal `d` round the origin, as the map draws its resource groups. */
export const diamondPath = (d: number) => `M0 ${(-d).toFixed(2)}L${d.toFixed(2)} 0L0 ${d.toFixed(2)}L${(-d).toFixed(2)} 0Z`;

export interface Point {
  x: number;
  y: number;
}

/** A claim's line up to a goal. */
export const goalLinkPath = (p: Point, gx: number, gy: number, sway = 0, swing = 0) =>
  `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} C ${(p.x + sway).toFixed(1)} ${(p.y - 120).toFixed(1)} ${(gx + swing).toFixed(1)} ${gy + 130} ${gx} ${gy + 22}`;

/** Corroboration between claims; `bend` moves the midpoint up or down. */
export const webPath = (a: Point, b: Point, bend: number) =>
  `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${((a.x + b.x) / 2).toFixed(1)} ${((a.y + b.y) / 2 + bend).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;

/** Lineage from a claim to the next one on its subject; `bend` moves the midpoint sideways. */
export const lineagePath = (a: Point, b: Point, bend: number) =>
  `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${((a.x + b.x) / 2 + bend).toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;

/** Claims on the far side of the column recede. */
export const nearness = (depth: number) => 0.72 + (0.28 * (depth + 1)) / 2;

/** Yaw wrapped into [−π, π). */
export function wrapAngle(a: number): number {
  return a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));
}

/**
 * Where the column's goals stand: the main goal over the apex, connected
 * goals either side, level, their labels hanging below them and running
 * outwards, clear of the cone. There is room beside the apex for two; the
 * normalizer keeps that many.
 */
export const GOAL_AT = {
  main: { x: CX, y: 56 },
  aside: [
    { x: CX - 190, y: 152 },
    { x: CX + 190, y: 152 },
  ],
} as const;

/** Connected goals the column has room for beside its apex. */
export const MAX_CONNECTED = GOAL_AT.aside.length;
