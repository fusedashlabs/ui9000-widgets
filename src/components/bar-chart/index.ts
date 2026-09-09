export { Ui9000BarChart, registerBarChart } from './element/ui9000-bar-chart.js';
export { renderBarChart } from './render/draw.js';
export {
  barPadFactor,
  collectBarCategories,
  collectBarValueDomain,
  cumulativeValues,
  formatCompact,
  groupedBarOffset,
  normalizeBarData,
  resolveBaseline,
  selectTickIndices,
  stackTotals,
  valueAt,
  barHorizontalMinSpan,
  type BarChartData,
  type BarHoverEntry,
  type BarLayout,
  type BarOrientation,
  type BarPoint,
  type BarSeries,
} from './lib/index.js';
export { default as barChartMetadata } from './metadata.json';
