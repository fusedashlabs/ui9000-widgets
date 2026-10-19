import type { GoalPlacement } from './layout.js';
import type { AgentNode, GoalConnection, PerimeterGoal } from './types.js';

/**
 * The texture under the marks: each goal's agent cloud, the loose
 * agents fringing it, and the strand bundles between goals. Everything is
 * seeded from ids, so a redraw or a resize paints the same picture.
 */

/** FNV-1a. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small, fast, seedable PRNG in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

export type ParticleTone = 'healthy' | 'degraded' | 'blocked' | 'failed' | 'idle' | 'core';

export interface Particle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  tone: ParticleTone;
  /** 0–3: picks a shade within the tone. */
  shade: number;
  /** Set when the speck is one agent node, so hover can name it. */
  agentId?: string;
}

/**
 * Specks are SVG rects, so the cloud stands for the population rather than
 * drawing every agent of a large one: a goal gets at most 900, and a board at
 * most 3,600 across its goals (see `particleScale`).
 */
const MIN_PARTICLES = 80;
const MAX_PARTICLES = 900;
export const BOARD_PARTICLES = 3600;
/** An exceptional state with any agents keeps at least this many specks visible. */
const MIN_EXCEPTION_SPECKS = 6;

export function particleBudget(total: number): number {
  return Math.round(Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, MIN_PARTICLES + total * 0.9)));
}

/** Shrinks every goal's budget alike when the board as a whole would pass `BOARD_PARTICLES`. */
export function particleScale(goals: readonly PerimeterGoal[]): number {
  const sum = goals.reduce((acc, goal) => acc + particleBudget(goal.agents.total), 0);
  return sum > BOARD_PARTICLES ? BOARD_PARTICLES / sum : 1;
}

type SpeckState = Exclude<ParticleTone, 'core'>;

/** Specks per state, in proportion to agents, healthy taking what is left. */
export function particleShares(goal: PerimeterGoal, scale = 1): Record<SpeckState, number> {
  const n = Math.max(MIN_PARTICLES / 2, Math.round(particleBudget(goal.agents.total) * scale));
  const total = Math.max(1, goal.agents.total);
  const share = (value: number) =>
    value > 0 ? Math.max(MIN_EXCEPTION_SPECKS, Math.round((value / total) * n)) : 0;
  const failed = share(goal.agents.failed);
  const blocked = share(goal.agents.blocked);
  const degraded = share(goal.agents.degraded);
  const idle = share(goal.agents.idle);
  return {
    failed,
    blocked,
    degraded,
    idle,
    healthy: Math.max(0, n - failed - blocked - degraded - idle),
  };
}

const SPREAD: Record<ParticleTone, number> = {
  healthy: 0.4,
  idle: 0.55,
  core: 0.16,
  degraded: 0.5,
  blocked: 0.5,
  failed: 0.5,
};

function speck(
  rand: () => number,
  p: GoalPlacement,
  tone: ParticleTone,
  grain: number,
  agentId?: string,
): Particle {
  const spread = SPREAD[tone];
  // Slightly wider than tall, like the design's clouds; specks past 1.1r are redrawn.
  let dx = 0;
  let dy = 0;
  for (let tries = 0; tries < 6; tries += 1) {
    dx = gauss(rand) * p.r * spread * 1.12;
    dy = gauss(rand) * p.r * spread * 0.95;
    if (dx * dx + dy * dy <= (p.r * 1.1) ** 2) break;
  }
  const depth = 1 - Math.min(1, Math.hypot(dx, dy) / (p.r * 1.1));
  const out: Particle = {
    x: p.x + dx,
    y: p.y + dy,
    size: (tone === 'core' ? 1.4 + rand() * 1.4 : 1 + rand() * 1.9) * grain,
    alpha: Math.min(1, 0.22 + 0.78 * depth ** 0.7 * (0.55 + rand() * 0.45)),
    tone,
    shade: Math.floor(rand() * 4),
  };
  if (agentId) {
    // An agent the user can point at is never a faint speck.
    out.size = Math.max(out.size, 1.8 * grain);
    out.alpha = Math.max(out.alpha, 0.55);
    out.agentId = agentId;
  }
  return out;
}

