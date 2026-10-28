/** A goal's status: the colour of the dot beside its code. Health below the thresholds turns it amber, then rose. */
export type GoalHealth = 'healthy' | 'degraded' | 'critical';

/**
 * Agent states the trees and the legend tell apart: working agents are
 * white, idle grey, and each held state wears a mark of its own — awaiting
 * (waiting on a person or a slow dependency), blocked, failed, and degraded
 * (slowed, or past its budget).
 */
export type AgentState = 'healthy' | 'degraded' | 'awaiting' | 'blocked' | 'failed' | 'idle';

/** What holds a goal's agents on a resource group. */
export type HoldState = 'awaiting' | 'blocked' | 'failed';

/**
 * How a goal fares with one of its resource groups: its traffic flows
 * (`healthy`), some of it is slowed (`degraded`), or agents are held there,
 * in the state that holds them.
 */
export type ResourceState = 'healthy' | 'degraded' | HoldState;

/** A dependency as the graph weighs it: agents held on it, some traffic slowed, or all of it flowing. */
export type DependencyHealth = 'held' | 'degraded' | 'clean';

export interface AgentsBreakdownInput {
  total?: number | string;
  healthy?: number | string;
  degraded?: number | string;
  awaiting?: number | string;
  blocked?: number | string;
  failed?: number | string;
  idle?: number | string;
}

/**
 * A resource group a goal draws on, as that goal meets it. Groups of the same
 * name (or kind) on different goals are one group of the graph's row.
 */
export interface GoalResourceInput {
  id?: string;
  name?: string;
  label?: string;
  /** Resource kind (`camera`, `model`, `tool`…): names the group when it has no name. */
  kind?: string;
  type?: string;
  /** `healthy`, `degraded`, or what holds agents there: `awaiting`, `blocked`, `failed`. */
  state?: string;
  status?: string;
  /** Agents of the goal held on this group; summed beside its name (`SYSTEM 94`). */
  held?: number | string;
  /** Calls a minute the goal makes to it: the more, the quicker the light runs along its line. */
  calls?: number | string;
  /** What is wrong, in plain language. */
  detail?: string;
  /** The cause that holds agents here, e.g. `credential grant required`: the traced line's title. */
  cause?: string;
  /** Who owns the cause. */
  owner?: string;
  /** How long it has held them, e.g. `14m`. */
  since?: string;
  /** The rule that holds them, e.g. `R-047`. */
  rule?: string;
}

/** A resource group of the row as a whole, when the payload describes it. */
export interface ResourceGroupInput {
  id?: string;
  name?: string;
  label?: string;
  kind?: string;
  type?: string;
  /** Assets in the group. */
  count?: number | string;
  healthy?: number | string;
  degraded?: number | string;
  impaired?: number | string;
  detail?: string;
}

export interface GoalInput {
  id?: string;
  /** Short reference shown above the name, e.g. `G-014`. */
  code?: string;
  name?: string;
  title?: string;
  label?: string;
  /** Agent total, or the count per state. */
  agents?: number | string | AgentsBreakdownInput;
  /** Progress to target, `0.88`, `88` or `"88%"`: the ring under the tree. Alias: `health`. */
  progress?: number | string;
  health?: number | string;
  /** Token burn against the goal's baseline, printed as `1.1×`. */
  multiplier?: number | string;
  multiplierLabel?: string;
  /** Agents held. Defaults to awaiting + blocked + failed + degraded. Alias: `impure`. */
  exceptionCount?: number | string;
  impure?: number | string;
  /** `on track`, `at risk`, `blocked`, `off track`, `healthy`, `degraded`, `critical` and other aliases. */
  status?: string;
  /** Words beside the status dot. Defaults to ON TRACK, AT RISK, BLOCKED or OFF TRACK. */
  statusLabel?: string;
  /** The groups the goal draws on: a line rises from its root to each. */
  resourceGroups?: GoalResourceInput[] | null;
}

export interface GoalThresholdsInput {
  /** Progress below this turns the status amber. Default 0.8. */
  degraded?: number | string;
  /** Progress below this turns it rose. Default 0.25. */
  critical?: number | string;
}

export interface GoalsDependencyGraphPayload {
  chartType?: string;
  name?: string;
  title?: string;
  goals?: GoalInput[] | null;
  /** The row of groups, in order, with what each holds as a whole. Groups only goals name join it after these. */
  resourceGroups?: ResourceGroupInput[] | null;
  /** The goal at the centre on load, by id, code or name. Defaults to the goal with the most agents held. */
  center?: string;
  /** Agents held across the graph, in the line under the title. Defaults to the goals' sum. */
  exceptionCount?: number | string;
  thresholds?: GoalThresholdsInput | null;
}

export interface AgentsBreakdown {
  total: number;
  healthy: number;
  degraded: number;
  awaiting: number;
  blocked: number;
  failed: number;
  idle: number;
}

export interface GraphGoal {
  id: string;
  /** Short reference, e.g. `G-014`; empty when the payload gives none. */
  code: string;
  name: string;
  agents: AgentsBreakdown;
  /** 0–1 progress to target. */
  progress: number;
  status: GoalHealth;
  /** Uppercase words beside the status dot: ON TRACK, AT RISK, BLOCKED… */
  statusLabel: string;
  multiplier: number | null;
  multiplierLabel: string;
  /** Agents held: the HELD reading under the goal. */
  held: number;
}

export interface GraphResource {
  /** The key goals share it by: its name, lowercased, else its kind. */
  id: string;
  name: string;
  kind: string;
  /** Assets in the group, and how they stand, when the payload says. */
  count: number | null;
  healthy: number | null;
  degraded: number | null;
  impaired: number | null;
  detail: string;
}

/** A goal → resource group dependency: a line from the goal's root up to the group. */
export interface GraphEdge {
  /** Goal id. */
  goal: string;
  /** Resource group id. */
  resource: string;
  state: ResourceState;
  health: DependencyHealth;
  /** What holds the goal's agents there, when something does. */
  hold: HoldState | null;
  /** Agents of the goal held there. */
  held: number;
  /** Calls a minute, or null when the payload gives none. */
  calls: number | null;
  detail: string;
  cause: string;
  owner: string;
  since: string;
  rule: string;
}

export interface GoalsDependencyGraphModel {
  title: string;
  goals: GraphGoal[];
  resources: GraphResource[];
  edges: GraphEdge[];
  /** The goal at the centre on load. */
  center: string;
  /** Agents held across the graph. */
  held: number;
  empty: boolean;
}
