import {
  QUALITATIVE_2,
  resolveFormattingColor,
  SEQUENTIAL_1,
  type FuseFormattingEntry,
} from '../../../utils/fuse-palette.js';

import { generateColorRanges, rangesFromPaletteStops, valuesOfRows } from './domain.js';
import { inferMapTypeFromKeyNames } from './geo-index.js';
import { isFeatureCollection } from './geojson.js';
import { isMapVisualisation, joinLayerFeatures } from './join.js';
import { layerAverage } from './legend.js';
import type {
  GeoJsonFeatureCollection,
  MapChartInput,
  MapChatRow,
  MapLayerInput,
  MapLayerModel,
  MapModel,
  MapRow,
  MapWidgetInput,
} from './types.js';

const EMPTY: MapModel = { title: '', terrain: false, showLegend: true, layers: [] };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function rowsFromUnknown(value: unknown): MapRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is MapRow => !!row && typeof row === 'object' && !Array.isArray(row),
  );
}

function isChatRow(value: unknown): value is MapChatRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as MapChatRow;
  return typeof row.label === 'string' && typeof row.value === 'number';
}

export function normalizeMapData(
  input: MapChartInput,
  geoJson?: GeoJsonFeatureCollection | Record<string, GeoJsonFeatureCollection>,
): MapModel {
  if (input == null) return EMPTY;

  if (Array.isArray(input)) {
    if (!input.length) return EMPTY;
    if (isChatRow(input[0])) {
      return normalizeMapData(
        {
          name: '',
          chartType: 'mapChart',
          layers: [
            {
              name: 'Map',
              visualisationType: 'choropleth',
              geospatialData: ['label'],
              arrangeByMetric: ['value'],
              data: input.map((row) => ({
                label: (row as MapChatRow).label,
                value: (row as MapChatRow).value,
              })),
              mapType: (input[0] as MapChatRow).mapType ?? 'country',
            },
          ],
        },
        geoJson,
      );
    }
    return EMPTY;
  }

  const obj = asRecord(input);
  if (!obj) return EMPTY;

  if (Array.isArray(obj.points)) {
    const points = obj.points as Array<{ x?: string; y?: number }>;
    return normalizeMapData(
      points.map((p) => ({ label: String(p.x ?? ''), value: Number(p.y ?? 0) })),
      geoJson,
    );
  }

  if (Array.isArray(obj.regions)) {
    const regions = obj.regions as Array<{ name?: string; label?: string; value?: number }>;
    return normalizeMapData(
      regions.map((r) => ({
        label: String(r.name ?? r.label ?? ''),
        value: Number(r.value ?? 0),
      })),
      geoJson,
    );
  }

  const widget = obj as MapWidgetInput;
  const rawLayers = (widget.layers ?? []).filter((layer) => !layer.hideLayer);
  const fallbackRows = rowsFromUnknown(widget.data);
  const layersIn =
    rawLayers.length > 0
      ? rawLayers
      : fallbackRows.length
        ? [
            {
              name: widget.name ?? 'Map',
              visualisationType: widget.visualisationType ?? 'choropleth',
              geospatialData: inferKeys(fallbackRows),
              arrangeByMetric: inferValueKeys(fallbackRows),
              data: fallbackRows,
              mapType: widget.mapType,
              formatting: widget.formatting,
            } satisfies MapLayerInput,
          ]
        : [];

  if (!layersIn.length) return EMPTY;

  const inlineGeo = resolveGeoJson(widget.geoJson ?? geoJson);
  const layers = layersIn.map((layer, index) =>
    buildLayer(layer, index, widget, inlineGeo[layer.mapType ?? ''] ?? widget.geoJson ?? undefined),
  );

  return {
    title: typeof widget.name === 'string' ? widget.name : '',
    terrain: Boolean(widget.terrain),
    showLegend: widget.legend !== false,
    layers,
  };
}

