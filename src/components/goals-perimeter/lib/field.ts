import type { SceneGoal, Vec3 } from './cloud.js';
import { hashString, rng } from './random.js';
import type { AgentState } from './types.js';

/**
 * The agents of the board, drawn one by one: every point is one agent of its
 * goal, in its real state. Healthy agents are white, idle ones grey, and the
 * held ones carry a mark of their own — a ring (awaiting), a solid dot
 * (blocked), a cross (failed) or a triangle (degraded) — so trouble is the
 * only colour in the field.
 *
 * Where an agent sits inside its goal says nothing: agents are scattered
 * through the goal's volume, a little denser towards the middle, and no state
 * is gathered anywhere. What holds them is read off the orbit, not the cloud.
 *
 * Built once, painted every frame through the shared camera. Each cloud turns
 * slowly about its own axis, a little faster the hotter the goal burns.
 */

/** The order the painters draw states in, and their index in the shaders. */
export const FIELD_STATES = ['healthy', 'idle', 'awaiting', 'blocked', 'failed', 'degraded'] as const satisfies readonly AgentState[];
export type FieldState = (typeof FIELD_STATES)[number];

/** Most points the board draws; past it every state is sampled alike, and counts stay exact elsewhere. */
export const FIELD_BUDGET = 6000;

/** Calls a minute assumed for a resource group that gives none. */
export const DEFAULT_CALLS = 1000;

const TAU = Math.PI * 2;

export interface AgentCloud {
  goal: SceneGoal;
  /** x, y, z per agent, as offsets from the goal centre (design px). */
  position: Float32Array;
  /** One number per agent in [0, 1): its size, brightness and twinkle. */
  seed: Float32Array;
  /** Where each state's agents start and end in the arrays above. */
  ranges: Record<FieldState, [from: number, to: number]>;
  /** Radians per second about the goal's own vertical axis. */
  spin: number;
  phase: number;
  /** Lights going round the orbit: more of them the more calls a minute the goal makes. */
  motes: number;
}

export interface AgentField {
  clouds: AgentCloud[];
}

/** Calls a minute a goal makes to all its resource groups. */
export function goalCalls(g: SceneGoal): number {
  return g.goal.resourceGroups.reduce((sum, group) => sum + (group.calls ?? DEFAULT_CALLS), 0);
}

/** Agents a cloud draws in each state: all of them within the budget, else a sample that keeps every held state. */
export function fieldCounts(goals: readonly SceneGoal[], budget = FIELD_BUDGET): Record<string, Record<FieldState, number>> {
  const total = goals.reduce((sum, g) => sum + g.goal.agents.total, 0);
  const share = total > budget ? budget / total : 1;
  return Object.fromEntries(
    goals.map((g) => [
      g.id,
      Object.fromEntries(
        FIELD_STATES.map((state) => {
          const n = g.goal.agents[state];
          const held = state !== 'healthy' && state !== 'idle';
          return [state, n > 0 ? Math.max(held ? 1 : 0, Math.round(n * share)) : 0];
        }),
      ) as Record<FieldState, number>,
    ]),
  );
}

/** The seed a goal's cloud is drawn from: its code, as on the design's board, else its id. */
export const cloudSeed = (g: SceneGoal) => hashString(g.goal.code || g.id, 4417);

function buildCloud(g: SceneGoal, counts: Record<FieldState, number>): AgentCloud {
  const seedOf = cloudSeed(g);
  const rnd = rng(seedOf);
  const limit = g.r * 0.96;

  /** Somewhere in the goal's volume: any direction, a little denser towards the middle. */
  const somewhere = (): Vec3 => {
    const v = rnd() * 2 - 1;
    const th = rnd() * TAU;
    const sr = Math.sqrt(1 - v * v);
    const k = limit * Math.pow(rnd(), 0.46);
    return [sr * Math.cos(th) * k, v * k, sr * Math.sin(th) * k];
  };

  const total = FIELD_STATES.reduce((sum, s) => sum + counts[s], 0);
  const position = new Float32Array(total * 3);
  const seed = new Float32Array(total);
  const ranges = {} as AgentCloud['ranges'];
  let i = 0;
  for (const state of FIELD_STATES) {
    const from = i;
    for (let n = 0; n < counts[state]; n++, i++) {
      position.set(somewhere(), i * 3);
      seed[i] = rnd();
    }
    ranges[state] = [from, i];
  }

  const calls = goalCalls(g);
  const motes = calls > 0 ? Math.max(1, Math.min(6, Math.round(Math.log10(calls) * 1.6 - 1.4))) : 0;
  const burn = g.goal.multiplier ?? 1;
  return { goal: g, position, seed, ranges, spin: (0.03 + 0.011 * burn) * (seedOf % 2 ? 1 : -1), phase: rnd() * TAU, motes };
}

/** One point per agent of every goal. */
export function buildAgentField(goals: readonly SceneGoal[]): AgentField {
  const counts = fieldCounts(goals);
  return { clouds: goals.map((g) => buildCloud(g, counts[g.id]!)) };
}

/** A resource group on a goal's orbit, as the calls to it are drawn. */
export interface CallSlot {
  /** Goal id. */
  goal: string;
  /** Where its diamond stands on the orbit, radians. */
  angle: number;
  /** Calls a minute the goal makes to it. */
  calls: number;
  /** Share of that traffic slowed, stopped or turned away, 0–1. */
  trouble: number;
  /** What holds the goal's agents there, when something does. */
  hold?: 'awaiting' | 'blocked' | 'failed';
}

/** A link that carries light: its world-space samples. */
export interface LinkTrack {
  points: Vec3[];
  /** Set when the same hold stops agents at both its ends. */
  hold?: 'awaiting' | 'blocked' | 'failed';
  /** Calls a minute its two goals make to the group they share: more calls, more lights on the line. */
  calls: number;
  /** Shifts its pulses, so links do not beat together. */
  seed: number;
  /** Brightness, 0–1. */
  alpha: number;
}

export interface FieldOptions {
  pose: { yaw: number; pitch: number; focal: number };
  /** Design px per screen px: marks keep their size on screen at any scale. */
  unit: number;
  /** Brightness of healthy and idle agents. */
  healthy: number;
  /** Per-goal brightness. */
  goalAlpha?: (goalId: string) => number;
  links: LinkTrack[];
  /** Radius of a goal's orbit beyond the goal's own, design px; and whether it lies flat (plan view). */
  orbit: number;
  flat: boolean;
  /** The resource groups on the goals' orbits, for the calls running to them. */
  slots: CallSlot[];
  /** Goal under the pointer: the lens pulls focus to it. */
  focus: string | null;
  /** The part of the design space the canvas covers, design px. */
  region: { x: number; y: number; w: number; h: number };
  /** The camera's zoom: zoomed in, the lens focuses on the goal in the middle of the frame. */
  zoom: number;
}

export interface PaintOptions extends FieldOptions {
  /** Seconds since start; null freezes the field (reduced motion). */
  time: number | null;
  /** 0–1 while the field settles in on load. */
  intro: number;
}
