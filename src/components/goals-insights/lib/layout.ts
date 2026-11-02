import { rng } from '../../goals-perimeter/lib/random.js';
import { APEX_Y, CX, CYCLES, claimRadius, cycleOf, halfWidthAt, hoursY } from './geometry.js';
import type { Claim, Evidence } from './types.js';

/** Where a claim sits for one camera: screen position and depth (−1 far … 1 near). */
export interface ClaimPoint {
  x: number;
  y: number;
  depth: number;
}

/** The column turns in 64 steps per revolution; layouts are solved at each step and blended between. */
export const YAW_STEP = (Math.PI * 2) / 64;
const STEPS = 64;

/** How far a claim may be nudged off the ring of its hour to clear its neighbours, viewBox units. */
const DRIFT = 26;
/** Under the apex the column is narrowest and the last hours' claims are many: there they may sink a little further, the newer above. */
const DRIFT_TOP = 48;
const TOP_BAND = APEX_Y + 60;

const quantiseTilt = (tilt: number) => Math.round(tilt * 200) / 200;

/** The subjects of the column's claims, in the order they first appear: each takes a sector of the turn. */
const sectorCache = new WeakMap<Claim[], Map<string, number>>();
function sectors(claims: Claim[]): Map<string, number> {
  let known = sectorCache.get(claims);
  if (!known) {
    known = new Map();
    for (const c of claims) if (!known.has(c.theme)) known.set(c.theme, known.size);
    sectorCache.set(claims, known);
  }
  return known;
}

/**
 * Raw placement: each claim on the ring of the hour it was filed; round the
 * column in the sector of its subject, so claims about one thing turn
 * together; and the more it moves its goal, the nearer the axis.
 */
function place(c: Claim, claims: Claim[], yaw: number, tilt: number): ClaimPoint {
  const y = hoursY(c.age);
  const hw = halfWidthAt(Math.max(APEX_Y + 20, y));
  const subjects = sectors(claims);
  const sector = subjects.get(c.theme) ?? 0;
  const angle = ((sector + 0.15 + 0.7 * c.seed) / Math.max(1, subjects.size)) * Math.PI * 2 + y * 0.019 + yaw;
  const r = (0.28 + 0.68 * (1 - Math.min(1, c.weight / 0.7))) * hw;
  return { x: CX + Math.cos(angle) * r, y: y + Math.sin(angle) * r * tilt, depth: Math.sin(angle) };
}

const cache = new WeakMap<Claim[], Map<string, ClaimPoint[]>>();

/**
 * Claims pushed apart until no two markers overlap. Each may drift a little
 * off its ring and stays inside the column; in the narrow tip, where there
 * is no room sideways, claims make room by stacking, the newer above.
 * O(n²·passes), hence cached.
 */
function solve(claims: Claim[], yaw: number, tilt: number): ClaimPoint[] {
  const radii = claims.map((c) => claimRadius(c.records));
  const pts = claims.map((c) => place(c, claims, yaw, tilt));
  const jitter = rng(911);
  const band = pts.map((p) => {
    const y = p.y;
    p.y += (jitter() - 0.5) * 10;
    return y;
  });
  for (let pass = 0; pass < 320; pass++) {
    let moved = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i]!;
        const b = pts[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const need = radii[i]! + radii[j]! + 3;
        const d = Math.hypot(dx, dy);
        if (d >= need) continue;
        let nx = d < 0.01 ? 1 : dx / d;
        let ny = d < 0.01 ? 0.6 : dy / d;
        if (band[i]! < TOP_BAND && band[j]! < TOP_BAND) {
          ny += (band[j]! >= band[i]! ? 1 : -1) * 0.9;
          const n = Math.hypot(nx, ny);
          nx /= n;
          ny /= n;
        }
        const push = (need - d) / 2 + 0.2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        moved++;
      }
    }
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const home = band[i]!;
      // the newest claims may only drift down: above the first ring is the goal
      p.y = Math.max(Math.max(APEX_Y + 4, home - DRIFT), Math.min(home + (home < TOP_BAND ? DRIFT_TOP : DRIFT), p.y));
      const lim = halfWidthAt(Math.max(APEX_Y + 20, p.y)) - radii[i]!;
      const off = p.x - CX;
      if (Math.abs(off) > lim) p.x = CX + Math.sign(off) * Math.max(10, lim);
    }
    if (!moved) break;
  }
  return pts;
}

/** The solved layout at yaw step `k` (any integer) and a quantised tilt. */
function keyframe(claims: Claim[], k: number, tilt: number): ClaimPoint[] {
  let frames = cache.get(claims);
  if (!frames) cache.set(claims, (frames = new Map()));
  const step = ((k % STEPS) + STEPS) % STEPS;
  const key = `${step}:${tilt}`;
  let pts = frames.get(key);
  if (!pts) {
    // a long drag through many tilts would otherwise grow the cache without bound
    if (frames.size > 512) frames.clear();
    pts = solve(claims, step * YAW_STEP, tilt);
    frames.set(key, pts);
  }
  return pts;
}

/** Claim positions for any camera: the two nearest solved steps, blended so the turn is continuous. */
export function claimLayout(claims: Claim[], yaw: number, tilt: number): ClaimPoint[] {
  const t = quantiseTilt(tilt);
  const at = yaw / YAW_STEP;
  const k = Math.floor(at);
  const f = at - k;
  const a = keyframe(claims, k, t);
  if (f < 1e-4) return a;
  const b = keyframe(claims, k + 1, t);
  return a.map((p, i) => ({
    x: p.x + (b[i]!.x - p.x) * f,
    y: p.y + (b[i]!.y - p.y) * f,
    depth: p.depth + (b[i]!.depth - p.depth) * f,
  }));
}

