import { describe, expect, it } from 'vitest';
import {
  averageYByX,
  collectStepXDomain,
  collectStepYDomain,
  formatCompact,
  isDateXDomain,
  normalizeStepLineData,
  orderStepXDomain,
  parseXDate,
  selectTickIndices,
} from '../lib/index.js';

describe('normalizeStepLineData', () => {
  it('accepts legacy [{label,value}]', () => {
    const series = normalizeStepLineData([
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
    const series = normalizeStepLineData({
      points: [
        { x: 'A', y: 1 },
        { x: 'B', y: 2 },
      ],
    });
    expect(series[0].id).toBe('default');
    expect(series[0].points).toHaveLength(2);
  });

  it('accepts multi-series and defaults the name to the id', () => {
    const series = normalizeStepLineData({
      series: [
        { id: 'a', points: [{ x: 'Q1', y: 100 }] },
        { id: 'b', name: 'Bravo', points: [{ x: 'Q1', y: 80 }] },
      ],
    });
    expect(series.map((s) => s.name)).toEqual(['a', 'Bravo']);
  });

  it('drops null and non-finite rows like getGroupedData', () => {
    const series = normalizeStepLineData({
      points: [
        { x: 'A', y: 1 },
        { x: 'B', y: Number.NaN },
        { x: null as unknown as string, y: 3 },
        { x: 'D', y: null as unknown as number },
        { x: 'E', y: 5 },
      ],
    });
    expect(series[0].points).toEqual([
      { x: 'A', y: 1 },
      { x: 'E', y: 5 },
    ]);
  });

  it('returns empty for nullish', () => {
    expect(normalizeStepLineData(null)).toEqual([]);
    expect(normalizeStepLineData(undefined)).toEqual([]);
    expect(normalizeStepLineData([])).toEqual([]);
  });
});

describe('x domain', () => {
  const series = normalizeStepLineData({
    series: [
      {
        id: 'a',
        points: [
          { x: 'Q1', y: 1 },
          { x: 'Q2', y: 2 },
        ],
      },
      {
        id: 'b',
        points: [
          { x: 'Q2', y: 3 },
          { x: 'Q3', y: 4 },
        ],
      },
    ],
  });

  it('unions x values in first-seen order', () => {
    expect(collectStepXDomain(series)).toEqual(['Q1', 'Q2', 'Q3']);
  });

  it('detects date mode only with 2+ distinct instants', () => {
    expect(isDateXDomain(['2024-01-01', '2024-02-01'])).toBe(true);
    expect(isDateXDomain(['2024-01-01'])).toBe(false);
    expect(isDateXDomain(['2024-01-01', '2024-01-01'])).toBe(false);
    expect(isDateXDomain(['Q1', 'Q2'])).toBe(false);
    expect(isDateXDomain(['2024-01-01', 'Q2'])).toBe(false);
    expect(isDateXDomain([])).toBe(false);
  });

  it('sorts dates ascending but keeps category order', () => {
    expect(orderStepXDomain(['2024-03-01', '2024-01-01', '2024-02-01'])).toEqual([
      '2024-01-01',
      '2024-02-01',
      '2024-03-01',
    ]);
    expect(orderStepXDomain(['Mar', 'Jan', 'Feb'])).toEqual(['Mar', 'Jan', 'Feb']);
  });
});

describe('collectStepYDomain', () => {
  it('pads the FuseDash extent by 1.2 and anchors at zero', () => {
    const series = normalizeStepLineData({
      points: [
        { x: 'A', y: 10 },
        { x: 'B', y: 50 },
      ],
    });
    expect(collectStepYDomain(series)).toEqual([0, 60]);
  });

  it('stays symmetric when values straddle zero', () => {
    const series = normalizeStepLineData({
      points: [
        { x: 'A', y: -20 },
        { x: 'B', y: 10 },
      ],
    });
    expect(collectStepYDomain(series)).toEqual([-24, 24]);
  });

  it('falls back to [0,1] with no usable values', () => {
    expect(collectStepYDomain([])).toEqual([0, 1]);
  });
});

describe('averageYByX', () => {
  it('means each x across series and marks gaps NaN', () => {
    const series = normalizeStepLineData({
      series: [
        {
          id: 'a',
          points: [
            { x: 'A', y: 10 },
            { x: 'B', y: 20 },
          ],
        },
        { id: 'b', points: [{ x: 'A', y: 30 }] },
      ],
    });
    const avg = averageYByX(series, ['A', 'B', 'C']);
    expect(avg[0]).toBe(20);
    expect(avg[1]).toBe(20);
    expect(Number.isNaN(avg[2])).toBe(true);
  });
});

describe('parseXDate', () => {
  it('reads calendar-only strings in local time, not UTC', () => {
    const d = parseXDate('2024-01-01');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
  });

  it('leaves full timestamps to the platform parser', () => {
    expect(parseXDate('2024-01-01T12:30:00Z').valueOf()).toBe(
      Date.parse('2024-01-01T12:30:00Z'),
    );
  });
});

describe('selectTickIndices', () => {
  const spread = (n: number, step: number) =>
    Array.from({ length: n }, (_, i) => i * step);

  it('keeps every label when there is room', () => {
    expect(selectTickIndices(['A', 'B', 'C'], spread(3, 200))).toEqual([0, 1, 2]);
  });

  it('thins labels when the axis is cramped', () => {
    const labels = Array.from({ length: 40 }, (_, i) => `label-${i}`);
    const kept = selectTickIndices(labels, spread(40, 12));
    expect(kept.length).toBeGreaterThan(1);
    expect(kept.length).toBeLessThan(labels.length);
  });

  it('always keeps the last tick and never lets it overlap', () => {
    const labels = Array.from({ length: 6 }, () => 'Feb 29, 2024 07:00 PM');
    const positions = spread(6, 90);
    const kept = selectTickIndices(labels, positions);
    expect(kept).toContain(5);
    // no kept pair sits closer than the widest label
    for (let i = 1; i < kept.length; i++) {
      expect(positions[kept[i]] - positions[kept[i - 1]]).toBeGreaterThan(90);
    }
  });

  it('skips ticks with non-finite positions', () => {
    expect(selectTickIndices(['A', 'B', 'C'], [0, Number.NaN, 400])).toEqual([0, 2]);
  });
});

describe('formatCompact', () => {
  it('matches the axis tick rule', () => {
    expect(formatCompact(1500)).toBe('1.5K');
    expect(formatCompact(2_500_000)).toBe('2.5M');
    expect(formatCompact(12)).toBe('12');
    expect(formatCompact(12.345)).toBe('12.35');
  });
});
