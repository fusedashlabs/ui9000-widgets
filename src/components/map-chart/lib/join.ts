import { fdColors } from '../../../utils/fusedash-visual.js';
import { LAYER_ORDER, MAX_SPIKES, sanitizeKey, type MapVisualisation } from './constants.js';
import { colorForValue, featureCenter } from './domain.js';
import { hexToRgba, numericValue } from './format.js';
import { createFeaturesIndex, getRegionId } from './geo-index.js';
import type {
  ColorRange,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  MapLayerModel,
  MapRow,
} from './types.js';

function rawRegionValue(row: MapRow, layer: MapLayerModel): unknown {
  return row[layer.geoKey] ?? row[layer.mapType];
}

export function joinLayerFeatures(
  layer: MapLayerModel,
  collection: GeoJsonFeatureCollection | null | undefined,
): MapLayerModel {
  if (!collection?.features?.length) {
    return { ...layer, features: [], colorById: {}, matchTotal: 0, matchHit: 0 };
  }

  const index = createFeaturesIndex(collection.features, layer.mapType);
  let matchTotal = 0;
  let matchHit = 0;
  const features: GeoJsonFeature[] = [];
  const colorById: Record<string, string> = {};

  for (const row of layer.rows) {
    const raw = rawRegionValue(row, layer);
    if (Array.isArray(raw)) {
      const value = numericValue(row[layer.valueKey]);
      if (raw.length < 2) continue;
      features.push({
        type: 'Feature',
        properties: { ...row, value, regionId: null, regionName: null },
        geometry: { type: 'Point', coordinates: raw },
      });
      continue;
    }

    const dataValue = String(raw ?? '').toLowerCase();
    if (!dataValue) continue;
    matchTotal += 1;
    const regionId = getRegionId(dataValue, layer.mapType, index);
    if (!regionId) continue;
    matchHit += 1;

    const regionFeature = index.byId.get(regionId);
    if (!regionFeature) continue;
    const value = numericValue(row[layer.valueKey]);
    const regionName =
      (typeof row[layer.geoKey] === 'string' && row[layer.geoKey]
        ? String(row[layer.geoKey])
        : undefined) ??
      (typeof regionFeature.properties?.name === 'string'
        ? regionFeature.properties.name
        : regionId);

    if (layer.visualisationType === 'choropleth') {
      features.push({
        ...regionFeature,
        id: regionId,
        properties: {
          ...regionFeature.properties,
          id: regionId,
          regionId,
          value,
          regionName,
        },
      });
      colorById[regionId] = hexToRgba(colorForValue(value, layer.colorRanges), 1);
      continue;
    }

    const center = featureCenter(regionFeature);
    if (!center) continue;
    features.push({
      type: 'Feature',
      properties: { ...row, value, regionId, regionName },
      geometry: { type: 'Point', coordinates: [center.lng, center.lat] },
    });
  }

  const nextFeatures =
    layer.visualisationType === 'spike' ? spikeFeatures(features, layer, 'light') : features;

  return { ...layer, features: nextFeatures, colorById, matchTotal, matchHit };
}

export function joinModelLayers(
  layers: MapLayerModel[],
  geoJsonByType: Record<string, GeoJsonFeatureCollection | undefined>,
): MapLayerModel[] {
  return layers.map((layer) => joinLayerFeatures(layer, geoJsonByType[layer.mapType]));
}

export function orderedLayers(layers: MapLayerModel[]): MapLayerModel[] {
  return [...layers].sort(
    (a, b) =>
      (LAYER_ORDER[a.visualisationType] ?? 99) - (LAYER_ORDER[b.visualisationType] ?? 99),
  );
}

export function themeSpikeLayer(
  layer: MapLayerModel,
  mode: 'light' | 'dark',
): MapLayerModel {
  if (layer.visualisationType !== 'spike' || !layer.features.length) return layer;
  return { ...layer, features: spikeFeatures(layer.features, layer, mode) };
}

