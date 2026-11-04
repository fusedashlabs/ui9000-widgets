import { BOARD, CALLOUT, goalRadius, type PerimeterGoal } from '../../goals-perimeter/lib/index.js';
import type { BipartiteResource, Dependency } from './types.js';

/**
 * The goals in a column on the left, the resource groups they draw on in a
 * column on the right — both evenly spaced over the same height of the
 * 1280 × 620 design space the goals perimeter is drawn in. Where the columns
 * stand across it is set for the plot (`placeColumns`): labels keep one size
 * on screen, so the columns move apart or together to keep the whole of it,
 * labels included, in the middle.
 */

/** The height both columns spread over, design px. */
export const COLUMN = { top: 52, bottom: 548 } as const;

/** Anatomy of the marks, in screen px. */
export const MARK = {
  /** A goal's progress ring and its scale, beyond the goal's radius: tighter than on the perimeter, the goals stand in a column. */
  ring: 6,
  scale: 9.5,
  minor: 2.5,
  major: 5,
  bracket: 21,
  /** From a goal's radius to where its ribbons leave and its label's leader starts. */
  clear: 20,
  /** Half-diagonal of a resource group's diamond. */
  diamond: 6,
  /** From the largest goal's edge to the spine every goal's label hangs on. */
  spine: 46,
  /** The widest and the narrowest a ribbon gets. */
  wide: 14,
  thin: 1.5,
} as const;

/** Room kept clear either side of the scene, and the least and most the columns stand apart, design px. */
const SPREAD = { margin: 40, min: 400, max: 620 } as const;
/** A group's label at its widest — its readout — screen px. */
export const RESOURCE_LABEL = 220;
/** From a group's diamond to its label, screen px. */
export const RESOURCE_GAP = 13;

/** The goals are drawn smaller than on the perimeter: a share of the radius their agents would give them there. */
const GOAL_SHARE = 0.46;
/** Design px kept between two goals' scales. */
const GOAL_AIR = 18;

const row = (count: number, i: number) =>
  count <= 1 ? (COLUMN.top + COLUMN.bottom) / 2 : COLUMN.top + (i * (COLUMN.bottom - COLUMN.top)) / (count - 1);

/** Each goal's height and radius, design px: sized by its agents, and all shrunk alike where the column is too tight for them. */
export function goalRows(goals: readonly PerimeterGoal[]): { y: number; r: number }[] {
  const radii = goals.map((g) => goalRadius(g.agents.total) * GOAL_SHARE);
  const largest = Math.max(1, ...radii);
  const spacing = goals.length > 1 ? (COLUMN.bottom - COLUMN.top) / (goals.length - 1) : Infinity;
  const k = Math.max(0.25, Math.min(1, (spacing / 2 - GOAL_AIR) / largest));
  return goals.map((_, i) => ({ y: row(goals.length, i), r: radii[i]! * k }));
}

/** Each group's height, design px. */
export const resourceRows = (resources: readonly BipartiteResource[]) => resources.map((_, i) => row(resources.length, i));

/**
 * Where the two columns stand across the design space, for a map drawn at
 * `unit` design px per screen px before any zoom: zooming must not slide them.
 * `widestLabel` is the widest goal label, screen px; 0 when the labels are
 * folded away, and the groups' labels with them.
 */
export function placeColumns(unit: number, largest: number, widestLabel: number): { goals: number; resources: number } {
  const labelled = widestLabel > 0;
  const left = largest + (labelled ? MARK.spine + CALLOUT.pad + widestLabel : MARK.clear) * unit;
  const right = (MARK.diamond + (labelled ? RESOURCE_GAP + RESOURCE_LABEL : 0)) * unit;
  const apart = Math.max(SPREAD.min, Math.min(SPREAD.max, BOARD.width - 2 * SPREAD.margin - left - right));
  const goals = BOARD.width / 2 - (left + apart + right) / 2 + left;
  return { goals, resources: goals + apart };
}

/**
 * Where each ribbon leaves its goal and meets its group, as a step up or down
 * from the middle: the ribbons of one goal leave in the order of the groups
 * they run to, and those into one group arrive in the order of their goals —
 * so the ribbons of one bundle fan out without crossing each other.
 */
export function ribbonLanes(dependencies: readonly Dependency[], goalAt: Map<string, number>, resourceAt: Map<string, number>) {
  const lanes = dependencies.map(() => ({ goal: 0, resource: 0, of: 1 }));
  const assign = (group: (d: Dependency) => string, order: (d: Dependency) => number, side: 'goal' | 'resource') => {
    const groups = new Map<string, number[]>();
    dependencies.forEach((d, i) => groups.set(group(d), [...(groups.get(group(d)) ?? []), i]));
    for (const members of groups.values()) {
      members.sort((a, b) => order(dependencies[a]!) - order(dependencies[b]!));
      members.forEach((index, lane) => {
        lanes[index]![side] = lane - (members.length - 1) / 2;
        if (side === 'goal') lanes[index]!.of = members.length;
      });
    }
  };
  assign(
    (d) => d.goal.id,
    (d) => resourceAt.get(d.resource.key) ?? 0,
    'goal',
  );
  assign(
    (d) => d.resource.key,
    (d) => goalAt.get(d.goal.id) ?? 0,
    'resource',
  );
  return lanes;
}

/** A ribbon's width, screen px: the more calls a minute the goal makes to the group, the wider — by area, so a few calls still show. */
export const ribbonWidth = (calls: number, busiest: number) =>
  MARK.thin + (MARK.wide - MARK.thin) * Math.sqrt(Math.max(0, calls) / Math.max(1, busiest));

/** Seconds a light takes to run a ribbon: the more calls a minute, the quicker. */
export const runSeconds = (calls: number) => Math.max(2.6, Math.min(8, 9.4 - Math.log10(Math.max(10, calls)) * 1.65));

const f1 = (n: number) => n.toFixed(1);

/** A ribbon's line: level out of the goal, level into the group, an S between. */
export function ribbonPath(x0: number, y0: number, x1: number, y1: number): string {
  const reach = (x1 - x0) * 0.46;
  return `M${f1(x0)} ${f1(y0)}C${f1(x0 + reach)} ${f1(y0)} ${f1(x1 - reach)} ${f1(y1)} ${f1(x1)} ${f1(y1)}`;
}
