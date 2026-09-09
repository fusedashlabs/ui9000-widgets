export {
  Ui9000AreaGroupedBarChart,
  registerAreaGroupedBarChart,
} from './element/ui9000-area-grouped-bar-chart.js';
export { renderAreaGroupedBarChart } from './render/draw.js';
export type {
  AreaGroupedBarHoverPayload,
  RenderAreaGroupedBarChartOptions,
} from './render/draw.js';
export {
  normalizeAreaGroupedBarData,
  areaGroupedBarYDomain,
  formatAgbAxisTick,
  formatAgbValue,
  type AreaGroupedBarChartInput,
  type AreaGroupedBarGroup,
  type AreaGroupedBarLinePoint,
  type AreaGroupedBarModel,
} from './lib/index.js';
export { default as areaGroupedBarChartMetadata } from './metadata.json';
