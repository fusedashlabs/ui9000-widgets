import { hashString } from '../../goals-perimeter/lib/random.js';
import { MAX_CONNECTED } from './geometry.js';
import type {
  Claim,
  ClaimState,
  ClaimType,
  Evidence,
  GoalAgents,
  GoalsInsightsModel,
  GoalTone,
  InsightsGoal,
  Polarity,
} from './types.js';

/**
 * Claims the column draws at most. Past this the solver that keeps their
 * diamonds apart slows the turn, and the rings are crowded past reading; the
 * goal's own claims are kept first, then the newest of its connected goals'.
 */
export const MAX_CLAIMS = 120;

const STATUS: Record<string, { label: string; tone: GoalTone }> = {
  on_track: { label: 'On track', tone: 'ok' },
  at_risk: { label: 'At risk', tone: 'warn' },
  blocked: { label: 'Blocked', tone: 'blocked' },
};
const STATUS_ALIASES: Record<string, keyof typeof STATUS> = {
  'on track': 'on_track',
  healthy: 'on_track',
  ok: 'on_track',
  good: 'on_track',
  'at risk': 'at_risk',
  risk: 'at_risk',
  degraded: 'at_risk',
  warning: 'at_risk',
  warn: 'at_risk',
  blocked: 'blocked',
  'off track': 'blocked',
  critical: 'blocked',
  failed: 'blocked',
};

const CLAIM_STATES: ClaimState[] = ['new', 'open', 'corroborated', 'accepted', 'disputed'];
const CLAIM_TYPES: ClaimType[] = ['gap', 'observation', 'correlation', 'anomaly', 'recommendation'];

/**
 * How far a claim can move its goal before corroboration, when the payload
 * does not say: a contradiction more than a confirmation, a gap or an anomaly
 * more than an observation.
 */
const POLARITY_WEIGHT: Record<Polarity, number> = { contradicting: 0.3, confirming: 0.18 };
const TYPE_WEIGHT: Record<ClaimType, number> = { gap: 0.2, anomaly: 0.1, correlation: 0.05, observation: 0, recommendation: 0 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, max = 160): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : '';
}

function number(value: unknown): number | undefined {
  const n = typeof value === 'string' && value.trim() ? Number(value.replace(/[%,\s]/g, '')) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function count(value: unknown): number | undefined {
  const n = number(value);
  return n === undefined ? undefined : Math.max(0, Math.round(n));
}

/** `0.81`, `81` and `"81%"` are all 81%. */
function share(value: unknown): number | undefined {
  const n = number(value);
  if (n === undefined) return undefined;
  const percent = (typeof value === 'string' && value.includes('%')) || n > 1;
  return Math.max(0, Math.min(1, percent ? n / 100 : n));
}

/** The first of `keys` the record carries a value for. */
function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  return undefined;
}

function statusOf(value: unknown): InsightsGoal['status'] {
  const s = text(value).toLowerCase().replace(/[-_]+/g, ' ');
  if (!s) return null;
  const key = STATUS_ALIASES[s] ?? (s.replace(/ /g, '_') in STATUS ? (s.replace(/ /g, '_') as keyof typeof STATUS) : undefined);
  return key ? STATUS[key]! : null;
}

function goalOf(raw: unknown): InsightsGoal | null {
  if (!isRecord(raw)) return null;
  const name = text(pick(raw, 'name', 'title', 'label'), 80);
  const id = text(pick(raw, 'id', 'code'), 40) || name;
  if (!id) return null;
  const idle = count(raw.idle) ?? 0;
  const awaiting = count(pick(raw, 'awaiting', 'waiting')) ?? 0;
  const blocked = count(raw.blocked) ?? 0;
  const failed = count(raw.failed) ?? 0;
  const overBudget = count(pick(raw, 'overBudget', 'over_budget')) ?? 0;
  const held = awaiting + blocked + failed + overBudget;
  const givenWorking = count(raw.working);
  const total = count(pick(raw, 'total', 'agents')) ?? idle + held + (givenWorking ?? 0);
  const agents: GoalAgents = {
    total,
    working: givenWorking ?? Math.max(0, total - idle - held),
    idle,
    awaiting,
    blocked,
    failed,
    overBudget,
  };
  const priority = text(raw.priority, 16).toUpperCase();
  return {
    id,
    code: text(raw.code, 40) || id,
    name: name || id,
    status: statusOf(raw.status),
    confidence: share(pick(raw, 'confidence', 'progress')) ?? null,
    priority: priority || null,
    agents,
    held,
    claims: 0,
  };
}

