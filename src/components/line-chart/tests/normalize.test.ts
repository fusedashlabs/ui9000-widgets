import { describe, expect, it } from 'vitest';
import {
  collectXDomain,
  collectYExtent,
  formatCompact,
  normalizeLineData,
} from '../lib/index.js';

describe('normalizeLineData', () => {
  it('accepts legacy [{label,value}]', () => {
    const series = normalizeLineData([
      { label: 'Jan', value: 10 },
      { label: 'Feb', value: 20 },
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].points).toEqual([
      { x: 'Jan', y: 10 },
      { x: 'Feb', y: 20 },
    ]);
  });

  it('accepts { points } payload', () => {
    const series = normalizeLineData({
      points: [
        { x: 'A', y: 1 },
        { x: 'B', y: 2 },
      ],
    });
    expect(series[0].id).toBe('default');
    expect(series[0].points).toHaveLength(2);
  });

  it('accepts multi-series', () => {
    const series = normalizeLineData({
      series: [
        {
          id: 'rev',
          name: 'Revenue',
          points: [
            { x: 'Q1', y: 100 },
            { x: 'Q2', y: 120 },
          ],
        },
        {
          id: 'cost',
          name: 'Cost',
          points: [
            { x: 'Q1', y: 80 },
            { x: 'Q2', y: 90 },
          ],
        },
      ],
    });
    expect(series).toHaveLength(2);
    expect(collectXDomain(series)).toEqual(['Q1', 'Q2']);
    expect(collectYExtent(series)).toEqual([80, 120]);
  });

  it('returns empty for nullish', () => {
    expect(normalizeLineData(null)).toEqual([]);
    expect(normalizeLineData(undefined)).toEqual([]);
    expect(normalizeLineData([])).toEqual([]);
  });
});

describe('formatCompact', () => {
  it('formats large numbers', () => {
    expect(formatCompact(1500)).toBe('1.5K');
    expect(formatCompact(2_500_000)).toBe('2.5M');
    expect(formatCompact(12)).toBe('12');
  });
});
