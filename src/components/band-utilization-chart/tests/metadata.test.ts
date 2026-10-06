import { describe, expect, it } from 'vitest';

import metadata from '../metadata.json';
import { resolveChartTarget } from '../../chart-renderer/lib/registry.js';

describe('band utilization metadata', () => {
  it('registers the chat tag and the engine chart type', () => {
    expect(metadata.id).toBe('band-utilization-chart');
    expect(metadata.tag).toBe('ui9000-band-utilization-chart');
    expect(metadata.chartTypeKeys).toEqual(['bandUtilizationChart']);
    expect(metadata.stack).toBe('d3');
    expect(metadata.entry).toBe('@ui9000/widgets/band-utilization-chart');
    expect(metadata.lazyImport).toBe('@ui9000/widgets/lazy/band-utilization-chart');
  });

  it('resolves through the chart renderer', () => {
    const target = resolveChartTarget('bandUtilizationChart');
    expect(target?.kind).toBe('band-utilization-chart');
    expect(target?.tag).toBe('ui9000-band-utilization-chart');
  });
});
