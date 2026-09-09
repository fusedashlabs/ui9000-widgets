import { describe, expect, it } from 'vitest';

import { normalizePieData, legendSlicesFromPieOrder } from '../lib/normalize.js';

import pieFixture from '../../../stories/fixtures/pie.fusedash.json';

describe('normalizePieData', () => {
  it('pie.fusedash.json → 12 slices with formatting colors', () => {
    const model = normalizePieData(pieFixture as never);
    expect(model.slices.length).toBe(12);
    expect(model.total).toBeGreaterThan(0);
    expect(model.slices[0].key).toBe('January');
    expect(model.slices[0].color).toMatch(/^#/);
    expect(model.slices.reduce((sum, slice) => sum + slice.percentage, 0)).toBeCloseTo(
      100,
      0,
    );
  });

  it('accepts simple label/value rows', () => {
    const model = normalizePieData([
      { label: 'A', value: 30 },
      { label: 'B', value: 70 },
    ]);
    expect(model.slices.length).toBe(2);
    expect(model.slices[0].percentage).toBeCloseTo(30, 0);
  });

  it('returns empty for invalid payload', () => {
    expect(normalizePieData(null).slices).toEqual([]);
    expect(normalizePieData([]).slices).toEqual([]);
  });
});

describe('legendSlicesFromPieOrder', () => {
  it('filters legend to uniqueValues membership in pie order', () => {
    const model = normalizePieData(pieFixture as never);
    const pieOrder = model.slices.map((slice) => slice.key).reverse();
    const legend = legendSlicesFromPieOrder(model, pieOrder);
    expect(legend.length).toBe(12);
    expect(legend.every((slice) => model.uniqueValuesHint?.includes(slice.key))).toBe(true);
  });
});
