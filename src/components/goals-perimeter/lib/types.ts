/** Perimeter colour. Health below the thresholds turns it amber, then rose. */
export type GoalHealth = 'healthy' | 'degraded' | 'critical';

/**
 * Agent states the cloud, the marks and the legend tell apart: healthy agents
 * are white, idle grey, and each held state wears a mark of its own —
 * awaiting (waiting on a person or a slow dependency), blocked, failed, and
 * degraded (slowed, or past its budget).
 */
export type AgentState = 'healthy' | 'degraded' | 'awaiting' | 'blocked' | 'failed' | 'idle';

/** States that get a mark and count as held. */
export type ExceptionState = 'failed' | 'blocked' | 'awaiting' | 'degraded';

/** What holds a goal's agents on a resource group, or both ends of a link. */
export type HoldState = 'awaiting' | 'blocked' | 'failed';

/** What holds a blocked agent: a rule, a dependency, or a person. */
export type BlockerKind = 'rule' | 'dependency' | 'human';

/**
 * How a goal fares with one of its resource groups: its traffic flows
 * (`healthy`), some of it is slowed (`degraded`), or agents are held there,
 * in the state that holds them.
 */
export type ResourceState = 'healthy' | 'degraded' | HoldState;

/** Glyph drawn inside a resource-group diamond. */
export type ResourceIcon =
  | 'sensor'
  | 'model'
  | 'network'
  | 'pipeline'
  | 'storage'
  | 'alert'
  | 'policy'
  | 'tool'
  | 'generic';

/** `active` draws a light line, `degraded` tints it, `unavailable` draws the red line and its marker. */
export type ConnectionStatus = 'active' | 'degraded' | 'unavailable';

export interface AgentsBreakdownInput {
  total?: number | string;
  healthy?: number | string;
  degraded?: number | string;
  awaiting?: number | string;
  blocked?: number | string;
  failed?: number | string;
  idle?: number | string;
}

/** One agent, e.g. `{ id: 'agent-17', state: 'failed', goal: 'Perimeter Watch' }`. */
export interface AgentNodeInput {
  id?: string | number;
  name?: string;
  label?: string;
  state?: string;
  status?: string;
  /** Goal id or name. Omitted, the agent belongs to the only goal. */
  goal?: string;
  /** Plain operational language: why the agent failed or what blocks it. */
  reason?: string;
  /** Blocked agents only: `rule`, `dependency` or `human`. */
  blocker?: string;
}

/** A group of agents in one exceptional state, e.g. `{ state: 'failed', count: 12, reason: 'Model timeout' }`. */
export interface GoalExceptionInput {
  state?: string;
  status?: string;
  count?: number | string;
  value?: number | string;
  reason?: string;
  label?: string;
  blocker?: string;
}

export interface ResourceGroupInput {
  id?: string;
  name?: string;
  label?: string;
  /** Resource kind (`model`, `toolset`, `infrastructure`, `pipeline`, `data`, …); picks the glyph. */
  kind?: string;
  type?: string;
  /** Glyph override: one of the `ResourceIcon` names. */
  icon?: string;
  /** `healthy`, `degraded`, or what holds agents there: `awaiting`, `blocked`, `failed`. */
  state?: string;
  status?: string;
  /** Agents that depend on this group. */
  agents?: number | string;
  /** Agents of the goal held on this group; printed beside its name (`TOOL 27`). */
  held?: number | string;
  /** Calls a minute the goal makes to it: more calls, more sparks and more light on its links. */
  calls?: number | string;
  detail?: string;
}

export interface GoalPositionInput {
  x?: number | string;
  y?: number | string;
  /** Depth, as a share of the board's width; further away when positive. */
  z?: number | string;
  /** Radius, as a share of the board's width. Defaults to one sized by the goal's agents. */
  r?: number | string;
}

export interface GoalInput {
  id?: string;
  /** Short reference shown above the name, e.g. `G-014`. */
  code?: string;
  name?: string;
  title?: string;
  label?: string;
  /** Agent total, or the count per state. Agent nodes fill it in when absent. */
  agents?: number | string | AgentsBreakdownInput;
  /** Goal health, `0.88`, `88` or `"88%"`. Sizes the perimeter arc. */
  health?: number | string;
  /** Ratio against the goal's baseline, printed as `1.1×`. */
  multiplier?: number | string;
  /** Tooltip name of the multiplier. */
  multiplierLabel?: string;
  /** Agents needing attention. Defaults to degraded + blocked + failed. Alias: `impure`. */
  exceptionCount?: number | string;
  impure?: number | string;
  /** Status override: `healthy`, `degraded`, `critical`, or `on track`, `at risk`, `blocked`, `off track` and other aliases. */
  status?: string;
  /** Words shown beside the status dot. Defaults to ON TRACK, AT RISK or BLOCKED / OFF TRACK. */
  statusLabel?: string;
  exceptions?: GoalExceptionInput[] | null;
  /** The groups, or only how many there are. */
  resourceGroups?: ResourceGroupInput[] | number | string | null;
  /** Layout hint, x and y 0–1 across the board, with an optional depth and radius. All goals need one for it to apply. */
  position?: GoalPositionInput | [number, number] | null;
  x?: number | string;
  y?: number | string;
}

