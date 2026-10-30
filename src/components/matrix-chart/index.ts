export {
  Ui9000MatrixChart,
  registerMatrixChart,
} from './element/ui9000-matrix-chart.js';
export {
  heatmapGridLayout,
  matrixColorRanges,
  matrixView,
  renderHeatmapGrid,
  renderMatrixChart,
  type HeatmapCellInfo,
  type HeatmapColumnInfo,
  type HeatmapGridLayout,
  type HeatmapGridOptions,
  type HeatmapRowInfo,
  type MatrixView,
} from './render/index.js';
export {
  normalizeMatrixData,
  sortAxisDomain,
  hasNaturalOrder,
  heatmapCellKey,
  heatmapTokens,
  HEATMAP_DARK_TOKENS,
  HEATMAP_LIGHT_TOKENS,
  type HeatmapTokens,
  formatCategoryLabel,
  formatMatrixValue,
  type MatrixCell,
  type MatrixCellsPayload,
  type MatrixInput,
  type MatrixModel,
} from './lib/index.js';
export { default as matrixChartMetadata } from './metadata.json';
