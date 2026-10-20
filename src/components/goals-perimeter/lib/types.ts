/** Perimeter colour. Health below the thresholds turns it amber, then rose. */
export type GoalHealth = 'healthy' | 'degraded' | 'critical';

/** Agent states the cloud, the markers and the legend tell apart. */
export type AgentState = 'healthy' | 'degraded' | 'blocked' | 'failed' | 'idle';

/** States that get a marker and count as exceptions. */
export type ExceptionState = 'failed' | 'blocked' | 'degraded';

/** What holds a blocked agent: a rule, a dependency, or a person. */
export type BlockerKind = 'rule' | 'dependency' | 'human';

export type ResourceState = 'healthy' | 'degraded' | 'failed';

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
  state?: string;
  status?: string;
  /** Agents that depend on this group. */
  agents?: number | string;
  detail?: string;
}

export interface GoalPositionInput {
  x?: number | string;
  y?: number | string;
}

export interface GoalInput {
  id?: string;
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
  /** Perimeter override: `healthy`, `degraded`, `critical` or their aliases. */
  status?: string;
  exceptions?: GoalExceptionInput[] | null;
  /** The groups, or only how many there are. */
  resourceGroups?: ResourceGroupInput[] | number | string | null;
  /** Layout hint, each axis 0–1 across the board. All goals need one for it to apply. */
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
  name: string;
  kind: string;
  icon: ResourceIcon;
  state: ResourceState;
  agents: number | null;
  detail: string;
}

export interface PerimeterGoal {
  id: string;
  name: string;
  agents: AgentsBreakdown;
  /** 0–1. Taken from the payload, else the healthy share. */
  health: number;
  status: GoalHealth;
  multiplier: number | null;
  multiplierLabel: string;
  /** Agents needing attention: the IMPURE count under the goal. */
  impure: number;
  exceptions: GoalException[];
  /** Drawn as diamonds. */
  resourceGroups: ResourceGroup[];
  /** Printed count; may exceed the listed groups. */
  resourceGroupCount: number;
  /** 0–1 board position, or null for the automatic layout. */
  position: { x: number; y: number } | null;
}

/** Goal-to-goal: a bundle of strands, or the red line when it is down. */
export interface GoalConnection {
  id: string;
  source: string;
  target: string;
  strands: number;
  status: ConnectionStatus;
  label: string;
  reason: string;
  impact: string;
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
