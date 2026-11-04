export {
  type MatrixCell,
  type MatrixCellsPayload,
  type MatrixInput,
  type MatrixModel,
} from './types.js';
export { normalizeMatrixData } from './normalize.js';
export { hasNaturalOrder, sortAxisDomain } from './domain.js';
export { formatCategoryLabel, formatMatrixValue } from './format.js';
export {
  fitTotals,
  getHeaderHeight,
  getHeatmapCells,
  getReadableTextColor,
  getRowPitch,
  heatmapCellKey,
  orderByTotals,
  wrapLabel,
  type FittedTotals,
  type HeatmapCells,
  type MeasureText,
} from './heatmap-layout.js';
export {
  heatmapTokens,
  type HeatmapTokens,
} from './heatmap-tokens.js';
