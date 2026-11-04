import { getNodeConnections } from './fit.js';
import type {
  MetricPoint,
  NetworkGraphModel,
  NetworkLink,
  NetworkNode,
  NetworkTopic,
} from './types.js';

/** Whether a node belongs to a topic: its type or one of its topics. */
export function nodeMatchesTopic(node: NetworkNode, topic: string): boolean {
  return node.type === topic || !!node.topics?.includes(topic);
}

/**
 * Entries of "Trends by Topics": the data's own topics when it has them,
 * otherwise one entry per node type with the number of links that touch it.
 */
export function getNetworkTopics(model: NetworkGraphModel): NetworkTopic[] {
  const { nodes, links, topics } = model;
  const colorOf = (name: string): string | undefined =>
    nodes.find((node) => nodeMatchesTopic(node, name))?.color;

  if (topics?.length) {
    return topics
      .filter((topic) => topic && String(topic.name ?? '').trim())
      .map((topic) => ({
        ...topic,
        value: Number(topic.value) || 0,
        color: topic.color ?? colorOf(topic.name),
      }));
  }

  const typeById = new Map(nodes.map((node) => [node.id, node.type]));
  const counts = new Map<string, number>();
  for (const node of nodes) {
    if (node.type && !counts.has(node.type)) counts.set(node.type, 0);
  }
  for (const link of links) {
    for (const type of new Set([typeById.get(link.source), typeById.get(link.target)])) {
      if (type) counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([name, value]) => ({ name, value, color: colorOf(name) }));
}

/** Topics of a node for its card; a node that is a topic itself does not list itself. */
export function getNodeTopics(node: NetworkNode, known: string[]): string[] {
  const own = new Set([node.id, node.label]);
  const names = Array.from(new Set([...(node.topics ?? []), node.type].filter(Boolean))).filter(
    (name) => !own.has(name),
  );
  if (!known.length) return names;
  const knownSet = new Set(known);
  return names.filter((name) => knownSet.has(name));
}

export interface NodeConnection {
  node: NetworkNode;
  weight: number;
}

/** Nodes linked to `nodeId`, strongest link first, then by name. */
export function getConnectionList(
  nodeId: string,
  nodes: NetworkNode[],
  links: NetworkLink[],
): NodeConnection[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return Array.from(getNodeConnections(nodeId, links))
    .filter(([id]) => byId.has(id))
    .map(([id, weight]) => ({ node: byId.get(id) as NetworkNode, weight }))
    .sort((a, b) => b.weight - a.weight || a.node.label.localeCompare(b.node.label));
}

/** Number of linked nodes of every node, by its name. */
export function getConnectionCounts(
  nodes: NetworkNode[],
  links: NetworkLink[],
): Map<string, number> {
  const ids = new Set(nodes.map((node) => node.id));
  const neighbours = new Map<string, Set<string>>();
  const add = (from: string, to: string): void => {
    const set = neighbours.get(from) ?? new Set<string>();
    set.add(to);
    neighbours.set(from, set);
  };
  for (const { source, target } of links) {
    if (source === target || !ids.has(source) || !ids.has(target)) continue;
    add(source, target);
    add(target, source);
  }
  return new Map(nodes.map((node) => [node.label, neighbours.get(node.id)?.size ?? 0]));
}

export interface PeriodPoint extends MetricPoint {
  time: number;
}

/** Points of `series` within the last `months` before its last date. */
export function getPeriodSeries(series: MetricPoint[], months: number): PeriodPoint[] {
  const points = series
    .map((point) => ({ time: new Date(point.date).getTime(), ...point }))
    .filter((point) => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
  if (!points.length) return [];
  const last = new Date(points[points.length - 1].time);
  // The same day `months` back, or the last day of a shorter month (Aug 31 -> Feb 28).
  const year = last.getUTCFullYear();
  const month = last.getUTCMonth() - months;
  const monthEnd = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const from = Date.UTC(year, month, Math.min(last.getUTCDate(), monthEnd));
  return points.filter((point) => point.time >= from);
}

/** Two letters for an avatar: the first letters of the first two words. */
export function getInitials(name: string): string {
  const words = String(name ?? '')
    .split(/[\s\-_/]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** A value with its unit; percentages keep one decimal ("62.0%"). */
export function formatMetricValue(value: number, unit?: string): string {
  return unit === '%' ? `${value.toFixed(1)}%` : `${value}${unit ?? ''}`;
}

/** Decimals of a change: points keep one ("+6.0 pt"), whole numbers none. */
export function changeDecimals(change: number, unit?: string): number {
  return unit === ' pt' || !Number.isInteger(change) ? 1 : 0;
}

/** "+2.3%" */
export function formatChange(change: number, unit: string, decimals: number): string {
  const sign = change > 0 ? '+' : change < 0 ? '-' : '';
  return `${sign}${Math.abs(change).toFixed(decimals)}${unit}`;
}