function inferKeys(rows: MapRow[]): string[] {
  const first = rows[0];
  if (!first) return ['label'];
  const geo = Object.keys(first).find((k) => inferMapTypeFromKeyNames([k]));
  if (geo) return [geo];
  if ('label' in first) return ['label'];
  return [Object.keys(first)[0] ?? 'label'];
}

function inferValueKeys(rows: MapRow[]): string[] {
  const first = rows[0];
  if (!first) return ['value'];
  if ('value' in first) return ['value'];
  const numeric = Object.keys(first).find((k) => typeof first[k] === 'number');
  return [numeric ?? 'value'];
}

function resolveGeoJson(
  geoJson: GeoJsonFeatureCollection | Record<string, GeoJsonFeatureCollection> | null | undefined,
): Record<string, GeoJsonFeatureCollection> {
  if (!geoJson) return {};
  if (isFeatureCollection(geoJson)) {
    return { country: geoJson, '': geoJson };
  }
  return geoJson as Record<string, GeoJsonFeatureCollection>;
}

function buildLayer(
  layer: MapLayerInput,
  index: number,
  widget: MapWidgetInput,
  geoJson?: GeoJsonFeatureCollection,
): MapLayerModel {
  const rows = rowsFromUnknown(layer.data);
  const visualisationType = isMapVisualisation(layer.visualisationType)
    ? layer.visualisationType
    : 'choropleth';
  const geoKey = layer.geospatialData?.[0] ?? inferKeys(rows)[0] ?? 'label';
  const valueKey = layer.arrangeByMetric?.[0] ?? inferValueKeys(rows)[0] ?? 'value';
  const mapType =
    layer.mapType ||
    inferMapTypeFromKeyNames(layer.geospatialData ?? []) ||
    inferMapTypeFromKeyNames([geoKey]) ||
    'country';
  const values = valuesOfRows(rows, valueKey);
  const formatting: FuseFormattingEntry[] = layer.formatting?.length
    ? layer.formatting
    : (widget.formatting ?? []);
  const isQualitative =
    visualisationType === 'bubbles' ||
    visualisationType === 'spike' ||
    visualisationType === 'markers';
  const customHex = layer.palette?.customColors?.find((c) => c.hex)?.hex;
  const fillColor =
    customHex ??
    (isQualitative ? resolveFormattingColor(formatting, 'default', formatting.length || 1) : SEQUENTIAL_1[3]);
  const paletteColors = isQualitative
    ? [fillColor, ...QUALITATIVE_2.filter((c) => c !== fillColor)]
    : [...SEQUENTIAL_1];
  const paletteRange = layer.palette?.range;
  const colorRanges =
    paletteRange && paletteRange.length > 1
      ? rangesFromPaletteStops(paletteRange, paletteColors)
      : generateColorRanges(values, paletteColors);

  const years = collectYears(rows, layer.timePeriod);
  const layerId = String(layer.layerId || layer.query || layer.name || `layer-${index}`);

  const model: MapLayerModel = {
    layerId,
    layerName: layer.name || 'Map',
    visualisationType,
    mapType,
    geoKey,
    valueKey,
    yearKey: layer.timePeriod?.field || 'year',
    rows,
    values,
    colorRanges,
    fillColor,
    average: layerAverage(values),
    years: years.years,
    selectedYear: years.year,
    features: [],
    colorById: {},
    matchTotal: 0,
    matchHit: 0,
  };

  const layerGeo = layer.geoJson ?? geoJson;
  return layerGeo ? joinLayerFeatures(model, layerGeo) : model;
}

function collectYears(
  rows: MapRow[],
  timePeriod: MapLayerInput['timePeriod'],
): { year?: string; years: string[] } {
  if (timePeriod?.values?.length) {
    return { year: timePeriod.values[0], years: [...timePeriod.values] };
  }
  const field = timePeriod?.field || 'year';
  const years: string[] = [];
  for (const row of rows) {
    const value = row[field];
    if (value == null || value === '') continue;
    const text = String(value);
    if (!years.includes(text)) years.push(text);
  }
  years.sort();
  return { year: years[0], years };
}