export interface SpeckPlan {
  /** What to draw, in drawing order: healthy and idle under the exceptional states. */
  specks: { tone: ParticleTone; agentId?: string }[];
  /** Specks the goal may draw at this scale. */
  budget: number;
}

/**
 * Which specks a goal draws, before they are placed. Agent nodes come first,
 * one speck each (every k-th when there are more than the budget); specks
 * without a node make up the rest of each state's share, within the budget.
 * `core` adds the bright core a multiplier of 2× or more lights.
 */
export function speckPlan(
  goal: PerimeterGoal,
  nodes: readonly AgentNode[] = [],
  scale = 1,
  core = true,
): SpeckPlan {
  const shares = particleShares(goal, scale);
  const budget = Object.values(shares).reduce((a, b) => a + b, 0);
  const step = nodes.length > budget ? nodes.length / budget : 1;
  const shown: AgentNode[] = [];
  for (let i = 0; i < nodes.length && shown.length < budget; i += step) shown.push(nodes[Math.floor(i)]!);

  const specks: SpeckPlan['specks'] = [];
  // Specks without a node only fill the room the nodes leave in the budget.
  let room = budget - shown.length;
  const emit = (state: SpeckState) => {
    const own = shown.filter((node) => node.state === state);
    for (const node of own) specks.push({ tone: state, agentId: node.id });
    for (let i = own.length; i < shares[state] && room > 0; i += 1, room -= 1) specks.push({ tone: state });
  };
  emit('idle');
  emit('healthy');
  if (core && goal.multiplier !== null && goal.multiplier >= 2) {
    const count = Math.min(160, Math.round((goal.multiplier - 1) * 40 * scale));
    for (let i = 0; i < count; i += 1) specks.push({ tone: 'core' });
  }
  emit('degraded');
  emit('blocked');
  emit('failed');
  return { specks, budget };
}

/** Speck size factor: a small population in a large ring gets larger specks, so it still reads as a cloud. */
export function speckGrain(radius: number, budget: number): number {
  return Math.min(2.6, Math.max(1, Math.sqrt((Math.PI * radius * radius) / Math.max(1, budget)) * 0.12));
}

/**
 * The agent cloud: the plan placed around the goal's centre. Healthy fills
 * the cloud, exceptional states scatter wider and sit on top. Boards like the
 * default sample keep grain 1.
 */
export function cloudParticles(
  goal: PerimeterGoal,
  p: GoalPlacement,
  nodes: readonly AgentNode[] = [],
  scale = 1,
): Particle[] {
  const rand = seededRandom(hashSeed(`cloud:${goal.id}`));
  const { specks, budget } = speckPlan(goal, nodes, scale);
  const grain = speckGrain(p.r, budget);
  return specks.map((s) => speck(rand, p, s.tone, grain, s.agentId));
}

export type FringeTone = 'grey' | 'light' | 'rose';

export interface FringeNode {
  x: number;
  y: number;
  size: number;
  tone: FringeTone;
}

export interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Fringe {
  nodes: FringeNode[];
  links: Segment[];
}

/**
 * Loose agents around the perimeter, joined by thin links, leaning away
 * from the other goals. Rose nodes grow with the impure share.
 */
