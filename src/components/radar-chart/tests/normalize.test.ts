import { describe, expect, it } from 'vitest';

import { normalizeRadarData, collectRadarValues } from '../lib/index.js';

describe('normalizeRadarData', () => {
  it('accepts [{label,value}]', () => {
    const model = normalizeRadarData([
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
    ]);
    expect(model.series).toHaveLength(1);
    expect(model.categories).toEqual(['A', 'B']);
    expect(model.series[0].points).toEqual([
      { category: 'A', value: 10 },
      { category: 'B', value: 20 },
    ]);
  });

  it('accepts multi-series chat shape', () => {
    const model = normalizeRadarData({
      categories: ['Q1', 'Q2'],
      series: [
        {
          id: 'a',
          name: 'Alpha',
          points: [
            { category: 'Q1', value: 5 },
            { category: 'Q2', value: 8 },
          ],
        },
        {
          id: 'b',
          points: [
            { category: 'Q1', value: 3 },
            { category: 'Q2', value: 4 },
          ],
        },
      ],
    });
    expect(model.series).toHaveLength(2);
    expect(collectRadarValues(model.series)).toEqual([5, 8, 3, 4]);
  });

  it('returns empty for nullish', () => {
    expect(normalizeRadarData(null).series).toEqual([]);
    expect(normalizeRadarData(undefined).series).toEqual([]);
  });
});
