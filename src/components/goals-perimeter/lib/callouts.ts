import type { PerimeterGoal } from './types.js';

/**
 * Where each goal's callout goes. A callout leaves its goal's ring on a
 * diagonal, runs level for a moment and ends at the spine of its label. It
 * can leave towards any of the four corners — or, where none is clear,
 * straight out to a side, down or up; the set of places is chosen together,
 * so that no label lands on a goal, a link, a resource name, another label
 * or the edge of the map window. Everything is in plot px.
 */

export type Corner = 'se' | 'ne' | 'sw' | 'nw' | 'e' | 'w' | 's' | 'n';

/** In order of preference: the diagonals first, lower right before all; then straight out to a side, straight down, straight up. */
const CORNERS: Corner[] = ['se', 'ne', 'sw', 'nw', 'e', 'w', 's', 'n'];

/** Anatomy of a callout, in screen px. */
export const CALLOUT = {
  /** From the goal's radius to where the leader starts — clear of the ring's scale. */
  reach: 27,
  diagonal: 22,
  run: 14,
  /** From the spine to the text. */
  pad: 11,
  /** Label height: head (id · status, name) and the readout under it. Compact, a label is its head. */
  height: 77,
  compactHeight: 36,
  head: 36,
  /** Readout width — the narrowest a label gets. */
  readout: 208,
} as const;

/** Width of a goal's label: the wider of its name and its readout; compact, as wide as its head. */
export const calloutWidth = (goal: PerimeterGoal, compact: boolean) =>
  Math.max(compact ? 96 : CALLOUT.readout, Math.ceil(goal.name.length * 6.8) + 24);

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface CalloutSpec {
  id: string;
  /** The goal's centre and radius as drawn. */
  x: number;
  y: number;
  r: number;
  /** Label width. */
  width: number;
}

export interface Callout {
  id: string;
  corner: Corner;
  /** 1 = label to the right of its spine, −1 = to the left. */
  side: 1 | -1;
  /** Leader: from the ring (a), through the elbow (e), to the spine (h). */
  ax: number;
  ay: number;
  ex: number;
  ey: number;
  hx: number;
  hy: number;
  /** The label's box. */
  rect: Rect;
  /** How much of it shows, 0–1: a callout that has just taken a new place fades in there. */
  fade: number;
  /** The place it has just left, fading out, while the change lasts. */
  leaving?: Callout;
}

export interface Obstacles {
  /** Goals with their rings. */
  circles: { id: string; x: number; y: number; r: number }[];
  /** Resource names. */
  rects: Rect[];
  /** Points along the links. */
  points: { x: number; y: number }[];
  /** The map window. */
  frame: Rect;
}

export function placeCallout(spec: CalloutSpec, corner: Corner, height: number, frame: Rect): Callout {
  const level = corner === 'e' || corner === 'w';
  const upright = corner === 's' || corner === 'n';
  const sx = upright ? 0 : corner.endsWith('e') ? 1 : -1;
  const sy = level ? 0 : corner[0] === 's' ? 1 : -1;
  // off the ring on a diagonal — or straight out to a side, straight down or straight up
  const d = level || upright ? 1 : Math.SQRT1_2;
  // straight down or up, the leader runs on into the label's spine; the label hangs to its right, or to its
  // left where the right would take it out of the map window
  const side = upright ? (spec.x + CALLOUT.pad + spec.width > frame.x1 ? -1 : 1) : sx;
  const ax = spec.x + sx * (spec.r + CALLOUT.reach) * d;
  const ay = spec.y + sy * (spec.r + CALLOUT.reach) * d;
  const ex = ax + sx * CALLOUT.diagonal * d;
  const ey = ay + sy * CALLOUT.diagonal * d;
  const hx = ex + sx * CALLOUT.run;
  // going up, the leader meets the foot of the label's spine; straight down, its top; otherwise the head of the label
  const y0 = sy < 0 ? ey - height : upright ? ey : ey - CALLOUT.head / 2;
  const inner = hx + side * CALLOUT.pad;
  const outer = inner + side * spec.width;
  return {
    id: spec.id,
    corner,
    side: side as 1 | -1,
    ax,
    ay,
    ex,
    ey,
    hx,
    hy: ey,
    rect: { x0: Math.min(inner, outer), x1: Math.max(inner, outer), y0, y1: y0 + height },
    fade: 1,
  };
}

