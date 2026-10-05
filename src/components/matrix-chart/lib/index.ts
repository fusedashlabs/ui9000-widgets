export {
  type MatrixCell,
  type MatrixCellsPayload,
  type MatrixInput,
  type MatrixModel,
} from './types.js';
export { normalizeMatrixData } from './normalize.js';
export { sortAxisDomain } from './domain.js';
export { formatCategoryLabel, formatMatrixValue } from './format.js';
export {
  MATRIX_Y_LABEL_MIN_GUTTER,
  matrixYLabelGutter,
  matrixYLabelMaxChars,
} from './y-labels.js';
