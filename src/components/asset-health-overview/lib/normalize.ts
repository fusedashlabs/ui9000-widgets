import type {
  AssetHealthCategoryInput,
  AssetHealthDayBin,
  AssetHealthGoal,
  AssetHealthModel,
  AssetHealthPayload,
  AssetHealthProblemInput,
  AssetHealthSection,
  AssetHealthTrouble,
  FlowState,
  GoalTone,
  HoldState,
  TroubleState,
} from './types.js';

/** More sections than this leave the arena's aisles wider than its sections. */
export const MAX_CATEGORIES = 12;

const AGENT_TOTAL_KEYS = /^(agents?|agent_?total|agent_?count|total_?agents?|population)$/i;
const AWAITING_KEYS = /^(awaiting|needs_?input|waiting)$/i;
const BLOCKED_KEYS = /^blocked$/i;
const FAILED_AGENT_KEYS = /^(failed|failing_?agents?)$/i;
const CATEGORY_KEYS = /^(category|asset_?category|name|label|group)$/i;
const TOTAL_KEYS = /^(total|assets?|count|n)$/i;
const HEALTHY_KEYS = /^(healthy|ok|good|green)$/i;
const DEGRADED_KEYS = /^(degraded|warn|warning|amber)$/i;
const FAILING_KEYS = /^(failing|failed_?assets?|critical|impaired|red)$/i;

const HOLD_STATES: HoldState[] = ['blocked', 'failed', 'awaiting'];
/** The gate is drawn in this order: what flows first, then what does not. */
const FLOW_ORDER: FlowState[] = ['flowing', 'throttled', 'awaiting', 'blocked', 'failed'];

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function number(value: unknown): number | undefined {
  const n = typeof value === 'string' && value.trim() ? Number(value.replace(/[%,\s]/g, '')) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function count(value: unknown): number | undefined {
  const n = number(value);
  return n === undefined ? undefined : Math.max(0, Math.round(n));
}

/** `0.41`, `41` and `"41%"` are all 41%. */
function share(value: unknown): number | undefined {
  const n = number(value);
  if (n === undefined) return undefined;
  const percent = (typeof value === 'string' && value.includes('%')) || n > 1;
  return Math.max(0, Math.min(1, percent ? n / 100 : n));
}

function keyOf(row: Record<string, unknown>, pattern: RegExp): string | undefined {
  return Object.keys(row).find((name) => pattern.test(name));
}

function cell(row: Record<string, unknown>, pattern: RegExp): unknown {
  const key = keyOf(row, pattern);
  return key ? row[key] : undefined;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';
}

/** Splits `total` in proportion to `weights`, in whole agents that add up to it. */
export function apportion(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w / sum) * total);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k]![1]]! += 1;
  return out;
}

function holdOf(value: unknown): HoldState | null {
  const s = text(value).toLowerCase();
  if (!s) return null;
  if (/wait|pending|await|hold/.test(s)) return 'awaiting';
  if (/block/.test(s)) return 'blocked';
  if (/fail|impair|error|down|crash|unreach/.test(s)) return 'failed';
  return null;
}

function troubleOf(value: unknown, fallback: HoldState | null): TroubleState {
  const s = text(value).toLowerCase();
  if (/degrad|warn|slow|throttl|elevat|caution/.test(s)) return 'slowed';
  return holdOf(s) ?? fallback ?? 'failed';
}

interface RawProblem {
  input: AssetHealthProblemInput;
  name: string;
}

function problemsOf(c: AssetHealthCategoryInput): RawProblem[] {
  return (Array.isArray(c.problems) ? c.problems : []).flatMap((input) => {
    if (!isRecord(input)) return [];
    const name = text(input.name);
    return name ? [{ input: input as AssetHealthProblemInput, name }] : [];
  });
}

/** A category before the goal's agents are seated in it. */
interface Draft {
  section: AssetHealthSection;
  /** Crew and held as sent; undefined when the payload leaves them to us. */
  crew: number | undefined;
  held: number | undefined;
  overBudget: number | undefined;
  heldUp: number | undefined;
  traffic: Partial<Record<FlowState, number>> | null;
}

