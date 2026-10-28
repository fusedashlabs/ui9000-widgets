import type {
  AgentsBreakdown,
  DependencyHealth,
  GoalHealth,
  GoalInput,
  GoalsDependencyGraphModel,
  GoalsDependencyGraphPayload,
  GraphEdge,
  GraphGoal,
  GraphResource,
  HoldState,
  ResourceState,
} from './types.js';

/**
 * The payload is the goals perimeter's: goals with their agents and the
 * resource groups they draw on. The same data draws either view — the
 * perimeter as clouds, this graph as trees rooted on a baseline with the
 * groups in a row over them.
 */

/** The most goals the graph draws: the agent picture holds eight. */
export const MAX_GOALS = 8;

const DEFAULT_THRESHOLDS = { degraded: 0.8, critical: 0.25 };

const HEALTH_ALIASES: Record<string, GoalHealth> = {
  healthy: 'healthy',
  ok: 'healthy',
  success: 'healthy',
  good: 'healthy',
  green: 'healthy',
  on_track: 'healthy',
  'on-track': 'healthy',
  'on track': 'healthy',
  degraded: 'degraded',
  warning: 'degraded',
  warn: 'degraded',
  amber: 'degraded',
  at_risk: 'degraded',
  'at-risk': 'degraded',
  'at risk': 'degraded',
  risk: 'degraded',
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

/**
 * Breakdown counts win. Held agents the states do not account for count as
 * degraded, and the working are whatever the total leaves.
 */
function readAgents(input: unknown, heldInput: unknown): { agents: AgentsBreakdown; held: number } {
  const parts = isRecord(input) ? input : { total: input };
  const failed = count(parts.failed) ?? 0;
  const blocked = count(parts.blocked) ?? 0;
  const awaiting = count(parts.awaiting) ?? 0;
  let degraded = count(parts.degraded) ?? 0;
  const idle = count(parts.idle) ?? 0;
  const heldGiven = count(heldInput);
  if (heldGiven !== undefined && heldGiven > failed + blocked + awaiting + degraded) degraded = heldGiven - failed - blocked - awaiting;
  const held = failed + blocked + awaiting + degraded;
  const given = count(parts.total);
  const healthyGiven = count(parts.healthy);
  const total = given ?? (healthyGiven ?? 0) + held + idle;
  const healthy = healthyGiven ?? Math.max(0, total - held - idle);
  return { agents: { total: Math.max(total, healthy + held + idle), healthy, degraded, awaiting, blocked, failed, idle }, held };
}

function readStatus(explicit: unknown, progress: number, thresholds: { degraded: number; critical: number }): GoalHealth {
  const named = HEALTH_ALIASES[key(explicit)];
  if (named) return named;
  if (progress < thresholds.critical) return 'critical';
  if (progress < thresholds.degraded) return 'degraded';
  return 'healthy';
}

function readStatusLabel(label: unknown, status: unknown, health: GoalHealth): string {
  const given = text(label);
  if (given) return given.toUpperCase();
  return STATUS_LABELS[key(status)] ?? STATUS_WORDS[health];
}

function readThresholds(input: unknown): { degraded: number; critical: number } {
  if (!isRecord(input)) return DEFAULT_THRESHOLDS;
  return {
    degraded: readFraction(input.degraded) ?? DEFAULT_THRESHOLDS.degraded,
    critical: readFraction(input.critical) ?? DEFAULT_THRESHOLDS.critical,
  };
}

const goalName = (input: GoalInput) => text(input.name) || text(input.title) || text(input.label);

const isHold = (state: ResourceState): state is HoldState => state === 'awaiting' || state === 'blocked' || state === 'failed';

/** A hold the payload names, or the agents held there make: a count with no state is a blocked group. */
function readResourceState(entry: Record<string, unknown>, held: number): ResourceState {
  return RESOURCE_STATE_ALIASES[key(entry.state ?? entry.status)] ?? (held > 0 ? 'blocked' : 'healthy');
}

function healthOf(state: ResourceState): DependencyHealth {
  return isHold(state) ? 'held' : state === 'degraded' ? 'degraded' : 'clean';
}

function readGoal(input: GoalInput, id: string, thresholds: { degraded: number; critical: number }): GraphGoal {
  const { agents, held } = readAgents(input.agents, input.exceptionCount ?? input.impure);
  const progress = readFraction(input.progress ?? input.health) ?? (agents.total > 0 ? agents.healthy / agents.total : 0);
  const status = readStatus(input.status, progress, thresholds);
  return {
    id,
    code: text(input.code),
    name: goalName(input),
    agents,
    progress,
    status,
    statusLabel: readStatusLabel(input.statusLabel, input.status, status),
    multiplier: readMultiplier(input.multiplier),
    multiplierLabel: text(input.multiplierLabel) || 'Burn',
    held,
  };
}

function blankResource(id: string, name: string, kind: string): GraphResource {
  return { id, name, kind, count: null, healthy: null, degraded: null, impaired: null, detail: '' };
}

/** The row's groups the payload lists, in its order. */
function readCatalog(input: unknown): GraphResource[] {
  if (!Array.isArray(input)) return [];
  const out: GraphResource[] = [];
  for (const entry of input) {
    if (!isRecord(entry)) continue;
    const name = text(entry.name) || text(entry.label);
    const kind = text(entry.kind) || text(entry.type);
    const id = key(name || kind);
    if (!id || out.some((r) => r.id === id)) continue;
    out.push({
      ...blankResource(id, name || kind, kind),
      count: count(entry.count) ?? null,
      healthy: count(entry.healthy) ?? null,
      degraded: count(entry.degraded) ?? null,
      impaired: count(entry.impaired) ?? null,
      detail: text(entry.detail),
    });
  }
  return out;
}

/** The goal at the centre on load: the one the payload names, else the one with most agents held. */
function readCenter(input: unknown, goals: GraphGoal[]): string {
  const asked = key(input);
  const named = asked && goals.find((g) => [g.id, g.code, g.name].some((v) => v.toLowerCase() === asked));
  if (named) return named.id;
  return goals.reduce<GraphGoal | null>((best, g) => (!best || g.held > best.held ? g : best), null)?.id ?? '';
}

export function normalizeGoalsDependencyGraph(input: unknown): GoalsDependencyGraphModel {
  const payload: GoalsDependencyGraphPayload = isRecord(input) ? (input as GoalsDependencyGraphPayload) : {};
  const thresholds = readThresholds(payload.thresholds);
  const title = text(payload.title) || text(payload.name);
  const inputs = (Array.isArray(payload.goals) ? payload.goals : []).filter((g): g is GoalInput => isRecord(g) && !!goalName(g)).slice(0, MAX_GOALS);

  const taken = new Set<string>();
  const goals = inputs.map((goal, index) => {
    let id = text(goal.id) || slug(goalName(goal)) || `goal-${index}`;
    while (taken.has(id)) id = `${id}-${index}`;
    taken.add(id);
    return readGoal(goal, id, thresholds);
  });

  const resources = readCatalog(payload.resourceGroups);
  const edges: GraphEdge[] = [];
  inputs.forEach((goal, gi) => {
    const groups = Array.isArray(goal.resourceGroups) ? goal.resourceGroups : [];
    for (const entry of groups) {
      if (!isRecord(entry)) continue;
      const name = text(entry.name) || text(entry.label);
      const kind = text(entry.kind) || text(entry.type);
      const id = key(name || kind);
      // one line from a goal to a group: a group named twice on one goal is drawn once
      if (!id || edges.some((e) => e.goal === goals[gi]!.id && e.resource === id)) continue;
      if (!resources.some((r) => r.id === id)) resources.push(blankResource(id, name || kind, kind));
      const heldGiven = count(entry.held) ?? 0;
      const state = readResourceState(entry, heldGiven);
      edges.push({
        goal: goals[gi]!.id,
        resource: id,
        state,
        health: healthOf(state),
        hold: isHold(state) ? state : null,
        held: isHold(state) ? heldGiven : 0,
        calls: count(entry.calls) ?? null,
        detail: text(entry.detail),
        cause: text(entry.cause),
        owner: text(entry.owner),
        since: text(entry.since),
        rule: text(entry.rule),
      });
    }
  });
  // the row draws only groups some goal draws on
  const used = resources.filter((r) => edges.some((e) => e.resource === r.id));

  return {
    title,
    goals,
    resources: used,
    edges,
    center: readCenter(payload.center, goals),
    held: count(payload.exceptionCount) ?? goals.reduce((sum, g) => sum + g.held, 0),
    empty: goals.length === 0,
  };
}
