export {
  COUNTRY_SYNONYMS,
  DEFAULT_BUBBLES_RADIUS,
  DEFAULT_SPIKE_SIZES,
  GEOJSON_KEYS,
  LAYER_ORDER,
  MAP_ADMIN_TYPES,
  MAP_STYLES,
  MAPBOX_CSS_HREF,
  MAX_COLOR_RANGE,
  sanitizeId,
  sanitizeKey,
} from './constants.js';
export {
  collectionBBox,
  colorForValue,
  featureBBox,
  featureCenter,
  generateColorRanges,
  rangesFromPaletteStops,
  valuesOfRows,
} from './domain.js';
export { darkenColor, formatMapValue, formatRangeLabel, hexToRgba, numericValue } from './format.js';
export {
  createFeaturesIndex,
  getRegionId,
  getRegionIdFromFeatureProperties,
  inferMapTypeFromKeyNames,
  normalizeDataValue,
} from './geo-index.js';
export { fetchMapGeoJson, geoJsonFileName, isFeatureCollection } from './geojson.js';
export { isMapVisualisation, joinLayerFeatures, joinModelLayers, orderedLayers } from './join.js';
export {
  clampLayerSlider,
  defaultLayerSlider,
  featuresForYear,
  featuresInSliderRange,
  formatAverage,
  formatFieldLabel,
  formatLegendBucket,
  legendLayerOrder,
  layerAverage,
  legendSpikeHeight,
  MUTED_LEGEND_FILL,
  rangeTrackOffset,
  slideThumb,
  sliderIndexFromPointer,
  sliderValueWindow,
  thumbTrackPercent,
} from './legend.js';
export type { LayerSlider } from './legend.js';
export { normalizeMapData } from './normalize.js';
export {
  choroplethPmtilesSource,
  featuresHavePolygonGeometry,
  getPmtilesConfig,
  PMTILES_CONFIG,
  resolvePmtilesUrl,
} from './pmtiles.js';
export type { PmtilesLayerConfig } from './pmtiles.js';
export type {
  ColorRange,
  FeaturesIndex,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  MapChartInput,
  MapHoverEntry,
  MapLayerModel,
  MapModel,
  MapRow,
  MapVisualisation,
} from './types.js';