function polarityOf(value: unknown): Polarity {
  return /contra|against|refut|negat|oppos/i.test(text(value)) ? 'contradicting' : 'confirming';
}

function claimTypeOf(value: unknown): ClaimType | null {
  const s = text(value).toLowerCase();
  return CLAIM_TYPES.find((t) => t === s) ?? null;
}

function claimStateOf(value: unknown, sources: number, age: number): ClaimState {
  const s = text(value).toLowerCase();
  const known = CLAIM_STATES.find((state) => state === s);
  if (known) return known;
  if (/disput|conflict/.test(s)) return 'disputed';
  if (sources >= 8) return 'accepted';
  if (sources >= 2) return 'corroborated';
  return age < 24 ? 'new' : 'open';
}

function evidenceOf(polarity: Polarity, state: ClaimState, sources: number): Evidence {
  if (state === 'disputed') return 'disputed';
  if (polarity === 'contradicting') return 'contradicting';
  return sources < 2 ? 'unverified' : 'supporting';
}

/** 0 for one source, 1 for fourteen: the scale corroboration is read on. */
const depthOf = (sources: number) => Math.log(sources + 1) / Math.log(15);
const frac = (h: number) => (h % 10007) / 10007;

function idList(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return list.map((v) => text(v, 40)).filter(Boolean);
}

interface RawClaim extends Omit<Claim, 'also'> {
  also: string[];
}

function claimOf(raw: unknown, index: number, fallbackGoal: string): RawClaim | null {
  if (!isRecord(raw)) return null;
  const words = text(pick(raw, 'claim', 'text', 'title', 'label'), 280);
  const theme = text(pick(raw, 'theme', 'topic', 'subject'), 60).toLowerCase();
  const age = number(pick(raw, 'age', 'ageHours', 'hoursAgo', 'hours'));
  if ((!words && !theme) || age === undefined) return null;
  const sources = Math.max(1, Math.min(99, count(raw.sources) ?? 1));
  const polarity = polarityOf(pick(raw, 'polarity', 'stance'));
  const hours = Math.max(0, age);
  const state = claimStateOf(raw.state, sources, hours);
  const type = claimTypeOf(raw.type);
  const h = hashString(words || theme);
  const reach = POLARITY_WEIGHT[polarity] + (polarity === 'contradicting' && type ? TYPE_WEIGHT[type] : 0);
  const derived = Math.min(0.92, Math.max(0.06, reach * (0.6 + 0.5 * depthOf(sources)) + (frac(h >> 3) - 0.5) * 0.06));
  const weight = number(raw.weight);
  return {
    id: text(raw.id, 40) || `CLM-${index + 1}`,
    goal: text(raw.goal, 40) || fallbackGoal,
    also: idList(raw.also),
    theme: theme || 'general',
    text: words || theme,
    type,
    polarity,
    state,
    sources,
    records: count(raw.records) ?? Math.round(sources * (24 + (h % 70)) + (state === 'accepted' ? 180 : 0)),
    weight: weight === undefined ? Math.round(derived * 100) / 100 : Math.max(0.02, Math.min(0.95, weight > 1 ? weight / 100 : weight)),
    agent: text(raw.agent, 60) || null,
    age: hours,
    asset: text(pick(raw, 'asset', 'assetKind', 'kind'), 24).toLowerCase(),
    evidence: evidenceOf(polarity, state, sources),
    seed: frac(h),
  };
}

const EMPTY_GOAL: InsightsGoal = {
  id: '',
  code: '',
  name: '',
  status: null,
  confidence: null,
  priority: null,
  agents: { total: 0, working: 0, idle: 0, awaiting: 0, blocked: 0, failed: 0, overBudget: 0 },
  held: 0,
  claims: 0,
};

