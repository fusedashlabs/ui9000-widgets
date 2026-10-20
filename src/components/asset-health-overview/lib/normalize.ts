import type {
  AssetHealthCategory,
  AssetHealthCategoryInput,
  AssetHealthGoal,
  AssetHealthModel,
  AssetHealthPayload,
  AssetHealthProblem,
  AssetHealthProblemInput,
  AssetHealthSeverity,
  AssetHealthWallSlot,
  AssetHealthWallSlotInput,
} from './types.js';

/** More sectors than this leave tiles too thin to read. */
export const MAX_CATEGORIES = 12;

/** Quarter-hour slots in 24h — matches the Figma GoalRings wall. */
export const WALL_SLOTS = 96;

const AGENT_TOTAL_KEYS = /^(agents?|agent_?total|agent_?count|total_?agents?|population)$/i;
const AWAITING_KEYS = /^(awaiting|needs_?input|waiting)$/i;
const BLOCKED_KEYS = /^blocked$/i;
const FAILED_AGENT_KEYS = /^(failed|failing_?agents?)$/i;
const BURN_KEYS = /^burn$/i;
const CATEGORY_KEYS = /^(category|asset_?category|name|label|group)$/i;
const TOTAL_KEYS = /^(total|assets?|count|n)$/i;
const HEALTHY_KEYS = /^(healthy|ok|good|green)$/i;
const DEGRADED_KEYS = /^(degraded|warn|warning|amber)$/i;
const FAILING_KEYS = /^(failing|failed_?assets?|critical|impaired|red)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function count(value: unknown): number | undefined {
  const n = typeof value === 'string' && value.trim() ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n)) : undefined;
}

function truthyFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const s = text(value).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'err' || s === 'error';
}

function severity(value: unknown): AssetHealthSeverity {
  return /(degrad|warn|slow|elevat|caution)/i.test(text(value)) ? 'degraded' : 'impaired';
}

function keyOf(row: Record<string, unknown>, pattern: RegExp): string | undefined {
  return Object.keys(row).find((name) => pattern.test(name));
}

function cell(row: Record<string, unknown>, pattern: RegExp): unknown {
  const key = keyOf(row, pattern);
  return key ? row[key] : undefined;
}

function normalizeProblem(input: unknown): AssetHealthProblem | null {
  if (!isRecord(input)) return null;
  const p = input as AssetHealthProblemInput;
  const name = text(p.name);
  if (!name) return null;
  return {
    name,
    type: text(p.type) || 'ASSET',
    why: text(p.why),
    loc: text(p.loc),
    sev: severity(p.sev),
  };
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';
}

function normalizeCategory(
  input: unknown,
  index: number,
  taken: Set<string>,
): AssetHealthCategory | null {
  if (!isRecord(input)) return null;
  const c = input as AssetHealthCategoryInput & Record<string, unknown>;
  const name =
    text(cell(c, CATEGORY_KEYS)) || text(c.name) || text(c.category) || text(c.label) || text(c.id);
  if (!name) return null;

  let id = text(c.id) || slug(name);
  while (taken.has(id)) id = `${id}-${index}`;
  taken.add(id);

  const items = (Array.isArray(c.items) ? c.items : []).map(text).filter(Boolean);
  const problems = (Array.isArray(c.problems) ? c.problems : [])
    .map(normalizeProblem)
    .filter((p): p is AssetHealthProblem => p !== null);

  const failingFromProblems = problems.filter((p) => p.sev === 'impaired').length;
  const degradedFromProblems = problems.filter((p) => p.sev === 'degraded').length;

  // Do not read bare `failed` here — on WidgetItem rows that key is the
  // agent failure count (see FAILED_AGENT_KEYS / agentsFromRows).
  const failing =
    count(cell(c, FAILING_KEYS) ?? c.failing) ??
    (problems.length ? failingFromProblems : undefined);
  const degraded =
    count(cell(c, DEGRADED_KEYS) ?? c.degraded) ??
    (problems.length ? degradedFromProblems : undefined);
  const healthyExplicit = count(cell(c, HEALTHY_KEYS) ?? c.healthy);
  const totalExplicit = count(cell(c, TOTAL_KEYS) ?? c.total);

  const failingN = failing ?? 0;
  const degradedN = degraded ?? 0;
  const healthyN =
    healthyExplicit ??
    Math.max(
      0,
      (totalExplicit ?? items.length + problems.length) - failingN - degradedN,
    );
  const total = Math.max(
    totalExplicit ?? healthyN + degradedN + failingN,
    items.length + problems.length,
    healthyN + degradedN + failingN,
    1,
  );

  return {
    id,
    name,
    total,
    healthy: healthyN,
    degraded: degradedN,
    failing: failingN,
    items,
    problems,
  };
}

