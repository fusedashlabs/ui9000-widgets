import { describe, expect, it } from 'vitest';

import { GEOJSON_KEYS } from '../lib/constants.js';
import { createFeaturesIndex, getRegionId, inferMapTypeFromKeyNames } from '../lib/geo-index.js';
import { joinLayerFeatures } from '../lib/join.js';
import { normalizeMapData } from '../lib/normalize.js';
import type { GeoJsonFeatureCollection } from '../lib/types.js';

import mapFixture from '../../../stories/fixtures/map.fusedash.json';

const COUNTRIES: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'France',
        iso_a3: 'FRA',
        iso_a2: 'FR',
        name_long: 'French Republic',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'United States',
        iso_a3: 'USA',
        name_long: 'United States of America',
        admin: 'United States of America',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-10, 0],
            [-8, 0],
            [-8, 2],
            [-10, 2],
            [-10, 0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Romania',
        iso_a3: 'ROU',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [4, 0],
            [6, 0],
            [6, 2],
            [4, 2],
            [4, 0],
          ],
        ],
      },
    },
  ],
};

describe('normalizeMapData', () => {
  it('map.fusedash.json → one country choropleth layer with Temperature values', () => {
    const model = normalizeMapData(mapFixture as never);
    expect(model.title).toBe('Average Temperature by Country');
    expect(model.layers).toHaveLength(1);
    const layer = model.layers[0];
    expect(layer.visualisationType).toBe('choropleth');
    expect(layer.mapType).toBe('country');
    expect(layer.geoKey).toBe('Country__created');
    expect(layer.valueKey).toBe('Temperature');
    expect(layer.rows.length).toBeGreaterThan(50);
    expect(layer.colorRanges.length).toBeGreaterThan(1);
    expect(layer.colorRanges[0].color).toMatch(/^#/);
  });

  it('joins the FuseDash mock onto country polygons via name aliases', () => {
    const model = normalizeMapData(mapFixture as never, COUNTRIES);
    const layer = model.layers[0];
    expect(layer.matchHit).toBeGreaterThan(0);
    expect(layer.features.some((f) => f.properties?.id === 'FRA')).toBe(true);
    expect(layer.features.some((f) => f.properties?.id === 'ROU')).toBe(true);
    expect(layer.colorById.FRA).toMatch(/^rgba\(/);
  });

  it('keeps each visualisation type and stacked layers', () => {
    const base = mapFixture.layers[0];
    const model = normalizeMapData({
      ...mapFixture,
      layers: [
        { ...base, layerId: 'choropleth', visualisationType: 'choropleth' },
        { ...base, layerId: 'bubbles', visualisationType: 'bubbles', name: 'Bubbles' },
        { ...base, layerId: 'spike', visualisationType: 'spike', name: 'Spikes' },
        { ...base, layerId: 'markers', visualisationType: 'markers', name: 'Markers' },
      ],
    } as never);
    expect(model.layers.map((l) => l.visualisationType)).toEqual([
      'choropleth',
      'bubbles',
      'spike',
      'markers',
    ]);
  });

  it('accepts chat {label,value} rows as a country choropleth', () => {
    const model = normalizeMapData(
      [
        { label: 'France', value: 10 },
        { label: 'Romania', value: 4 },
      ],
      COUNTRIES,
    );
    expect(model.layers[0].mapType).toBe('country');
    expect(model.layers[0].features).toHaveLength(2);
  });

  it('returns empty for invalid payload', () => {
    expect(normalizeMapData(null).layers).toEqual([]);
    expect(normalizeMapData([]).layers).toEqual([]);
    expect(normalizeMapData({ nope: true } as never).layers).toEqual([]);
  });
});

describe('geo join', () => {
  it('infers country from geospatial key names', () => {
    expect(inferMapTypeFromKeyNames(['Country__created'])).toBe('country');
    expect(inferMapTypeFromKeyNames(['County'])).toBe('county');
  });

  it('indexes iso_a2, iso_a3, and long-form country aliases', () => {
    const index = createFeaturesIndex(COUNTRIES.features, 'country');
    expect(getRegionId('france', 'country', index)).toBe('FRA');
    expect(getRegionId('FR', 'country', index)).toBe('FRA');
    expect(getRegionId('FRA', 'country', index)).toBe('FRA');
    expect(getRegionId('United States of America', 'country', index)).toBe('USA');
    expect(GEOJSON_KEYS.country.id).toBe('iso_a3');
  });

  it('joins ISO-2 chat rows onto country polygons', () => {
    const model = normalizeMapData(
      [
        { label: 'FR', value: 10 },
        { label: 'ROU', value: 4 },
      ],
      COUNTRIES,
    );
    expect(model.layers[0].features.some((f) => f.properties?.id === 'FRA')).toBe(true);
    expect(model.layers[0].features.some((f) => f.properties?.id === 'ROU')).toBe(true);
  });

  it('indexes Czechia against Natural Earth Czech Rep.', () => {
    const index = createFeaturesIndex(
      [
        {
          type: 'Feature',
          properties: { name: 'Czech Rep.', iso_a3: 'CZE', admin: 'Czech Republic', name_long: 'Czech Republic' },
          geometry: { type: 'Point', coordinates: [15, 50] },
        },
      ],
      'country',
    );
    expect(getRegionId('Czechia', 'country', index)).toBe('CZE');
    expect(getRegionId('Czech Republic', 'country', index)).toBe('CZE');
  });

  it('builds bubble points at polygon centres', () => {
    const model = normalizeMapData(
      {
        layers: [
          {
            name: 'Bubbles',
            visualisationType: 'bubbles',
            geospatialData: ['label'],
            arrangeByMetric: ['value'],
            data: [{ label: 'France', value: 12 }],
          },
        ],
      },
      COUNTRIES,
    );
    const feature = joinLayerFeatures(model.layers[0], COUNTRIES).features[0];
    expect(feature.geometry?.type).toBe('Point');
    expect(feature.properties?.regionId).toBe('FRA');
  });

  it('keeps coordinate rows whose metric is 0', () => {
    const model = normalizeMapData(
      {
        layers: [
          {
            name: 'Markers',
            visualisationType: 'markers',
            geospatialData: ['point'],
            arrangeByMetric: ['value'],
            data: [{ point: [2, 48], value: 0 }],
          },
        ],
      } as never,
      COUNTRIES,
    );
    expect(model.layers[0].features).toHaveLength(1);
    expect(model.layers[0].features[0].geometry?.coordinates).toEqual([2, 48]);
  });
});
