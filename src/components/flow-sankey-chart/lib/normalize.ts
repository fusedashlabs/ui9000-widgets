import { formatCapitalizedWords } from '../../../utils/format-text.js';

import {
  SEVERITY_KEYS,
  type FlowGraphPayload,
  type FlowLinkDatum,
  type FlowNodeDatum,
  type FlowSankeyFusePayload,
  type FlowSankeyInput,
  type FlowSankeyModel,
  type FlowSummaryCard,
  type SeverityKey,
} from './types.js';

/**
 * Hard mark cap for chat: one ribbon per link plus a node bar, a label and a
 * share badge per node. Denser payloads keep their highest-value links.
 */
export const MAX_FLOW_LINKS = 1500;

/** The severity scale is this chart's fixed key, so it names itself. */
export const DEFAULT_LEGEND_LABEL = 'Severity';

/** Joins stage index to label so one name can appear in several columns. */
const ID_SEP = '\u0000';
const LINK_SEP = '\u0001';

const EMPTY: FlowSankeyModel = {
  nodes: [],
  links: [],
  stages: [],
  summary: [],
  valueLabel: '',
  subtitle: '',
  legendLabel: DEFAULT_LEGEND_LABEL,
  severities: [],
  circular: false,
};

function emptyModel(overrides: Partial<FlowSankeyModel> = {}): FlowSankeyModel {
  return { ...EMPTY, nodes: [], links: [], stages: [], summary: [], ...overrides };
}

function firstKey(value: string | string[] | null | undefined): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

/** Anything outside the four known keys is unclassified, not a severity. */
export function resolveSeverity(raw: unknown): SeverityKey | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase();
  return (SEVERITY_KEYS as readonly string[]).includes(key)
    ? (key as SeverityKey)
    : null;
}

/** True when following source -> target ever revisits a node on the same path. */
function hasCycle(links: FlowLinkDatum[]): boolean {
  const adjacency = new Map<string, Set<string>>();
  for (const link of links) {
    let targets = adjacency.get(link.source);
    if (!targets) {
      targets = new Set();
      adjacency.set(link.source, targets);
    }
    targets.add(link.target);
  }

  const visited = new Set<string>();
  const path = new Set<string>();

  const walk = (node: string): boolean => {
    if (path.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    path.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (walk(next)) return true;
    }
    path.delete(node);
    return false;
  };

  for (const node of adjacency.keys()) {
    if (!visited.has(node) && walk(node)) return true;
  }
  return false;
}

/**
 * Longest path from any root — the stage a node is drawn in when the payload
 * does not name one. Matches where d3-sankey would place it, but computed here
 * so `lib/` stays the single source of truth for the column index.
 */
function deriveStages(
  ids: string[],
  links: FlowLinkDatum[],
  declared: Map<string, number>,
): Map<string, number> {
  const incoming = new Map<string, string[]>();
  for (const link of links) {
    const list = incoming.get(link.target);
    if (list) list.push(link.source);
    else incoming.set(link.target, [link.source]);
  }

  const depth = new Map<string, number>();
  const resolving = new Set<string>();

  const walk = (id: string): number => {
    const fixed = declared.get(id);
    if (fixed !== undefined) return fixed;
    const seen = depth.get(id);
    if (seen !== undefined) return seen;
    // Guarded by hasCycle upstream; the set keeps a malformed call finite.
    if (resolving.has(id)) return 0;

    resolving.add(id);
    let best = 0;
    for (const parent of incoming.get(id) ?? []) {
      best = Math.max(best, walk(parent) + 1);
    }
    resolving.delete(id);
    depth.set(id, best);
    return best;
  };

  const stages = new Map<string, number>();
  for (const id of ids) stages.set(id, walk(id));
  return stages;
}

interface RawNode {
  label: string;
  severity: SeverityKey | null;
  icon: string;
  stage?: number;
}

