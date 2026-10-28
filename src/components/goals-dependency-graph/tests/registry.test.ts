import { describe, expect, it } from 'vitest';

import { collectPortMetadata } from '../../../catalog/load.js';
import { canRenderChartType, resolveChartTarget } from '../../chart-renderer/lib/registry.js';
import metadata from '../metadata.json';

describe('goals dependency graph registration', () => {
  it('mounts through chart-renderer for its chartType', () => {
    for (const key of metadata.chartTypeKeys) {
      expect(canRenderChartType(key)).toBe(true);
      expect(resolveChartTarget(key)).toMatchObject({ kind: 'goals-dependency-graph', tag: 'ui9000-goals-dependency-graph' });
    }
  });

  it('does not shadow the goals perimeter or the network graph', () => {
    expect(resolveChartTarget('goalsPerimeter')?.tag).toBe('ui9000-goals-perimeter');
    expect(resolveChartTarget('networkGraphChart')?.tag).toBe('ui9000-network-graph');
  });

  it('is a host-tier entry in the catalog', () => {
    const meta = collectPortMetadata().find((item) => item.id === 'goals-dependency-graph');
    expect(meta?.tier).toBe('host');
    expect(meta?.chartTypeKeys).toEqual(['goalsDependencyGraph']);
  });
});
