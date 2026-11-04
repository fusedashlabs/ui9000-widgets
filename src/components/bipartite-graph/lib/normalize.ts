import { DEFAULT_CALLS, normalizeGoalsPerimeter, type HoldState, type SatelliteHealth } from '../../goals-perimeter/lib/index.js';
import type {
  BipartiteGraphModel,
  BipartiteGraphPayload,
  BipartiteResource,
  Dependency,
  ResourceCatalogInput,
  ResourceStanding,
} from './types.js';

/** What one instance of each usual kind of group is called. */
const KIND_UNIT: Record<string, [string, string]> = {
  camera: ['camera', 'cameras'],
  app: ['app', 'apps'],
  system: ['system of record', 'systems of record'],
  tool: ['tool', 'tools'],
  store: ['data store', 'data stores'],
  model: ['model', 'models'],
  human: ['person', 'people'],
};

/** Severity of a dependency: stopped agents beat failed ones, which beat waiting ones, which beat slowed traffic. */
const HOLD_RANK: Record<HoldState, number> = { blocked: 4, failed: 3, awaiting: 2 };
export const dependencyRank = (d: Pick<Dependency, 'hold' | 'health'>) => (d.hold ? HOLD_RANK[d.hold] : d.health === 'degraded' ? 1 : 0);

/** The worse of two dependencies; between equals, the one holding more agents. */
const worse = (a: Dependency, b: Dependency) => dependencyRank(b) - dependencyRank(a) || b.held - a.held;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function count(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value.trim().replace(/,/g, '')) : value;
  return typeof n === 'number' && Number.isFinite(n) && (typeof value !== 'string' || value.trim() !== '') ? Math.max(0, Math.round(n)) : null;
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

const key = (value: unknown) => text(value).toLowerCase();

function readUnit(unit: unknown, kind: string): [string, string] | null {
  if (Array.isArray(unit) && unit.length >= 2 && text(unit[0]) && text(unit[1])) return [text(unit[0]), text(unit[1])];
  if (text(unit)) return [text(unit), text(unit)];
  return KIND_UNIT[key(kind)] ?? null;
}

function readCatalog(input: unknown): Map<string, ResourceCatalogInput & { at: number }> {
  const out = new Map<string, ResourceCatalogInput & { at: number }>();
  if (!Array.isArray(input)) return out;
  input.forEach((entry, at) => {
    if (!isRecord(entry)) return;
    const name = text(entry.name) || text(entry.label);
    const kind = text(entry.kind) || text(entry.type);
    const k = key(name || kind);
    if (k && !out.has(k)) out.set(k, { ...(entry as ResourceCatalogInput), at });
  });
  return out;
}

/**
 * The goals perimeter's goals, each joined by a ribbon to every resource group
 * it draws on, and those groups in a column of their own: the ones in the
 * catalog first, in its order, then any it leaves out, in the order the goals
 * name them. A group the catalog lists but no goal draws on is not drawn.
 */
export function normalizeBipartiteGraph(input: unknown): BipartiteGraphModel {
  const payload: BipartiteGraphPayload = isRecord(input) ? (input as BipartiteGraphPayload) : {};
  const base = normalizeGoalsPerimeter(payload);
  const catalog = readCatalog(payload.resourceGroups ?? payload.resources);

  const resources = new Map<string, BipartiteResource>();
  const seen: string[] = [];
  const dependencies: Dependency[] = [];
  for (const goal of base.goals) {
    const drawn = new Set<string>();
    for (const group of goal.resourceGroups) {
      if (drawn.has(group.shareKey)) continue;
      drawn.add(group.shareKey);
      let resource = resources.get(group.shareKey);
      if (!resource) {
        const entry = catalog.get(group.shareKey);
        const kind = text(entry?.kind) || text(entry?.type) || group.kind;
        resource = {
          key: group.shareKey,
          name: text(entry?.name) || text(entry?.label) || group.name,
          kind,
          count: count(entry?.count),
          unit: readUnit(entry?.unit, kind),
          healthy: count(entry?.healthy ?? entry?.ok),
          degraded: count(entry?.degraded),
          impaired: count(entry?.impaired),
        };
        resources.set(group.shareKey, resource);
        seen.push(group.shareKey);
      }
      const hold = group.state === 'awaiting' || group.state === 'blocked' || group.state === 'failed' ? group.state : null;
      const health: SatelliteHealth = hold ? 'held' : group.state === 'degraded' ? 'degraded' : 'clean';
      dependencies.push({
        key: `${goal.id}→${group.shareKey}`,
        goal,
        resource,
        group,
        health,
        hold,
        held: group.held,
        calls: group.calls ?? DEFAULT_CALLS,
      });
    }
  }

  const order = (k: string) => catalog.get(k)?.at ?? catalog.size + seen.indexOf(k);
  const column = seen.sort((a, b) => order(a) - order(b)).map((k) => resources.get(k)!);

  const standing = new Map<string, ResourceStanding>();
  for (const resource of column) {
    const edges = dependencies.filter((d) => d.resource === resource).sort(worse);
    standing.set(resource.key, {
      health: edges[0]?.health ?? 'clean',
      hold: edges[0]?.hold ?? null,
      held: edges.reduce((sum, d) => sum + d.held, 0),
      goals: edges.length,
      calls: edges.reduce((sum, d) => sum + d.calls, 0),
    });
  }

  return {
    title: base.title,
    goals: base.goals,
    resources: column,
    dependencies,
    standing,
    resourceTotal: Math.max(column.length, count(payload.resourceGroupTotal) ?? catalog.size),
    exceptionCount: base.exceptionCount,
    empty: base.empty,
  };
}
