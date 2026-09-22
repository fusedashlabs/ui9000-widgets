import { describe, expect, it } from 'vitest';

import { catalogTierOf, loadEngineCatalog, type PortMetadata } from '../../../catalog/index.js';
import metadata from '../metadata.json';
import traceContract from '../trace.v2.json';

describe('inspector metadata', () => {
  it('is tier host and stays out of the engine catalog', () => {
    expect(metadata.tier).toBe('host');
    expect(catalogTierOf(metadata as PortMetadata)).toBe('host');
    expect(loadEngineCatalog().map((m) => m.id)).not.toContain(metadata.id);
  });

  it('points at the tag and entry the host mounts', () => {
    expect(metadata.tag).toBe('ui9000-inspector');
    expect(metadata.entry).toBe('@ui9000/widgets/inspector');
    expect(metadata).not.toHaveProperty('lazyImport');
  });

  it('declares the attributes the element accepts', () => {
    expect(Object.keys(metadata.propsSchema.properties)).toEqual(['trace', 'panelLabel']);
    expect(metadata.propsSchema.properties.trace.$ref).toBe('./trace.v2.json');
  });

  it('carries the provisional trace contract until S4-03 publishes one', () => {
    expect(traceContract.required).toEqual([
      'objective',
      'profile',
      'candidates',
      'rejections',
      'actions',
    ]);
    expect(Object.keys(traceContract.properties)).toEqual(
      expect.arrayContaining(['winner', 'riskBand', 'outcome']),
    );
    expect(traceContract.properties.riskBand.enum).toEqual(['low', 'medium', 'high']);
    expect(traceContract.properties.profile.additionalProperties).toBe(false);
  });
});
