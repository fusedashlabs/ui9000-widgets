import type { PerimeterGoal, SatelliteHealth } from '../lib/index.js';

/**
 * Problems only, as the Agent operations design's Held only: the board keeps
 * only what is held. The working and idle agents all but go out, and so does
 * whatever has nothing held on it — a goal none of whose agents is held, a
 * line or a group where traffic flows. The held agents, the lines and groups
 * that hold them and the calls turned away keep their full light.
 */
export const EXCEPTIONS = {
  /** Brightness of working and idle agents, 1 normally. Kept low: the painter's grade lifts faint light. */
  healthy: 0.05,
  /** A goal none of whose agents is held: its agents, its instruments and its callout. */
  quiet: 0.35,
  /** How a line or a group shows, by how the goal fares there. */
  health: { held: 1, degraded: 0.6, clean: 0.22 } satisfies Record<SatelliteHealth, number>,
};

/** Agents held on a goal: awaiting, blocked, failed or past their budget. */
export const exceptionCount = (goal: PerimeterGoal) => goal.agents.awaiting + goal.agents.blocked + goal.agents.failed + goal.agents.degraded;

/** How strongly a goal shows under Problems only: in full while any of its agents is held. */
export const goalShown = (goal: PerimeterGoal, on: boolean) => (on && exceptionCount(goal) === 0 ? EXCEPTIONS.quiet : 1);

/** How strongly a dependency shows under Problems only, by how its goal fares there. */
export const healthShown = (health: SatelliteHealth, on: boolean) => (on ? EXCEPTIONS.health[health] : 1);
