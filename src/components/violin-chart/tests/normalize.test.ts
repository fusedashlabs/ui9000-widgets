import { describe, expect, it } from 'vitest';

import fusedashFixture from '../../../stories/fixtures/violin.fusedash.json';
import {
  collectValueExtent,
  kde,
  normalizeViolinData,
  quantile,
  resolveViolinAxes,
  silvermanBandwidth,
} from '../lib/index.js';

describe('normalizeViolinData', () => {
  it('accepts FuseDash defaultViolin fixture', () => {
    const model = normalizeViolinData(fusedashFixture as never);
    expect(model.orientation).toBe('horizontal');
    expect(model.groups.map((g) => g.id)).toEqual([
      '2019',
      '2020',
      '2021',
      '2022',
      'May',
    ]);
    expect(model.groups.every((g) => g.samples.length > 0)).toBe(true);
    expect(model.categoryKey).toBe('group');
    expect(model.valueKey).toBe('value');
    const [lo, hi] = collectValueExtent(model.groups);
    expect(hi).toBeGreaterThan(lo);
  });

  it('accepts { orientation, groups }', () => {
    const model = normalizeViolinData({
      orientation: 'vertical',
      groups: [
        { id: 'A', samples: [1, 2, 3, 4, 5] },
        { label: 'B', samples: [2, 3, 4] },
      ],
    });
    expect(model.orientation).toBe('vertical');
    expect(model.groups).toHaveLength(2);
    expect(model.groups[0]!.id).toBe('A');
    expect(model.groups[0]!.samples).toEqual([1, 2, 3, 4, 5]);
    expect(model.groups[1]!.id).toBe('B');
  });

  it('accepts ViolinGroup[]', () => {
    const model = normalizeViolinData([
      { id: 'x', samples: [10, 20, 30] },
    ]);
    expect(model.groups).toHaveLength(1);
    expect(model.groups[0]!.samples).toEqual([10, 20, 30]);
  });

  it('returns empty for nullish / empty', () => {
    expect(normalizeViolinData(null).groups).toEqual([]);
    expect(normalizeViolinData(undefined).groups).toEqual([]);
    expect(normalizeViolinData([]).groups).toEqual([]);
  });

  it('orders groups by uniqueValues when present', () => {
    const model = normalizeViolinData({
      orientation: 'horizontal',
      xAxe: ['value'],
      yAxe: ['group'],
      uniqueValues: { group: ['May', '2019'] },
      data: [
        { group: '2019', value: 1 },
        { group: 'May', value: 2 },
        { group: '2019', value: 3 },
      ],
    });
    expect(model.groups.map((g) => g.id)).toEqual(['May', '2019']);
    expect(model.groups[0]!.samples).toEqual([2]);
    expect(model.groups[1]!.samples).toEqual([1, 3]);
  });

  it('resolves vertical axes when x categorical & y numeric', () => {
    const axes = resolveViolinAxes('group', 'value', [
      { group: 'A', value: 1 },
      { group: 'B', value: 2 },
    ]);
    expect(axes).toEqual({ valueKey: 'value', categoryKey: 'group' });
  });
});

describe('stats (KDE / quantile)', () => {
  it('quantile matches midpoints', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75);
  });

  it('kde returns density along grid', () => {
    const samples = [1, 2, 2, 3];
    const h = silvermanBandwidth(samples, 1, 3);
    const dens = kde(samples, h, [1, 2, 3]);
    expect(dens).toHaveLength(3);
    expect(dens.every((d) => d.y > 0)).toBe(true);
    expect(dens[1]!.y).toBeGreaterThan(dens[0]!.y);
  });
});
