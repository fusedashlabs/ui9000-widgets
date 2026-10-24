import type {
  AgentLink,
  AgentNode,
  AgentsBreakdown,
  AgentState,
  BlockerKind,
  ConnectionStatus,
  ExceptionState,
  ExternalDependency,
  GoalConnection,
  GoalException,
  GoalHealth,
  GoalInput,
  GoalPosition,
  GoalsPerimeterModel,
  GoalsPerimeterPayload,
  LinkInput,
  PerimeterGoal,
  ResourceGroup,
  ResourceIcon,
  ResourceState,
} from './types.js';

const DEFAULT_THRESHOLDS = { degraded: 0.8, critical: 0.25 };
const DEFAULT_STRANDS = 6;
const MAX_STRANDS = 16;

const HEALTH_ALIASES: Record<string, GoalHealth> = {
  healthy: 'healthy',
  ok: 'healthy',
  success: 'healthy',
  good: 'healthy',
  green: 'healthy',
  degraded: 'degraded',
  warning: 'degraded',
  warn: 'degraded',
  amber: 'degraded',
  at_risk: 'degraded',
  'at-risk': 'degraded',
  'at risk': 'degraded',
  risk: 'degraded',
  on_track: 'healthy',
  'on-track': 'healthy',
  'on track': 'healthy',
  blocked: 'critical',
  off_track: 'critical',
  'off-track': 'critical',
  'off track': 'critical',
  critical: 'critical',
  error: 'critical',
  failed: 'critical',
  danger: 'critical',
  red: 'critical',
};

const EXCEPTION_ALIASES: Record<string, ExceptionState> = {
  failed: 'failed',
  failure: 'failed',
  error: 'failed',
  crashed: 'failed',
  down: 'failed',
  unavailable: 'failed',
  blocked: 'blocked',
  held: 'blocked',
  awaiting: 'awaiting',
  waiting: 'awaiting',
  holding: 'awaiting',
  pending: 'awaiting',
  'on hold': 'awaiting',
  degraded: 'degraded',
  warning: 'degraded',
  slow: 'degraded',
  'over budget': 'degraded',
  'over-budget': 'degraded',
  over_budget: 'degraded',
  overbudget: 'degraded',
};

const BLOCKER_ALIASES: Record<string, BlockerKind> = {
  rule: 'rule',
  policy: 'rule',
  guardrail: 'rule',
  dependency: 'dependency',
  upstream: 'dependency',
  resource: 'dependency',
  human: 'human',
  approval: 'human',
  person: 'human',
  manual: 'human',
};

const RESOURCE_STATE_ALIASES: Record<string, ResourceState> = {
  healthy: 'healthy',
  ok: 'healthy',
  success: 'healthy',
  active: 'healthy',
  degraded: 'degraded',
  warning: 'degraded',
  warn: 'degraded',
  slow: 'degraded',
  failed: 'failed',
  error: 'failed',
  critical: 'failed',
  down: 'failed',
  unavailable: 'failed',
  blocked: 'blocked',
  held: 'blocked',
  awaiting: 'awaiting',
  waiting: 'awaiting',
  holding: 'awaiting',
  pending: 'awaiting',
};

const ICONS = new Set<ResourceIcon>([
  'sensor',
  'model',
  'network',
  'pipeline',
  'storage',
  'alert',
  'policy',
  'tool',
  'generic',
]);

/** Kind keyword → glyph. First match wins. */
const ICON_KEYWORDS: [RegExp, ResourceIcon][] = [
  [/sensor|camera|monitor|radar|telemetry|watch|scan|perimeter/, 'sensor'],
  [/model|llm|inference|\bml\b|\bai\b|embedding/, 'model'],
  [/pipeline|queue|workflow|etl|job|batch|schedul|\bci\b/, 'pipeline'],
  [/data|storage|\bstore\b|database|\bdb\b|inventory|asset|registry|cache|warehouse/, 'storage'],
  [/alert|incident|pager|on-?call|human|people|team|responder|operator/, 'alert'],
  [/policy|rule|guardrail|compliance|access|identity|auth/, 'policy'],
  [/tool|api|integration|plugin|connector/, 'tool'],
  [/network|infra|compute|cluster|cloud|server|host|node/, 'network'],
];

