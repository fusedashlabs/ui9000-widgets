import { heatmapCellKey } from '../../matrix-chart/lib/heatmap-layout.js';
import type { NetworkGraphModel } from './types.js';

export interface NetworkHeatmapData {
  /** Node ids, the most connected first; rows and columns share the order. */
  ids: string[];
  labels: string[];
  colors: string[];
  /** Summed link value of every node pair, both directions. */
  values: Map<string, number>;
}

/** The graph as a node × node matrix. Links are undirected here: A → B and B → A add up. */
export function buildNetworkHeatmap(model: NetworkGraphModel): NetworkHeatmapData {
  const ids = new Set(model.nodes.map((node) => node.id));
  const values = new Map<string, number>();
  const totals = new Map<string, number>();

  for (const link of model.links) {
    const { source, target, value } = link;
    if (!ids.has(source) || !ids.has(target) || source === target) continue;
    for (const [row, column] of [
      [source, target],
      [target, source],
    ]) {
      const key = heatmapCellKey(row, column);
      values.set(key, (values.get(key) ?? 0) + value);
    }
    totals.set(source, (totals.get(source) ?? 0) + value);
    totals.set(target, (totals.get(target) ?? 0) + value);
  }

  const ordered = [...model.nodes].sort(
    (a, b) =>
      (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0) || a.label.localeCompare(b.label),
  );

  return {
    ids: ordered.map((node) => node.id),
    labels: ordered.map((node) => node.label),
    colors: ordered.map((node) => node.color ?? ''),
    values,
  };
}
