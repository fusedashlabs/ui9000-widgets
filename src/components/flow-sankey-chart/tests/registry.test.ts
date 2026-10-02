import { describe, expect, it } from 'vitest';

import {
  canRenderChartType,
  resolveChartTarget,
} from '../../chart-renderer/lib/registry.js';
import metadata from '../metadata.json';

describe('chart-renderer registry', () => {
  it('mounts the flow Sankey for every chartTypeKey in its metadata', () => {
    for (const key of metadata.chartTypeKeys) {
      expect(canRenderChartType(key)).toBe(true);
      expect(resolveChartTarget(key)?.tag).toBe(metadata.tag);
    }
  });

  it('does not shadow the two-column Sankey', () => {
    expect(resolveChartTarget('sankeyChart')?.tag).toBe('ui9000-sankey-chart');
  });
});
