import { generateBreakPoints, SEQUENTIAL_1 } from '../../../utils/fuse-palette.js';

import {
  DEFAULT_BUBBLES_RADIUS,
  DEFAULT_SPIKE_SIZES,
  FALLBACK_FILL,
  MAX_COLOR_RANGE,
  SPIKE_HEIGHTS,
} from './constants.js';
import { numericValue } from './format.js';
import type { ColorRange, GeoJsonFeature, MapRow } from './types.js';

export function valuesOfRows(rows: MapRow[], valueKey: string): number[] {
  const values: number[] = [];
  for (const row of rows) {
    values.push(numericValue(row[valueKey]));
  }
  return values;
}

export function generateColorRanges(
  values: number[],
  colors: string[] = [...SEQUENTIAL_1],
): ColorRange[] {
  if (!colors.length || !values.length) return [];
  const sortedValues = [...new Set(values)].sort((a, b) => a - b);
  const steps = generateBreakPoints(sortedValues, MAX_COLOR_RANGE);
  if (!steps.length) return [];

  return steps.map((start, index) => {
    const end = index === steps.length - 1 ? start * 3 : (steps[index + 1] ?? start);
    return {
      start: Number(start),
      end: Number(end),
      color: colors[index] ?? colors[colors.length - 1] ?? SEQUENTIAL_1[0],
      radius: DEFAULT_BUBBLES_RADIUS[index] ?? 0,
      height: SPIKE_HEIGHTS[index] ?? DEFAULT_SPIKE_SIZES[index] ?? 0,
    };
  });
}

export function rangesFromPaletteStops(stops: number[], colors: string[]): ColorRange[] {
  if (stops.length < 2 || !colors.length) return [];
  const sorted = [...stops].sort((a, b) => a - b);
  return sorted.slice(0, -1).map((start, idx) => ({
    start,
    end: sorted[idx + 1] ?? start,
    color: colors[idx % colors.length],
    radius: DEFAULT_BUBBLES_RADIUS[idx] ?? 0,
    height: DEFAULT_SPIKE_SIZES[idx] ?? 0,
  }));
}

export function colorForValue(value: number, ranges: ColorRange[]): string {
  if (!ranges.length) return FALLBACK_FILL;
  if (value < 0) return FALLBACK_FILL;
  if (value === 0) return ranges[0].color;
  const last = ranges[ranges.length - 1];
  if (value > last.end) return last.color;
  const hit = ranges.find((range) => value >= range.start && value <= range.end);
  return hit?.color ?? ranges[0].color;
}

export function featureBBox(feature: GeoJsonFeature): [number, number, number, number] | null {
  const coords: number[][] = [];
  const walk = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      coords.push(value as number[]);
      return;
    }
    for (const item of value) walk(item);
  };
  walk(feature.geometry?.coordinates);
  if (!coords.length) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  if (!Number.isFinite(minLng)) return null;
  return [minLng, minLat, maxLng, maxLat];
}

export function featureCenter(feature: GeoJsonFeature): { lng: number; lat: number } | null {
  const box = featureBBox(feature);
  if (!box) return null;
  return { lng: (box[0] + box[2]) / 2, lat: (box[1] + box[3]) / 2 };
}

export function collectionBBox(
  features: GeoJsonFeature[],
): [number, number, number, number] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let any = false;
  for (const feature of features) {
    const box = featureBBox(feature);
    if (!box) continue;
    any = true;
    minLng = Math.min(minLng, box[0]);
    minLat = Math.min(minLat, box[1]);
    maxLng = Math.max(maxLng, box[2]);
    maxLat = Math.max(maxLat, box[3]);
  }
  return any ? [minLng, minLat, maxLng, maxLat] : null;
}
