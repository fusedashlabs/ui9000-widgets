import { describe, expect, it } from 'vitest';

import {
  collectBarCategories,
  collectBarValueDomain,
  cumulativeValues,
  formatCompact,
  groupedBarOffset,
  normalizeBarData,
  resolveBaseline,
  stackTotals,
  valueAt,
} from '../lib/index.js';

describe('normalizeBarData', () => {
  it('accepts legacy [{label,value}]', () => {
    const series = normalizeBarData([
      { label: 'Jan', value: 10 },
      { label: 'Feb', value: 20 },
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].id).toBe('default');
    expect(series[0].points).toEqual([
      { x: 'Jan', y: 10 },
      { x: 'Feb', y: 20 },
    ]);
  });

  it('accepts { points } payload', () => {
    const series = normalizeBarData({
      points: [
        { x: 'A', y: 1 },
        { x: 'B', y: 2 },
      ],
    });
    expect(series[0].id).toBe('default');
    expect(series[0].points).toHaveLength(2);
  });

  it('accepts multi-series and defaults the name to the id', () => {
    const series = normalizeBarData({
      series: [
        { id: 'north', points: [{ x: 'A', y: 1 }] },
        { id: 'south', name: 'South', points: [{ x: 'A', y: 2 }] },
      ],
    });
    expect(series.map((s) => s.name)).toEqual(['north', 'South']);
  });

  it('accepts a bare series array', () => {
    const series = normalizeBarData([{ id: 'only', points: [{ x: 'A', y: 3 }] }]);
    expect(series).toHaveLength(1);
    expect(series[0].points).toEqual([{ x: 'A', y: 3 }]);
  });

  it('drops rows with null or non-finite values', () => {
    const series = normalizeBarData({
      points: [
        { x: 'A', y: 1 },
        { x: 'B', y: null as unknown as number },
        { x: 'C', y: Number.NaN },
        { x: null as unknown as string, y: 4 },
        { x: 'D', y: 5 },
      ],
    });
    expect(series[0].points).toEqual([
      { x: 'A', y: 1 },
      { x: 'D', y: 5 },
    ]);
  });

  it('returns [] for empty and missing input', () => {
    expect(normalizeBarData(null)).toEqual([]);
    expect(normalizeBarData([])).toEqual([]);
    expect(normalizeBarData({})).toEqual([]);
  });
});

describe('FuseDash grouped widget', () => {
  it('orders categories from uniqueValues[yAxe] on horizontal grouped bars', () => {
    const widget = {
      chartType: 'barChart',
      orientation: 'horizontal',
      yAxe: ['County'],
      xAxe: ['revenue'],
      groupBy: ['Crop'],
      uniqueValues: {
        County: ['Alpha', 'Beta', 'Gamma'],
        Crop: ['North', 'South'],
      },
      formatting: [
        { key: 'North', color: '1' },
        { key: 'South', color: '2' },
      ],
      data: [
        { County: 'Gamma', revenue: 3, Crop: 'North' },
        { County: 'Alpha', revenue: 1, Crop: 'North' },
        { County: 'Beta', revenue: 2, Crop: 'South' },
      ],
    };
    const series = normalizeBarData(widget);
    expect(series.map((s) => s.id)).toEqual(['North', 'South']);
    expect(series[0].points.map((p) => p.x)).toEqual(['Alpha', 'Gamma']);
    expect(collectBarCategories(series)).toEqual(['Alpha', 'Gamma', 'Beta']);
  });
});

describe('collectBarCategories', () => {
  it('unions categories across series in first-seen order', () => {
    const series = normalizeBarData({
      series: [
        {
          id: 'a',
          points: [
            { x: 'Q1', y: 1 },
            { x: 'Q3', y: 3 },
          ],
        },
        {
          id: 'b',
          points: [
            { x: 'Q2', y: 2 },
            { x: 'Q3', y: 4 },
          ],
        },
      ],
    });
    expect(collectBarCategories(series)).toEqual(['Q1', 'Q3', 'Q2']);
  });
});

describe('valueAt', () => {
  const [series] = normalizeBarData({
    points: [
      { x: 'A', y: 5 },
      { x: 'B', y: 0 },
    ],
  });

  it('returns the value at a category', () => {
    expect(valueAt(series, 'A')).toBe(5);
    expect(valueAt(series, 'B')).toBe(0);
  });

  it('returns undefined for a missing category', () => {
    expect(valueAt(series, 'Z')).toBeUndefined();
  });
});