export interface WebLink {
  a: number;
  b: number;
  bend: number;
  /** Filed within two hours of each other: a node at the midpoint. */
  node: boolean;
}

export interface LineageLink {
  a: number;
  b: number;
  bend: number;
  /** The two claims say opposite things: neither counts until one is resolved. */
  disputed: boolean;
}

export interface ColumnTopology {
  web: WebLink[];
  lineage: LineageLink[];
}

/** Claims about the same kind of asset filed this close together corroborate each other, hours. */
export const WEB_HOURS = 6;

const topologies = new WeakMap<Claim[], ColumnTopology>();

/**
 * How the column's claims connect. The web: claims on different subjects
 * about the same kind of asset, filed within a few hours of each other —
 * evidence from one place bearing on two things. Lineage: each claim to the
 * next one filed on its subject, oldest to newest — what the agents know
 * about one thing, built up — a disputed pair joined however far apart.
 */
export function columnTopology(claims: Claim[]): ColumnTopology {
  const known = topologies.get(claims);
  if (known) return known;
  const r = rng(4801);
  const web: WebLink[] = [];
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const a = claims[i]!;
      const b = claims[j]!;
      if (a.asset !== b.asset || a.theme === b.theme || Math.abs(a.age - b.age) > WEB_HOURS) continue;
      web.push({ a: i, b: j, bend: (r() - 0.5) * 26, node: Math.abs(a.age - b.age) < 2 });
    }
  }
  const lineage: LineageLink[] = [];
  const subjects = new Map<string, number[]>();
  claims.forEach((c, i) => {
    const key = `${c.goal}:${c.theme}`;
    subjects.set(key, [...(subjects.get(key) ?? []), i]);
  });
  for (const members of subjects.values()) {
    const order = [...members].sort((p, q) => claims[q]!.age - claims[p]!.age);
    for (let k = 1; k < order.length; k++) {
      const a = order[k - 1]!;
      const b = order[k]!;
      lineage.push({ a, b, bend: (r() - 0.5) * 30, disputed: claims[a]!.state === 'disputed' && claims[b]!.state === 'disputed' });
    }
    const pair = order.filter((i) => claims[i]!.state === 'disputed');
    if (pair.length === 2 && !lineage.some((l) => l.disputed && pair.includes(l.a) && pair.includes(l.b))) {
      lineage.push({ a: pair[0]!, b: pair[1]!, bend: (r() - 0.5) * 30, disputed: true });
    }
  }
  const topology = { web, lineage };
  topologies.set(claims, topology);
  return topology;
}

/** A source behind one of the goal's claims, as a particle rising up the axis into the goal. */
export interface SourceMote {
  evidence: Evidence;
  /** Its claim was filed in the last day: it rises in the quick, tight stream. */
  fresh: boolean;
}

/** Evidence records, all told, that the dust in the rings stands for: the density the column is drawn at. */
const DUST = 240;
/** Particles rising up the axis at most: past this, one stands for several sources. */
export const MAX_SOURCES = 160;

export interface ColumnFlow {
  /** The sources behind the goal's claims, the newest claims' first — one a particle, up to `MAX_SOURCES`. */
  sources: SourceMote[];
  /** Motes of dust in each ring: the evidence records that came in during its cycle, in proportion. */
  dust: number[];
}

const flows = new WeakMap<Claim[], ColumnFlow>();

/**
 * What flows through the column, read off the goal's own claims: their
 * sources, and when their evidence came in. A claim's first source is the
 * agent that filed it, at the hour it was filed; the others corroborated it
 * since — most of them soon after, the last of them lately — so a claim's
 * records keep arriving from its own hour up to now.
 */
export function columnFlow(claims: Claim[]): ColumnFlow {
  const known = flows.get(claims);
  if (known) return known;
  const total = claims.reduce((sum, c) => sum + c.sources, 0);
  const per = Math.max(1, total / MAX_SOURCES);
  const sources = [...claims]
    .sort((a, b) => a.age - b.age)
    .flatMap((c) => Array.from({ length: Math.max(1, Math.round(c.sources / per)) }, (): SourceMote => ({ evidence: c.evidence, fresh: c.age < 24 })))
    .slice(0, MAX_SOURCES);
  const records = Array.from({ length: CYCLES }, () => 0);
  for (const c of claims) {
    const each = c.records / c.sources;
    for (let k = 0; k < c.sources; k++) records[cycleOf(c.age * (1 - Math.pow(k / c.sources, 0.7)))]! += each;
  }
  const sum = records.reduce((a, n) => a + n, 0) || 1;
  const flow = { sources, dust: records.map((n) => Math.round((DUST * n) / sum)) };
  flows.set(claims, flow);
  return flow;
}

/** Seeds for particles riding a path: each its own pace from its own phase, scattered round the path. */
export interface ParticleSeed {
  dur: number;
  phase: number;
  jx: number;
  jy: number;
  size: number;
}

/**
 * Seeds for `count` particles riding a path: each at its own pace from its
 * own phase, scattered round the path — `spread` units either way, gathered
 * towards it. The same seed gives the same particles, in the SVG and in the
 * column's light alike.
 */
export function particleSeeds(seed: number, count: number, spread: number, seconds: number): ParticleSeed[] {
  const r = rng(seed);
  const near = () => (r() + r() + r() - 1.5) / 1.5;
  return Array.from({ length: count }, () => {
    const dur = seconds * (0.8 + 0.5 * r());
    const begin = -r() * seconds * 1.3;
    const jx = near() * spread;
    const jy = near() * spread;
    return { dur, phase: -begin, jx, jy, size: 0.5 + 0.9 * r() };
  });
}