const grow = (r: Rect, by: number): Rect => ({ x0: r.x0 - by, y0: r.y0 - by, x1: r.x1 + by, y1: r.y1 + by });

const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/** How deep a circle reaches into a rectangle (0 when clear). */
function intrusion(rect: Rect, c: { x: number; y: number; r: number }) {
  const dx = Math.max(rect.x0 - c.x, 0, c.x - rect.x1);
  const dy = Math.max(rect.y0 - c.y, 0, c.y - rect.y1);
  return Math.max(0, c.r - Math.hypot(dx, dy));
}

/** Cost of one callout against everything that does not move. Lower is better. */
export function calloutCost(c: Callout, obstacles: Obstacles): number {
  // lower right is home; the others are taken in turn when home is not clear
  let total = CORNERS.indexOf(c.corner) * 6;
  const box = grow(c.rect, 4);
  const f = obstacles.frame;
  const outside = Math.max(0, f.x0 - box.x0) + Math.max(0, box.x1 - f.x1) + Math.max(0, f.y0 - box.y0) + Math.max(0, box.y1 - f.y1);
  if (outside > 0) total += 90 + outside * 4;
  for (const circle of obstacles.circles) {
    const depth = intrusion(box, circle);
    if (depth > 0) total += 160 + depth * 5;
    if (circle.id === c.id) continue;
    // the leader itself should not cross another goal
    for (const [x, y] of [
      [c.ex, c.ey],
      [c.hx, c.hy],
    ] as const)
      if (Math.hypot(x - circle.x, y - circle.y) < circle.r) total += 50;
  }
  // the leader's own run, sampled, should not pass through a diamond or its name either
  const leader = [0.25, 0.6, 1]
    .map((t) => [c.ax + (c.ex - c.ax) * t, c.ay + (c.ey - c.ay) * t])
    .concat([0.5, 1].map((t) => [c.ex + (c.hx - c.ex) * t, c.ey]));
  for (const rect of obstacles.rects) {
    const area = overlap(box, rect);
    if (area > 0) total += 40 + area * 0.06;
    const near = grow(rect, 3);
    if (leader.some(([x, y]) => x! > near.x0 && x! < near.x1 && y! > near.y0 && y! < near.y1)) total += 110;
  }
  // a label lying across a link is worse than any clear place, however far down the list
  const reach = grow(c.rect, 6);
  let across = 0;
  for (const p of obstacles.points) if (p.x > reach.x0 && p.x < reach.x1 && p.y > reach.y0 && p.y < reach.y1) across++;
  if (across) total += 60 + across * 10;
  return total;
}

/** How much better another corner must be before a callout leaves the one it has. */
const STAY = 34;
/**
 * A callout does not jump to a new place: it fades out where it was while it
 * fades in where it is going, over this long. And having moved, it stays put
 * for a while unless staying would mean a collision.
 */
const FADE_MS = 320;
const DWELL_MS = 900;
const DWELL = 110;
/** Steps the search for the best set of corners may take: all of them for the design's six goals, a bound for many. */
const SEARCH_BUDGET = 400_000;

/**
 * Places every callout, choosing the corners together. Each board keeps its
 * own memory: the corners chosen last, so a callout only moves when it has
 * to, and the place each last left. While `hold` stays the same — the view
 * has not changed, only drifted — the places chosen last are kept. When a
 * place does change, the callout is returned mid-change (`fade`, `leaving`)
 * for as long as the change lasts, unless `animate` is off.
 */
