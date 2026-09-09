export {
  type ParallelCoordinatesFusePayload,
  type ParallelCoordinatesInput,
  type ParallelCoordinatesModel,
  type ParallelCoordinatesOrientation,
  type ParallelCoordinatesRow,
  type ParallelCoordinatesRowsPayload,
} from './types.js';
export {
  MAX_PARALLEL_LINES,
  normalizeParallelCoordinatesData,
  resolveParallelFormatting,
} from './normalize.js';
export { axisExtent, axisExtents, tickCountForSpan } from './domain.js';
export { AXIS_TITLE_MAX, formatAxisTick, formatTooltipValue } from './format.js';