const UNAVAILABLE = new Set([
  'unavailable',
  'down',
  'broken',
  'disconnected',
  'failed',
  'offline',
  'error',
  'blocked',
]);
const DEGRADED = new Set(['degraded', 'exception', 'warning', 'slow', 'partial', 'unstable']);
const STATUS_RANK: Record<ConnectionStatus, number> = { active: 0, degraded: 1, unavailable: 2 };

const AGENT_STATE_ALIASES: Record<string, AgentState> = {
  healthy: 'healthy',
  ok: 'healthy',
  success: 'healthy',
  active: 'healthy',
  running: 'healthy',
  online: 'healthy',
  working: 'healthy',
  degraded: 'degraded',
  warning: 'degraded',
  warn: 'degraded',
  slow: 'degraded',
  'over budget': 'degraded',
  'over-budget': 'degraded',
  over_budget: 'degraded',
  overbudget: 'degraded',
  blocked: 'blocked',
  held: 'blocked',
  awaiting: 'awaiting',
  waiting: 'awaiting',
  holding: 'awaiting',
  pending: 'awaiting',
  'on hold': 'awaiting',
  failed: 'failed',
  failure: 'failed',
  error: 'failed',
  crashed: 'failed',
  down: 'failed',
  offline: 'failed',
  unavailable: 'failed',
  idle: 'idle',
  inactive: 'idle',
  paused: 'idle',
  stopped: 'idle',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim().replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function count(value: unknown): number | undefined {
  const n = num(value);
  return n === undefined ? undefined : Math.max(0, Math.round(n));
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function key(value: unknown): string {
  return text(value).toLowerCase();
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** `0.88`, `88` and `"88%"` all read as 0.88. */
function readFraction(value: unknown): number | undefined {
  const raw = typeof value === 'string' ? value.trim().replace(/%$/, '') : value;
  const n = num(raw);
  if (n === undefined) return undefined;
  const percent = typeof value === 'string' && value.trim().endsWith('%');
  return clamp01(percent || n > 1 ? n / 100 : n);
}

/** `1.1`, `"1.1x"`, `"1.1×"`. */
function readMultiplier(value: unknown): number | null {
  const raw = typeof value === 'string' ? value.trim().replace(/[x×]$/i, '') : value;
  const n = num(raw);
  return n === undefined || n < 0 ? null : n;
}

function readExceptions(input: unknown): GoalException[] {
  if (!Array.isArray(input)) return [];
  const out: GoalException[] = [];
  for (const entry of input) {
    if (!isRecord(entry)) continue;
    const state = EXCEPTION_ALIASES[key(entry.state ?? entry.status)];
    const n = count(entry.count ?? entry.value);
    if (!state || !n) continue;
    const blocker = state === 'blocked' ? (BLOCKER_ALIASES[key(entry.blocker)] ?? null) : null;
    out.push({ state, count: n, reason: text(entry.reason) || text(entry.label), blocker });
  }
  return out;
}

function sumState(exceptions: GoalException[], state: ExceptionState): number {
  return exceptions.reduce((sum, e) => (e.state === state ? sum + e.count : sum), 0);
}

type StateCounts = Record<AgentState, number>;

function countStates(nodes: readonly AgentNode[]): StateCounts {
  const counts: StateCounts = { healthy: 0, degraded: 0, awaiting: 0, blocked: 0, failed: 0, idle: 0 };
  for (const node of nodes) counts[node.state] += 1;
  return counts;
}

/**
 * Breakdown counts win; a missing state comes from the exceptions, then from
 * the agent nodes. The exception count is every held state together unless
 * the payload says otherwise, and exceptions the states do not account for
 * count as degraded.
 */
function readAgents(
  input: unknown,
  exceptions: GoalException[],
  nodes: readonly AgentNode[],
  impureInput: unknown,
): { agents: AgentsBreakdown; impure: number } {
  const parts = isRecord(input) ? input : { total: input };
  const fromNodes = countStates(nodes);
  const stateOf = (state: ExceptionState) =>
    count(parts[state]) ?? (sumState(exceptions, state) || fromNodes[state]);
  const failed = stateOf('failed');
  const blocked = stateOf('blocked');
  const awaiting = stateOf('awaiting');
  let degraded = stateOf('degraded');
  const idle = count(parts.idle) ?? fromNodes.idle;
  const impureGiven = count(impureInput);
  const impure = impureGiven ?? failed + blocked + awaiting + degraded;
  if (impure > failed + blocked + awaiting + degraded) degraded = impure - failed - blocked - awaiting;
  const held = failed + blocked + awaiting + degraded;

  const given = count(parts.total);
  const healthyGiven = count(parts.healthy) ?? (given === undefined ? fromNodes.healthy : undefined);
  const total = given ?? (healthyGiven ?? 0) + held + idle;
  const healthy = healthyGiven ?? Math.max(0, total - held - idle);
  return {
    agents: { total: Math.max(total, nodes.length, healthy), healthy, degraded, awaiting, blocked, failed, idle },
    impure,
  };
}

/** One exception per state and reason among the nodes, largest first. */
function exceptionsFromNodes(nodes: readonly AgentNode[]): GoalException[] {
  const groups = new Map<string, GoalException>();
  for (const node of nodes) {
    if (node.state === 'healthy' || node.state === 'idle') continue;
    const id = `${node.state}|${node.reason}|${node.blocker ?? ''}`;
    const group = groups.get(id);
    if (group) group.count += 1;
    else groups.set(id, { state: node.state, count: 1, reason: node.reason, blocker: node.blocker });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

function readIcon(icon: unknown, kind: string, name: string): ResourceIcon {
  const explicit = key(icon) as ResourceIcon;
  if (ICONS.has(explicit)) return explicit;
  const haystack = `${kind} ${name}`.toLowerCase();
  for (const [pattern, glyph] of ICON_KEYWORDS) {
    if (pattern.test(haystack)) return glyph;
  }
  return 'generic';
}

/** A hold the payload names, or the agents held there make: a count with no state is a blocked group. */
function readResourceState(entry: Record<string, unknown>, held: number): ResourceState {
  const named = RESOURCE_STATE_ALIASES[key(entry.state ?? entry.status)];
  if (named) return named;
  return held > 0 ? 'blocked' : 'healthy';
}

function readResourceGroups(input: unknown, goalId: string): ResourceGroup[] {
  if (!Array.isArray(input)) return [];
  const out: ResourceGroup[] = [];
  input.forEach((entry, index) => {
    if (!isRecord(entry)) return;
    const name = text(entry.name) || text(entry.label);
    const kind = text(entry.kind) || text(entry.type);
    if (!name && !kind) return;
    const heldGiven = count(entry.held) ?? 0;
    const state = readResourceState(entry, heldGiven);
    const holds = state === 'awaiting' || state === 'blocked' || state === 'failed';
    out.push({
      id: text(entry.id) || `${goalId}-rg-${index}`,
      shareKey: key(name || kind),
      name: name || kind,
      kind,
      icon: readIcon(entry.icon, kind, name),
      state,
      agents: count(entry.agents) ?? null,
      held: holds ? heldGiven : 0,
      calls: count(entry.calls) ?? null,
      detail: text(entry.detail),
    });
  });
  return out;
}

function readPosition(goal: GoalInput): GoalPosition | null {
  const raw = goal.position;
  const pair: Record<string, unknown> = Array.isArray(raw)
    ? { x: raw[0], y: raw[1] }
    : isRecord(raw)
      ? raw
      : { x: goal.x, y: goal.y };
  const x = num(pair.x);
  const y = num(pair.y);
  if (x === undefined || y === undefined) return null;
  const r = num(pair.r);
  return {
    x: clamp01(x),
    y: clamp01(y),
    z: Math.max(-1, Math.min(1, num(pair.z) ?? 0)),
    r: r !== undefined && r > 0 ? Math.min(0.5, r) : null,
  };
}

function readStatus(
  explicit: unknown,
  health: number,
  thresholds: { degraded: number; critical: number },
): GoalHealth {
  const named = HEALTH_ALIASES[key(explicit)];
  if (named) return named;
  if (health < thresholds.critical) return 'critical';
  if (health < thresholds.degraded) return 'degraded';
  return 'healthy';
}

const STATUS_WORDS: Record<GoalHealth, string> = {
  healthy: 'ON TRACK',
  degraded: 'AT RISK',
  critical: 'OFF TRACK',
};

/** Words that name a status of their own; any other status word reads as its health's default. */
const STATUS_LABELS: Record<string, string> = {
  blocked: 'BLOCKED',
  'on track': 'ON TRACK',
  on_track: 'ON TRACK',
  'on-track': 'ON TRACK',
  'at risk': 'AT RISK',
  at_risk: 'AT RISK',
  'at-risk': 'AT RISK',
  'off track': 'OFF TRACK',
  off_track: 'OFF TRACK',
  'off-track': 'OFF TRACK',
};

function readStatusLabel(label: unknown, status: unknown, health: GoalHealth): string {
  const given = text(label);
  if (given) return given.toUpperCase();
  return STATUS_LABELS[key(status)] ?? STATUS_WORDS[health];
}

function goalName(input: GoalInput): string {
  return text(input.name) || text(input.title) || text(input.label);
}

function readGoal(
  input: GoalInput,
  id: string,
  nodes: readonly AgentNode[],
  thresholds: { degraded: number; critical: number },
): PerimeterGoal {
  const listed = readExceptions(input.exceptions);
  const { agents, impure } = readAgents(input.agents, listed, nodes, input.exceptionCount ?? input.impure);

  let exceptions = listed;
  if (!exceptions.length) {
    exceptions = exceptionsFromNodes(nodes);
    // States the nodes do not cover keep one unexplained group, so every
    // exceptional agent still has a marker.
    for (const state of ['failed', 'blocked', 'awaiting', 'degraded'] as const) {
      const rest = agents[state] - sumState(exceptions, state);
      if (rest > 0) exceptions.push({ state, count: rest, reason: '', blocker: null });
    }
  }

  const health =
    readFraction(input.health) ?? (agents.total > 0 ? agents.healthy / agents.total : 0);
  const resourceGroups = readResourceGroups(input.resourceGroups, id);
  const groupCount = count(input.resourceGroups);

  const status = readStatus(input.status, health, thresholds);
  return {
    id,
    code: text(input.code),
    name: goalName(input),
    agents,
    health,
    status,
    statusLabel: readStatusLabel(input.statusLabel, input.status, status),
    multiplier: readMultiplier(input.multiplier),
    multiplierLabel: text(input.multiplierLabel) || 'Burn',
    impure,
    exceptions,
    resourceGroups,
    resourceGroupCount: Math.max(groupCount ?? 0, resourceGroups.length),
    position: readPosition(input),
  };
}

type ParsedNode = AgentNode & { goalKey: string; goalText: string };

function readAgentNodes(input: unknown): ParsedNode[] {
  if (!Array.isArray(input)) return [];
  const taken = new Set<string>();
  const out: ParsedNode[] = [];
  input.forEach((raw, index) => {
    if (!isRecord(raw)) return;
    let id = text(raw.id) || text(raw.name) || text(raw.label) || `agent-${index}`;
    while (taken.has(id)) id = `${id}-${index}`;
    taken.add(id);
    const stateKey = key(raw.state ?? raw.status);
    const state = AGENT_STATE_ALIASES[stateKey] ?? (stateKey ? 'idle' : 'healthy');
    out.push({
      id,
      label: text(raw.label) || text(raw.name) || id,
      state,
      goalId: '',
      goalKey: key(raw.goal),
      goalText: text(raw.goal),
      reason: text(raw.reason),
      blocker: state === 'blocked' ? (BLOCKER_ALIASES[key(raw.blocker)] ?? null) : null,
    });
  });
  return out;
}

function readConnectionStatus(entry: LinkInput): ConnectionStatus {
  const status = key(entry.status);
  if (UNAVAILABLE.has(status)) return 'unavailable';
  if (DEGRADED.has(status) || entry.exception === true) return 'degraded';
  return 'active';
}

type Endpoint =
  | { kind: 'goal'; goalId: string }
  | { kind: 'resource'; goalId: string }
  | { kind: 'agent'; goalId: string; agentId: string };

function endpointIndex(goals: PerimeterGoal[], agents: AgentNode[]): Map<string, Endpoint> {
  const index = new Map<string, Endpoint>();
  const put = (name: string, endpoint: Endpoint) => {
    const k = name.toLowerCase();
    if (k && !index.has(k)) index.set(k, endpoint);
  };
  for (const goal of goals) {
    put(goal.id, { kind: 'goal', goalId: goal.id });
    put(goal.name, { kind: 'goal', goalId: goal.id });
  }
  for (const goal of goals) {
    for (const group of goal.resourceGroups) {
      put(group.id, { kind: 'resource', goalId: goal.id });
      put(group.name, { kind: 'resource', goalId: goal.id });
    }
  }
  for (const agent of agents) {
    put(agent.id, { kind: 'agent', goalId: agent.goalId, agentId: agent.id });
    put(agent.label, { kind: 'agent', goalId: agent.goalId, agentId: agent.id });
  }
  return index;
}

/**
 * Links → what the board draws. Goal to goal (directly, or through their
 * agents and resource groups) folds into one bundle per pair and status.
 * Agent to agent inside one goal stays an agent link. An end that names
 * nothing on the board is an external dependency of the goal at the other
 * end. Links that name nothing at either end are dropped.
 */
function readLinks(
  input: unknown,
  goals: PerimeterGoal[],
  agents: AgentNode[],
): { connections: GoalConnection[]; externals: ExternalDependency[]; agentLinks: AgentLink[] } {
  const connections = new Map<string, GoalConnection>();
  const externals = new Map<string, ExternalDependency>();
  const agentLinks: AgentLink[] = [];
  if (!Array.isArray(input)) return { connections: [], externals: [], agentLinks };
  const index = endpointIndex(goals, agents);

  input.forEach((raw) => {
    if (!isRecord(raw)) return;
    const entry = raw as LinkInput;
    const sourceName = text(entry.source ?? entry.from);
    const targetName = text(entry.target ?? entry.to);
    if (!sourceName || !targetName || sourceName === targetName) return;
    const a = index.get(sourceName.toLowerCase());
    const b = index.get(targetName.toLowerCase());
    const status = readConnectionStatus(entry);
    const reason = text(entry.reason);
    const impact = text(entry.impact);
    const label = text(entry.label);

    if (a && b) {
      if (a.goalId === b.goalId) {
        if (a.kind === 'agent' && b.kind === 'agent') {
          agentLinks.push({ goalId: a.goalId, source: a.agentId, target: b.agentId, status });
        }
        return;
      }
      const goalToGoal = a.kind === 'goal' && b.kind === 'goal';
      const strands = count(entry.strands ?? entry.weight ?? entry.value) ?? (goalToGoal ? DEFAULT_STRANDS : 1);
      const id = `${a.goalId}--${b.goalId}--${status}`;
      const reverse = connections.get(`${b.goalId}--${a.goalId}--${status}`);
      const existing = connections.get(id) ?? reverse;
      if (existing) {
        existing.strands = Math.min(MAX_STRANDS, existing.strands + strands);
        existing.reason ||= reason;
        existing.impact ||= impact;
        existing.label ||= label;
        return;
      }
      connections.set(id, {
        id: text(entry.id) || id,
        source: a.goalId,
        target: b.goalId,
        strands: Math.min(MAX_STRANDS, Math.max(1, strands)),
        status,
        label,
        reason,
        impact,
        via: '',
        hold: null,
      });
      return;
    }

    const known = a ?? b;
    if (!known) return;
    const outside = a ? targetName : sourceName;
    const id = `${known.goalId}->${outside.toLowerCase()}`;
    const existing = externals.get(id);
    if (existing) {
      existing.links += 1;
      if (STATUS_RANK[status] > STATUS_RANK[existing.status]) existing.status = status;
      existing.reason ||= reason;
      existing.impact ||= impact;
      return;
    }
    externals.set(id, {
      id,
      label: label || outside,
      goalId: known.goalId,
      status,
      links: 1,
      reason,
      impact,
    });
  });

  return { connections: [...connections.values()], externals: [...externals.values()], agentLinks };
}

function readThresholds(input: unknown): { degraded: number; critical: number } {
  if (!isRecord(input)) return DEFAULT_THRESHOLDS;
  return {
    degraded: readFraction(input.degraded) ?? DEFAULT_THRESHOLDS.degraded,
    critical: readFraction(input.critical) ?? DEFAULT_THRESHOLDS.critical,
  };
}

/** `goals`, else `goal` (an object or a name). */
function goalInputs(payload: GoalsPerimeterPayload): GoalInput[] {
  const list = Array.isArray(payload.goals) ? payload.goals.filter(isRecord) : [];
  if (list.length) return list as GoalInput[];
  if (isRecord(payload.goal)) return [payload.goal as GoalInput];
  const name = text(payload.goal);
  return name ? [{ name }] : [];
}

/**
 * Goals payload → board model. Agents name their goal by id or name; a goal
 * only agents name is added, and agents that name none join the first goal
 * (or one goal named after the board when there is none). Invalid input
 * yields an empty model, never a throw.
 */
export function normalizeGoalsPerimeter(input: unknown): GoalsPerimeterModel {
  const payload: GoalsPerimeterPayload = isRecord(input) ? (input as GoalsPerimeterPayload) : {};
  const thresholds = readThresholds(payload.thresholds);
  const title = text(payload.title) || text(payload.name);
  const nodes = readAgentNodes(payload.agents ?? payload.nodes);

  const inputs = goalInputs(payload).filter((goal) => goalName(goal));
  const named = new Set(inputs.flatMap((goal) => [key(goal.id), key(goalName(goal)), slug(goalName(goal))]));
  for (const node of nodes) {
    if (node.goalKey && !named.has(node.goalKey)) {
      named.add(node.goalKey);
      inputs.push({ name: node.goalText });
    }
  }
  if (!inputs.length && nodes.length) inputs.push({ name: title || 'Agents' });

  const taken = new Set<string>();
  const ids = inputs.map((goal, index) => {
    let id = text(goal.id) || slug(goalName(goal)) || `goal-${index}`;
    while (taken.has(id)) id = `${id}-${index}`;
    taken.add(id);
    return id;
  });
  const idByKey = new Map<string, string>();
  inputs.forEach((goal, i) => {
    for (const k of [key(goal.id), key(goalName(goal)), ids[i]!]) if (k && !idByKey.has(k)) idByKey.set(k, ids[i]!);
  });
  const agents: AgentNode[] = nodes.map((node) => ({
    id: node.id,
    label: node.label,
    state: node.state,
    goalId: idByKey.get(node.goalKey) ?? ids[0] ?? '',
    reason: node.reason,
    blocker: node.blocker,
  }));

  const goals = inputs.map((goal, i) =>
    readGoal(goal, ids[i]!, agents.filter((agent) => agent.goalId === ids[i]), thresholds),
  );
  const links = readLinks(payload.links ?? payload.connections, goals, agents);

  return {
    title,
    goals,
    agents,
    ...links,
    exceptionCount: count(payload.exceptionCount) ?? goals.reduce((sum, goal) => sum + goal.impure, 0),
    empty: goals.length === 0,
  };
}