function normalizeGoal(input: unknown, categories: AssetHealthCategory[], title: string): AssetHealthGoal {
  const g = isRecord(input) ? input : {};
  const awaiting = count(g.awaiting) ?? count(cell(g, AWAITING_KEYS)) ?? 0;
  const blocked = count(g.blocked) ?? count(cell(g, BLOCKED_KEYS)) ?? 0;
  const failed = count(g.failed) ?? count(cell(g, FAILED_AGENT_KEYS)) ?? 0;
  const total =
    count(g.total) ?? count(cell(g, AGENT_TOTAL_KEYS)) ?? awaiting + blocked + failed;
  const burn = count(g.burn) ?? count(cell(g, BURN_KEYS));
  const fallbackName = title || (categories.length ? `${categories.length} categories` : '');
  return {
    id: text(g.id),
    name: text(g.name) || fallbackName,
    total: total ?? 0,
    awaiting,
    blocked,
    failed,
    burn: burn ?? 1,
  };
}

/** Agents may also be repeated as columns on the first WidgetItem category row. */
function agentsFromRows(rows: Record<string, unknown>[]): AssetHealthGoal | null {
  const row = rows.find((r) => count(cell(r, AGENT_TOTAL_KEYS)) !== undefined) ?? rows[0];
  if (!row) return null;
  const total = count(cell(row, AGENT_TOTAL_KEYS));
  if (total === undefined) return null;
  return normalizeGoal(
    {
      total,
      awaiting: cell(row, AWAITING_KEYS),
      blocked: cell(row, BLOCKED_KEYS),
      failed: cell(row, FAILED_AGENT_KEYS),
      burn: cell(row, BURN_KEYS),
    },
    [],
    '',
  );
}

/**
 * Wall slots come only from the payload. Missing / empty / no-error → [].
 * Sparse error slots are expanded to 96 quarter-hours; gaps stay non-error.
 * Nothing is invented with a PRNG.
 */
export function normalizeWall(raw: unknown): AssetHealthWallSlot[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const bySlot = new Map<number, AssetHealthWallSlot>();
  raw.forEach((entry, index) => {
    if (!isRecord(entry)) return;
    const w = entry as AssetHealthWallSlotInput & Record<string, unknown>;
    const slot = Math.min(WALL_SLOTS - 1, count(w.slot) ?? index);
    const err = truthyFlag(w.err ?? w.error ?? w.hasError);
    const srcRaw = w.src ?? w.source;
    const srcProblem = srcRaw ? normalizeProblem(srcRaw) : null;
    const catName = isRecord(srcRaw) ? text(srcRaw.catName) : '';
    bySlot.set(slot, {
      slot,
      err,
      hgt: count(w.hgt ?? w.height) ?? (err ? 40 : 16),
      reqs: count(w.reqs ?? w.requests) ?? 0,
      ...(count(w.nErr ?? w.errors) !== undefined
        ? { nErr: count(w.nErr ?? w.errors) }
        : {}),
      ...(srcProblem
        ? { src: { ...srcProblem, catName: catName || srcProblem.type } }
        : { src: null }),
    });
  });

  if (bySlot.size === 0) return [];
  const values = [...bySlot.values()];
  if (!values.some((s) => s.err)) return [];

  return Array.from({ length: WALL_SLOTS }, (_, i) => {
    return (
      bySlot.get(i) ?? {
        slot: i,
        err: false,
        hgt: 16,
        reqs: 0,
        src: null,
      }
    );
  });
}

function emptyModel(): AssetHealthModel {
  return {
    goal: { id: '', name: '', total: 0, awaiting: 0, blocked: 0, failed: 0, burn: 1 },
    categories: [],
    wall: [],
    empty: true,
  };
}

/**
 * Turns a domain object or a FuseDash WidgetItem into the drawing model.
 *
 * WidgetItem shape: `{ chartType, name, data: categoryRows[], agents?, wall? }`.
 * Domain shape: `{ goal|agents, categories, wall? }`.
 *
 * Counts are taken as given. The 24h wall is drawn only when `wall` / `errors`
 * is sent and contains at least one error slot.
 */
export function normalizeAssetHealth(raw: unknown): AssetHealthModel {
  if (!isRecord(raw)) return emptyModel();

  const payload = raw as AssetHealthPayload & Record<string, unknown>;
  const title = text(payload.name) || text(payload.title) || text(payload.description);
  const taken = new Set<string>();

  const categorySource: unknown[] = Array.isArray(payload.categories)
    ? payload.categories
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  const categories = categorySource
    .map((c, i) => normalizeCategory(c, i, taken))
    .filter((c): c is AssetHealthCategory => c !== null)
    .slice(0, MAX_CATEGORIES);

  const goalSource =
    payload.goal ??
    payload.agents ??
    (Array.isArray(payload.data) ? agentsFromRows(payload.data.filter(isRecord)) : null);

  const hasAgentTotal =
    isRecord(goalSource) && count(goalSource.total ?? cell(goalSource, AGENT_TOTAL_KEYS)) !== undefined;

  if (categories.length === 0 || !hasAgentTotal) return emptyModel();

  const goal = normalizeGoal(goalSource, categories, title);
  if (title) goal.name = title || goal.name;

  const wall = normalizeWall(payload.wall ?? payload.errors);

  return { goal, categories, wall, empty: false };
}