function buildModel(
  rawNodes: Map<string, RawNode>,
  rawLinks: FlowLinkDatum[],
  meta: Pick<
    FlowSankeyModel,
    'stages' | 'summary' | 'valueLabel' | 'subtitle' | 'legendLabel'
  >,
): FlowSankeyModel {
  let clean = rawLinks.filter(
    (l) =>
      l.source !== l.target &&
      rawNodes.has(l.source) &&
      rawNodes.has(l.target) &&
      Number.isFinite(l.value) &&
      l.value > 0,
  );

  if (clean.length > MAX_FLOW_LINKS) {
    clean = clean
      .slice()
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_FLOW_LINKS);
  }

  if (!clean.length) return emptyModel(meta);
  if (hasCycle(clean)) return emptyModel({ ...meta, circular: true });

  const used = new Set<string>();
  for (const link of clean) {
    used.add(link.source);
    used.add(link.target);
  }

  const ids = [...rawNodes.keys()].filter((id) => used.has(id));
  const declared = new Map<string, number>();
  for (const id of ids) {
    const stage = rawNodes.get(id)?.stage;
    if (typeof stage === 'number' && Number.isFinite(stage) && stage >= 0) {
      declared.set(id, Math.trunc(stage));
    }
  }
  const stageOf = deriveStages(ids, clean, declared);

  // A node's value is its larger side — incoming for a sink, outgoing for a
  // source — so a stage total never counts a pass-through flow twice.
  const inSum = new Map<string, number>();
  const outSum = new Map<string, number>();
  for (const link of clean) {
    outSum.set(link.source, (outSum.get(link.source) ?? 0) + link.value);
    inSum.set(link.target, (inSum.get(link.target) ?? 0) + link.value);
  }

  const stageTotals = new Map<number, number>();
  const valueOf = new Map<string, number>();
  const sized = ids.map((id) => {
    const stage = stageOf.get(id) ?? 0;
    const value = Math.max(inSum.get(id) ?? 0, outSum.get(id) ?? 0);
    stageTotals.set(stage, (stageTotals.get(stage) ?? 0) + value);
    valueOf.set(id, value);
    return { id, stage, value };
  });

  // The busiest stage carries the whole flow — that total is what the 0-100%
  // gutter measures, and every column is drawn against it.
  const flowTotal = Math.max(...stageTotals.values(), 0);

  // A node fed by exactly one upstream node reads as a share of that parent;
  // roots and nodes that many paths converge on read against the flow total.
  const parents = new Map<string, Set<string>>();
  for (const link of clean) {
    const set = parents.get(link.target);
    if (set) set.add(link.source);
    else parents.set(link.target, new Set([link.source]));
  }

  const nodes: FlowNodeDatum[] = sized.map(({ id, stage, value }) => {
    const raw = rawNodes.get(id);
    const from = parents.get(id);
    const soleParent =
      from && from.size === 1 ? valueOf.get([...from][0]) ?? 0 : 0;
    const denominator = soleParent > 0 ? soleParent : flowTotal;
    return {
      id,
      label: raw?.label ?? id,
      stage,
      value,
      share: denominator > 0 ? value / denominator : 0,
      severity: raw?.severity ?? null,
      icon: raw?.icon ?? '',
    };
  });

  const maxStage = nodes.reduce((max, n) => Math.max(max, n.stage), 0);
  const stages = Array.from(
    { length: maxStage + 1 },
    (_, i) => meta.stages[i] ?? '',
  );

  // Marks with no severity are drawn in the neutral colour, which is a legend
  // class of its own: it is what the normal, uneventful flow looks like. Fold
  // them into `info` so the key explains every colour on the plot.
  const present = new Set<SeverityKey>();
  let unclassified = false;
  for (const node of nodes) {
    if (node.severity) present.add(node.severity);
    else unclassified = true;
  }
  for (const link of clean) {
    if (link.severity) present.add(link.severity);
    else unclassified = true;
  }
  if (unclassified) present.add('info');

  return {
    nodes,
    links: clean,
    stages,
    summary: meta.summary,
    valueLabel: meta.valueLabel,
    subtitle: meta.subtitle,
    legendLabel: meta.legendLabel,
    severities: SEVERITY_KEYS.filter((key) => present.has(key)),
    circular: false,
  };
}

function normalizeSummary(payload: FlowGraphPayload): FlowSummaryCard[] {
  return (payload.summary ?? [])
    .map((card) => ({
      label: String(card.label ?? ''),
      value:
        card.value === undefined || card.value === null ? '' : String(card.value),
      caption: String(card.caption ?? ''),
      icon: String(card.icon ?? ''),
    }))
    .filter((card) => card.label || card.value);
}