describe('collectBarValueDomain', () => {
  const single = normalizeBarData([
    { label: 'A', value: 10 },
    { label: 'B', value: 40 },
  ]);

  it('pads a plain vertical chart by 1.2', () => {
    expect(collectBarValueDomain(single)).toEqual([0, 48]);
  });

  it('pads horizontal charts by 1.1', () => {
    expect(collectBarValueDomain(single, { orientation: 'horizontal' })).toEqual([0, 44]);
  });

  it('leaves the grouped vertical extent unpadded', () => {
    const multi = normalizeBarData({
      series: [
        { id: 'a', points: [{ x: 'A', y: 10 }] },
        { id: 'b', points: [{ x: 'A', y: 40 }] },
      ],
    });
    expect(collectBarValueDomain(multi)).toEqual([0, 40]);
  });

  it('mirrors the extent when values straddle zero', () => {
    const mixed = normalizeBarData([
      { label: 'A', value: -20 },
      { label: 'B', value: 10 },
    ]);
    expect(collectBarValueDomain(mixed)).toEqual([-24, 24]);
  });

  it('uses stack totals plus a 10% pad when stacked', () => {
    const multi = normalizeBarData({
      series: [
        { id: 'a', points: [{ x: 'A', y: 30 }] },
        { id: 'b', points: [{ x: 'A', y: 70 }] },
      ],
    });
    // total 100, pad 10 → [0, 110]; grouped would only reach 70
    expect(collectBarValueDomain(multi, { layout: 'stacked' })).toEqual([0, 110]);
  });

  it('extends the domain to fit the cumulative overlay', () => {
    expect(collectBarValueDomain(single, { cumulativeMax: 50 })).toEqual([0, 50]);
  });

  it('falls back to [0, 1] with no usable values', () => {
    expect(collectBarValueDomain([])).toEqual([0, 1]);
    expect(collectBarValueDomain(normalizeBarData([{ label: 'A', value: 0 }]))).toEqual([0, 1]);
  });
});

describe('stackTotals', () => {
  it('sums positive and negative segments separately', () => {
    const series = normalizeBarData({
      series: [
        {
          id: 'a',
          points: [
            { x: 'A', y: 5 },
            { x: 'B', y: -2 },
          ],
        },
        {
          id: 'b',
          points: [
            { x: 'A', y: -3 },
            { x: 'B', y: -4 },
          ],
        },
      ],
    });
    expect(stackTotals(series, ['A', 'B'])).toEqual({
      positive: [5, 0],
      negative: [3, 6],
    });
  });
});

describe('resolveBaseline', () => {
  it('anchors at zero when the domain straddles it', () => {
    expect(resolveBaseline([-10, 10])).toBe(0);
  });

  it('anchors at the low end for an all-positive domain', () => {
    expect(resolveBaseline([2, 10])).toBe(2);
  });

  it('anchors at the high end for an all-negative domain', () => {
    expect(resolveBaseline([-10, -2])).toBe(-2);
  });
});

describe('cumulativeValues', () => {
  it('accumulates in category order and treats gaps as zero', () => {
    const [series] = normalizeBarData({
      points: [
        { x: 'A', y: 10 },
        { x: 'C', y: 5 },
      ],
    });
    expect(cumulativeValues(series, ['A', 'B', 'C'])).toEqual([10, 10, 15]);
  });
});

describe('groupedBarOffset', () => {
  it('centres the middle bar of an odd group', () => {
    expect(groupedBarOffset(10, 1, 3)).toBe(0);
    expect(groupedBarOffset(10, 0, 3)).toBe(-11);
    expect(groupedBarOffset(10, 2, 3)).toBe(11);
  });

  it('straddles the centre for an even group', () => {
    expect(groupedBarOffset(10, 0, 2)).toBe(-5.5);
    expect(groupedBarOffset(10, 1, 2)).toBe(5.5);
  });

  it('stays symmetric around the group centre', () => {
    const offsets = [0, 1, 2, 3].map((i) => groupedBarOffset(8, i, 4));
    expect(offsets[0]).toBe(-offsets[3]);
    expect(offsets[1]).toBe(-offsets[2]);
  });
});

describe('formatCompact', () => {
  it('keeps small integers exact and abbreviates large values', () => {
    expect(formatCompact(42)).toBe('42');
    expect(formatCompact(1500)).toBe('1.5K');
    expect(formatCompact(2_500_000)).toBe('2.5M');
  });

  it('gives non-integers two decimals', () => {
    expect(formatCompact(4.5)).toBe('4.50');
  });
});