const emptyModel = (title = ''): GoalsInsightsModel => ({ empty: true, title, goal: EMPTY_GOAL, connected: [], claims: [], counted: 0, dropped: 0 });

/** Oldest first, as the claims were filed: the order the column's subjects take their sectors in. */
const byFiling = (a: { age: number }, b: { age: number }) => b.age - a.age;

/**
 * The payload as the column draws it. One goal over the apex (`goal`), the
 * goals it shares evidence with beside it (`connected`, the two that share
 * the most), and the claims filed under any of them (`claims`). The column
 * holds the goal's own claims and those its connected goals filed that bear
 * on it (`also`), then, faintly, the rest of its connected goals' claims.
 * Without a `connected` list, the goals the goal's claims name stand beside
 * it under their ids.
 */
export function normalizeGoalsInsights(input: unknown): GoalsInsightsModel {
  if (!isRecord(input)) return emptyModel();
  const title = text(pick(input, 'title', 'name'), 120);
  const goal = goalOf(pick(input, 'goal', 'mainGoal'));
  if (!goal) return emptyModel(title);

  const rawClaims = pick(input, 'claims', 'insights', 'evidence');
  const sent = Array.isArray(rawClaims) ? rawClaims : [];
  const all = sent.map((raw, i) => claimOf(raw, i, goal.id)).filter((c): c is RawClaim => c !== null);

  // the goals beside it: those listed, or those its claims name; the two that share the most with it
  const rawConnected = pick(input, 'connected', 'connectedGoals', 'partners', 'goals');
  const listed = (Array.isArray(rawConnected) ? rawConnected : []).map(goalOf).filter((g): g is InsightsGoal => g !== null);
  const named = listed.length
    ? listed
    : [...new Set(all.flatMap((c) => (c.goal === goal.id ? c.also : c.also.includes(goal.id) ? [c.goal] : [])))].map((id) => goalOf({ id })!);
  const seen = new Set([goal.id]);
  const candidates = named.filter((g) => !seen.has(g.id) && seen.add(g.id));
  const shared = (id: string) => all.filter((c) => (c.goal === goal.id && c.also.includes(id)) || (c.goal === id && c.also.includes(goal.id))).length;
  const connected = candidates
    .map((g, order) => ({ g, order, shared: shared(g.id) }))
    .sort((a, b) => b.shared - a.shared || a.order - b.order)
    .slice(0, MAX_CONNECTED)
    .map(({ g }) => g);
  const drawn = new Set([goal.id, ...connected.map((g) => g.id)]);

  // the goal's own evidence first, then its connected goals' other claims
  const bears = (c: RawClaim) => c.goal === goal.id || (drawn.has(c.goal) && c.also.includes(goal.id));
  const own = all.filter(bears).sort(byFiling);
  const context = all.filter((c) => !bears(c) && drawn.has(c.goal)).sort(byFiling);
  const keptOwn = own.length > MAX_CLAIMS ? [...own].sort((a, b) => a.age - b.age).slice(0, MAX_CLAIMS).sort(byFiling) : own;
  const room = MAX_CLAIMS - keptOwn.length;
  const keptContext = context.length > room ? [...context].sort((a, b) => a.age - b.age).slice(0, room).sort(byFiling) : context;

  // ids stay unique, so a pick and a tip find one claim
  const ids = new Set<string>();
  const claims: Claim[] = [...keptOwn, ...keptContext].map((c) => {
    let id = c.id;
    for (let n = 2; ids.has(id); n++) id = `${c.id}-${n}`;
    ids.add(id);
    return { ...c, id, also: c.also.filter((g) => g !== c.goal && drawn.has(g)) };
  });

  const filedUnder = (id: string) => claims.filter((c) => c.goal === id).length;
  return {
    empty: false,
    title: title || goal.name,
    goal: { ...goal, claims: filedUnder(goal.id) },
    connected: connected.map((g) => ({ ...g, claims: filedUnder(g.id) })),
    claims,
    counted: keptOwn.length,
    dropped: sent.length - claims.length,
  };
}
