/**
 * PMTiles choropleth boundaries — lockstep with client MapBox/Config/pmtiles.ts.
 *
 * country.json (and the other admin GeoJSONs) are centroid Points used for the
 * data-join / bubbles / spikes. Polygon fills come from `{base}/{file}` vector
 * tiles via mapbox-gl native `provider: "pmtiles"` (3.21+).
 */

export type PmtilesLayerConfig = {
  file: string;
  sourceLayer: string;
  idProp: string;
  idExpr?: unknown[];
};

export const PMTILES_VERSION = '3';

export const PMTILES_CONFIG: Record<string, PmtilesLayerConfig> = {
  country: {
    file: 'world-countries.pmtiles',
    sourceLayer: 'world-countries',
    idProp: 'iso_a3',
    idExpr: ['case', ['==', ['get', 'iso_a3'], '-99'], ['get', 'adm0_a3'], ['get', 'iso_a3']],
  },
  county: {
    file: 'us-counties.pmtiles',
    sourceLayer: 'us-counties',
    idProp: 'GID_2',
  },
  state: {
    file: 'us-states.pmtiles',
    sourceLayer: 'us-states',
    idProp: 'GID_1',
  },
  city: {
    file: 'world-cities.pmtiles',
    sourceLayer: 'world-cities',
    idProp: 'GID_2',
  },
  province: {
    file: 'world-provinces.pmtiles',
    sourceLayer: 'world-provinces',
    idProp: 'iso_3166_2',
  },
  region: {
    file: 'world-provinces.pmtiles',
    sourceLayer: 'world-provinces',
    idProp: 'iso_3166_2',
  },
};

export function getPmtilesConfig(mapType: string): PmtilesLayerConfig | undefined {
  return PMTILES_CONFIG[mapType];
}

export function pmtilesIdExpression(config: PmtilesLayerConfig): unknown[] {
  return config.idExpr ?? ['get', config.idProp];
}

/** True when joined features can paint as a Mapbox fill layer. */
export function featuresHavePolygonGeometry(
  features: Array<{ geometry?: { type?: string } | null }>,
): boolean {
  return features.some(
    (feature) => feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon',
  );
}

/**
 * Resolve `{base}/{file}?v=` to an absolute URL. The pmtiles provider runs in a
 * worker, so a root-relative path would not resolve against the page origin.
 */
export function resolvePmtilesUrl(
  mapType: string,
  baseUrl?: string,
  origin?: string,
): string | null {
  const config = PMTILES_CONFIG[mapType];
  if (!config) return null;
  const base = (baseUrl?.trim() || '/pmtiles').replace(/\/$/, '');
  const pageOrigin =
    origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const absoluteBase = base.startsWith('/') && pageOrigin ? `${pageOrigin}${base}` : base;
  if (!absoluteBase || absoluteBase.startsWith('/')) return null;
  return `${absoluteBase}/${config.file}?v=${PMTILES_VERSION}`;
}

export function choroplethPmtilesSource(
  mapType: string,
  features: Array<{ geometry?: { type?: string } | null }>,
  baseUrl?: string,
  origin?: string,
): { config: PmtilesLayerConfig; url: string } | null {
  if (featuresHavePolygonGeometry(features)) return null;
  const config = getPmtilesConfig(mapType);
  if (!config) return null;
  const url = resolvePmtilesUrl(mapType, baseUrl, origin);
  if (!url) return null;
  return { config, url };
}

const isGetId = (value: unknown): boolean =>
  Array.isArray(value) && value.length === 2 && value[0] === 'get' && value[1] === 'id';

/** Replace every `["get", "id"]` with the tile join expression. */
export function rebindGetId(expr: unknown, idExpr: unknown[]): unknown {
  if (isGetId(expr)) return idExpr;
  if (Array.isArray(expr)) return expr.map((part) => rebindGetId(part, idExpr));
  if (expr && typeof expr === 'object') {
    return Object.fromEntries(
      Object.entries(expr as Record<string, unknown>).map(([key, value]) => [
        key,
        rebindGetId(value, idExpr),
      ]),
    );
  }
  return expr;
}

export function toPmtilesFillLayer(
  fillLayer: Record<string, unknown>,
  config: PmtilesLayerConfig,
  inRangeIds: string[],
): Record<string, unknown> {
  const paint = (fillLayer.paint ?? {}) as Record<string, unknown>;
  const idExpr = pmtilesIdExpression(config);
  return {
    ...fillLayer,
    'source-layer': config.sourceLayer,
    filter:
      inRangeIds.length > 0
        ? ['in', idExpr, ['literal', inRangeIds]]
        : ['==', 1, 0],
    paint: {
      ...paint,
      'fill-color': rebindGetId(paint['fill-color'], idExpr),
    },
  };
}

export function toPmtilesStrokeLayer(
  strokeLayer: Record<string, unknown>,
  config: PmtilesLayerConfig,
): Record<string, unknown> {
  return {
    ...strokeLayer,
    'source-layer': config.sourceLayer,
    paint: rebindGetId(strokeLayer.paint ?? {}, pmtilesIdExpression(config)),
  };
}
