import { describe, expect, it } from 'vitest';

import { normalizeBarData } from '../lib/index.js';
import metadata from '../metadata.json';
import { BAR_FIXTURE_VARIANTS } from './fixtures.js';
import fusedashFixture from '../../../stories/fixtures/bar.fusedash.json';
import groupedFusedashFixture from '../../../stories/fixtures/bar-grouped.fusedash.json';

describe('metadata', () => {
  it('declares the chart type keys the gateway dispatches on', () => {
    expect(metadata.chartTypeKeys).toEqual([
      'barChart',
      'barGrouped',
      'barStacked',
      'cumulativeBar',
      'barHorizontal',
      'barHorizontalGrouped',
      'barHorizontalStacked',
    ]);
  });

  it('maps every chart type key to attributes the element accepts', () => {
    const props = metadata.propsSchema.properties as Record<string, unknown>;
    for (const key of metadata.chartTypeKeys) {
      const mapping = (metadata.chartTypeMap as Record<string, Record<string, unknown>>)[key];
      expect(mapping, `${key} has no chartTypeMap entry`).toBeDefined();
      for (const prop of Object.keys(mapping)) {
        expect(props, `${key} maps unknown prop ${prop}`).toHaveProperty(prop);
      }
    }
  });

  it('names D3 as the stack and stays out of the FuseDash editor', () => {
    expect(metadata.stack).toBe('d3');
    expect(metadata.usageConditions.notFor).toBe('fusedash-editor');
  });

  it('points at the published entry points', () => {
    expect(metadata.entry).toBe('@ui9000/widgets/bar-chart');
    expect(metadata.lazyImport).toBe('@ui9000/widgets/lazy/bar-chart');
    expect(metadata.tag).toBe('ui9000-bar-chart');
  });
});

describe('mock fixture', () => {
  it('covers every declared chart type key', () => {
    const covered = new Set(BAR_FIXTURE_VARIANTS.map((v) => v.chartType));
    for (const key of metadata.chartTypeKeys) {
      expect(covered, `no fixture variant renders ${key}`).toContain(key);
    }
  });

  it('normalizes to renderable series', () => {
    for (const variant of BAR_FIXTURE_VARIANTS) {
      const series = normalizeBarData(variant.data);
      expect(series.length, variant.title).toBeGreaterThan(0);
      expect(series.every((s) => s.points.length > 0), variant.title).toBe(true);
    }
  });

  it('keeps a deliberate gap so missing group keys stay covered', () => {
    const grouped = BAR_FIXTURE_VARIANTS.find((v) => v.chartType === 'barGrouped');
    const series = normalizeBarData(grouped!.data);
    const west = series.find((s) => s.id === 'west');
    expect(west?.points.map((p) => p.x)).not.toContain('Q2');
  });
});

describe('FuseDash widget payload', () => {
  it('normalizes the Storybook fixture with uniqueValues order', () => {
    const series = normalizeBarData(fusedashFixture);
    expect(series).toHaveLength(1);
    expect(series[0].points[0].x).toBe('Globe G-XTREME® 3.0 Jacket');
    expect(series[0].points).toHaveLength(12);
  });

  it('normalizes the grouped FuseDash fixture with series order from groupBy', () => {
    const series = normalizeBarData(groupedFusedashFixture);
    expect(series.length).toBe(5);
    expect(series.map((s) => s.id)).toEqual([
      'Open field group',
      'Tomato group',
      'Cucumber group',
      'Allium group',
      'Other',
    ]);
    expect(series[0].points[0].x).toBe('California, Los Angeles');
    expect(series.every((s) => s.points.length > 0)).toBe(true);
  });
});
