import { FD_SEQUENTIAL } from '../../../utils/fusedash-visual.js';

import type {
  SankeyFusePayload,
  SankeyGraphPayload,
  SankeyInput,
  SankeyLinkDatum,
  SankeyModel,
  SankeyNodeDatum,
} from './types.js';

/**
 * Hard mark cap for chat: one ribbon per link, plus a label and a rule per
 * node. Denser payloads keep their highest-value links.
 */
export const MAX_SANKEY_LINKS = 2000;

const EMPTY: SankeyModel = {
  nodes: [],
  links: [],
  sourceLabel: '',
  targetLabel: '',
  valueLabel: '',
  colors: [...FD_SEQUENTIAL],
  circular: false,
};

function emptyModel(overrides: Partial<SankeyModel> = {}): SankeyModel {
  return { ...EMPTY, colors: [...FD_SEQUENTIAL], ...overrides };
}

function firstKey(value: string | string[] | null | undefined): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/** True when following source → target ever revisits a node on the same path. */
function hasCycle(links: SankeyLinkDatum[]): boolean {
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

function buildModel(
  nodes: SankeyNodeDatum[],
  links: SankeyLinkDatum[],
  labels: Pick<SankeyModel, 'sourceLabel' | 'targetLabel' | 'valueLabel'>,
  colors: string[],
): SankeyModel {
  const known = new Set(nodes.map((n) => n.name));
  let clean = links.filter(
    (l) =>
      known.has(l.source) &&
      known.has(l.target) &&
      l.source !== l.target &&
      Number.isFinite(l.value),
  );

  if (clean.length > MAX_SANKEY_LINKS) {
    clean = clean
      .slice()
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_SANKEY_LINKS);
  }

  if (!clean.length) return emptyModel({ ...labels, colors });
  if (hasCycle(clean)) return emptyModel({ ...labels, colors, circular: true });

  const used = new Set<string>();
  for (const link of clean) {
    used.add(link.source);
    used.add(link.target);
  }

  return {
    nodes: nodes.filter((n) => used.has(n.name)),
    links: clean,
    ...labels,
    colors,
    circular: false,
  };
}

function normalizeFuse(payload: SankeyFusePayload): SankeyModel {
  const rows = payload.data ?? [];
  const details = payload.axisDetails ?? undefined;
  const custom = payload.palette?.customColors ?? undefined;
  const colors = custom?.length
    ? custom.map((c) => c.hex)
    : [...FD_SEQUENTIAL];

  // FuseDash reads xAxe/yAxe/groupBy; editor-built Sankeys keep the two
  // dimensions in `arrangeBy` and the measure in `display`.
  const arrangeBy = payload.arrangeBy ?? [];
  const sourceKey = firstKey(payload.xAxe) || arrangeBy[0] || '';
  const valueKey = firstKey(payload.yAxe) || payload.display?.[0] || '';
  let targetKey = firstKey(payload.groupBy) || arrangeBy[1] || '';
  if (!targetKey) {
    targetKey =
      Object.keys(rows[0] ?? {}).find(
        (key) => key !== sourceKey && key !== valueKey,
      ) ?? '';
  }

  const labels = {
    sourceLabel: details?.[sourceKey]?.label || capitalize(sourceKey),
    targetLabel: details?.[targetKey]?.label || capitalize(targetKey),
    valueLabel: details?.[valueKey]?.label || capitalize(valueKey),
  };

  if (!rows.length || !sourceKey || !targetKey || !valueKey) {
    return emptyModel({ ...labels, colors });
  }

  const sources = new Set<string>();
  const targets = new Set<string>();
  const links: SankeyLinkDatum[] = [];

  for (const row of rows) {
    const source = String(row[sourceKey] ?? '');
    const target = String(row[targetKey] ?? '').trim();
    const value = Number(row[valueKey]);
    if (!source || !target || !Number.isFinite(value)) continue;
    sources.add(source);
    targets.add(target);
    // Trailing space keeps a value that appears in both columns from
    // becoming a self link (FuseDash).
    links.push({ source: `${source} `, target, value });
  }

  const nodes: SankeyNodeDatum[] = [
    ...[...sources].sort().map((name) => ({ name: `${name} `, label: name })),
    ...[...targets].sort().map((name) => ({ name, label: name })),
  ];

  return buildModel(nodes, links, labels, colors);
}

function normalizeGraph(payload: SankeyGraphPayload): SankeyModel {
  const rawLinks = (payload.links ?? [])
    .map((l) => ({
      source: String(l.source ?? ''),
      target: String(l.target ?? ''),
      value: Number(l.value),
    }))
    .filter((l) => l.source && l.target);

  const nodes: SankeyNodeDatum[] = payload.nodes?.length
    ? payload.nodes.map((n) => ({
        name: String(n.name),
        label: n.label ?? String(n.name),
      }))
    : [
        ...new Set([
          ...rawLinks.map((l) => l.source),
          ...rawLinks.map((l) => l.target),
        ]),
      ].map((name) => ({ name, label: name }));

  return buildModel(
    nodes,
    rawLinks,
    {
      sourceLabel: payload.sourceLabel ?? '',
      targetLabel: payload.targetLabel ?? '',
      valueLabel: payload.valueLabel ?? '',
    },
    [...FD_SEQUENTIAL],
  );
}

/** Normalize FuseDash widget or chat payloads into a Sankey graph. */
export function normalizeSankeyData(
  input: SankeyInput | null | undefined,
): SankeyModel {
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
