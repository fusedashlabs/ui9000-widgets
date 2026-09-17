import { COUNTRY_LABEL_ALIASES, COUNTRY_SYNONYMS, GEOJSON_KEYS, MAP_ADMIN_TYPES, type MapAdminType } from './constants.js';
import type { FeaturesIndex, GeoJsonFeature } from './types.js';

const CITY_NAME_VARIATIONS: Record<string, string> = {
  kyiv: 'kiev',
  peking: 'beijing',
  bombay: 'mumbai',
  calcutta: 'kolkata',
  madras: 'chennai',
  saigon: 'hochiminh',
};

export function inferMapTypeFromKeyNames(dataKeys: string[]): string | undefined {
  for (const key of dataKeys ?? []) {
    const name = String(key).toLowerCase();
    const found = MAP_ADMIN_TYPES.find((type) => name.includes(type));
    if (found) return found;
  }
  return undefined;
}

export function normalizeDataValue(dataValue: string, mapType: string): string {
  if (!dataValue) return '';

  let normalized = dataValue
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  normalized = normalized.replace(/\bst\.?\s+/g, 'saint ');
  if (mapType !== 'city') {
    normalized = normalized.replace(/['’´`.-]/g, ' ');
  }

  if (mapType === 'city') {
    normalized = normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[''`´]/g, '')
      .replace(/[-_]/g, '');
    for (const [from, to] of Object.entries(CITY_NAME_VARIATIONS)) {
      normalized = normalized.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
    }
  }

  if (mapType === 'country') return normalized;

  const parts = normalized.replace(/ /g, '').split(',');
  if (mapType === 'county') {
    return parts.map((item) => item.replace('county', '')).join(',');
  }
  return parts.join(',');
}

export function getRegionIdFromFeatureProperties(
  featureProperties: Record<string, unknown> | null | undefined,
  mapType?: string,
): string | undefined {
  if (!featureProperties || !mapType) return undefined;
  const keys = GEOJSON_KEYS[mapType as MapAdminType];
  if (!keys) return undefined;

  if (mapType === 'country') {
    const iso = featureProperties[keys.id];
    if (iso === '-99') return String(featureProperties.adm0_a3 ?? iso);
    return iso != null ? String(iso) : undefined;
  }

  const id = featureProperties[keys.id];
  return id != null && String(id) !== '' ? String(id) : undefined;
}

function getDataValueFromFeature(feature: GeoJsonFeature, mapType: string): string | undefined {
  const props = feature.properties;
  if (!props) return undefined;
  const keys = GEOJSON_KEYS[mapType as MapAdminType];
  if (!keys) return undefined;

  const getProp = (field: keyof typeof keys): string | undefined => {
    const value = props[keys[field]];
    return typeof value === 'string' && value ? value : undefined;
  };

  const buildComposite = (
    parts: Array<keyof typeof keys>,
    fallbackKey: keyof typeof keys,
  ): string | undefined => {
    const values = parts.map(getProp);
    return values.every((v) => v) ? values.join(',') : getProp(fallbackKey);
  };

  switch (mapType) {
    case 'city': {
      const country = getProp('country');
      const state = getProp('state');
      const name = getProp('name');
      if (country && state && name) return `${country},${state},${name}`;
      if (country && name) return `${country},${name}`;
      return name;
    }
    case 'county':
      return buildComposite(['country', 'state', 'county'], 'county');
    case 'state':
    case 'province':
      return buildComposite(['country', 'state'], 'state');
    case 'country':
    case 'region':
      return getProp('name');
    default:
      return undefined;
  }
}

function indexAlias(
  byDataValue: Map<string, string>,
  byNormalizedValue: Map<string, string>,
  alias: string,
  regionId: string,
  mapType: string,
): void {
  const lower = alias.toLowerCase();
  if (!byDataValue.has(lower)) byDataValue.set(lower, regionId);
  const normalized = normalizeDataValue(alias, mapType);
  if (!byNormalizedValue.has(normalized)) byNormalizedValue.set(normalized, regionId);
}

export function createFeaturesIndex(features: GeoJsonFeature[], mapType: string): FeaturesIndex {
  const byId = new Map<string, GeoJsonFeature>();
  const byDataValue = new Map<string, string>();
  const byNormalizedValue = new Map<string, string>();
  if (!features.length || !mapType) return { byId, byDataValue, byNormalizedValue };

  const ambiguousTwoPartKeys = new Set<string>();

  for (const feature of features) {
    const regionId = getRegionIdFromFeatureProperties(feature.properties, mapType);
    if (!regionId) continue;
    byId.set(regionId, feature);

    const dataValue = getDataValueFromFeature(feature, mapType);
    if (!dataValue) continue;

    const normalized = normalizeDataValue(dataValue, mapType);
    byDataValue.set(dataValue.toLowerCase(), regionId);
    byNormalizedValue.set(normalized, regionId);

    const props = feature.properties;
    if (!props) continue;

    if (mapType === 'city') {
      const country = props.COUNTRY;
      const state = props.NAME_1;
      const cityName = props.NAME_2;
      if (typeof country === 'string' && typeof cityName === 'string') {
        const twoPart = normalizeDataValue(`${country},${cityName}`, mapType);
        const existing = byNormalizedValue.get(twoPart);
        if (existing && existing !== regionId) ambiguousTwoPartKeys.add(twoPart);
        else byNormalizedValue.set(twoPart, regionId);
      }
      if (
        typeof country === 'string' &&
        typeof state === 'string' &&
        typeof cityName === 'string' &&
        state !== cityName
      ) {
        const stateFormat = normalizeDataValue(`${country},${state}`, mapType);
        if (!byNormalizedValue.has(stateFormat)) byNormalizedValue.set(stateFormat, regionId);
      }
    }

    if (mapType === 'county') {
      const country = props.COUNTRY;
      const countyName = props.NAME_2;
      if (typeof country === 'string' && typeof countyName === 'string') {
        for (const countryForm of [country, ...(COUNTRY_SYNONYMS[country] ?? [])]) {
          const twoPart = normalizeDataValue(`${countryForm},${countyName}`, mapType);
          const existing = byNormalizedValue.get(twoPart);
          if (existing && existing !== regionId) ambiguousTwoPartKeys.add(twoPart);
          else byNormalizedValue.set(twoPart, regionId);
        }
      }
    }

    if (mapType === 'region' || mapType === 'province') {
      const country = props.admin;
      const regionName = props.name;
      const unitNames = [regionName, props.name_en, ...String(props.aliases ?? '').split('|')].filter(
        (n): n is string => typeof n === 'string' && n.length > 0,
      );
      const countryForms =
        typeof country === 'string' ? [country, ...(COUNTRY_SYNONYMS[country] ?? [])] : [];
      for (const countryForm of countryForms) {
        for (const unitName of unitNames) {
          const composite = normalizeDataValue(`${countryForm},${unitName}`, mapType);
          if (!byNormalizedValue.has(composite)) byNormalizedValue.set(composite, regionId);
        }
      }
      for (const alias of [props.name_en, ...String(props.aliases ?? '').split('|')]) {
        if (typeof alias !== 'string' || !alias || alias === regionName) continue;
        indexAlias(byDataValue, byNormalizedValue, alias, regionId, mapType);
      }
    }

    if (mapType === 'state' || mapType === 'province') {
      const keys = GEOJSON_KEYS[mapType];
      const bareName = props[keys.state] ?? props[keys.name];
      if (typeof bareName === 'string' && bareName) {
        indexAlias(byDataValue, byNormalizedValue, bareName, regionId, mapType);
      }
    }

    if (mapType === 'country') {
      for (const code of [regionId, props.iso_a2, props.iso_a3, props.postal, props.wb_a2, props.wb_a3]) {
        if (typeof code === 'string' && code && code !== '-99') {
          indexAlias(byDataValue, byNormalizedValue, code, regionId, mapType);
        }
      }
      const aliases = [
        props.name_long,
        props.formal_en,
        props.brk_name,
        props.admin,
        props.geounit,
        ...String(props.aliases ?? '').split('|'),
      ];
      for (const seed of [dataValue, props.name, ...aliases]) {
        if (typeof seed !== 'string' || !seed) continue;
        aliases.push(...(COUNTRY_LABEL_ALIASES[seed] ?? []));
      }
      for (const alias of aliases) {
        if (typeof alias === 'string' && alias && alias !== dataValue) {
          indexAlias(byDataValue, byNormalizedValue, alias, regionId, mapType);
        }
      }
    }
  }

  for (const key of ambiguousTwoPartKeys) byNormalizedValue.delete(key);
  return { byId, byDataValue, byNormalizedValue };
}

export function getRegionId(dataValue: string, mapType: string, index: FeaturesIndex): string | undefined {
  if (!dataValue || !mapType) return undefined;
  const direct = index.byDataValue.get(dataValue.toLowerCase());
  if (direct) return direct;
  const normalized = index.byNormalizedValue.get(normalizeDataValue(dataValue, mapType));
  if (normalized) return normalized;

  if (
    (mapType === 'region' || mapType === 'province' || mapType === 'county') &&
    dataValue.includes(',')
  ) {
    const lastPart = dataValue.split(',').at(-1)?.trim();
    if (lastPart) {
      return (
        index.byDataValue.get(lastPart.toLowerCase()) ??
        index.byNormalizedValue.get(normalizeDataValue(lastPart, mapType))
      );
    }
  }
  return undefined;
}
