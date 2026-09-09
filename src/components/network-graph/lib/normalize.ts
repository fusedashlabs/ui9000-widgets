import { generateBreakPoints } from '../../../utils/breakpoints.js';
import { pickQualitativePalette } from '../../../utils/fuse-palette.js';

import { NODE_TYPE_COLORS } from './domain.js';

import type {
  NetworkGraphFusePayload,
  NetworkGraphInput,
  NetworkGraphModel,
  NetworkLink,
  NetworkLinkKind,
  NetworkNode,
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
  };
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
    });
  });

  if (links.length <= MAX_NETWORK_LINKS) return links;
  return links
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_NETWORK_LINKS);
}

/**
 * `NODE_TYPE_COLORS` only covers the categories the client ships. Anything else
 * (the default mock's `investment_bank`, `asset_management`, …) would collapse
 * onto one slate fill, so unknown categories draw from the qualitative palette
 * in first-seen order instead.
 */
function paintUnknownTypes(nodes: NetworkNode[]): void {
  const unknown: string[] = [];
  for (const node of nodes) {
    if (!node.type || NODE_TYPE_COLORS[node.type] || unknown.includes(node.type)) continue;
    unknown.push(node.type);
  }
  if (!unknown.length) return;

  const palette = pickQualitativePalette(0, unknown.length);
  for (const node of nodes) {
    if (node.color) continue;
    const index = unknown.indexOf(node.type);
    if (index >= 0) node.color = palette[index % palette.length];
  }
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

  paintUnknownTypes(nodes);

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
  return buildModel(
    Array.isArray(first.nodes) ? first.nodes : [],
    Array.isArray(first.links) ? first.links : [],
  );
}

/** Normalize FuseDash widget or chat payloads into a force-graph model. */
export function normalizeNetworkGraphData(
  input: NetworkGraphInput | null | undefined,
): NetworkGraphModel {
  if (!input) return emptyModel();

  if (Array.isArray(input)) return buildModel([], input);

  if (isRecord(input) && (Array.isArray(input.nodes) || Array.isArray(input.links))) {
    return buildModel(
      Array.isArray(input.nodes) ? input.nodes : [],
      Array.isArray(input.links) ? input.links : [],
    );
  }

  if (isRecord(input) && Array.isArray(input.data)) {
    return normalizeFuse(input as NetworkGraphFusePayload);
  }

  return emptyModel();
}
