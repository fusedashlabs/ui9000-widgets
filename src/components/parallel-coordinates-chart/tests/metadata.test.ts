import { describe, expect, it } from 'vitest';

import { loaders } from '../../../lazy/index.js';
import metadata from '../metadata.json';

describe('metadata', () => {
  it('declares the chart type key the gateway dispatches on', () => {
    expect(metadata.chartTypeKeys).toEqual(['parallelCoordinatesChart']);
  });

  it('names D3 as the stack and stays out of the FuseDash editor', () => {
    expect(metadata.stack).toBe('d3');
    expect(metadata.usageConditions.notFor).toBe('fusedash-editor');
  });

  it('points at the published entry points', () => {
    expect(metadata.entry).toBe('@fusedashlabs/widgets/parallel-coordinates-chart');
    expect(metadata.lazyImport).toBe(
      '@fusedashlabs/widgets/lazy/parallel-coordinates-chart',
    );
    expect(metadata.tag).toBe('ui9000-parallel-coordinates-chart');
    expect(loaders).toHaveProperty(metadata.id);
  });

  it('records the two deliberate divergences from the house rules', () => {
    expect(metadata.divergences.map((entry) => entry.rule)).toEqual([
      'Legend is HTML in the shell, above the plot',
      'Ports match the client 1:1',
    ]);
  });

  it('declares every attribute the element accepts', () => {
    expect(Object.keys(metadata.propsSchema.properties)).toEqual([
      'data',
      'orientation',
      'showLegend',
      'showTooltip',
      'colorKey',
    ]);
  });
});
