import { describe, expect, it } from 'vitest';

import { joinLayerFeatures } from '../lib/join.js';
import { normalizeMapData } from '../lib/normalize.js';
import {
  choroplethPmtilesSource,
  featuresHavePolygonGeometry,
  PMTILES_CONFIG,
  PMTILES_VERSION,
  rebindGetId,
  resolvePmtilesUrl,
  toPmtilesFillLayer,
} from '../lib/pmtiles.js';
import type { GeoJsonFeatureCollection } from '../lib/types.js';

import mapFixture from '../../../stories/fixtures/map.fusedash.json';

const CENTROIDS: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'France', iso_a3: 'FRA' },
      geometry: { type: 'Point', coordinates: [2.3, 46.2] },
    },
  ],
};

describe('pmtiles choropleth path', () => {
  it('resolves country archives to an absolute worker URL', () => {
    expect(resolvePmtilesUrl('country', '/pmtiles', 'http://localhost:6006')).toBe(
      `http://localhost:6006/pmtiles/world-countries.pmtiles?v=${PMTILES_VERSION}`,
    );
    expect(PMTILES_CONFIG.country.sourceLayer).toBe('world-countries');
    expect(PMTILES_CONFIG.country.idProp).toBe('iso_a3');
  });

  it('does not resolve a root-relative URL without an origin', () => {
    expect(resolvePmtilesUrl('country', '/pmtiles', '')).toBeNull();
  });

  it('rebinds fill-color ["get","id"] onto the tile iso_a3 expression', () => {
    const idExpr = PMTILES_CONFIG.country.idExpr ?? ['get', 'iso_a3'];
    const rebound = rebindGetId(['match', ['get', 'id'], 'FRA', 'rgba(1,2,3,1)', 'rgba(0,0,0,0.15)'], idExpr);
    expect(rebound).toEqual(['match', idExpr, 'FRA', 'rgba(1,2,3,1)', 'rgba(0,0,0,0.15)']);
  });

  it('attaches source-layer and filters to in-range region ids', () => {
    const layer = toPmtilesFillLayer(
      {
        id: 'country-fill-layer',
        type: 'fill',
        source: 'country',
        paint: { 'fill-color': ['match', ['get', 'id'], 'FRA', '#473DD9', '#ccc'] },
      },
      PMTILES_CONFIG.country,
      ['FRA', 'DEU'],
    );
    expect(layer['source-layer']).toBe('world-countries');
    expect(layer.filter).toEqual([
      'in',
      PMTILES_CONFIG.country.idExpr,
      ['literal', ['FRA', 'DEU']],
    ]);
  });

  it('joins centroid GeoJSON for colorById but will not fill those points', () => {
    const model = normalizeMapData(mapFixture);
    const joined = joinLayerFeatures(model.layers[0], CENTROIDS);
    expect(joined.colorById.FRA).toMatch(/^rgba\(/);
    expect(joined.features[0]?.geometry?.type).toBe('Point');
    expect(featuresHavePolygonGeometry(joined.features)).toBe(false);
    expect(choroplethPmtilesSource('country', joined.features, '/pmtiles', 'http://localhost:6006')).toEqual(
      {
        config: PMTILES_CONFIG.country,
        url: `http://localhost:6006/pmtiles/world-countries.pmtiles?v=${PMTILES_VERSION}`,
      },
    );
  });

  it('keeps inline polygons on the GeoJSON fill path', () => {
    const polygons = [
      {
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
          ],
        },
      },
    ];
    expect(featuresHavePolygonGeometry(polygons)).toBe(true);
    expect(choroplethPmtilesSource('country', polygons, '/pmtiles', 'http://localhost:6006')).toBeNull();
  });
});
