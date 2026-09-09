export { Ui9000MapChart, registerMapChart } from './element/ui9000-map-chart.js';
export {
  renderMapChart,
  resizeMapChart,
  stopMapChart,
  type MapChartController,
  type RenderMapChartOptions,
} from './render/index.js';
export {
  GEOJSON_KEYS,
  createFeaturesIndex,
  fetchMapGeoJson,
  formatMapValue,
  generateColorRanges,
  getRegionId,
  inferMapTypeFromKeyNames,
  joinLayerFeatures,
  normalizeMapData,
  type MapChartInput,
  type MapHoverEntry,
  type MapLayerModel,
  type MapModel,
} from './lib/index.js';
export { default as mapChartMetadata } from './metadata.json';
