import { BASELINE, growTree, type TreeForm } from './geometry.js';
import { hashString, rng } from './random.js';
import type { AgentState, GraphGoal } from './types.js';

/**
 * The agents of the graph, drawn one by one: every point is one agent of its
 * goal, in its real state, standing on a tip of its goal's tree. A tree has a
 * tip for every agent, so nothing on it is decoration: the white tips are
 * agents at work, the grey ones idle, and each held agent wears its state's
 * mark — a ring (awaiting), a solid dot (blocked), a cross (failed) or a
 * triangle (degraded) — exactly as many of each as the goal has.
 *
 * Which tip an agent takes says nothing: the held are scattered through the
 * tree, not gathered on a branch. What holds them is read off the lines that
 * rise from the root.
 *
 * Built once. The trees move and change size without it being rebuilt: the
 * scene sets each goal's place and scale before every frame.
 */

/** The order the painters draw states in, and their index in the shaders. */
export const FIELD_STATES = ['healthy', 'idle', 'awaiting', 'blocked', 'failed', 'degraded'] as const satisfies readonly AgentState[];
export type FieldState = (typeof FIELD_STATES)[number];

/** Most agents the graph draws; past it every state is sampled alike, and counts stay exact elsewhere. */
export const FIELD_BUDGET = 6000;

/** How far up its tree a goal's light sits, as a share of the tree's reach. */
const LIGHT_AT = 0.5;

/** A goal as the painter sees it: where its canopy's centre is and how far it reaches, set every frame. */
export interface FieldGoal {
  id: string;
  goal: GraphGoal;
  x: number;
  y: number;
  z: number;
  r: number;
}

export interface AgentCloud {
  goal: FieldGoal;
  /** x, y, z per agent, as offsets from the goal centre (design px). */
  position: Float32Array;
  /** One number per agent in [0, 1): its size, brightness and twinkle. */
  seed: Float32Array;
  /** Where each state's agents start and end in the arrays above. */
  ranges: Record<FieldState, [from: number, to: number]>;
  /** Radians per second about the goal's own vertical axis: a tree stands still. */
  spin: number;
  phase: number;
  /** Scales the agents' places about the goal's centre: 1 at the centre of the graph, smaller off it. */
  scale: number;
}

export interface AgentField {
  clouds: AgentCloud[];
}

/** A goal's tree and the agents standing on it. */
export interface Planted {
  tree: TreeForm;
  cloud: AgentCloud;
  /** From the root up to the canopy's centre, at the centre's size. */
  lift: number;
}

export interface FieldOptions {
  pose: { yaw: number; pitch: number; focal: number };
  /** Design px per screen px: marks keep their size on screen at any scale. */
  unit: number;
  /** Brightness of working and idle agents. */
  healthy: number;
  /** Per-goal brightness. */
  goalAlpha?: (goalId: string) => number;
  /** Goal under the pointer: the lens pulls focus to it. */
  focus: string | null;
  /** The part of the design space the canvas covers, design px. */
  region: { x: number; y: number; w: number; h: number };
  /** The camera's zoom: zoomed in, the lens focuses on the goal in the middle of the frame. */
  zoom: number;
  /** Scales an agent's dot, 1 as in a cloud. */
  grain?: number;
  /** How much nearer agents are drawn larger and brighter, 1 as in a cloud; less where agents are to be read alike. */
  depthCue?: number;
  /** How far the lens pulls colours apart towards the edges of the frame, 1 as in a cloud. */
  aberration?: number;
}

export interface PaintOptions extends FieldOptions {
  /** Seconds since start; null freezes the field (reduced motion). */
  time: number | null;
  /** 0–1 while the field settles in on load. */
  intro: number;
}

/** Agents a goal draws in each state: all of them within the budget, else a sample that keeps every held state. */
export function fieldCounts(goals: readonly GraphGoal[], budget = FIELD_BUDGET): Record<string, Record<FieldState, number>> {
  const total = goals.reduce((sum, g) => sum + g.agents.total, 0);
  const share = total > budget ? budget / total : 1;
  return Object.fromEntries(
    goals.map((g) => [
      g.id,
      Object.fromEntries(
        FIELD_STATES.map((state) => {
          const n = g.agents[state];
          const held = state !== 'healthy' && state !== 'idle';
          return [state, n > 0 ? Math.max(held ? 1 : 0, Math.round(n * share)) : 0];
        }),
      ) as Record<FieldState, number>,
    ]),
  );
}

/** Plants every goal: its tree, grown with a tip for each agent drawn, and those agents on its tips. */
export function plantGoals(goals: readonly GraphGoal[]): Record<string, Planted> {
  const counts = fieldCounts(goals);
  const largest = Math.max(1, ...goals.map((g) => g.agents.total));
  return Object.fromEntries(
    goals.map((goal) => {
      const drawn = counts[goal.id]!;
      const n = FIELD_STATES.reduce((sum, s) => sum + drawn[s], 0);
      const tree = growTree(goal, n, largest);
      const count = tree.tips.length / 3;
      const random = rng(hashString(goal.code || goal.id, 2713));
      // every agent takes a tip of its own, in no order
      const tip = Array.from({ length: count }, (_, i) => i);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [tip[i], tip[j]] = [tip[j]!, tip[i]!];
      }

      const position = new Float32Array(count * 3);
      const seed = new Float32Array(count);
      const ranges = {} as AgentCloud['ranges'];
      const lift = tree.reach * LIGHT_AT;
      let i = 0;
      for (const state of FIELD_STATES) {
        const from = i;
        for (let k = 0; k < drawn[state] && i < count; k++, i++) {
          const t = tip[i]! * 3;
          position.set([tree.tips[t]!, tree.tips[t + 1]! + lift, tree.tips[t + 2]!], i * 3);
          seed[i] = random();
        }
        ranges[state] = [from, i];
      }
      const cloud: AgentCloud = {
        goal: { id: goal.id, goal, x: 0, y: BASELINE - lift, z: 0, r: tree.reach * 0.6 },
        position,
        seed,
        ranges,
        spin: 0,
        phase: 0,
        scale: 1,
      };
      return [goal.id, { tree, cloud, lift }];
    }),
  );
}

/** Stands a planted goal's agents on its tree, wherever the tree now is and however large. */
export function standCloud(planted: Planted, x: number, scale: number): void {
  const { cloud, tree, lift } = planted;
  cloud.goal.x = x;
  cloud.goal.y = BASELINE - lift * scale;
  cloud.goal.r = tree.reach * 0.6 * scale;
  cloud.scale = scale;
}
