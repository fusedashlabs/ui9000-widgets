import { sharedByAll } from './model.js';
import { hashString, rng } from './random.js';
import type { GoalsDependencyGraphModel, GraphEdge, GraphGoal } from './types.js';

/**
 * Geometry of the graph, a flat front view in the 1280 × 620 design space:
 * goals root on the baseline, each as a tree of its agents — one tip an
 * agent; the resource groups hang in a row over them; a dependency rises from
 * a goal's root to each group it draws on.
 *
 * The goal at the centre grows the full tree; the others stand as miniatures
 * of theirs. The canopy stops short of the row of groups, so the band between
 * the two stays clear for the lines that cross it.
 */

export const BOARD = { width: 1280, height: 620 } as const;

export const BASELINE = 506;
/** The row the resource groups hang on. */
export const RESOURCE_Y = 122;
/** Where the baseline runs, design px. */
export const BASELINE_SPAN = { x0: 40, x1: 1240 } as const;

/**
 * The goal at the centre stands in the middle of the field, with room either
 * side for its canopy and its readings; the others share what is left, the
 * same distance apart on both sides.
 */
const ROOTS = { centre: 640, main: 225, side: 190, reach: 545 };

/** The distance between neighbouring roots off the centre, for `count` goals. */
export function sideRoom(count: number): number {
  const most = Math.ceil((count - 1) / 2);
  return Math.min(ROOTS.side, (ROOTS.reach - ROOTS.main) / Math.max(1, most - 1));
}

export const TREE = {
  /** How far the largest goal's tree reaches from its root, at the centre. */
  reach: 290,
  /** A tree off the centre, against the same tree at the centre. */
  side: 0.34,
} as const;

/**
 * Root slots along the baseline for `count` goals: the centre first, then the
 * others left to right — half of them to its left, and the odd one out to its
 * right. The row is centred on the board as a whole, so with an even count the
 * centre stands half a gap left of the middle rather than the row leaning right.
 */
export function slotX(count: number): number[] {
  const left = Math.floor((count - 1) / 2);
  const right = count - 1 - left;
  const gap = sideRoom(count);
  const xs = [
    ROOTS.centre,
    ...Array.from({ length: left }, (_, i) => ROOTS.centre - ROOTS.main - (left - 1 - i) * gap),
    ...Array.from({ length: right }, (_, i) => ROOTS.centre + ROOTS.main + i * gap),
  ];
  const shift = BOARD.width / 2 - (Math.min(...xs) + Math.max(...xs)) / 2;
  return xs.map((x) => x + shift);
}

/** Half a group's name: the row's diamonds sit that far left of the middle, so the diamonds and their names together are centred. */
const NAME_HALF = 32;

/** Where each resource group hangs: one row, in the model's order. Their names run to the right of them. */
export function resourcePlaces(model: GoalsDependencyGraphModel): Record<string, { x: number; y: number }> {
  const n = model.resources.length;
  const x0 = 112 - NAME_HALF;
  return Object.fromEntries(model.resources.map((r, i) => [r.id, { x: n === 1 ? BOARD.width / 2 - NAME_HALF : x0 + (i * 1030) / Math.max(1, n - 1), y: RESOURCE_Y }]));
}

// ── Trees ────────────────────────────────────────────────────────

