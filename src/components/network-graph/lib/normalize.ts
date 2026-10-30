import { pickQualitativePalette } from '../../../utils/fuse-palette.js';
import { generateBreakPoints } from '../../../utils/breakpoints.js';


import type {
  NetworkGraphFusePayload,
  NetworkGraphInput,
  NetworkGraphModel,
  NetworkLabels,
  NetworkLink,
  NetworkLinkKind,
  NetworkNode,
  NetworkTopic,
  RankingEntry,
  TopicMetric,
} from './types.js';

/**
 * Mark caps for chat: a node costs eight SVG elements plus a label, a link
 * costs a line plus a label pill. Denser payloads keep their largest members.
 */
export const MAX_NETWORK_NODES = 250;
export const MAX_NETWORK_LINKS = 600;

const LINK_KINDS: NetworkLinkKind[] = ['primary', 'neutral', 'secondary'];

const EMPTY_MODEL: NetworkGraphModel = {
  nodes: [],
  links: [],
  breakpoints: [],
  maxLinkValue: 1,
};

function emptyModel(): NetworkGraphModel {
  return { ...EMPTY_MODEL, nodes: [], links: [], breakpoints: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toNode(raw: unknown): NetworkNode | null {
  if (!isRecord(raw)) return null;
  const id = raw.id == null ? '' : String(raw.id);
  if (!id) return null;
  return {
    id,
    label: optionalString(raw.label) ?? id,
    value: finiteNumber(raw.value),
    type: raw.type == null ? '' : String(raw.type),
    color: optionalString(raw.color),
    img: optionalString(raw.img),
    topics: stringList(raw.topics),
    date: optionalString(raw.date),
    events: stringList(raw.events),
    role: optionalString(raw.role),
    metrics: Array.isArray(raw.metrics) ? (raw.metrics as TopicMetric[]) : undefined,
    bio: optionalString(raw.bio),
    eventsLabel: optionalString(raw.eventsLabel),
    linksLabel: optionalString(raw.linksLabel),
  };
}

function stringList(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : undefined;
}

function toLinkKind(raw: unknown): NetworkLinkKind {
  return LINK_KINDS.includes(raw as NetworkLinkKind)
    ? (raw as NetworkLinkKind)
    : 'neutral';
}

function collectNodes(raw: unknown[]): NetworkNode[] {
  const byId = new Map<string, NetworkNode>();
  for (const entry of raw) {
    const node = toNode(entry);
    if (node && !byId.has(node.id)) byId.set(node.id, node);
  }
  const nodes = [...byId.values()];
  if (nodes.length <= MAX_NETWORK_NODES) return nodes;
  return nodes
    .slice()
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, MAX_NETWORK_NODES);
}

function collectLinks(raw: unknown[], known: Set<string>): NetworkLink[] {
  const seen = new Set<string>();
  const links: NetworkLink[] = [];

  raw.forEach((entry, index) => {
    if (!isRecord(entry)) return;
    const source = entry.source == null ? '' : String(entry.source);
    const target = entry.target == null ? '' : String(entry.target);
    // A self link draws as a zero-length stroke — it costs marks and shows
    // nothing, so it never reaches the plot.
    if (!source || !target || source === target) return;
    if (!known.has(source) || !known.has(target)) return;

    const id = entry.id == null ? `${source}->${target}-${index}` : String(entry.id);
    if (seen.has(id)) return;
    seen.add(id);

    links.push({
      id,
      source,
      target,
      value: finiteNumber(entry.value) ?? 0,
      type: toLinkKind(entry.type),
      date: optionalString(entry.date),
    });
  });

  if (links.length <= MAX_NETWORK_LINKS) return links;
  return links
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_NETWORK_LINKS);
}

/**
 * Node types take the page palette in order of first appearance. A node's own
 * colour wins; nodes without a type share the first colour.
 */
function paintNodeGroups(nodes: NetworkNode[]): void {
  const palette = pickQualitativePalette(0, new Set(nodes.map((node) => node.type.trim())).size);
  const groups: string[] = [];
  for (const node of nodes) {
    if (node.color) continue;
    const type = node.type.trim();
    let index = groups.indexOf(type);
    if (index < 0) {
      groups.push(type);
      index = groups.length - 1;
    }
    node.color = palette[index % palette.length];
  }
}

/** Topics, ranking and words of the panels: on the graph itself or in `data[0]`. */
function extrasOf(source: Record<string, unknown>): Partial<NetworkGraphModel> {
  return {
    ...(Array.isArray(source.topics) ? { topics: source.topics as NetworkTopic[] } : {}),
    ...(Array.isArray(source.ranking) ? { ranking: source.ranking as RankingEntry[] } : {}),
    ...(isRecord(source.labels) ? { labels: source.labels as NetworkLabels } : {}),
  };
}

function buildModel(rawNodes: unknown[], rawLinks: unknown[]): NetworkGraphModel {
  let nodes = collectNodes(rawNodes);

  if (!nodes.length) {
    // Links-only payloads describe their own endpoints.
    const derived = new Map<string, NetworkNode>();
    for (const entry of rawLinks) {
      if (!isRecord(entry)) continue;
      for (const key of ['source', 'target'] as const) {
        const id = entry[key] == null ? '' : String(entry[key]);
        if (id && !derived.has(id)) derived.set(id, { id, label: id, type: '' });
      }
    }
    nodes = collectNodes([...derived.values()]);
  }

  if (!nodes.length) return emptyModel();

  paintNodeGroups(nodes);

  const links = collectLinks(rawLinks, new Set(nodes.map((n) => n.id)));
  const values = nodes
    .map((n) => n.value)
    .filter((v): v is number => typeof v === 'number');

  return {
    nodes,
    links,
    breakpoints: values.length ? generateBreakPoints(values, 7) : [],
    maxLinkValue: links.reduce((max, l) => Math.max(max, l.value), 0) || 1,
  };
}

/** Client `extractGraphDataFromWidget` — the graph lives in `widget.data[0]`. */
function normalizeFuse(payload: NetworkGraphFusePayload): NetworkGraphModel {
  const first = Array.isArray(payload.data) ? payload.data[0] : undefined;
  if (!isRecord(first)) return emptyModel();
  return {
    ...buildModel(
      Array.isArray(first.nodes) ? first.nodes : [],
      Array.isArray(first.links) ? first.links : [],
    ),
    ...extrasOf(first),
  };
}

/** Normalize FuseDash widget or chat payloads into a force-graph model. */
export function normalizeNetworkGraphData(
  input: NetworkGraphInput | null | undefined,
): NetworkGraphModel {
  if (!input) return emptyModel();

  if (Array.isArray(input)) return buildModel([], input);

  if (isRecord(input) && (Array.isArray(input.nodes) || Array.isArray(input.links))) {
    return {
      ...buildModel(
        Array.isArray(input.nodes) ? input.nodes : [],
        Array.isArray(input.links) ? input.links : [],
      ),
      ...extrasOf(input),
    };
  }

  if (isRecord(input) && Array.isArray(input.data)) {
    return normalizeFuse(input as NetworkGraphFusePayload);
  }

  return emptyModel();
}
