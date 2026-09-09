import type { FuseFormattingEntry } from '../../../utils/fuse-palette.js';

import type { MapAdminType, MapVisualisation } from './constants.js';

export type MapRow = Record<string, unknown>;

export type ColorRange = {
  start: number;
  end: number;
  color: string;
  radius: number;
  height: number;
};

export type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

export type GeoJsonFeature = {
  type: 'Feature';
  id?: string | number;
  properties: Record<string, unknown> | null;
  geometry: GeoJsonGeometry | null;
};

export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
};

export type MapLayerInput = {
  layerId?: string;
  name?: string;
  query?: string;
  visualisationType?: string;
  geospatialData?: string[];
  arrangeByMetric?: string[];
  timePeriod?: { field?: string; values?: string[] } | null;
  data?: MapRow[];
  formatting?: FuseFormattingEntry[] | null;
  palette?: {
    paletteId?: string;
    range?: number[];
    customColors?: Array<{ key?: string; hex?: string }>;
  } | null;
  hideLayer?: boolean;
  geoJson?: GeoJsonFeatureCollection | null;
  mapType?: string;
};

export type MapWidgetInput = {
  name?: string;
  chartType?: string;
  legend?: boolean;
  terrain?: boolean;
  tooltip?: boolean;
  timeline?: boolean;
  paletteId?: string;
  formatting?: FuseFormattingEntry[] | null;
  layers?: MapLayerInput[];
  data?: MapRow[] | unknown;
  geoJson?: GeoJsonFeatureCollection | null;
  mapType?: string;
  visualisationType?: string;
  regions?: Array<{ name?: string; label?: string; value?: number }>;
};

export type MapChatRow = { label: string; value: number; mapType?: string };

export type MapChartInput =
  | MapWidgetInput
  | MapChatRow[]
  | { points?: Array<{ x: string; y: number }> }
  | null
  | undefined;

export type MapLayerModel = {
  layerId: string;
  layerName: string;
  visualisationType: MapVisualisation;
  mapType: string;
  geoKey: string;
  valueKey: string;
  yearKey: string;
  rows: MapRow[];
  values: number[];
  colorRanges: ColorRange[];
  fillColor: string;
  average: number;
  years: string[];
  selectedYear?: string;
  features: GeoJsonFeature[];
  colorById: Record<string, string>;
  matchTotal: number;
  matchHit: number;
};

export type MapModel = {
  title: string;
  terrain: boolean;
  showLegend: boolean;
  layers: MapLayerModel[];
};

export type MapHoverEntry = {
  regionId: string;
  regionName: string;
  value: number;
  valueKey: string;
  layerName: string;
  lngLat: { lng: number; lat: number };
  point?: { x: number; y: number };
};

export type FeaturesIndex = {
  byId: Map<string, GeoJsonFeature>;
  byDataValue: Map<string, string>;
  byNormalizedValue: Map<string, string>;
};

export type { MapAdminType, MapVisualisation };
