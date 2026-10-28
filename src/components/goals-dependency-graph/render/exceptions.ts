import type { DependencyHealth, GraphGoal } from '../lib/index.js';

/**
 * Problems only, as the Agent operations design's Held only: the graph keeps
 * only what is held. The working and idle agents all but go out, and so does
 * whatever has nothing held on it — a goal none of whose agents is held, a
 * line or a group where traffic flows. The held agents and the lines and
 * groups that hold them keep their full light.
 */
export const EXCEPTIONS = {
  /** Brightness of working and idle agents, 1 normally. Kept low: the painter's grade lifts faint light. */
  healthy: 0.05,
  /** A goal none of whose agents is held: its agents, its tree, its root and its label. */
  quiet: 0.35,
  /** How a line or a group shows, by how the goals fare there. */
  health: { held: 1, degraded: 0.6, clean: 0.22 } satisfies Record<DependencyHealth, number>,
};

/** How strongly a goal shows under Problems only: in full while any of its agents is held. */
export const goalShown = (goal: GraphGoal, on: boolean) => (on && goal.held === 0 ? EXCEPTIONS.quiet : 1);

/** How strongly a line or a group shows under Problems only, by how the goals fare there. */
export const healthShown = (health: DependencyHealth, on: boolean) => (on ? EXCEPTIONS.health[health] : 1);