export interface TreeForm {
  /** The trunk's rays and their first forks, as one path about the root (0, 0), at the centre's size. */
  limbs: string;
  /** The finer branches, down to the tips. */
  twigs: string;
  /** x, y, z per tip, about the root — exactly one tip for every agent the tree carries. */
  tips: Float32Array;
  /** How far the tree reaches from its root. */
  reach: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Branch levels drawn as limbs; deeper ones are twigs. */
const LIMB_LEVELS = 2;

/**
 * A goal's tree: a fan of rays from the root, each forking until it has a
 * tip for every agent it carries — so the tree has exactly `n` tips, and a
 * goal with more agents is a wider, denser tree. Each ray is turned about the
 * vertical through the root, which gives its tips a depth. `largest` is the
 * most agents any goal has: a smaller goal is a smaller tree.
 */
export function growTree(goal: GraphGoal, n: number, largest: number): TreeForm {
  const r = rng(hashString(goal.code || goal.id, 911));
  const rays = clamp(Math.round(Math.sqrt(n) / 2.4), Math.min(5, Math.max(1, n)), 14);
  /** Half the fan, radians from the vertical. */
  const fan = 0.4 + (0.34 * (rays - 5)) / 9;
  const depth = clamp(Math.ceil(Math.log2(Math.max(1, n / rays))), 2, 6);

  const segs: [x1: number, y1: number, x2: number, y2: number, ray: number, level: number][] = [];
  const tips: [x: number, y: number, ray: number][] = [];
  const limit = fan + 0.22;
  const grow = (x: number, y: number, angle: number, length: number, level: number, leaves: number, ray: number) => {
    const a = clamp(angle, -limit, limit);
    const x2 = x + Math.sin(a) * length;
    const y2 = y - Math.cos(a) * length;
    segs.push([x, y, x2, y2, ray, level]);
    if (leaves === 1) return void tips.push([x2, y2, ray]);
    if (level >= depth) {
      // out of forks: what is left opens as a tuft of short twigs, a tip each
      for (let i = 0; i < leaves; i++) {
        const ta = clamp(a + ((i + 0.5) / leaves - 0.5) * Math.min(2.2, 0.55 * leaves) + (r() - 0.5) * 0.3, -limit - 0.5, limit + 0.5);
        const tl = length * (0.42 + r() * 0.5);
        const tx = x2 + Math.sin(ta) * tl;
        const ty = Math.min(-2, y2 - Math.cos(ta) * tl);
        segs.push([x2, y2, tx, ty, ray, level + 1]);
        tips.push([tx, ty, ray]);
      }
      return;
    }
    // now and then one agent stands on a spur of its own, part-way up: a tree is not all crown
    let left = leaves;
    if (left >= 4 && r() < 0.36) {
      const sa = clamp(a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), -limit - 0.5, limit + 0.5);
      const sl = length * (0.3 + r() * 0.4);
      const sx = x2 + Math.sin(sa) * sl;
      const sy = Math.min(-2, y2 - Math.cos(sa) * sl);
      segs.push([x2, y2, sx, sy, ray, Math.max(level + 1, LIMB_LEVELS)]);
      tips.push([sx, sy, ray]);
      left--;
    }
    const forks = left >= 3 && r() < 0.24 ? 3 : 2;
    // the agents it carries are shared out unevenly, as real branches are
    const shares: number[] = [];
    for (let i = 0; i < forks; i++) {
      const rest = forks - i - 1;
      const take = rest === 0 ? left : clamp(Math.round((left / (rest + 1)) * (0.6 + r() * 0.8)), 1, left - rest);
      shares.push(take);
      left -= take;
    }
    const spread = 0.42 + 0.05 * (6 - depth);
    shares.forEach((share, i) =>
      grow(x2, y2, a + (i - (forks - 1) / 2) * spread * (0.6 + r() * 0.8) + (r() - 0.5) * 0.2, length * (0.74 + r() * 0.14), level + 1, share, ray),
    );
  };
  for (let i = 0; i < rays; i++) {
    const t = rays === 1 ? 0.5 : i / (rays - 1);
    const leaves = Math.floor(((i + 1) * n) / rays) - Math.floor((i * n) / rays);
    if (leaves > 0) grow(0, 0, (t * 2 - 1) * fan + (r() - 0.5) * 0.07, 60 * (0.86 + r() * 0.28), 0, leaves, i);
  }

  // each ray is turned about the vertical axis through the root, then seen flat
  const turn = Array.from({ length: rays }, (_, i) => ((rays === 1 ? 0.5 : i / (rays - 1)) - 0.5) * 1.2 + (r() - 0.5) * 0.3);
  // drawn to its size: a goal with fewer agents is a smaller tree
  const reach = TREE.reach * (0.7 + 0.3 * Math.sqrt(goal.agents.total / Math.max(1, largest)));
  const k = reach / Math.max(1, ...tips.map(([x, y]) => Math.hypot(x, y)));
  const f = (v: number) => (v * k).toFixed(1);
  const path = (from: number, to: number) =>
    segs
      .filter(([, , , , , level]) => level >= from && level < to)
      .map(([x1, y1, x2, y2, ray]) => `M${f(x1 * Math.cos(turn[ray]!))} ${f(y1)}L${f(x2 * Math.cos(turn[ray]!))} ${f(y2)}`)
      .join('');

  const placed = new Float32Array(tips.length * 3);
  tips.forEach(([x, y, ray], i) => placed.set([x * Math.cos(turn[ray]!) * k, y * k, x * Math.sin(turn[ray]!) * k], i * 3));
  return { limbs: path(0, LIMB_LEVELS), twigs: path(LIMB_LEVELS, Infinity), tips: placed, reach };
}

// ── Dependencies ─────────────────────────────────────────────────

/**
 * A dependency as drawn: up out of the root, over to the group, and into it
 * from below. The dependencies of one root fan out from it, and those of one
 * group fan in to it — `lean` is how far each end leans aside.
 */
