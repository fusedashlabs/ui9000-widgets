/**
 * Charts registry. Every file in configs/ is a chart page; the sidebar, the routes, the search index, the Soon
 * badges and the Introduction cards read it from here. Adding a page = adding a config (and its fixtures).
 * The catalog (catalog.ts) still lists the charts that have no page yet, so they show as "Soon".
 */
import { CATEGORIES } from '../catalog.js';
import type { ChartConfig } from './types.js';

const modules = import.meta.glob<ChartConfig>('./configs/*.ts', { eager: true, import: 'default' });

const CHARTS: Record<string, ChartConfig> = {};
for (const [path, config] of Object.entries(modules)) {
  const listed = CATEGORIES.find((c) => c.id === config.category)?.types.some((t) => t.id === config.id);
  if (!listed) throw new Error(`${path}: chart "${config.id}" is not in category "${config.category}" in catalog.ts`);
  CHARTS[config.id] = config;
}

export function chartConfig(id: string): ChartConfig | undefined {
  return CHARTS[id];
}

export function isChartReady(id: string): boolean {
  return id in CHARTS;
}

/** Every chart page that is ready, in no particular order (the catalog gives the order). */
export function readyCharts(): ChartConfig[] {
  return Object.values(CHARTS);
}
