import { describe, expect, it } from 'vitest';

import { loaders } from '../../../lazy/index.js';
import metadata from '../metadata.json';

describe('metadata', () => {
  it('declares the chart type key the gateway dispatches on', () => {
    expect(metadata.chartTypeKeys).toEqual(['giniImpurityEntropyChart']);
  });

  it('names D3 as the stack and stays out of the FuseDash editor', () => {
    expect(metadata.stack).toBe('d3');
    expect(metadata.usageConditions.notFor).toBe('fusedash-editor');
  });

  it('points at the published entry points', () => {
    expect(metadata.entry).toBe('@ui9000/widgets/gini-impurity-entropy-chart');
    expect(metadata.lazyImport).toBe(
      '@ui9000/widgets/lazy/gini-impurity-entropy-chart',
    );
    expect(metadata.tag).toBe('ui9000-gini-impurity-entropy-chart');
    expect(loaders).toHaveProperty(metadata.id);
  });

  it('declares every attribute the element accepts', () => {
    expect(Object.keys(metadata.propsSchema.properties)).toEqual([
      'data',
      'showGrid',
      'showLegend',
      'showTooltip',
      'showPHat',
      'showCI',
      'showSplit',
    ]);
  });
});