export function dependencyPath(x0: number, y0: number, x1: number, y1: number, lean0 = 0, lean1 = 0): string {
  const rise = y0 - y1;
  // it climbs over its own root first and crosses to its group high up, in the band the canopies leave clear
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}C${(x0 + lean0).toFixed(1)} ${(y0 - rise * 0.8).toFixed(1)} ${(x1 + lean1).toFixed(1)} ${(y1 + rise * 0.17).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/**
 * Which lane each dependency takes where it leaves its root and where it
 * meets its group, counted from the middle of the bundle — ordered by where
 * the other end stands, so lines of one bundle do not cross each other.
 */
export function dependencyLanes(
  edges: readonly GraphEdge[],
  rootX: Record<string, number>,
  resourceX: Record<string, number>,
): { root: number; resource: number }[] {
  const lanes = edges.map(() => ({ root: 0, resource: 0 }));
  const assign = (group: (e: GraphEdge) => string, order: (e: GraphEdge) => number, end: 'root' | 'resource') => {
    const groups = new Map<string, number[]>();
    edges.forEach((e, i) => groups.set(group(e), [...(groups.get(group(e)) ?? []), i]));
    for (const members of groups.values()) {
      members.sort((a, b) => order(edges[a]!) - order(edges[b]!));
      members.forEach((index, lane) => (lanes[index]![end] = lane - (members.length - 1) / 2));
    }
  };
  assign(
    (e) => e.goal,
    (e) => resourceX[e.resource] ?? 0,
    'root',
  );
  assign(
    (e) => e.resource,
    (e) => rootX[e.goal] ?? 0,
    'resource',
  );
  return lanes;
}

// ── Focus ────────────────────────────────────────────────────────

export interface FocusSets {
  /** Goals and resource groups on a highlighted dependency. */
  lit: Set<string>;
  /** Other goals that draw on the focused goal's groups: what its trouble could reach. */
  soft: Set<string>;
  /** Highlighted dependencies (edge indexes). */
  edges: Set<number>;
  /** The dependencies of those other goals on the shared groups. */
  softEdges: Set<number>;
  active: boolean;
}

/** What a focused goal or a traced resource group lights up. Goal and group ids share no namespace, so the sets keep them apart by kind. */
export function focusSets(model: GoalsDependencyGraphModel, goal: string | null, resource: string | null): FocusSets {
  const lit = new Set<string>();
  const soft = new Set<string>();
  const edges = new Set<number>();
  const softEdges = new Set<number>();
  const shared = sharedByAll(model);
  model.edges.forEach((e, i) => {
    if (e.goal === goal || e.resource === resource) {
      edges.add(i);
      lit.add(`g:${e.goal}`);
      lit.add(`r:${e.resource}`);
    }
  });
  if (goal) {
    lit.add(`g:${goal}`);
    model.edges.forEach((e, i) => {
      if (e.goal !== goal && lit.has(`r:${e.resource}`) && !shared.has(e.resource) && !edges.has(i)) {
        softEdges.add(i);
        soft.add(`g:${e.goal}`);
      }
    });
  }
  return { lit, soft, edges, softEdges, active: lit.size > 0 };
}

// ── The root's ring ──────────────────────────────────────────────

/** The finest tick step a ring of `circumference` can carry with ticks at least `minGap` apart. */
export function tickStep(circumference: number, minGap = 5.5): number {
  return [0.01, 0.02, 0.05].find((step) => circumference * step >= minGap) ?? 0.1;
}

/**
 * Radial ticks around a ring from `from` to `to` (shares of the circle,
 * clockwise from 12 o'clock). Every tenth of the circle gets a longer tick.
 */
export function ringTicks(cx: number, cy: number, inner: number, minor: number, major: number, step: number, from: number, to: number): string {
  let d = '';
  const first = Math.ceil(from / step - 1e-6);
  const last = Math.floor(to / step + 1e-6);
  for (let i = first; i <= last; i++) {
    const share = i * step;
    if (share >= 0.9999) break;
    const tenth = Math.abs(share * 10 - Math.round(share * 10)) < 1e-6;
    const a = -Math.PI / 2 + share * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const outer = inner + (tenth ? major : minor);
    d += `M${(cx + cos * inner).toFixed(1)} ${(cy + sin * inner).toFixed(1)}L${(cx + cos * outer).toFixed(1)} ${(cy + sin * outer).toFixed(1)}`;
  }
  return d;
}

/** An arc between two shares of a circle, clockwise from 12 o'clock. */
export function ringArc(cx: number, cy: number, r: number, from: number, to: number): string {
  const end = Math.min(to, from + 0.9999);
  const a0 = -Math.PI / 2 + from * Math.PI * 2;
  const a1 = -Math.PI / 2 + end * Math.PI * 2;
  return `M${(cx + r * Math.cos(a0)).toFixed(2)} ${(cy + r * Math.sin(a0)).toFixed(2)}A${r.toFixed(2)} ${r.toFixed(2)} 0 ${end - from > 0.5 ? 1 : 0} 1 ${(cx + r * Math.cos(a1)).toFixed(2)} ${(cy + r * Math.sin(a1)).toFixed(2)}`;
}
