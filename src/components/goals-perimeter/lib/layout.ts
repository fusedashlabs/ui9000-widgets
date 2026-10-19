import { formatResourceGroups, goalSummary } from './format.js';
import type { ExternalDependency, PerimeterGoal } from './types.js';

/**
 * World units are CSS px of the design board (a 1400 × 976 frame): the
 * largest goal's perimeter is 120 across the radius, the smallest 20, and a
 * goal's radius grows with the square root of its agents.
 */
export const BOARD = { width: 1400, height: 976 } as const;
export const RING = { min: 20, span: 100 } as const;

/** Ring bottom → title, then one line per label row. */
export const LABEL_GAP = 16;
export const LABEL_LINE = 24;
/** Room around the ring the hover box keeps clear. */
export const RING_PAD = 35;

/** Average glyph advance of the 15–16px label rows, letter spacing included. */
const LABEL_CHAR = 9;

export interface GoalPlacement {
  id: string;
  x: number;
  y: number;
  r: number;
  /** Radians; the fringe of loose agents leans this way, away from the other goals. */
  fringeAngle: number;
  /** Half the widest label row, estimated. */
  labelHalfWidth: number;
  labelHeight: number;
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface BoardLayout {
  placements: GoalPlacement[];
  byId: Map<string, GoalPlacement>;
  /** External dependencies, beside the goal that depends on them. */
  externals: Map<string, { x: number; y: number }>;
  bounds: Bounds;
}

/** External dependencies sit this far outside their goal's ring, fanned around its fringe side. */
export const EXTERNAL_GAP = 64;
const EXTERNAL_FAN = 0.42;

export interface FitTransform {
  k: number;
  tx: number;
  ty: number;
}

export function goalRadius(total: number, maxTotal: number): number {
  if (maxTotal <= 0) return RING.min + RING.span / 2;
  return RING.min + RING.span * Math.sqrt(Math.max(0, total) / maxTotal);
}

/** Title, summary, IMPURE (when any), resource groups. */
export function labelRows(goal: PerimeterGoal): number {
  return goal.impure > 0 ? 4 : 3;
}

function labelHalfWidth(goal: PerimeterGoal): number {
  const groups = goal.resourceGroupCount > 0 ? `${formatResourceGroups(goal.resourceGroupCount)} · ` : '';
  const rows = [goal.name, goalSummary(goal), `${groups}click to open`];
  return (Math.max(...rows.map((row) => row.length)) * LABEL_CHAR) / 2;
}

/** The ring, the hover pad and the label block under it. */
export function goalFootprint(p: GoalPlacement): Bounds {
  const half = Math.max(p.r + RING_PAD + 40, p.labelHalfWidth + 12);
  return {
    x0: p.x - half,
    y0: p.y - p.r - RING_PAD,
    x1: p.x + half,
    y1: p.y + p.r + p.labelHeight + 12,
  };
}

function union(boxes: Bounds[]): Bounds {
  return boxes.reduce(
    (acc, b) => ({
      x0: Math.min(acc.x0, b.x0),
      y0: Math.min(acc.y0, b.y0),
      x1: Math.max(acc.x1, b.x1),
      y1: Math.max(acc.y1, b.y1),
    }),
    { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
  );
}

interface LayoutBox {
  index: number;
  x: number;
  y: number;
  hw: number;
  hh: number;
  /** Footprint centre → ring centre. */
  drop: number;
}

/** Pushes overlapping footprints apart along the axis that overlaps least. */
function separate(boxes: LayoutBox[]): void {
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const ox = a.hw + b.hw - Math.abs(dx);
      const oy = a.hh + b.hh - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      if (ox < oy) {
        const shift = (ox / 2) * (dx < 0 ? -1 : 1);
        a.x -= shift;
        b.x += shift;
      } else {
        const shift = (oy / 2) * (dy < 0 ? -1 : 1);
        a.y -= shift;
        b.y += shift;
      }
    }
  }
}

/**
 * No positions: a staggered grid about one and a half times wider than tall
 * (two goals side by side, five as three over two), largest first, drawn
 * together and pushed apart until no two footprints (ring plus labels)
 * overlap. No randomness: the same goals always land in the same place.
 */
