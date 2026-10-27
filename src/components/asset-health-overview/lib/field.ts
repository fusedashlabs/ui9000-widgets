import { ARENA, benchSeats, seatPitch, sectorDepth, sectorSeats, type Sector, type Seat } from './arena.js';
import { PIVOT_X, PIVOT_Y, type CamPose } from './camera.js';
import { hashString, rng } from './random.js';
import type { AssetHealthGoal, HoldState } from './types.js';

/**
 * The goal's agents as the painters draw them: one dot each — working agents
 * white, idle ones grey, and the ones held wearing a mark of their own: a
 * ring (awaiting), a solid dot (blocked), a cross (failed) or a triangle
 * (over budget) — so trouble is the only colour in the field.
 */
export const FIELD_STATES = ['working', 'idle', 'awaiting', 'blocked', 'failed', 'overBudget'] as const;
export type FieldState = (typeof FIELD_STATES)[number];

/** The goal at the middle of the field, in design px, with what its light needs to know. */
export interface FieldGoal {
  id: string;
  x: number;
  y: number;
  z: number;
  r: number;
  total: number;
  held: Record<Exclude<FieldState, 'working' | 'idle'>, number>;
  /** Pulses the goal's light while it is blocked. */
  alert: boolean;
}

export interface AgentCloud {
  goal: FieldGoal;
  /** x, y, z per agent, as offsets from the goal centre (design px). */
  position: Float32Array;
  /** One number per agent in [0, 1): its size, brightness and twinkle. */
  seed: Float32Array;
  /** Where each state's agents start and end in the arrays above. */
  ranges: Record<FieldState, [from: number, to: number]>;
  /** Radians per second about the goal's own vertical axis. */
  spin: number;
  phase: number;
}

export interface AgentField {
  clouds: AgentCloud[];
}

/** A category's gate, as the calls to it are drawn. */
export interface CallSlot {
  /** Goal id. */
  goal: string;
  /** Where its diamond stands on the gate, radians. */
  angle: number;
  /** Calls a minute the goal makes to it. */
  calls: number;
  /** Share of that traffic slowed, stopped or turned away, 0–1. */
  trouble: number;
  /** What holds the goal's agents there, when something does. */
  hold?: HoldState;
  /** The working agents its calls leave from, as a range of the cloud's arrays: the section's own rows. */
  agents?: [from: number, to: number];
}

export interface FieldOptions {
  pose: CamPose;
  /** Design px per screen px: marks keep their size on screen at any scale. */
  unit: number;
  /** Brightness of working and idle agents: 1 normally, low when only the held should stand out. */
  healthy: number;
  /** How far past the stands' front row the gates stand, design px; and whether the view is a plan. */
  orbit: number;
  flat: boolean;
  /** The gates, for the calls running to them. */
  slots: CallSlot[];
  /** The part of the design space the canvas covers, design px. */
  region: { x: number; y: number; w: number; h: number };
  /** How much working agents wander about their places, 1 as in a cloud; less where they sit in rows. */
  drift?: number;
  /** Scales an agent's dot, 1 as in a cloud. */
  grain?: number;
  /** How much nearer agents are drawn larger and brighter, 1 as in a cloud; less where every row is to be read. */
  depthCue?: number;
}

export interface PaintOptions extends FieldOptions {
  /** Seconds since start; null freezes the field (reduced motion). */
  time: number | null;
  /** 0–1 while the field settles in on load. */
  intro: number;
}

/**
 * The goal's agents, seated: one dot each, but each in its place — in the
 * section of the category its work is with, the held ones in the front rows
 * against that category's gate, the idle ones on the bench round the hub.
 * So where an agent sits is what it is doing, and a section's rows are
 * exactly as many as the label beside it says.
 */
export interface ArenaField {
  field: AgentField;
  /** The room a seat takes in this goal's stands, design px. */
  pitch: number;
  /** By section: its working agents, as a range of the field's arrays — where its calls leave from. */
  crews: Record<string, [from: number, to: number]>;
  /** By section: how far towards the hub its rows reach. */
  depth: Record<string, number>;
}

export function arenaField(goal: AssetHealthGoal, sectors: Sector[]): ArenaField {
  const pitch = seatPitch(sectors);
  const seated: Record<FieldState, Seat[]> = { working: [], idle: [], awaiting: [], blocked: [], failed: [], overBudget: [] };
  const crews: ArenaField['crews'] = {};
  const depth: ArenaField['depth'] = {};

  for (const sector of sectors) {
    const { crew, hold, id } = sector.section;
    const seats = sectorSeats(sector, crew.working + crew.overBudget + crew.held, pitch);
    // the held take the front rows, against the gate that holds them
    if (hold) seated[hold].push(...seats.slice(0, crew.held));
    // behind them the ones at work — those past their budget among them, evenly, not gathered anywhere
    const rest = seats.slice(crew.held);
    const over = new Set(Array.from({ length: crew.overBudget }, (_, m) => Math.floor(((m + 0.5) * rest.length) / crew.overBudget)));
    const from = seated.working.length;
    rest.forEach((seat, i) => seated[over.has(i) ? 'overBudget' : 'working'].push(seat));
    crews[id] = [from, seated.working.length];
    depth[id] = sectorDepth(sector, pitch);
  }
  seated.idle = benchSeats(goal.idle, pitch);

  const total = FIELD_STATES.reduce((sum, state) => sum + seated[state].length, 0);
  const position = new Float32Array(total * 3);
  const seed = new Float32Array(total);
  const ranges = {} as AgentCloud['ranges'];
  const random = rng(hashString(goal.id || goal.name, 6151));
  let i = 0;
  for (const state of FIELD_STATES) {
    const start = i;
    for (const seat of seated[state]) {
      position.set([Math.cos(seat.angle) * seat.radius, 0, Math.sin(seat.angle) * seat.radius], i * 3);
      seed[i++] = random();
    }
    ranges[state] = [start, i];
  }

  const fieldGoal: FieldGoal = {
    id: goal.id || 'goal',
    x: PIVOT_X,
    y: PIVOT_Y,
    z: 0,
    r: ARENA.stands,
    total: goal.total,
    held: { awaiting: goal.awaiting, blocked: goal.blocked, failed: goal.failed, overBudget: goal.overBudget },
    alert: goal.status?.tone === 'blocked',
  };
  return { field: { clouds: [{ goal: fieldGoal, position, seed, ranges, spin: 0, phase: 0 }] }, pitch, crews, depth };
}
