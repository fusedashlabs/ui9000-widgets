import type { ChartKind } from '../../../lazy/index.js';
import areaChartMeta from '../../area-chart/metadata.json';
import areaGroupedBarMeta from '../../area-grouped-bar-chart/metadata.json';
import bandUtilizationMeta from '../../band-utilization-chart/metadata.json';
import barChartMeta from '../../bar-chart/metadata.json';
import biasVarianceTradeoffMeta from '../../bias-variance-tradeoff-chart/metadata.json';
import boxPlotMeta from '../../box-plot-chart/metadata.json';
import bubbleMeta from '../../bubble-chart/metadata.json';
import donutMeta from '../../donut-chart/metadata.json';
import giniImpurityEntropyMeta from '../../gini-impurity-entropy-chart/metadata.json';
import histogramMeta from '../../histogram-chart/metadata.json';
import kpiMeta from '../../kpi-widget/metadata.json';
import lossIndicatorMeta from '../../loss-indicator/metadata.json';
import statusGaugeMeta from '../../status-gauge-widget/metadata.json';
import powerPathMeta from '../../power-path-card/metadata.json';
import lineMeta from '../../line-chart/metadata.json';
import lollipopMeta from '../../lollipop/metadata.json';
import mapChartMeta from '../../map-chart/metadata.json';
import matrixMeta from '../../matrix-chart/metadata.json';
import networkGraphMeta from '../../network-graph/metadata.json';
import parallelCoordinatesMeta from '../../parallel-coordinates-chart/metadata.json';
import pieMeta from '../../pie-chart/metadata.json';
import polarAreaMeta from '../../polar-area-chart/metadata.json';
import punchcardMeta from '../../punchcard-chart/metadata.json';
import radarMeta from '../../radar-chart/metadata.json';
import radialBarMeta from '../../radial-bar-chart/metadata.json';
import sankeyMeta from '../../sankey-chart/metadata.json';
import flowSankeyMeta from '../../flow-sankey-chart/metadata.json';
import scatterPlotMeta from '../../scatter-plot-chart/metadata.json';
import scatterSparklineMeta from '../../scatter-sparkline-chart/metadata.json';
import sparkAreaMeta from '../../spark-area-chart/metadata.json';
import sparkLineMeta from '../../spark-line-chart/metadata.json';
import stepLineMeta from '../../step-line-chart/metadata.json';
import treemapMeta from '../../treemap-chart/metadata.json';
import violinMeta from '../../violin-chart/metadata.json';
import waterfallMeta from '../../waterfall-chart/metadata.json';
import partialDependenceMeta from '../../partial-dependence-chart/metadata.json';
import type { ChartMetadataLike, ChartTarget, ChartTargetAttrs } from './types.js';

/** FuseDash variant / legacy chartType → registry key (mirrors client chartTypeRegistry). */
export const CHART_TYPE_ALIASES: Readonly<Record<string, string>> = {
  barGroupedChart: 'barGrouped',
  barStackedChart: 'barStacked',
  cumulativeBarChart: 'cumulativeBar',
  barHorizontalChart: 'barHorizontal',
  barHorizontalGroupedChart: 'barHorizontalGrouped',
  barHorizontalStackedChart: 'barHorizontalStacked',
  lollipopGroupedChart: 'lollipopGroupedChart',
  lollipopStackedChart: 'lollipopStackedChart',
  lineGroupedChart: 'lineGroupedChart',
  areaStackedChart: 'areaStackedChart',
  qqPlot: 'qqPlot',
  radarChartGrouped: 'radarGroupedChart',
  /** Client charts mock / MCP spelling */
  rocPlotChart: 'rocCurveChart',
  UniversalMap: 'mapChart',
};

const METADATA: ChartMetadataLike[] = [
  areaChartMeta,
  areaGroupedBarMeta,
  bandUtilizationMeta,
  barChartMeta,
  biasVarianceTradeoffMeta,
  boxPlotMeta,
  bubbleMeta,
  donutMeta,
  giniImpurityEntropyMeta,
  histogramMeta,
  kpiMeta,
  lossIndicatorMeta,
  statusGaugeMeta,
  powerPathMeta,
  lineMeta,
  lollipopMeta,
  mapChartMeta,
  matrixMeta,
  networkGraphMeta,
  parallelCoordinatesMeta,
  pieMeta,
  polarAreaMeta,
  punchcardMeta,
  radarMeta,
  radialBarMeta,
  sankeyMeta,
  flowSankeyMeta,
  scatterPlotMeta,
  scatterSparklineMeta,
  sparkAreaMeta,
  sparkLineMeta,
  stepLineMeta,
  treemapMeta,
  violinMeta,
  waterfallMeta,
  partialDependenceMeta,
];

function toDomAttr(camelKey: string): string {
  return camelKey.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function attrsFromMap(raw?: Record<string, unknown>): ChartTargetAttrs | undefined {
  if (!raw) return undefined;
  const out: ChartTargetAttrs = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
      out[toDomAttr(key)] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function entriesFromMeta(meta: ChartMetadataLike): Record<string, ChartTarget> {
  const kind = meta.id as ChartKind;
  const out: Record<string, ChartTarget> = {};
  for (const chartType of meta.chartTypeKeys ?? []) {
    out[chartType] = {
      kind,
      tag: meta.tag,
      attrs: attrsFromMap(meta.chartTypeMap?.[chartType]),
    };
  }
  return out;
}

const REGISTRY: Record<string, ChartTarget> = METADATA.reduce(
  (acc, meta) => Object.assign(acc, entriesFromMeta(meta)),
  {} as Record<string, ChartTarget>,
);

/** KS / ROC overlays map to step-line `graf-type`. */
REGISTRY.ksPlotChart = {
  ...REGISTRY.ksPlotChart,
  attrs: { 'graf-type': 'curve' },
};
REGISTRY.rocCurveChart = {
  ...REGISTRY.rocCurveChart,
  attrs: { 'graf-type': 'line' },
};

export const SUPPORTED_CHART_TYPES = Object.freeze(Object.keys(REGISTRY).sort());

export function resolveRegistryKey(chartType: string | undefined | null): string | undefined {
  if (!chartType?.trim()) return undefined;
  const trimmed = chartType.trim();
  return CHART_TYPE_ALIASES[trimmed] ?? trimmed;
}

/** Resolve FuseDash chartType → lazy ChartKind + host tag + optional attrs. */
export function resolveChartTarget(chartType: string | undefined | null): ChartTarget | null {
  const key = resolveRegistryKey(chartType);
  if (!key) return null;
  return REGISTRY[key] ?? null;
}

const HOST_NOT_READY = new Set(
  METADATA.filter((meta) => meta.usageConditions?.hostReady === false).map((meta) => meta.id),
);

export function canRenderChartType(chartType: string | undefined | null): boolean {
  const target = resolveChartTarget(chartType);
  if (!target) return false;
  return !HOST_NOT_READY.has(target.kind);
}
