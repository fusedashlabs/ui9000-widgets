export {
  Ui9000MatrixChart,
  registerMatrixChart,
} from './element/ui9000-matrix-chart.js';
export {
  matrixColorRanges,
  matrixLayout,
  renderMatrixChart,
} from './render/index.js';
export {
  normalizeMatrixData,
  sortAxisDomain,
  formatCategoryLabel,
  formatMatrixValue,
  type MatrixCell,
  type MatrixCellsPayload,
  type MatrixInput,
  type MatrixModel,
} from './lib/index.js';
export { default as matrixChartMetadata } from './metadata.json';
