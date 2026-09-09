export {
  Ui9000ParallelCoordinatesChart,
  registerParallelCoordinatesChart,
} from './element/ui9000-parallel-coordinates-chart.js';
export {
  renderParallelCoordinatesChart,
  type ParallelCoordinatesHover,
  type RenderParallelCoordinatesOptions,
} from './render/index.js';
export {
  AXIS_TITLE_MAX,
  MAX_PARALLEL_LINES,
  axisExtent,
  axisExtents,
  formatAxisTick,
  formatTooltipValue,
  normalizeParallelCoordinatesData,
  resolveParallelFormatting,
  tickCountForSpan,
  type ParallelCoordinatesFusePayload,
  type ParallelCoordinatesInput,
  type ParallelCoordinatesModel,
  type ParallelCoordinatesOrientation,
  type ParallelCoordinatesRow,
  type ParallelCoordinatesRowsPayload,
} from './lib/index.js';
export { default as parallelCoordinatesChartMetadata } from './metadata.json';
