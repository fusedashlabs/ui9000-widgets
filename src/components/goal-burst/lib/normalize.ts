import { categoryRows, normalizeAssetHealth } from '../../asset-health-overview/lib/index.js';
import type { BurstGroup, GoalBurstModel, ResourceKind } from './types.js';

/**
 * How long each kind of group takes to answer: the median call and the 95th
 * percentile, seconds. A person answers in minutes: every one of theirs is
 * off the scale.
 */
export const KIND_LATENCY: Record<ResourceKind, [p50: number, p95: number]> = {
  camera: [0.08, 0.22],
  store: [0.05, 0.16],
  system: [0.24, 0.7],
  app: [0.3, 0.9],
  tool: [0.62, 1.5],
  model: [0.9, 2.1],
  human: [180, 900],
};

/** A group of no kind the burst knows answers as an app does. */
const DEFAULT_LATENCY: [number, number] = [0.3, 0.9];

/** What one asset of each kind is called. */
const KIND_UNIT: Record<ResourceKind, [one: string, many: string]> = {
  camera: ['camera', 'cameras'],
  store: ['data store', 'data stores'],
  system: ['system of record', 'systems of record'],
  app: ['app', 'apps'],
  tool: ['tool', 'tools'],
  model: ['model', 'models'],
  human: ['person', 'people'],
};

/** A kind, from the words a payload uses for it — the kind it sends, else the group's name. */
const KIND_WORDS: [RegExp, ResourceKind][] = [
  [/camera|cctv|video|\bnvr\b/, 'camera'],
  [/\bstores?\b|storage|warehouse|bucket|\blake\b/, 'store'],
  [/system|record|database|\bdbs?\b|\bcrm\b|\berp\b/, 'system'],
  [/\bapps?\b|application|saas|integration/, 'app'],
  [/tool|sandbox|runner|browser/, 'tool'],
  [/model|\bllm\b|\bai\b/, 'model'],
  [/human|person|people|on-call|reviewer|approver/, 'human'],
];

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function count(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() ? Number(value.replace(/[,\s]/g, '')) : value;
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

/** `0.24`, `"240ms"`, `"0.7s"`, `"3m"` → seconds. */
function seconds(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const match = text(value).toLowerCase().match(/^([\d.]+)\s*(ms|s|m|min)?$/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return match[2] === 'ms' ? n / 1000 : match[2] === 'm' || match[2] === 'min' ? n * 60 : n;
}

function kindOf(row: Record<string, unknown>, name: string): ResourceKind | null {
  const given = (text(row.kind) || text(row.type)).toLowerCase();
  if (given in KIND_LATENCY) return given as ResourceKind;
  for (const words of [given, name.toLowerCase()]) {
    const hit = words && KIND_WORDS.find(([pattern]) => pattern.test(words));
    if (hit) return hit[1];
  }
  return null;
}

/** The answer times sent, or the kind's usual, marked as not measured; one sent alone keeps the usual spread to the other. */
function latencyOf(row: Record<string, unknown>, kind: ResourceKind | null): BurstGroup['latency'] {
  const [p50, p95] = kind ? KIND_LATENCY[kind] : DEFAULT_LATENCY;
  const given = row.latency && typeof row.latency === 'object' ? (row.latency as Record<string, unknown>) : {};
  const median = seconds(given.p50);
  const tail = seconds(given.p95);
  if (median && tail) return { p50: Math.min(median, tail), p95: Math.max(median, tail), measured: true };
  if (median) return { p50: median, p95: (median * p95) / p50, measured: true };
  if (tail) return { p50: (tail * p50) / p95, p95: tail, measured: true };
  return { p50, p95, measured: false };
}

/**
 * The goal burst's model: the asset health model of the same payload — the
 * goal, and a section for each resource group it draws on, with its traffic,
 * its assets and what is in trouble there — and, for each group, how long its
 * calls take to be answered. A group whose assets the payload does not name
 * takes its kind's word for them (9 systems of record).
 */
export function normalizeGoalBurst(raw: unknown): GoalBurstModel {
  const base = normalizeAssetHealth(raw);
  const rows = categoryRows(raw);
  const total = raw && typeof raw === 'object' ? count((raw as Record<string, unknown>).resourceGroupTotal) : null;

  const groups: BurstGroup[] = base.sections.map((section, i) => {
    const row = rows[i] ?? {};
    const kind = kindOf(row, section.name);
    const unit = !text(row.unit) && kind ? KIND_UNIT[kind] : section.unit;
    return {
      section: { ...section, unit },
      kind,
      latency: latencyOf(row, kind),
      bytes: count(row.bytes ?? row.bpm),
      sharedWith: count(row.sharedWith),
    };
  });

  return {
    title: base.title,
    goal: base.goal,
    groups,
    groupTotal: Math.max(groups.length, total ?? 0),
    empty: base.empty,
  };
}
