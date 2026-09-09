import { describe, expect, it } from 'vitest';

import {
  formattingInputFromWidget,
  getFormattingKeys,
  getUniversalFormatting,
  getUniversalMarkers,
  resolveWidgetFormatting,
  resolveWidgetMarkers,
} from './index.js';

describe('getFormattingKeys', () => {
  it('uses groupBy uniqueValues', () => {
    expect(
      getFormattingKeys({
        chartType: 'lineChart',
        groupByField: 'region',
        uniqueValues: { region: ['EU', 'US'] },
      }),
    ).toEqual(['EU', 'US']);
  });

  it('returns parallel coordinates endpoints', () => {
    expect(
      getFormattingKeys({ chartType: 'parallelCoordinatesChart' }),
    ).toEqual(['defaultMin', 'defaultMax']);
  });
});

describe('getUniversalFormatting', () => {
  it('returns default when no keys', () => {
    expect(getUniversalFormatting({ chartType: 'barChart' })).toEqual([
      { key: 'default', color: '1' },
    ]);
  });

  it('assigns color indices 1–12 cyclically', () => {
    const keys = Array.from({ length: 3 }, (_, i) => `s${i}`);
    expect(
      getUniversalFormatting({
        chartType: 'lineChart',
        groupByField: 'g',
        uniqueValues: { g: keys },
      }),
    ).toEqual([
      { key: 's0', color: '1' },
      { key: 's1', color: '2' },
      { key: 's2', color: '3' },
    ]);
  });

  it('preserves existing when keys match', () => {
    const existing = [
      { key: 'A', color: '5' },
      { key: 'B', color: '7' },
    ];
    expect(
      getUniversalFormatting({
        chartType: 'lineChart',
        groupByField: 'g',
        uniqueValues: { g: ['A', 'B'] },
        existingFormatting: existing,
      }),
    ).toBe(existing);
  });
});

describe('getUniversalMarkers', () => {
  it('returns empty for unsupported chart types', () => {
    expect(getUniversalMarkers({ chartType: 'barChart' })).toEqual([]);
  });

  it('defaults lollipop to rhombus', () => {
    expect(getUniversalMarkers({ chartType: 'lollipopChart' })).toEqual([
      { key: 'default', shape: 'rhombus' },
    ]);
  });

  it('cycles shapes for grouped line chart', () => {
    expect(
      getUniversalMarkers({
        chartType: 'lineChart',
        groupByField: 'g',
        uniqueValues: { g: ['A', 'B'] },
      }),
    ).toEqual([
      { key: 'A', shape: 'donut' },
      { key: 'B', shape: 'circle' },
    ]);
  });
});

describe('from-fuse-widget', () => {
  it('resolves formatting from widget payload', () => {
    const widget = {
      chartType: 'lineChart',
      groupBy: ['region'],
      uniqueValues: { region: ['EU', 'US'] },
      data: [{ region: 'EU', value: 1 }],
    };
    expect(resolveWidgetFormatting(widget)).toEqual([
      { key: 'EU', color: '1' },
      { key: 'US', color: '2' },
    ]);
    expect(resolveWidgetMarkers(widget)).toEqual([
      { key: 'EU', shape: 'donut' },
      { key: 'US', shape: 'circle' },
    ]);
  });

  it('builds input via formattingInputFromWidget', () => {
    const input = formattingInputFromWidget({
      chartType: 'pieChart',
      xAxe: ['category'],
      uniqueValues: { category: ['A', 'B'] },
      data: [],
    });
    expect(input.xAxeField).toBe('category');
    expect(getFormattingKeys(input)).toEqual(['A', 'B']);
  });
});