/**
 * A relationship. Each end is a goal, a resource group or an agent (by id or
 * name); an end that is none of those is an external dependency.
 */
export interface LinkInput {
  id?: string;
  source?: string | number;
  target?: string | number;
  from?: string | number;
  to?: string | number;
  /** Lines in a goal-to-goal bundle. Defaults to the number of links between the pair. */
  strands?: number | string;
  weight?: number | string;
  value?: number | string;
  status?: string;
  /** Tint an otherwise active link. */
  exception?: boolean;
  label?: string;
  /** What is disconnected or degraded, in plain language. */
  reason?: string;
  /** What the outage stops. */
  impact?: string;
}

export interface GoalThresholdsInput {
  /** Health below this turns the perimeter amber. Default 0.8. */
  degraded?: number | string;
  /** Health below this turns it rose. Default 0.25. */
  critical?: number | string;
}

export interface GoalsPerimeterPayload {
  chartType?: string;
  name?: string;
  title?: string;
  /** One shared goal: an object, or only its name. */
  goal?: GoalInput | string | null;
  goals?: GoalInput[] | null;
  /** Agent nodes. Alias: `nodes`. */
  agents?: AgentNodeInput[] | null;
  nodes?: AgentNodeInput[] | null;
  /** Alias: `connections`. */
  links?: LinkInput[] | null;
  connections?: LinkInput[] | null;
  /** Agents needing attention across the board. Defaults to the goals' sum. */
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

export interface AgentNode {
  id: string;
  label: string;
  state: AgentState;
  goalId: string;
  reason: string;
  blocker: BlockerKind | null;
}

export interface GoalException {
  state: ExceptionState;
  count: number;
  reason: string;
  blocker: BlockerKind | null;
}

export interface ResourceGroup {
  id: string;
  /** The same group on another goal's orbit: its name, lowercased, else its kind. */
  shareKey: string;
  name: string;
  kind: string;
  icon: ResourceIcon;
  state: ResourceState;
  agents: number | null;
  /** Agents held on it: 0 unless its state is a hold. */
  held: number;
  calls: number | null;
  detail: string;
}

export interface PerimeterGoal {
  id: string;
  /** Short reference, e.g. `G-014`; empty when the payload gives none. */
  code: string;
  name: string;
  agents: AgentsBreakdown;
  /** 0–1. Taken from the payload, else the healthy share. */
  health: number;
  status: GoalHealth;
  /** Uppercase words beside the status dot: ON TRACK, AT RISK, BLOCKED… */
  statusLabel: string;
  multiplier: number | null;
  multiplierLabel: string;
  /** Agents needing attention: the HELD count in the goal's callout. */
  impure: number;
  exceptions: GoalException[];
  /** Drawn as diamonds. */
  resourceGroups: ResourceGroup[];
  /** Printed count; may exceed the listed groups. */
  resourceGroupCount: number;
  /** 0–1 board position, with depth and radius when given, or null for the automatic layout. */
  position: GoalPosition | null;
}

export interface GoalPosition {
  x: number;
  y: number;
  /** Share of the board's width; 0 when not given. */
  z: number;
  /** Share of the board's width, or null to size the goal by its agents. */
  r: number | null;
}

/**
 * Goal to goal. Given in the payload, or — when it gives none — one for each
 * resource group two goals share, running between that group's diamonds.
 */
export interface GoalConnection {
  id: string;
  source: string;
  target: string;
  strands: number;
  status: ConnectionStatus;
  label: string;
  reason: string;
  impact: string;
  /** The shared resource group it runs through (its `shareKey`), or '' for none. */
  via: string;
  /** Set when the same hold stops agents at both ends: the line takes that colour. */
  hold: HoldState | null;
}

/** Something outside the goals that one goal depends on. */
export interface ExternalDependency {
  id: string;
  label: string;
  goalId: string;
  status: ConnectionStatus;
  /** Links folded into this one. */
  links: number;
  reason: string;
  impact: string;
}

/** Agent to agent inside one goal. */
export interface AgentLink {
  goalId: string;
  source: string;
  target: string;
  status: ConnectionStatus;
}

export interface GoalsPerimeterModel {
  title: string;
  goals: PerimeterGoal[];
  agents: AgentNode[];
  connections: GoalConnection[];
  externals: ExternalDependency[];
  agentLinks: AgentLink[];
  /** Agents needing attention across the board. */
  exceptionCount: number;
  empty: boolean;
}