function normalizeGraph(payload: FlowGraphPayload): FlowSankeyModel {
  const links: FlowLinkDatum[] = (payload.links ?? [])
    .map((l) => ({
      source: String(l.source ?? ''),
      target: String(l.target ?? ''),
      value: Number(l.value),
      severity: resolveSeverity(l.severity),
    }))
    .filter((l) => l.source && l.target);

  const nodes = new Map<string, RawNode>();

  for (const node of payload.nodes ?? []) {
    const id = String(node.id ?? '');
    if (!id) continue;
    nodes.set(id, {
      label: node.label ?? id,
      severity: resolveSeverity(node.severity),
      icon: String(node.icon ?? ''),
      stage: typeof node.stage === 'number' ? node.stage : undefined,
    });
  }

  // Links may name nodes the `nodes` array left out (or omit it entirely).
  for (const link of links) {
    for (const id of [link.source, link.target]) {
      if (!nodes.has(id)) nodes.set(id, { label: id, severity: null, icon: '' });
    }
  }

  return buildModel(nodes, links, {
    stages: payload.stages ?? [],
    summary: normalizeSummary(payload),
    valueLabel: payload.valueLabel ?? '',
    subtitle: payload.subtitle ?? '',
    legendLabel: payload.legendLabel || DEFAULT_LEGEND_LABEL,
  });
}

function normalizeFuse(payload: FlowSankeyFusePayload): FlowSankeyModel {
  const rows = payload.data ?? [];
  const details = payload.axisDetails ?? undefined;

  // Editor-built flows keep the ordered stage fields in `arrangeBy`; fall back
  // to the xAxe / groupBy pair the two-column Sankey uses.
  const arrangeBy = (payload.arrangeBy ?? []).filter(
    (key): key is string => typeof key === 'string' && key.length > 0,
  );
  const stageKeys = arrangeBy.length
    ? arrangeBy
    : [firstKey(payload.xAxe), firstKey(payload.groupBy)].filter(Boolean);
  const valueKey = firstKey(payload.yAxe) || payload.display?.[0] || '';
  const severityKey = payload.severityBy ?? '';

  const stageLabels = stageKeys.map(
    (key) => details?.[key]?.label || formatCapitalizedWords(key),
  );
  const valueLabel = details?.[valueKey]?.label || formatCapitalizedWords(valueKey);

  if (rows.length === 0 || stageKeys.length < 2 || !valueKey) {
    return emptyModel({ stages: stageLabels, valueLabel });
  }


  const nodes = new Map<string, RawNode>();
  // The same pair repeats across rows — fold them into one ribbon.
  const totals = new Map<string, FlowLinkDatum>();

  for (const row of rows) {
    const value = Number(row[valueKey]);
    if (!Number.isFinite(value) || value <= 0) continue;
    const severity = resolveSeverity(row[severityKey]);

    // Namespace the id by stage so a label repeated across columns stays two
    // distinct nodes (and can never become a self link).
    const cells = stageKeys.map((key, stage) => {
      const label = String(row[key] ?? '').trim();
      return label ? { id: `${stage}${ID_SEP}${label}`, label, stage } : null;
    });

    for (const cell of cells) {
      if (cell && !nodes.has(cell.id)) {
        nodes.set(cell.id, {
          label: cell.label,
          severity: null,
          icon: '',
          stage: cell.stage,
        });
      }
    }

    for (let i = 0; i < cells.length - 1; i += 1) {
      const from = cells[i];
      const to = cells[i + 1];
      if (!from || !to) continue;
      const key = `${from.id}${LINK_SEP}${to.id}`;
      const existing = totals.get(key);
      if (existing) existing.value += value;
      else totals.set(key, { source: from.id, target: to.id, value, severity });
    }
  }

  return buildModel(nodes, [...totals.values()], {
    stages: stageLabels,
    summary: [],
    valueLabel,
    subtitle: '',
    legendLabel: DEFAULT_LEGEND_LABEL,
  });
}

/** Normalize FuseDash widget or chat payloads into a staged flow graph. */
export function normalizeFlowSankeyData(
  input: FlowSankeyInput | null | undefined,
): FlowSankeyModel {
  if (!input) return emptyModel();

  if (Array.isArray(input)) {
    return normalizeGraph({ links: input });
  }

  if ('links' in input && Array.isArray(input.links)) {
    return normalizeGraph(input);
  }

  if ('data' in input && Array.isArray(input.data)) {
    return normalizeFuse(input);
  }

  return emptyModel();
}
