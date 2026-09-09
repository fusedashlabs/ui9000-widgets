import { describe, expect, it } from 'vitest';

import { loaders } from '../../../lazy/index.js';
import metadata from '../metadata.json';

describe('map-chart metadata', () => {
  it('declares the chart type keys the gateway dispatches on', () => {
    expect(metadata.chartTypeKeys).toEqual(['mapChart', 'UniversalMap']);
  });

  it('names mapbox-gl as the stack and stays out of the FuseDash editor', () => {
    expect(metadata.stack).toBe('mapbox-gl');
    expect(metadata.usageConditions.notFor).toBe('fusedash-editor');
    expect(metadata.usageConditions.hostReady).toBe(true);
  });

  it('points at the published entry points', () => {
    expect(metadata.entry).toBe('@ui9000/widgets/map-chart');
    expect(metadata.lazyImport).toBe('@ui9000/widgets/lazy/map-chart');
    expect(metadata.tag).toBe('ui9000-map-chart');
    expect(loaders).toHaveProperty(metadata.id);
  });

  it('declares every attribute the element accepts', () => {
    expect(Object.keys(metadata.propsSchema.properties)).toEqual([
      'data',
      'chart-title',
      'show-header',
      'show-legend',
      'show-tooltip',
      'mapbox-token',
      'geojson-base-url',
      'pmtiles-base-url',
    ]);
  });
});
