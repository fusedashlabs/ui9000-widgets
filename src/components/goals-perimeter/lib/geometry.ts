import type { GoalPlacement } from './layout.js';
import { bendNormal, hashSeed, seededRandom } from './scatter.js';
import type { PerimeterGoal, ExceptionState } from './types.js';

/** Clockwise angle from 12 o'clock → point on a circle. */
function polar(x: number, y: number, r: number, angle: number): { x: number; y: number } {
  return { x: x + r * Math.sin(angle), y: y - r * Math.cos(angle) };
}

const f = (n: number) => Number(n.toFixed(2));

/**
 * The perimeter: an arc from 12 o'clock, clockwise, as long as the goal's
 * health. Full health closes the ring; none draws nothing.
 */
export function arcPath(x: number, y: number, r: number, fraction: number): string {
  if (fraction <= 0.001) return '';
  if (fraction >= 0.999) {
    return `M${f(x)},${f(y - r)}A${f(r)},${f(r)} 0 1 1 ${f(x)},${f(y + r)}A${f(r)},${f(r)} 0 1 1 ${f(x)},${f(y - r)}`;
  }
  const end = polar(x, y, r, fraction * Math.PI * 2);
  const large = fraction > 0.5 ? 1 : 0;
  return `M${f(x)},${f(y - r)}A${f(r)},${f(r)} 0 ${large} 1 ${f(end.x)},${f(end.y)}`;
}

const TICK_START = (98 * Math.PI) / 180;
const TICK_STEP = (7.5 * Math.PI) / 180;
export const MAX_TICKS = 12;

/** Exception ticks outside the ring: square root of IMPURE, at most 12. */
export function exceptionTickCount(impure: number): number {
  if (impure <= 0) return 0;
  return Math.min(MAX_TICKS, Math.max(1, Math.round(Math.sqrt(impure))));
}

export function tickSegments(p: GoalPlacement, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = TICK_START + i * TICK_STEP;
    const a = polar(p.x, p.y, p.r + 7, angle);
    const b = polar(p.x, p.y, p.r + 16, angle);
    return { x1: f(a.x), y1: f(a.y), x2: f(b.x), y2: f(b.y) };
  });
}

export const MAX_DIAMONDS = 4;

/** Half the width of a resource-group diamond, flat tip to flat tip. */
export function diamondHalf(r: number): number {
  return 8 + r * 0.135;
}

/** A diamond with its four tips cut flat. */
export function diamondPath(e: number): string {
  const c = e * 0.16;
  const s = e + c;
  const pts = [
    [-c, -s + c],
    [c, -s + c],
    [s - c, -c],
    [s - c, c],
    [c, s - c],
    [-c, s - c],
    [-s + c, c],
    [-s + c, -c],
  ];
  return `M${pts.map(([x, y]) => `${f(x!)},${f(y!)}`).join('L')}Z`;
}

/** Diamonds sit in a row on the cloud's centre, tips nearly touching. */
export function diamondSlots(p: GoalPlacement, count: number) {
  const e = diamondHalf(p.r);
  const step = e * 1.9;
  const shown = Math.min(count, MAX_DIAMONDS);
  return Array.from({ length: shown }, (_, i) => ({
    x: f(p.x + (i - (shown - 1) / 2) * step),
    y: f(p.y),
    e,
  }));
}

export interface MarkerSpot {
  x: number;
  y: number;
  state: ExceptionState;
  /** Index into `goal.exceptions`. */
  exception: number;
}

/** Glyphs per exception group: about one per doubling, up to four. */
export function glyphsFor(count: number): number {
  return Math.min(4, Math.max(1, Math.ceil(Math.log2(count + 1))));
}

const MAX_MARKERS = 12;

/**
 * Status markers scattered between the diamonds and the ring, clear of the
 * diamond row and of each other. Seeded by goal id.
 */
export function markerSpots(goal: PerimeterGoal, p: GoalPlacement): MarkerSpot[] {
  const rand = seededRandom(hashSeed(`markers:${goal.id}`));
  const e = diamondHalf(p.r);
  const rowHalf = goal.resourceGroups.length
    ? (Math.min(goal.resourceGroups.length, MAX_DIAMONDS) * e * 1.9) / 2 + 6
    : 0;
  const gap = Math.max(14, p.r * 0.14);
  const spots: MarkerSpot[] = [];
  goal.exceptions.forEach((exception, index) => {
    for (let g = 0; g < glyphsFor(exception.count) && spots.length < MAX_MARKERS; g += 1) {
      for (let tries = 0; tries < 24; tries += 1) {
        const angle = rand() * Math.PI * 2;
        const dist = p.r * (0.4 + rand() * 0.55);
        const x = p.x + Math.cos(angle) * dist;
        const y = p.y + Math.sin(angle) * dist;
        const onRow = rowHalf && Math.abs(x - p.x) < rowHalf && Math.abs(y - p.y) < e * 1.4 + 6;
        const crowded = spots.some((s) => Math.hypot(s.x - x, s.y - y) < gap);
        if (onRow || crowded) continue;
        spots.push({ x: f(x), y: f(y), state: exception.state, exception: index });
        break;
      }
    }
  });
  return spots;
}

/**
 * The red line of an unavailable connection: ring edge to ring edge, bowed
 * the same way as the bundles, with its marker at the middle.
 */
export function unavailableLine(s: GoalPlacement, t: GoalPlacement) {
  const { nx, ny, len } = bendNormal(s, t);
  const cx = (s.x + t.x) / 2 + nx * len * 0.1;
  const cy = (s.y + t.y) / 2 + ny * len * 0.1;
  const edge = (p: GoalPlacement) => {
    const d = Math.max(1, Math.hypot(cx - p.x, cy - p.y));
    return { x: p.x + ((cx - p.x) / d) * p.r, y: p.y + ((cy - p.y) / d) * p.r };
  };
  const a = edge(s);
  const b = edge(t);
  return {
    d: `M${f(a.x)},${f(a.y)}Q${f(cx)},${f(cy)} ${f(b.x)},${f(b.y)}`,
    mid: { x: f(0.25 * a.x + 0.5 * cx + 0.25 * b.x), y: f(0.25 * a.y + 0.5 * cy + 0.25 * b.y) },
  };
}
