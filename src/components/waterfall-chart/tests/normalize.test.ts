import { describe, expect, it } from 'vitest';

import fusedashFixture from '../../../stories/fixtures/waterfall.fusedash.json';
import {
  collectLabels,
  normalizeWaterfallData,
  waterfallLinearDomain,
} from '../lib/index.js';

describe('normalizeWaterfallData', () => {
  it('accepts [{ label, value }] as cumulative levels', () => {
    const model = normalizeWaterfallData([
      { label: 'Start', value: 100 },
      { label: 'Mid', value: 150 },
      { label: 'End', value: 120 },
    ]);
    expect(model.sourcePath).toBe('label-value');
    expect(model.steps).toHaveLength(3);
    expect(model.steps[0]).toMatchObject({
      start: 0,
      end: 100,
      difference: 100,
      vector: 'positive',
    });
    expect(model.steps[1]).toMatchObject({
      start: 100,
      end: 150,
      difference: 50,
      vector: 'positive',
    });
    expect(model.steps[2]).toMatchObject({
      start: 150,
      end: 120,
      difference: -30,
      vector: 'negative',
    });
  });

  it('accepts { steps } chat payload with kinds', () => {
    const model = normalizeWaterfallData({
      steps: [
        { label: 'Open', value: 1000, kind: 'total' },
        { label: 'Sales', value: 500, kind: 'increase' },
        { label: 'Costs', value: -200, kind: 'decrease' },
        { label: 'Close', value: 1300, kind: 'total' },
      ],
    });
    expect(model.sourcePath).toBe('steps-payload');
    expect(model.steps.map((s) => s.level)).toEqual([1000, 1500, 1300, 1300]);
    expect(model.steps[0]).toMatchObject({ start: 0, end: 1000, kind: 'total' });
    expect(model.steps[1]).toMatchObject({
      start: 1000,
      end: 1500,
      difference: 500,
    });
    expect(model.steps[3]).toMatchObject({
      start: 0,
      end: 1300,
      kind: 'total',
    });
  });

  it('FuseDash fixture → delta-flags path, proper waterfall', () => {
    const model = normalizeWaterfallData(fusedashFixture as never);
    expect(model.sourcePath).toBe('delta-flags');
    expect(model.steps.length).toBe(8);
    expect(collectLabels(model)).toEqual(
      fusedashFixture.uniqueValues.category,
    );
    // Start total from 0 → 5000
    expect(model.steps[0]).toMatchObject({
      label: 'Starting Balance',
      start: 0,
      end: 5000,
      level: 5000,
      kind: 'total',
    });
    // Floating increase
    expect(model.steps[1]).toMatchObject({
      label: 'Product Sales',
      start: 5000,
      end: 13500,
      difference: 8500,
      vector: 'positive',
    });
    // Ending total anchors at 0
    const end = model.steps[7];
    expect(end).toMatchObject({
      label: 'Ending Balance',
      start: 0,
      end: 5500,
      level: 5500,
      kind: 'total',
    });
    // Client paint hard-codes (fixture formatting differs)
    expect(model.colors).toEqual({
      positive: '#938CFF',
      negative: '#FF8C47',
      total: '#BDBCC8',
    });
    const [lo, hi] = waterfallLinearDomain(model.steps);
    expect(hi).toBeGreaterThan(lo);
  });

  it('client-levels path when no delta flags', () => {
    const model = normalizeWaterfallData({
      chartType: 'waterfallChart',
      xAxe: ['category'],
      yAxe: ['value'],
      orientation: 'vertical',
      data: [
        { category: 'A', value: 10 },
        { category: 'B', value: 25 },
        { category: 'C', value: 18 },
      ],
    });
    expect(model.sourcePath).toBe('client-levels');
    expect(model.orientation).toBe('vertical');
    expect(model.steps[1]).toMatchObject({
      start: 10,
      end: 25,
      difference: 15,
    });
  });

  it('returns empty for nullish / invalid', () => {
    expect(normalizeWaterfallData(null).steps).toEqual([]);
    expect(normalizeWaterfallData([]).steps).toEqual([]);
    expect(normalizeWaterfallData({} as never).steps).toEqual([]);
  });
});
