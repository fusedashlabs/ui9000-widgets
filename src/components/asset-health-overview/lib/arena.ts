import { PIVOT_X, PIVOT_Y, wrapYaw, type CamPose, type Project } from './camera.js';
import { crewSize } from './format.js';
import type { AssetHealthSection } from './types.js';

export type Vec3 = [number, number, number];

/**
 * Geometry of the goal opened as an arena, seen from above its rim. Where a
 * thing stands in it says what it is:
 *
 *   the hub     the goal's progress, a ring in the middle of the floor, with
 *               its idle agents on a bench round it
 *   the stands  its agents, one dot each, seated in rows — each in the
 *               section of the asset category its work is with, the ones
 *               held there in the front rows, against the gate
 *   the gate    the arc between a section and its category: white where the
 *               goal's calls get through, in colour for the share that does
 *               not, the category's diamond in the middle
 *   the cells   behind the gate, one cell for every asset the goal works
 *               with in that category; an asset in trouble is lit, and a
 *               beam stands on it
 *   the wall    behind the cells, the goal's last 24 hours with that
 *               category: a bar for each stretch of the day, as tall as the
 *               calls in it, its top in colour for the share that was held up
 *
 * A section is as wide as the share of the goal's agents whose work is with
 * its category. Everything is laid out in the design space about the pivot,
 * so the arena turns in place. Parts given in screen px are multiplied by
 * the view's unit where they are drawn.
 */
export const ARENA = {
  /** The hub's progress ring, design px from the middle. */
  hub: 50,
  /** The first ring of the idle agents' bench. */
  bench: 66,
  /** The stands: their front row, the nearest to the hub they may reach, and the room an agent's seat takes. */
  stands: 150,
  standsLeast: 88,
  seat: 6.2,
  /** The gate. */
  gate: 162,
  /** The asset cells: where they start, the room a cell takes, and how many rows deep they stand. */
  cells: 174,
  cell: 7,
  cellRows: 4,
  /** The wall, and how high its tallest bar stands. */
  wall: 213,
  wallHeight: 28,
  /** How high a beam stands on an asset in trouble. */
  beam: 44,
  /** The floor: how far past the wall the slab the arena stands on reaches, and how thick it is. */
  floor: 9,
  slab: 7,
  /** Half-diagonal of a category's diamond, screen px. */
  diamond: 6,
  /** Where a label's leader starts, screen px beyond the wall. */
  anchor: 16,
} as const;

const TAU = Math.PI * 2;
/** The aisle between two sections, radians. */
const AISLE = 0.085;
/** The narrowest section, however few agents work with its category — room for its diamond, its cells and a wall. */
const MIN_SPAN = 0.34;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * How the arena is seen. In 3D the camera turns it, looked at from well
 * above its rim; in plan it is seen from straight overhead.
 */
export function arenaPose(camera: { yaw: number; pitch: number }, plan: boolean): CamPose {
  return plan ? { yaw: 0, pitch: Math.PI / 2, focal: 1e9 } : { yaw: wrapYaw(camera.yaw + 0.34), pitch: clamp(camera.pitch + 0.36, 0.44, 1.2), focal: 1500 };
}

/**
 * A point of the arena: on its floor at a radius and an angle, and — for
 * what stands on the floor — at a height above it. Seen in plan nothing has
 * a height to show, so what stands up is laid outwards instead.
 */
export function arenaPoint(radius: number, angle: number, height = 0, plan = false): Vec3 {
  const r = plan ? radius + height : radius;
  return [PIVOT_X + Math.cos(angle) * r, PIVOT_Y - (plan ? 0 : height), Math.sin(angle) * r];
}

/** What the arena takes of the stage at rest, design px from the pivot: half its width, and how far it reaches up and down. */
export function arenaExtent(plan: boolean) {
  const out = ARENA.wall + (plan ? ARENA.wallHeight : 0) + 8;
  return plan ? { half: out, up: out, down: out } : { half: out, up: 138, down: 146 };
}

// ── Sections ─────────────────────────────────────────────────────

/** A category's section of the arena. */
export interface Sector {
  section: AssetHealthSection;
  a0: number;
  a1: number;
  mid: number;
}

/**
 * Where each category's section lies. A section is as wide as the share of
 * the goal's agents working with its category. Which way round the whole
 * arena is turned says nothing, so it is turned to read well at rest: the
 * sections keep their middles to the sides, where their labels are, the
 * categories in trouble come to the front, and the two sides carry about as
 * many labels each.
 */
