export {
  Ui9000SparkAreaChart,
  registerSparkAreaChart,
} from './element/ui9000-spark-area-chart.js';
export { renderSparkLineChart } from '../spark-line-chart/render/draw.js';
export {
  collectSparkXDomain,
  collectSparkYDomain,
  formatCompact,
  normalizeSparkLineData,
  orderSparkXDomain,
  parseXDate,
  selectTickIndices,
  type SparkLineChartData,
  type SparkLineHoverEntry,
  type SparkLinePoint,
  type SparkLineSeries,
} from '../spark-line-chart/lib/index.js';
export { default as sparkAreaChartMetadata } from './metadata.json';
