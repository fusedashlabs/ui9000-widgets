import { describe, expect, it } from 'vitest';

import {
  collectSparkXDomain,
  collectSparkYDomain,
  normalizeSparkLineData,
  orderSparkXDomain,
  parseXDate,
} from '../lib/index.js';

describe('normalizeSparkLineData', () => {
  it('accepts legacy [{label,value}]', () => {
    const series = normalizeSparkLineData([
      { label: '2024-01-01', value: 10 },
      { label: '2024-01-02', value: 20 },
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].points).toEqual([
      { x: '2024-01-01', y: 10 },
      { x: '2024-01-02', y: 20 },
    ]);
  });

  it('accepts multi-series payload', () => {
    const series = normalizeSparkLineData({
      series: [
        { id: 'Rain', points: [{ x: '2024-01-01', y: 10 }] },
        { id: 'Snow', name: 'Snow', points: [{ x: '2024-01-01', y: 8 }] },
      ],
    });
    expect(series.map((s) => s.name)).toEqual(['Rain', 'Snow']);
  });

  it('drops null and non-finite rows', () => {
    const series = normalizeSparkLineData({
      points: [
        { x: '2024-01-01', y: 1 },
        { x: '2024-01-02', y: Number.NaN },
        { x: null as unknown as string, y: 3 },
      ],
    });
    expect(series[0].points).toEqual([{ x: '2024-01-01', y: 1 }]);
  });

  it('returns empty for nullish', () => {
    expect(normalizeSparkLineData(null)).toEqual([]);
    expect(normalizeSparkLineData(undefined)).toEqual([]);
  });
});

describe('spark x domain', () => {
  const series = normalizeSparkLineData({
    series: [
      {
        id: 'a',
        points: [
          { x: '2024-03-01', y: 1 },
          { x: '2024-01-01', y: 2 },
        ],
      },
    ],
  });

  it('sorts dates ascending', () => {
    const domain = orderSparkXDomain(collectSparkXDomain(series));
    expect(domain).toEqual(['2024-01-01', '2024-03-01']);
  });

  it('parses calendar-only strings in local time', () => {
    const d = parseXDate('2024-01-01');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });
});

describe('collectSparkYDomain', () => {
  it('pads the FuseDash extent by 1.2', () => {
    const series = normalizeSparkLineData({
      points: [
        { x: '2024-01-01', y: 50 },
        { x: '2024-01-02', y: 60 },
      ],
    });
    expect(collectSparkYDomain(series)).toEqual([0, 72]);
  });
});