function spikeFeatures(
  features: GeoJsonFeature[],
  layer: MapLayerModel,
  mode: 'light' | 'dark',
): GeoJsonFeature[] {
  const points = features.filter((f) => f.geometry?.type === 'Point');
  if (!points.length) return [];
  const ranked = [...points].sort(
    (a, b) => numericValue(b.properties?.value) - numericValue(a.properties?.value),
  );
  const limited = ranked.slice(0, MAX_SPIKES);
  const values = limited.map((f) => numericValue(f.properties?.value) || 1);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const layerIdClean = sanitizeKey(layer.layerId);

  return limited.map((feature, index) => {
    const value = numericValue(feature.properties?.value);
    const size = spikeSize(value, layer.colorRanges, minValue, maxValue);
    const regionId = String(feature.properties?.regionId ?? '');
    const iconName = `spike-icon-${layerIdClean}_${index}${regionId ? `_${sanitizeKey(regionId)}` : ''}`;
    const color = layer.fillColor.replace('#', '');
    const spikeText =
      typeof feature.properties?.spikeText === 'string'
        ? feature.properties.spikeText
        : typeof feature.properties?.label === 'string'
          ? feature.properties.label
          : undefined;
    const svgContent = spikeSvg(size, color, spikeText, mode);
    return {
      ...feature,
      properties: {
        ...feature.properties,
        size,
        iconName,
        svgContent,
        layerId: layer.layerId,
      },
    };
  });
}

function spikeSize(
  value: number,
  ranges: ColorRange[],
  minValue: number,
  maxValue: number,
): number {
  if (ranges.length) {
    const range = ranges.find((r) => value >= r.start && value <= r.end);
    if (range?.height) return range.height;
    if (value < ranges[0].start && ranges[0].height) return ranges[0].height;
    const last = ranges[ranges.length - 1];
    if (value > last.end && last.height) return last.height;
  }
  if (maxValue === minValue) return 28;
  const ratio = (value - minValue) / (maxValue - minValue);
  const heights = [8, 12, 16, 22, 28, 34, 42, 54];
  return heights[Math.round(ratio * (heights.length - 1))] ?? 28;
}

function spikeSvg(
  size: number,
  color: string,
  text: string | undefined,
  mode: 'light' | 'dark',
): string {
  const hex = color.startsWith('#') ? color : `#${color}`;
  const fill = hexToRgba(hex, 1);
  const actualHeight = size;
  const fontSize = 20;
  const textHeight = fontSize + 8;
  const gap = 4;
  const totalHeight = text ? textHeight + gap + actualHeight : actualHeight;
  const spikeOffsetY = text ? textHeight + gap : 0;
  const spikeWidth = 30;
  const svgWidth = text ? Math.max(spikeWidth, text.length * 12 + 10) : spikeWidth;
  const spikeOffsetX = text ? (svgWidth - spikeWidth) / 2 : 0;
  const centerX = spikeWidth / 2;
  const left = centerX - 6;
  const right = centerX + 6;
  const top = 0.25;
  const bottom = actualHeight - 0.75;
  const ink = fdColors(mode);
  const textEl = text
    ? `<text x="${svgWidth / 2}" y="${fontSize + 4}" text-anchor="middle" fill="${ink.mapSpikeLabel}" font-size="${fontSize}" font-weight="bold" font-family="Arial, sans-serif" stroke="${ink.mapSpikeHalo}" stroke-width="1" paint-order="stroke">${escapeXml(text)}</text>`
    : '';

  return `<svg width="${svgWidth}" height="${totalHeight}" viewBox="0 0 ${svgWidth} ${totalHeight}" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(${spikeOffsetX}, ${spikeOffsetY})"><path d="M${right} ${bottom}L${centerX} ${top}L${left} ${bottom}Z" fill="${fill}"/><path d="M${centerX + 10} ${bottom}H${right + 2}L${centerX} ${top}L${left - 2} ${bottom}H${centerX - 10}" stroke="${fill}" fill="none" stroke-width="1"/></g>${textEl}</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isMapVisualisation(value: string | undefined): value is MapVisualisation {
  return value === 'choropleth' || value === 'bubbles' || value === 'spike' || value === 'markers';
}