function draftCategory(input: unknown, index: number, taken: Set<string>): Draft | null {
  if (!isRecord(input)) return null;
  const c = input as AssetHealthCategoryInput & Record<string, unknown>;
  const name = text(c.name) || text(c.category) || text(c.label) || text(cell(c, CATEGORY_KEYS)) || text(c.id);
  if (!name) return null;

  let id = text(c.id) || slug(name);
  while (taken.has(id)) id = `${id}-${index}`;
  taken.add(id);

  const items = (Array.isArray(c.items) ? c.items : []).map(text).filter(Boolean);
  const problems = problemsOf(c);
  const explicitHold = holdOf(c.hold);

  // do not read bare `failed` here: on a WidgetItem row it is the goal's failed agents
  const failing = count(c.failing ?? c.failed_assets ?? cell(c, FAILING_KEYS));
  const degraded = count(c.degraded ?? cell(c, DEGRADED_KEYS));
  const healthy = count(c.healthy ?? cell(c, HEALTHY_KEYS));
  const sent = count(c.total ?? cell(c, TOTAL_KEYS));
  // the assets as listed, and any asset in trouble that is not, after them
  const names = [...new Set([...items, ...problems.map((p) => p.name)])];
  const parts = (healthy ?? 0) + (degraded ?? 0) + (failing ?? 0);
  const assets = Math.max(1, sent ?? (parts || names.length), names.length);

  // the named assets stand evenly along the section's cells
  const named = names.map((n, j) => ({ name: n, tick: Math.min(assets - 1, Math.floor(((j + 0.5) * assets) / names.length)) }));
  const tickOf = (asset: string) => named.find((n) => n.name === asset)?.tick ?? 0;

  // the hold the problems carry, when the category does not say: the state holding most agents, else the first named
  const weigh = new Map<HoldState, number>();
  for (const p of problems) {
    const state = holdOf(p.input.state ?? p.input.sev);
    if (state) weigh.set(state, (weigh.get(state) ?? 0) + (count(p.input.agents) ?? 0) + 0.001);
  }
  const sentHeld = count(c.held);
  const hold = explicitHold ?? [...weigh.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? (sentHeld ? 'blocked' : null);

  const troubles: AssetHealthTrouble[] = problems.map((p, k) => {
    const state = troubleOf(p.input.state ?? p.input.sev, hold);
    return {
      key: `${id}:${k}:${p.name}`,
      asset: p.name,
      type: text(p.input.type),
      tick: tickOf(p.name),
      where: text(p.input.where ?? p.input.loc),
      why: text(p.input.why),
      state,
      agents: state === 'slowed' ? 0 : (count(p.input.agents) ?? 0),
      since: count(p.input.since) ?? null,
      rule: text(p.input.rule),
    };
  });

  const traffic = isRecord(c.traffic)
    ? (Object.fromEntries(FLOW_ORDER.map((s) => [s, number((c.traffic as Record<string, unknown>)[s]) ?? 0])) as Record<FlowState, number>)
    : null;
  const day: AssetHealthDayBin[] = (Array.isArray(c.day) ? c.day : []).map((bin) => {
    if (!isRecord(bin)) return { calls: Math.max(0, number(bin) ?? 0), away: 0 };
    return { calls: Math.max(0, number(bin.calls ?? bin.requests) ?? 0), away: Math.min(0.95, share(bin.away ?? bin.heldUp) ?? 0) };
  });
  const agentsOnProblems = troubles.reduce((sum, t) => sum + t.agents, 0);

  return {
    section: {
      id,
      name,
      unit: [text(c.unitOne) || (text(c.unit) ? text(c.unit) : 'asset'), text(c.unit) || 'assets'],
      assets,
      named,
      troubles,
      crew: { working: 0, overBudget: 0, held: 0 },
      hold,
      health: 'clean',
      calls: count(c.calls ?? c.cpm) ?? null,
      share: 0,
      slowed: 0,
      mix: [],
      rules: (Array.isArray(c.rules) ? c.rules : []).map(text).filter(Boolean),
      whole: healthy !== undefined || degraded !== undefined || failing !== undefined ? { healthy: healthy ?? 0, degraded: degraded ?? 0, failing: failing ?? 0 } : null,
      day,
    },
    crew: count(c.crew),
    held: sentHeld ?? (agentsOnProblems || undefined),
    overBudget: count(c.overBudget),
    heldUp: share(c.heldUp),
    traffic,
  };
}

function normalizeGoal(input: unknown, name: string): AssetHealthGoal {
  const g = isRecord(input) ? input : {};
  const awaiting = count(g.awaiting ?? cell(g, AWAITING_KEYS)) ?? 0;
  const blocked = count(g.blocked ?? cell(g, BLOCKED_KEYS)) ?? 0;
  const failed = count(g.failed ?? cell(g, FAILED_AGENT_KEYS)) ?? 0;
  const overBudget = count(g.overBudget ?? g.over_budget) ?? 0;
  const idle = count(g.idle) ?? 0;
  const held = awaiting + blocked + failed + overBudget;
  const sentTotal = count(g.total ?? cell(g, AGENT_TOTAL_KEYS));
  const working = count(g.working) ?? Math.max(0, (sentTotal ?? held + idle) - held - idle);
  const total = sentTotal ?? working + idle + held;
  const statusKey = STATUS_ALIASES[text(g.status).toLowerCase().replace(/[_-]+/g, ' ')];
  const id = text(g.id);
  return {
    id,
    code: text(g.code) || id,
    name: text(g.name) || name,
    total,
    working,
    idle,
    awaiting,
    blocked,
    failed,
    overBudget,
    held,
    progress: share(g.progress) ?? null,
    burn: number(g.burn) ?? null,
    status: statusKey ? STATUS[statusKey]! : null,
  };
}

/** The goal's columns may sit on a WidgetItem category row. */
function goalFromRows(rows: Record<string, unknown>[]): Record<string, unknown> | null {
  const row = rows.find((r) => count(cell(r, AGENT_TOTAL_KEYS)) !== undefined);
  if (!row) return null;
  return { total: cell(row, AGENT_TOTAL_KEYS), awaiting: cell(row, AWAITING_KEYS), blocked: cell(row, BLOCKED_KEYS), failed: cell(row, FAILED_AGENT_KEYS) };
}

/** A set of categories' weights: their calls, or their assets where none of them is sent calls. */
function weightsOf(drafts: Draft[]): number[] {
  const byCalls = drafts.some((d) => (d.section.calls ?? 0) > 0);
  return drafts.map((d) => (byCalls ? (d.section.calls ?? 0) : d.section.assets));
}

/** Where the goal's agents in `state` that no category claims go: the one with most trouble that holds nobody yet. */
function freeToHold(drafts: Draft[], state: HoldState): Draft | undefined {
  const free = drafts.filter((d) => !d.section.hold && d.held === undefined);
  // one whose crew is ours to seat first, then by its troubles, its calls and its assets
  const rank = (d: Draft) => [d.crew === undefined ? 1 : 0, d.section.troubles.length, d.section.calls ?? 0, d.section.assets];
  const best = free.sort((a, b) => {
    const [x, y] = [rank(a), rank(b)];
    const k = x.findIndex((v, i) => v !== y[i]);
    return k < 0 ? 0 : y[k]! - x[k]!;
  })[0];
  if (best) best.section.hold = state;
  return best;
}

/**
 * Seats the goal's agents in its sections. What the payload says is kept;
 * what it leaves out is shared out from the goal's own counts, so every agent
 * of the goal has a place and a section's rows are as many as its label says:
 *
 *   held     a section's own, else its problems' agents, else the goal's
 *            agents in that state shared among the sections it holds; when
 *            those all say their own, the rest join them, and with none in
 *            that state they go to a section that holds nobody yet
 *   working  a section's crew less its held, else the goal's working agents
 *            shared out by calls (by assets when none is sent); when every
 *            section says its crew, the rest join them in the same way
 *
 * The goal comes back counted as seated, so the title reads what is drawn
 * even where the payload's categories and goal disagree.
 */
function seat(drafts: Draft[], goal: AssetHealthGoal): { goal: AssetHealthGoal; sections: AssetHealthSection[] } {
  for (const state of HOLD_STATES) {
    const claimed = drafts.reduce((sum, d) => sum + (d.section.hold === state ? (d.held ?? 0) : 0), 0);
    const left = Math.max(0, goal[state] - claimed);
    if (!left) continue;
    let open = drafts.filter((d) => d.section.hold === state && d.held === undefined);
    if (!open.length) open = drafts.filter((d) => d.section.hold === state);
    if (!open.length) open = [freeToHold(drafts, state)].filter((d): d is Draft => !!d);
    const parts = apportion(open.map((d) => Math.max(1, d.section.troubles.filter((t) => t.state === state).length)), left);
    open.forEach((d, i) => (d.held = (d.held ?? 0) + parts[i]!));
  }

  // an agent at work is counted with the category it is calling: the goal's agents spread as its calls do
  const claimedAtWork = drafts.reduce((sum, d) => sum + (d.crew !== undefined ? Math.max(0, d.crew - (d.held ?? 0)) : 0), 0);
  const free = drafts.filter((d) => d.crew === undefined);
  const joined = free.length ? free : drafts;
  const shared = apportion(weightsOf(joined), Math.max(0, goal.working + goal.overBudget - claimedAtWork));
  // those past their budget are among them, shared out the same way where a category does not say
  const unsaid = drafts.filter((d) => d.overBudget === undefined);
  const claimedOver = drafts.reduce((sum, d) => sum + (d.overBudget ?? 0), 0);
  const over = apportion(weightsOf(unsaid), Math.max(0, goal.overBudget - claimedOver));
  const calls = drafts.reduce((sum, d) => sum + (d.section.calls ?? 0), 0);

  const sections = drafts.map((d) => {
    const s = d.section;
    const held = s.hold ? (d.held ?? 0) : 0;
    const atWork = (d.crew !== undefined ? Math.max(0, d.crew - held) : 0) + (shared[joined.indexOf(d)] ?? 0);
    const crew = atWork + held;
    const overBudget = Math.min(d.overBudget ?? over[unsaid.indexOf(d)]!, atWork);
    s.crew = { working: atWork - overBudget, overBudget, held };
    s.share = calls ? (s.calls ?? 0) / calls : 0;

    // the gate: as sent, else what flows and, after it, the share held up in the hold's colour
    if (d.traffic) {
      const sum = FLOW_ORDER.reduce((a, state) => a + (d.traffic![state] ?? 0), 0) || 1;
      s.mix = FLOW_ORDER.filter((state) => (d.traffic![state] ?? 0) > 0).map((state) => ({ state, share: d.traffic![state]! / sum }));
    } else {
      const slowedByTrouble = s.troubles.some((t) => t.state === 'slowed');
      const away = d.heldUp ?? (held ? Math.min(0.6, held / Math.max(1, crew)) : slowedByTrouble ? 0.12 : 0);
      s.mix = [{ state: 'flowing' as FlowState, share: 1 - away }, { state: (s.hold ?? 'throttled') as FlowState, share: away }].filter((p) => p.share > 0);
    }
    s.slowed = s.mix.filter((p) => p.state !== 'flowing').reduce((a, p) => a + p.share, 0);
    s.health = held > 0 ? 'held' : s.slowed > 0.004 || s.troubles.length > 0 ? 'degraded' : 'clean';
    return s;
  });

  const heldIn = (state: HoldState) => sections.reduce((sum, s) => sum + (s.hold === state ? s.crew.held : 0), 0);
  const seated = { awaiting: heldIn('awaiting'), blocked: heldIn('blocked'), failed: heldIn('failed') };
  const working = sections.reduce((sum, s) => sum + s.crew.working, 0);
  const overBudget = sections.reduce((sum, s) => sum + s.crew.overBudget, 0);
  const held = seated.awaiting + seated.blocked + seated.failed + overBudget;
  return { goal: { ...goal, ...seated, working, overBudget, held, total: working + held + goal.idle }, sections };
}

function emptyModel(title = ''): AssetHealthModel {
  return { title, goal: normalizeGoal(null, ''), sections: [], empty: true };
}

/**
 * Turns a domain object or a FuseDash WidgetItem into the arena's model.
 *
 * Domain shape: `{ goal, categories }`. WidgetItem shape: `{ chartType, name,
 * data: categoryRows[] }` with the goal's agent columns on a row.
 *
 * Counts are drawn as given. A section's wall stands empty unless its `day`
 * is sent; nothing about the last 24 hours is invented.
 */
export function normalizeAssetHealth(raw: unknown): AssetHealthModel {
  if (!isRecord(raw)) return emptyModel();
  const payload = raw as AssetHealthPayload & Record<string, unknown>;
  const title = text(payload.title) || text(payload.name);
  const taken = new Set<string>();
  const rows: unknown[] = Array.isArray(payload.categories) ? payload.categories : Array.isArray(payload.data) ? payload.data : [];
  const drafts = rows
    .map((c, i) => draftCategory(c, i, taken))
    .filter((d): d is Draft => d !== null)
    .slice(0, MAX_CATEGORIES);

  const goalSource = payload.goal ?? payload.agents ?? (Array.isArray(payload.data) ? goalFromRows(payload.data.filter(isRecord)) : null);
  if (!drafts.length || !isRecord(goalSource)) return emptyModel(title);
  const goal = normalizeGoal(goalSource, title);
  if (goal.total <= 0) return emptyModel(title);

  return { title: title || goal.name, ...seat(drafts, goal), empty: false };
}
