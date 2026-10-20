import { formatSlotTime } from './format.js';
import { WALL_SLOTS } from './normalize.js';
import type { AssetHealthCategory, AssetHealthModel, AssetHealthProblem } from './types.js';

/** Inner and outer radius of the tiled sectors, in scene units. */
export const RT0 = 168;
export const RT1 = 272;

const TILE_ROWS = 5;

export type TileTone = 'ok' | 'warn' | 'crit' | 'neutral';

export interface WallPanel {
  /** Start angle of the 15-minute slot. */
  a: number;
  hgt: number;
  err: boolean;
  slot: number;
  reqs: number;
  nErr?: number;
  src?: (AssetHealthProblem & { catName: string }) | null;
  tip: string;
}

export interface Tile {
  key: string;
  cat: string;
  ra: number;
  rb: number;
  aa: number;
  ab: number;
  th: number;
  tone: TileTone;
  problem: AssetHealthProblem | null;
  name: string | null;
  noise: number;
  tip: string;
}

export interface Pin {
  key: string;
  problem: AssetHealthProblem;
  category: AssetHealthCategory;
  a: number;
  r: number;
  th: number;
  tone: TileTone;
}

export interface CategoryHead {
  category: AssetHealthCategory;
  mid: number;
  a0: number;
  a1: number;
}

export interface AssetHealthScene {
  model: AssetHealthModel;
  wall: WallPanel[];
  tiles: Tile[];
  pins: Pin[];
  heads: CategoryHead[];
}

/** Deterministic PRNG for tile filler height only — never for error flags. */
export function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function wallTip(w: Omit<WallPanel, 'tip'>): string {
  if (!w.err) return `Activity · ${formatSlotTime(w.slot)}\n${w.reqs} agent requests, no errors`;
  const head = `Errors · ${formatSlotTime(w.slot)}–${formatSlotTime(w.slot + 1)}\n${w.nErr ?? 0} of ${w.reqs} requests failed`;
  if (!w.src) return head;
  return `${head}\nWhat failed: ${w.src.name} · ${w.src.type.toLowerCase()}\nWhy: ${w.src.why}\nWhere: ${w.src.loc}`;
}

/** Wall panels from normalized payload slots only — never invented. */
function buildWall(model: AssetHealthModel): WallPanel[] {
  return model.wall.map((slot) => {
    const panel: Omit<WallPanel, 'tip'> = {
      a: (slot.slot / WALL_SLOTS) * Math.PI * 2,
      hgt: slot.hgt,
      err: slot.err,
      slot: slot.slot,
      reqs: slot.reqs,
      ...(slot.nErr !== undefined ? { nErr: slot.nErr } : {}),
      src: slot.src ?? null,
    };
    return { ...panel, tip: wallTip(panel) };
  });
}

function tileTip(
  c: AssetHealthCategory,
  p: AssetHealthProblem | null,
  name: string | null,
  tone: TileTone,
): string {
  if (p) return `${p.type} · ${p.name}\n${p.why}\n${p.loc}`;
  if (name) return `${name}\n${c.name.replace(/s$/, '')} · healthy`;
  if (tone === 'crit') return `${c.name}\nFailing asset`;
  if (tone === 'warn') return `${c.name}\nDegraded asset`;
  if (tone === 'ok') return `${c.name}\nOne of ${c.total} · healthy`;
  return `${c.name}\n${c.total} assets`;
}

/**
 * Paint a tile: named problems first (with beams), then any remaining
 * failing/degraded counts, then healthy items / filler. Extra counts beyond
 * the problem list still tint tiles — no invented beams.
 */
function toneAt(c: AssetHealthCategory, k: number): {
  tone: TileTone;
  problem: AssetHealthProblem | null;
  name: string | null;
} {
  if (k < c.problems.length) {
    const problem = c.problems[k]!;
    return {
      tone: problem.sev === 'impaired' ? 'crit' : 'warn',
      problem,
      name: problem.name,
    };
  }

  const afterProblems = k - c.problems.length;
  const failingLeft = Math.max(
    0,
    c.failing - c.problems.filter((p) => p.sev === 'impaired').length,
  );
  const degradedLeft = Math.max(
    0,
    c.degraded - c.problems.filter((p) => p.sev === 'degraded').length,
  );

  if (afterProblems < failingLeft) {
    return { tone: 'crit', problem: null, name: null };
  }
  if (afterProblems < failingLeft + degradedLeft) {
    return { tone: 'warn', problem: null, name: null };
  }
  const healthyIndex = afterProblems - failingLeft - degradedLeft;
  if (healthyIndex < c.healthy) {
    return { tone: 'ok', problem: null, name: c.items[healthyIndex] ?? null };
  }
  return { tone: 'neutral', problem: null, name: null };
}

/** Tiles in category sectors: problems first (with beams), then count-based tones. */
function buildTiles({ categories }: AssetHealthModel): Pick<AssetHealthScene, 'tiles' | 'pins' | 'heads'> {
  const r = seeded(9001);
  const tiles: Tile[] = [];
  const pins: Pin[] = [];
  const heads: CategoryHead[] = [];
  const gap = 0.06;
  const sw = (Math.PI * 2) / Math.max(categories.length, 1);

  categories.forEach((c, ci) => {
    const a0 = ci * sw + gap / 2 - Math.PI / 2 - sw / 2;
    const a1 = a0 + sw - gap;
    const cols = Math.max(12, Math.min(16, Math.ceil(c.total / 5)));

    for (let k = 0; k < TILE_ROWS * cols; k++) {
      const row = k % TILE_ROWS;
      const col = Math.floor(k / TILE_ROWS);
      const ra = RT0 + (row * (RT1 - RT0)) / TILE_ROWS + 1.5;
      const rb = RT0 + ((row + 1) * (RT1 - RT0)) / TILE_ROWS - 1.5;
      const aa = a0 + (col * (a1 - a0)) / cols + 0.005;
      const ab = a0 + ((col + 1) * (a1 - a0)) / cols - 0.005;
      const { tone, problem, name } = toneAt(c, k);
      const noise = r();
      const th = problem ? 16 : name || tone !== 'neutral' ? 8 : 4 + 3 * r();
      const key = `${ci}_${k}`;

      tiles.push({
        key,
        cat: c.id,
        ra,
        rb,
        aa,
        ab,
        th,
        tone,
        problem,
        name,
        noise,
        tip: tileTip(c, problem, name, tone),
      });
      if (problem) {
        pins.push({
          key,
          problem,
          category: c,
          a: (aa + ab) / 2,
          r: (ra + rb) / 2,
          th,
          tone,
        });
      }
    }
    heads.push({ category: c, mid: (a0 + a1) / 2, a0, a1 });
  });

  return { tiles, pins, heads };
}

export function buildScene(model: AssetHealthModel): AssetHealthScene {
  return { model, wall: buildWall(model), ...buildTiles(model) };
}