export function createCalloutLayout(now: () => number = () => performance.now()) {
  const memory = new Map<string, Corner>();
  const moves = new Map<string, { from: Corner; at: number }>();
  let chosenFor = '';

  const movedLately = (id: string) => {
    const move = moves.get(id);
    return !!move && now() - move.at < DWELL_MS;
  };

  /** A callout at the place chosen for it — mid-change, with the place it is leaving. */
  const settle = (spec: CalloutSpec, corner: Corner, height: number, frame: Rect, animate: boolean): Callout => {
    const t0 = now();
    const before = memory.get(spec.id);
    if (before && before !== corner) moves.set(spec.id, { from: before, at: t0 });
    memory.set(spec.id, corner);
    const callout = placeCallout(spec, corner, height, frame);
    const move = moves.get(spec.id);
    const t = move && animate ? (t0 - move.at) / FADE_MS : 1;
    if (!move || t >= 1) return callout;
    const shown = t * t * (3 - 2 * t);
    return { ...callout, fade: shown, leaving: { ...placeCallout(spec, move.from, height, frame), fade: 1 - shown } };
  };

  return {
    /** Whether a callout is still mid-change, so the board keeps drawing. */
    changing: () => [...moves.values()].some((move) => now() - move.at < FADE_MS),
    layout(specs: CalloutSpec[], obstacles: Obstacles, height: number, hold = '', animate = true): Callout[] {
      if (hold && hold === chosenFor && specs.every((spec) => memory.has(spec.id)))
        return specs.map((spec) => settle(spec, memory.get(spec.id)!, height, obstacles.frame, animate));
      chosenFor = hold;
      const options = specs.map((spec) =>
        CORNERS.map((corner) => {
          const callout = placeCallout(spec, corner, height, obstacles.frame);
          return {
            callout,
            cost: calloutCost(callout, obstacles) + (memory.get(spec.id) === corner ? 0 : STAY + (movedLately(spec.id) ? DWELL : 0)),
          };
        }),
      );
      // labels against each other
      const clash = (a: Callout, b: Callout) => {
        const area = overlap(grow(a.rect, 7), grow(b.rect, 7));
        return area > 0 ? 160 + area * 0.06 : 0;
      };

      // a greedy pass first, so a board with many goals has a good answer before the search runs out of budget
      const pick: number[] = [];
      let bestCost = 0;
      for (let i = 0; i < specs.length; i++) {
        let choice = { c: 0, cost: Infinity };
        for (let c = 0; c < CORNERS.length; c++) {
          let cost = options[i]![c]!.cost;
          for (let j = 0; j < i; j++) cost += clash(options[i]![c]!.callout, options[j]![pick[j]!]!.callout);
          if (cost < choice.cost) choice = { c, cost };
        }
        pick[i] = choice.c;
        bestCost += choice.cost;
      }
      let best: number[] = [...pick];
      let budget = SEARCH_BUDGET;
      const search = (i: number, running: number) => {
        if (running >= bestCost || budget-- <= 0) return;
        if (i === specs.length) {
          bestCost = running;
          best = [...pick];
          return;
        }
        for (let c = 0; c < CORNERS.length; c++) {
          let next = running + options[i]![c]!.cost;
          for (let j = 0; j < i; j++) next += clash(options[i]![c]!.callout, options[j]![pick[j]!]!.callout);
          pick[i] = c;
          search(i + 1, next);
        }
      };
      search(0, 0);

      return specs.map((spec, i) => settle(spec, options[i]![best[i]!]!.callout.corner, height, obstacles.frame, animate));
    },
  };
}

/**
 * On a board too small for every label: the callouts that can stand, the
 * largest goals' first. One is left out when its label would land on a
 * label already kept, reach into another goal, or run out of the map window.
 */
export function standingCallouts(
  callouts: readonly Callout[],
  circles: Obstacles['circles'],
  /** Goal ids, most important first. */
  order: readonly string[],
  frame?: Rect,
): Set<string> {
  const kept: Rect[] = [];
  const out = new Set<string>();
  const byId = new Map(callouts.map((c) => [c.id, c]));
  for (const id of order) {
    const c = byId.get(id);
    if (!c) continue;
    const box = grow(c.rect, 4);
    if (kept.some((k) => overlap(box, k) > 0)) continue;
    if (frame && (c.rect.x0 < frame.x0 || c.rect.x1 > frame.x1 || c.rect.y0 < frame.y0 || c.rect.y1 > frame.y1)) continue;
    if (circles.some((circle) => circle.id !== id && intrusion(box, circle) > 0)) continue;
    kept.push(box);
    out.add(id);
  }
  return out;
}