function autoPlace(goals: PerimeterGoal[], radii: number[], heights: number[], halves: number[]) {
  const order = goals.map((_, i) => i).sort((a, b) => radii[b]! - radii[a]!);
  const cols = Math.max(1, Math.ceil(Math.sqrt(order.length * 1.5)));
  const rows = Math.ceil(order.length / cols);
  const boxes: LayoutBox[] = order.map((i, slot) => {
    const r = radii[i]!;
    const top = r + RING_PAD;
    const bottom = r + heights[i]! + 12;
    return {
      index: i,
      hw: Math.max(r + RING_PAD + 40, halves[i]! + 12),
      hh: (top + bottom) / 2,
      drop: (bottom - top) / 2,
      x: ((slot % cols) - (cols - 1) / 2) * 340 + (Math.floor(slot / cols) % 2) * 90,
      y: (Math.floor(slot / cols) - (rows - 1) / 2) * 400 + (slot % 2 ? 40 : -40),
    };
  });
  for (let step = 0; step < 240; step += 1) {
    for (const box of boxes) {
      box.x *= 0.97;
      box.y *= 0.95;
    }
    for (let pass = 0; pass < 3; pass += 1) separate(boxes);
  }
  for (let pass = 0; pass < 40; pass += 1) separate(boxes);
  const out = new Array<{ x: number; y: number }>(goals.length);
  for (const box of boxes) out[box.index] = { x: box.x, y: box.y - box.drop };
  return out;
}

export function layoutBoard(
  goals: PerimeterGoal[],
  dependencies: readonly ExternalDependency[] = [],
): BoardLayout {
  const maxTotal = Math.max(0, ...goals.map((g) => g.agents.total));
  const radii = goals.map((g) => goalRadius(g.agents.total, maxTotal));
  const heights = goals.map((g) => LABEL_GAP + labelRows(g) * LABEL_LINE);
  const halves = goals.map(labelHalfWidth);

  const pinned = goals.length > 0 && goals.every((g) => g.position);
  const centres = pinned
    ? goals.map((g) => ({ x: g.position!.x * BOARD.width, y: g.position!.y * BOARD.height }))
    : autoPlace(goals, radii, heights, halves);

  const cx = centres.reduce((s, c) => s + c.x, 0) / Math.max(1, centres.length);
  const cy = centres.reduce((s, c) => s + c.y, 0) / Math.max(1, centres.length);

  const placements = goals.map<GoalPlacement>((goal, i) => {
    const { x, y } = centres[i]!;
    const away = Math.hypot(x - cx, y - cy) > 1 ? Math.atan2(y - cy, x - cx) : Math.PI;
    return {
      id: goal.id,
      x,
      y,
      r: radii[i]!,
      fringeAngle: away,
      labelHalfWidth: halves[i]!,
      labelHeight: heights[i]!,
    };
  });

  const byId = new Map(placements.map((p) => [p.id, p]));
  const externals = new Map<string, { x: number; y: number }>();
  for (const p of placements) {
    const own = dependencies.filter((d) => d.goalId === p.id);
    own.forEach((dependency, i) => {
      const angle = p.fringeAngle + (i - (own.length - 1) / 2) * EXTERNAL_FAN;
      const dist = p.r + EXTERNAL_GAP;
      externals.set(dependency.id, { x: p.x + Math.cos(angle) * dist, y: p.y + Math.sin(angle) * dist });
    });
  }
  const boxes = placements.map(goalFootprint);
  for (const { x, y } of externals.values()) boxes.push({ x0: x - 16, y0: y - 16, x1: x + 16, y1: y + 16 });

  return {
    placements,
    byId,
    externals,
    bounds: boxes.length ? union(boxes) : { x0: 0, y0: 0, x1: 0, y1: 0 },
  };
}

/** Scale and offset that fit the bounds into the viewport, centred, never above `maxScale`. */
export function fitBoard(
  bounds: Bounds,
  width: number,
  height: number,
  pad = 16,
  maxScale = 1.25,
): FitTransform {
  const bw = Math.max(1, bounds.x1 - bounds.x0);
  const bh = Math.max(1, bounds.y1 - bounds.y0);
  const k = Math.max(
    0.05,
    Math.min((width - pad * 2) / bw, (height - pad * 2) / bh, maxScale),
  );
  return {
    k,
    tx: (width - bw * k) / 2 - bounds.x0 * k,
    ty: (height - bh * k) / 2 - bounds.y0 * k,
  };
}
