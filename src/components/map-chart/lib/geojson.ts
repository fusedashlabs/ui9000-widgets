import type { GeoJsonFeatureCollection } from './types.js';

const cache = new Map<string, Promise<GeoJsonFeatureCollection | null>>();

export function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { type?: string; features?: unknown };
  return obj.type === 'FeatureCollection' && Array.isArray(obj.features);
}

export async function fetchMapGeoJson(
  mapType: string,
  baseUrl?: string,
): Promise<GeoJsonFeatureCollection | null> {
  const trimmed = baseUrl?.trim();
  if (!trimmed || !mapType) return null;
  const url = `${trimmed.replace(/\/$/, '')}/${geoJsonFileName(mapType)}`;
  const hit = cache.get(url);
  if (hit) return hit;

  const pending = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const json: unknown = await res.json();
      return isFeatureCollection(json) ? json : null;
    } catch {
      return null;
    }
  })();
  cache.set(url, pending);
  const result = await pending;
  if (!result) cache.delete(url);
  return result;
}

export function geoJsonFileName(mapType: string): string {
  switch (mapType) {
    case 'city':
      return 'city.json';
    case 'county':
      return 'county.json';
    case 'state':
      return 'state.json';
    case 'province':
    case 'region':
      return 'province.json';
    case 'country':
    default:
      return 'country.json';
  }
}