export function goalFringe(goal: PerimeterGoal, p: GoalPlacement): Fringe {
  const rand = seededRandom(hashSeed(`fringe:${goal.id}`));
  const m = Math.round(Math.min(64, Math.max(12, 10 + Math.sqrt(goal.agents.total) * 1.4)));
  const roseOdds = 0.03 + Math.min(0.45, (goal.impure / Math.max(1, goal.agents.total)) * 2.5);
  const nodes: FringeNode[] = [];
  for (let i = 0; i < m; i += 1) {
    const leaning = rand() < 0.7;
    const angle = leaning ? p.fringeAngle + gauss(rand) * 0.75 : rand() * Math.PI * 2;
    const dist = leaning ? p.r * (0.75 + rand() ** 0.7 * 1.25) : p.r * (0.85 + rand() * 0.6);
    const tone: FringeTone = rand() < roseOdds ? 'rose' : rand() < 0.35 ? 'light' : 'grey';
    nodes.push({
      x: p.x + Math.cos(angle) * dist,
      y: p.y + Math.sin(angle) * dist,
      size: 1.1 + rand() ** 1.6 * 2.6,
      tone,
    });
  }

  const links: Segment[] = [];
  nodes.forEach((node, i) => {
    // One or two links back to the nearest earlier nodes: a sparse web, no hairball.
    const near = nodes
      .slice(0, i)
      .map((other) => ({ other, d: Math.hypot(other.x - node.x, other.y - node.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, rand() < 0.4 ? 2 : 1);
    for (const { other } of near) links.push({ x0: node.x, y0: node.y, x1: other.x, y1: other.y });
    if (rand() < 0.28) {
      const a = rand() * Math.PI * 2;
      const d = rand() * p.r * 0.35;
      links.push({ x0: node.x, y0: node.y, x1: p.x + Math.cos(a) * d, y1: p.y + Math.sin(a) * d });
    }
  });
  return { nodes, links };
}

export interface Strand {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  tone: 'neutral' | 'exception';
  /** Brighter stretches along the strand, as [from, to] in 0–1. */
  dashes: [number, number][];
}

/** Which side of the straight line the bundle bows to: below for left-to-right pairs. */
export function bendNormal(s: GoalPlacement, t: GoalPlacement): { nx: number; ny: number; len: number } {
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  let nx = -dy / len;
  let ny = dx / len;
  if (ny < 0 || (ny === 0 && nx < 0)) {
    nx = -nx;
    ny = -ny;
  }
  return { nx, ny, len };
}

/**
 * The bundle between two goals: strands that leave from inside one cloud
 * and land inside the other, bowed together with a little spread. A degraded
 * connection draws about one in five in the exception tint, at least one.
 */
export function connectionStrands(
  connection: GoalConnection,
  s: GoalPlacement,
  t: GoalPlacement,
): Strand[] {
  if (connection.status === 'unavailable') return [];
  const rand = seededRandom(hashSeed(`strands:${connection.id}`));
  const { nx, ny, len } = bendNormal(s, t);
  const ux = (t.x - s.x) / len;
  const uy = (t.y - s.y) / len;
  const bow = len * 0.06;
  const spread = len * 0.035;
  const tinted = connection.status === 'degraded' ? Math.max(1, Math.round(connection.strands / 5)) : 0;

  const out: Strand[] = [];
  for (let i = 0; i < connection.strands; i += 1) {
    const a0 = rand() * Math.PI * 2;
    const r0 = Math.sqrt(rand()) * s.r * 0.4;
    const a1 = rand() * Math.PI * 2;
    const r1 = Math.sqrt(rand()) * t.r * 0.4;
    const x0 = s.x + ux * s.r * 0.25 + Math.cos(a0) * r0;
    const y0 = s.y + uy * s.r * 0.25 + Math.sin(a0) * r0;
    const x1 = t.x - ux * t.r * 0.25 + Math.cos(a1) * r1;
    const y1 = t.y - uy * t.r * 0.25 + Math.sin(a1) * r1;
    const off = bow + gauss(rand) * spread;
    const dashes: [number, number][] = [];
    const dashCount = Math.floor(rand() * 3);
    for (let d = 0; d < dashCount; d += 1) {
      const from = 0.15 + rand() * 0.65;
      dashes.push([from, from + 0.01 + rand() * 0.02]);
    }
    out.push({
      x0,
      y0,
      cx: (x0 + x1) / 2 + nx * off,
      cy: (y0 + y1) / 2 + ny * off,
      x1,
      y1,
      tone: i < tinted ? 'exception' : 'neutral',
      dashes,
    });
  }
  return out;
}
