import type { DependencyHealth, GoalsDependencyGraphModel, GraphEdge, HoldState } from './types.js';

/**
 * Readings off the dependencies: how bad each is, what a group holds across
 * the goals that draw on it, and which line of a goal holds most of its
 * agents — the one the graph traces by default.
 */

/** Severity of a dependency: stopped agents beat failed ones, which beat waiting ones, which beat slowed traffic. */
const HOLD_RANK: Record<HoldState, number> = { blocked: 4, failed: 3, awaiting: 2 };
export const edgeRank = (e: GraphEdge) => (e.hold ? HOLD_RANK[e.hold] : e.health === 'degraded' ? 1 : 0);

/** The worse of two dependencies; between equals, the one holding more agents. */
const worse = (a: GraphEdge, b: GraphEdge) => edgeRank(b) - edgeRank(a) || b.held - a.held;

/** A goal's dependencies, the worst first. */
export const goalEdges = (model: GoalsDependencyGraphModel, goal: string) => model.edges.filter((e) => e.goal === goal).sort(worse);

/** The dependency of a goal that holds its agents, if any does. */
export function worstHold(model: GoalsDependencyGraphModel, goal: string): GraphEdge | undefined {
  const first = goalEdges(model, goal)[0];
  return first?.hold ? first : undefined;
}

export interface ResourceStanding {
  health: DependencyHealth;
  hold: HoldState | null;
  /** Agents held on it, all goals together. */
  held: number;
  /** Goals that draw on it. */
  goals: number;
  /** Calls a minute it takes from them, where they say. */
  calls: number;
}

/** What the goals that draw on a group meet there, taken together. */
export function resourceStanding(model: GoalsDependencyGraphModel, resource: string): ResourceStanding {
  const edges = model.edges.filter((e) => e.resource === resource).sort(worse);
  return {
    health: edges[0]?.health ?? 'clean',
    hold: edges[0]?.hold ?? null,
    held: edges.reduce((sum, e) => sum + e.held, 0),
    goals: edges.length,
    calls: edges.reduce((sum, e) => sum + (e.calls ?? 0), 0),
  };
}

/** The order dependencies are drawn in: those whose traffic flows first, those that hold agents last, the worst on top. */
export function drawOrder(edges: readonly GraphEdge[]): number[] {
  return edges.map((_, i) => i).sort((a, b) => edgeRank(edges[a]!) - edgeRank(edges[b]!) || edges[a]!.held - edges[b]!.held);
}

/** A group every goal draws on says nothing about which goals are tied together. */
export function sharedByAll(model: GoalsDependencyGraphModel): Set<string> {
  const goals = model.goals.length;
  return new Set(model.resources.filter((r) => goals > 1 && model.edges.filter((e) => e.resource === r.id).length === goals).map((r) => r.id));
}
