import { describe, expect, it } from 'vitest';

import { collectPortMetadata } from '../../../catalog/load.js';
import { canRenderChartType, resolveChartTarget } from '../../chart-renderer/lib/registry.js';
import metadata from '../metadata.json';

describe('reasoning orchestration graph registration', () => {
  it('mounts through chart-renderer for its chartType', () => {
    for (const key of metadata.chartTypeKeys) {
      expect(canRenderChartType(key)).toBe(true);
      expect(resolveChartTarget(key)).toMatchObject({
        kind: 'reasoning-orchestration-graph',
        tag: 'ui9000-reasoning-orchestration-graph',
      });
    }
  });

  it('does not shadow the network graph', () => {
    expect(resolveChartTarget('networkGraphChart')?.tag).toBe('ui9000-network-graph');
  });

  it('is a host-tier entry in the catalog, so the engine can select it', () => {
    const meta = collectPortMetadata().find((item) => item.id === 'reasoning-orchestration-graph');
    expect(meta?.tier).toBe('host');
    expect(meta?.chartTypeKeys).toEqual(['reasoningOrchestrationGraph']);
  });
});