export function arenaSectors(sections: readonly AssetHealthSection[]): Sector[] {
  const ordered = [...sections].sort((a, b) => crewSize(b) - crewSize(a));
  const n = ordered.length;
  if (!n) return [];
  const room = TAU - n * AISLE;
  const crew = ordered.reduce((sum, s) => sum + crewSize(s), 0) || 1;
  const raw = ordered.map((s) => Math.max(MIN_SPAN, (crewSize(s) / crew) * room));
  const total = raw.reduce((a, b) => a + b, 0);
  const spans = raw.map((v) => (v * room) / total);

  const at = (turn: number): Sector[] => {
    let a = turn;
    return ordered.map((section, i) => {
      const a0 = a;
      const a1 = a + spans[i]!;
      a = a1 + AISLE;
      return { section, a0, a1, mid: (a0 + a1) / 2 };
    });
  };
  let best: { sectors: Sector[]; score: number } | undefined;
  for (let step = 0; step < 120; step++) {
    const sectors = at((step / 120) * TAU);
    let score = 0;
    let sides = 0;
    sectors.forEach((s, i) => {
      const x = Math.cos(s.mid);
      const front = -Math.sin(s.mid);
      score += Math.min(Math.abs(x), 0.7);
      if (Math.abs(x) < 0.24) score -= 1.6;
      if (s.section.troubles.length) score += 0.4 * front;
      // the category most of the agents work with reads first: on the left
      if (i === 0) score -= 0.12 * x;
      sides += x > 0 ? 1 : -1;
    });
    score -= 0.3 * Math.abs(sides);
    if (!best || score > best.score) best = { sectors, score };
  }
  return best!.sectors;
}

// ── Seats ────────────────────────────────────────────────────────

/** A place on the floor: how far from the middle, and at what angle. */
export interface Seat {
  radius: number;
  angle: number;
}

/**
 * The seats of a section for `count` agents, the best first: the front row
 * — the one against the gate — fills before the row behind it, and a row
 * fills from the middle of the section outwards. So whoever is seated first
 * sits at the gate, in front of the category's diamond.
 */
export function sectorSeats(sector: Sector, count: number, pitch: number): Seat[] {
  const seats: Seat[] = [];
  const span = sector.a1 - sector.a0;
  for (let row = 0; seats.length < count; row++) {
    const radius = ARENA.stands - pitch / 2 - row * pitch;
    if (radius < 4) break;
    const capacity = Math.max(1, Math.floor((span * radius) / pitch));
    const step = span / capacity;
    const take = Math.min(capacity, count - seats.length);
    // from the middle outwards: 0, +1, −1, +2… in a row with a middle seat, +½, −½, +1½… in one without
    for (let k = 0; k < take; k++) {
      const off = capacity % 2 ? (k % 2 ? 1 : -1) * Math.ceil(k / 2) : (k % 2 ? -1 : 1) * (Math.floor(k / 2) + 0.5);
      seats.push({ radius, angle: sector.mid + off * step });
    }
  }
  return seats;
}

/** How far towards the hub a section's rows reach when `count` agents are seated at a pitch. */
function standsDepth(sector: Sector, count: number, pitch: number): number {
  let left = count;
  let radius: number = ARENA.stands;
  for (let row = 0; left > 0; row++) {
    radius = ARENA.stands - pitch / 2 - row * pitch;
    if (radius < 4) break;
    left -= Math.max(1, Math.floor(((sector.a1 - sector.a0) * radius) / pitch));
  }
  return radius - pitch / 2;
}

/**
 * The room a seat takes for a goal: the arena's own, closed up only where
 * that would bring a section's back rows onto the hub's bench.
 */
export function seatPitch(sectors: Sector[]): number {
  let pitch: number = ARENA.seat;
  while (pitch > 2.4 && sectors.some((s) => standsDepth(s, crewSize(s.section), pitch) < ARENA.standsLeast)) pitch *= 0.95;
  return pitch;
}

/** The innermost edge of a section's seated rows. */
export const sectorDepth = (sector: Sector, pitch: number) => standsDepth(sector, crewSize(sector.section), pitch);

/** The idle agents' bench: rings round the hub, evenly seated, no further out than the stands may reach. */
export function benchSeats(count: number, pitch: number): Seat[] {
  const seats: Seat[] = [];
  for (let ring = 0; seats.length < count; ring++) {
    const radius = ARENA.bench + ring * pitch;
    if (radius > ARENA.standsLeast - pitch) break;
    const capacity = Math.max(1, Math.floor((TAU * radius) / pitch));
    const take = Math.min(capacity, count - seats.length);
    // a ring that is not full spreads its agents evenly rather than bunching them
    for (let k = 0; k < take; k++) seats.push({ radius, angle: Math.PI / 2 - ((k + 0.5) / take) * TAU });
  }
  return seats;
}

// ── Cells ────────────────────────────────────────────────────────

/** An asset's cell: a patch of the floor behind its category's gate. */
export interface Cell {
  r0: number;
  r1: number;
  a0: number;
  a1: number;
}

/**
 * The cell of a section's k-th asset. Cells stand in columns four deep,
 * filled column by column, the block centred behind the category's diamond —
 * so the block is as large as the goal has assets there. Every cell takes the
 * same room, closed up only where that many would not fit behind the gate.
 */
