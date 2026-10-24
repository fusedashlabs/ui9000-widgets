import type { PerimeterGoal } from './types.js';

/**
 * World units are px of the scene's design space, 1280 × 620: the camera
 * turns it about (640, 300) and the board fits it to the plot. A goal sits at
 * (x, y) and at depth z, positive further away.
 */
export const BOARD = { width: 1280, height: 620 } as const;

/** The part of the design space the automatic layout fills, leaving room round it for callouts. */
const FIELD = { x0: 230, y0: 140, x1: 1050, y1: 500 } as const;
/** Room kept round a goal by the automatic layout: its ring's scale, its orbit and a little air. */
const ORBIT_ROOM = 58;

export interface GoalPlacement {
  id: string;
  x: number;
  y: number;
  z: number;
  r: number;
}

export interface BoardLayout {
  placements: GoalPlacement[];
  byId: Map<string, GoalPlacement>;
}

/**
 * A goal's radius from its agents: 89 for 1,108 agents, 31 for 96, as the
 * clouds of the design are sized.
 */
export function goalRadius(total: number): number {
  return Math.max(22, Math.min(96, 4.43 * Math.pow(Math.max(1, total), 0.4277)));
}

/**
 * No positions: a staggered grid across the field, two and a bit columns to
 * a row, largest goal first, the radii scaled to the cells, then pushed
 * apart until no two goals' orbits meet. No randomness: the same goals
 * always land in the same place.
 */
function autoPlace(goals: PerimeterGoal[]): GoalPlacement[] {
  const n = goals.length;
  const order = goals.map((_, i) => i).sort((a, b) => goals[b]!.agents.total - goals[a]!.agents.total);
  const cols = Math.max(1, Math.min(n, Math.ceil(Math.sqrt(n * 2.2))));
  const rows = Math.ceil(n / cols);
  const cellW = (FIELD.x1 - FIELD.x0) / cols;
  const cellH = (FIELD.y1 - FIELD.y0) / rows;
  const radii = goals.map((g) => goalRadius(g.agents.total));
  const largest = Math.max(...radii);
  const k = Math.max(0.35, Math.min(2.2, (Math.min(cellW, cellH) / 2 - ORBIT_ROOM / 2) / largest));

  const placed = new Array<GoalPlacement>(n);
  order.forEach((index, slot) => {
    const row = Math.floor(slot / cols);
    const col = slot % cols;
    const inRow = Math.min(cols, n - row * cols);
    // a short last row is centred; rows lean alternately, and goals in a row rise and fall a little
    const x = FIELD.x0 + cellW * (col + 0.5 + (cols - inRow) / 2) + (rows > 1 ? (row % 2 ? 0.18 : -0.18) * cellW : 0);
    const y = FIELD.y0 + cellH * (row + 0.5) + (inRow > 1 ? (col % 2 ? 0.14 : -0.14) * cellH : 0);
    placed[index] = { id: goals[index]!.id, x, y, z: 0, r: radii[index]! * k };
  });

  for (let pass = 0; pass < 80; pass += 1) {
    let moved = false;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const a = placed[i]!;
        const b = placed[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const need = a.r + b.r + ORBIT_ROOM * 2;
        if (d >= need) continue;
        const push = (need - d) / 2;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push * 0.6;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push * 0.6;
        moved = true;
      }
    }
    for (const p of placed) {
      p.x = Math.max(FIELD.x0 - 60 + p.r, Math.min(FIELD.x1 + 60 - p.r, p.x));
      p.y = Math.max(FIELD.y0 - 40 + p.r * 0.5, Math.min(FIELD.y1 + 40 - p.r * 0.5, p.y));
    }
    if (!moved) break;
  }
  return placed;
}

export function layoutBoard(goals: PerimeterGoal[]): BoardLayout {
  const pinned = goals.length > 0 && goals.every((g) => g.position);
  const placements = pinned
    ? goals.map<GoalPlacement>((goal) => {
        const p = goal.position!;
        return {
          id: goal.id,
          x: p.x * BOARD.width,
          y: p.y * BOARD.height,
          z: p.z * BOARD.width,
          r: p.r !== null ? p.r * BOARD.width : goalRadius(goal.agents.total),
        };
      })
    : autoPlace(goals);

  const byId = new Map(placements.map((p) => [p.id, p]));
  return { placements, byId };
}
