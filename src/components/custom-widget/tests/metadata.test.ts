import { describe, expect, it } from 'vitest';

import { loaders } from '../../../lazy/index.js';
import metadata from '../metadata.json';
import { MAX_PANES } from '../lib/index.js';

describe('metadata', () => {
  it('declares the chart type keys the gateway dispatches on', () => {
    expect(metadata.chartTypeKeys).toEqual(['customWidget']);
  });

  it('names the composite stack and stays out of the FuseDash editor', () => {
    expect(metadata.stack).toBe('composite');
    expect(metadata.usageConditions.notFor).toBe('fusedash-editor');
    expect(metadata.usageConditions.maxPanes).toBe(MAX_PANES);
    expect(metadata.usageConditions.panesSupported).toEqual([
      'chartWidget',
      'tableWidget',
      'textWidget',
      'imageWidget',
    ]);
  });

  it('points at the published entry points', () => {
    expect(metadata.entry).toBe('@ui9000/widgets/custom-widget');
    expect(metadata.lazyImport).toBe('@ui9000/widgets/lazy/custom-widget');
    expect(metadata.tag).toBe('ui9000-custom-widget');
    expect(loaders).toHaveProperty(metadata.id);
  });

  it('declares every attribute the element accepts', () => {
    expect(Object.keys(metadata.propsSchema.properties)).toEqual([
      'data',
      'chartTitle',
      'direction',
      'scale',
      'showHeader',
      'showGrid',
      'showLegend',
      'showTooltip',
    ]);
  });

  it('schemas the arranging block the shell reads', () => {
    const arranging = metadata.propsSchema.properties.data.properties.arranging;
    expect(Object.keys(arranging.properties)).toEqual([
      'widgets',
      'hasKpi',
      'direction',
    ]);
    expect(arranging.properties.widgets.maxItems).toBe(MAX_PANES);
    expect(arranging.properties.widgets.items.enum).toEqual([
      'chartWidget',
      'tableWidget',
      'textWidget',
      'imageWidget',
    ]);
  });
});