export function assetCell(sector: Sector, k: number): Cell {
  const n = sector.section.assets;
  const columns = Math.ceil(n / ARENA.cellRows);
  const step = Math.min(ARENA.cell / ARENA.cells, ((sector.a1 - sector.a0) * 0.96) / columns);
  const column = Math.floor(k / ARENA.cellRows);
  const row = k % ARENA.cellRows;
  const a0 = sector.mid - (columns * step) / 2 + column * step;
  const gap = Math.min(0.9 / ARENA.cells, step * 0.14);
  return { r0: ARENA.cells + row * ARENA.cell, r1: ARENA.cells + (row + 1) * ARENA.cell - 1.8, a0: a0 + gap, a1: a0 + step - gap };
}

// ── The wall ─────────────────────────────────────────────────────

/** Minutes the wall behind a section covers. */
export const DAY_MINUTES = 24 * 60;

/**
 * How many stretches the day is cut into on a section's wall: as many as
 * stand a few pixels apart — five minutes each on the longest walls, two
 * hours on the shortest — so every wall has the same grain, whatever its
 * length.
 */
export function wallBins(sector: Sector, scale: number): number {
  const length = (sector.a1 - sector.a0) * ARENA.wall * scale;
  return [288, 144, 96, 48, 24, 12].find((bins) => length / bins >= 4.6) ?? 12;
}

/**
 * A day sent in `day.length` stretches, cut to `bins` (never finer than it
 * was sent): calls are added up, the share held up is weighed by them.
 */
export function resampleDay(day: readonly { calls: number; away: number }[], bins: number): { calls: number; away: number }[] {
  if (!day.length || bins >= day.length) return [...day];
  return Array.from({ length: bins }, (_, i) => {
    const from = Math.floor((i * day.length) / bins);
    const to = Math.floor(((i + 1) * day.length) / bins);
    let calls = 0;
    let away = 0;
    for (let j = from; j < to; j++) {
      calls += day[j]!.calls;
      away += day[j]!.calls * day[j]!.away;
    }
    return { calls, away: calls ? away / calls : 0 };
  });
}

/** Where the i-th of `bins` bars stands on a section's wall: the day runs clockwise, and ends at the section's edge. */
export const wallAngle = (sector: Sector, i: number, bins: number) => sector.a1 - ((i + 0.5) / bins) * (sector.a1 - sector.a0);

// ── Drawing ──────────────────────────────────────────────────────

const xy = (P: Project, point: Vec3) => {
  const p = P(...point);
  return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
};

/** An arc of the floor, as a path. */
export function arcPath(P: Project, radius: number, a0: number, a1: number): string {
  const steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.045));
  let d = '';
  for (let i = 0; i <= steps; i++) d += `${i ? 'L' : 'M'}${xy(P, arenaPoint(radius, a0 + ((a1 - a0) * i) / steps))}`;
  return d;
}

/**
 * A sheet standing on an arc of the floor, from the floor up to a height,
 * closed — a wall's own glass. Seen in plan it is laid outwards, as the bars
 * on it are.
 */
export function sheetPath(P: Project, radius: number, a0: number, a1: number, height: number, plan: boolean): string {
  const steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.06));
  let d = '';
  for (let i = 0; i <= steps; i++) d += `${i ? 'L' : 'M'}${xy(P, arenaPoint(radius, a0 + ((a1 - a0) * i) / steps))}`;
  for (let i = steps; i >= 0; i--) d += `L${xy(P, arenaPoint(radius, a0 + ((a1 - a0) * i) / steps, height, plan))}`;
  return `${d}Z`;
}

/** A round patch of the floor about a point of it — where a light falls. */
export function poolPath(P: Project, radius: number, angle: number, reach: number): string {
  const [cx, cy, cz] = arenaPoint(radius, angle);
  let d = '';
  for (let i = 0; i <= 20; i++) {
    const t = (i / 20) * TAU;
    d += `${i ? 'L' : 'M'}${xy(P, [cx + Math.cos(t) * reach, cy, cz + Math.sin(t) * reach])}`;
  }
  return `${d}Z`;
}

/** A patch of the floor between two radii and two angles, closed. */
export function patchPath(P: Project, r0: number, r1: number, a0: number, a1: number): string {
  const steps = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 0.06));
  let d = '';
  for (let i = 0; i <= steps; i++) d += `${i ? 'L' : 'M'}${xy(P, arenaPoint(r1, a0 + ((a1 - a0) * i) / steps))}`;
  for (let i = steps; i >= 0; i--) d += `L${xy(P, arenaPoint(r0, a0 + ((a1 - a0) * i) / steps))}`;
  return `${d}Z`;
}

/** A line from one point of the arena to another, as a path. */
export const linePath = (P: Project, from: Vec3, to: Vec3) => `M${xy(P, from)}L${xy(P, to)}`;
