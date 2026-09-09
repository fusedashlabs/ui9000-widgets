import { describe, expect, it } from 'vitest';

import { normalizePartialDependenceData } from '../lib/normalize.js';
import { computeAverageSeries, nearestAveragePoint } from '../lib/series.js';
import { pdpLinearDomain } from '../lib/domain.js';

import pdpFixture from '../../../stories/fixtures/partial-dependence.fusedash.json';

describe('normalizePartialDependenceData', () => {
  it('partial-dependence.fusedash.json → 16 ICE curves plus a computed average', () => {
    const model = normalizePartialDependenceData(pdpFixture as never);
    expect(model.iceSeries.length).toBe(16);
    expect(model.xField).toBe('humidity');
    expect(model.yField).toBe('pd');
    expect(model.groupField).toBe('series');
    expect(model.color).toBe('#473DD9');
    expect(model.iceSeries.every((s) => s.points.length === 41)).toBe(true);
    // average is sampled on the union of all ICE x values
    expect(model.averageSeries.length).toBe(41);
  });

  it('sorts each ICE curve by x', () => {
    const model = normalizePartialDependenceData(pdpFixture as never);
    for (const series of model.iceSeries) {
      const xs = series.points.map((p) => p.x);
      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    }
  });

  it('drops any supplied "Average" group so the average is always local', () => {
    const model = normalizePartialDependenceData({
      xAxe: ['x'],
      yAxe: ['y'],
      groupBy: ['g'],
      data: [
        { x: 0, y: 0, g: 'a' },
        { x: 1, y: 10, g: 'a' },
        { x: 0, y: 2, g: 'b' },
        { x: 1, y: 20, g: 'b' },
        { x: 0, y: 999, g: 'Average' },
        { x: 1, y: 999, g: 'Average' },
      ],
    } as never);
    expect(model.iceSeries.map((s) => s.key)).toEqual(['a', 'b']);
    expect(model.averageSeries).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 15 },
    ]);
  });

  it('orders ICE curves by uniqueValues[groupBy]', () => {
    const model = normalizePartialDependenceData({
      xAxe: ['x'],
      yAxe: ['y'],
      groupBy: ['g'],
      uniqueValues: { g: ['b', 'a'] },
      data: [
        { x: 0, y: 1, g: 'a' },
        { x: 1, y: 2, g: 'a' },
        { x: 0, y: 3, g: 'b' },
        { x: 1, y: 4, g: 'b' },
      ],
    } as never);
    expect(model.iceSeries.map((s) => s.key)).toEqual(['b', 'a']);
  });

  it('accepts chat x/y rows, series and points shapes', () => {
    expect(
      normalizePartialDependenceData([
        { x: 0, y: 1, group: 'a' },
        { x: 1, y: 2, group: 'a' },
        { x: 0, y: 3, group: 'b' },
      ]).iceSeries.length,
    ).toBe(2);

    expect(
      normalizePartialDependenceData({
        series: [{ id: 's1', points: [{ x: 0, y: 1 }, { x: 1, y: 3 }] }],
      }).averageSeries,
    ).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
    ]);

    expect(
      normalizePartialDependenceData({ points: [{ x: 0, y: 5 }, { x: 2, y: 7 }] }).iceSeries
        .length,
    ).toBe(1);

    expect(
      normalizePartialDependenceData([
        { label: 0.5, value: 4 },
        { label: 1.5, value: 6 },
      ]).iceSeries[0].points,
    ).toEqual([
      { x: 0.5, y: 4 },
      { x: 1.5, y: 6 },
    ]);
  });

  it('sanitizes a pre-shaped iceSeries payload and recomputes the average', () => {
    const model = normalizePartialDependenceData({
      iceSeries: [
        { key: 'b', points: [{ x: 1, y: 10 }, { x: 0, y: 0 }] },
        { key: 'a', points: [{ x: 0, y: 2 }, { x: 1, y: 20 }] },
        { key: 'Average', points: [{ x: 0, y: 999 }, { x: 1, y: 999 }] },
      ],
      averageSeries: [{ x: 0, y: 999 }],
      xField: 'humidity',
      yField: 'pd',
      color: '#473DD9',
    });
    expect(model.iceSeries.map((s) => s.key)).toEqual(['b', 'a']);
    expect(model.iceSeries[0].points.map((p) => p.x)).toEqual([0, 1]);
    expect(model.averageSeries).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 15 },
    ]);
    expect(model.xField).toBe('humidity');
    expect(model.color).toBe('#473DD9');
  });

  it('returns an empty model for invalid payloads', () => {
    expect(normalizePartialDependenceData(null).iceSeries).toEqual([]);
    expect(normalizePartialDependenceData([]).iceSeries).toEqual([]);
    expect(normalizePartialDependenceData({ data: [] } as never).iceSeries).toEqual([]);
    expect(
      normalizePartialDependenceData({
        xAxe: ['x'],
        yAxe: ['y'],
        data: [{ x: 'nope', y: 'nope' }],
      } as never).iceSeries,
    ).toEqual([]);
  });
});

describe('computeAverageSeries', () => {
  it('interpolates curves onto the union of their x values', () => {
    const avg = computeAverageSeries([
      [
        { x: 0, y: 0 },
        { x: 2, y: 20 },
      ],
      [
        { x: 1, y: 5 },
        { x: 3, y: 15 },
      ],
    ]);
    // x=1 → curve A interpolated to 10, curve B at 5
    expect(avg.map((p) => p.x)).toEqual([0, 1, 2, 3]);
    expect(avg[1].y).toBeCloseTo(7.5, 10);
    // x=3 sits past curve A, which holds its last value (20)
    expect(avg[3].y).toBeCloseTo(17.5, 10);
  });

  it('ignores empty curves', () => {
    expect(computeAverageSeries([[], []])).toEqual([]);
  });
});

describe('nearestAveragePoint', () => {
  const avg = [
    { x: 0, y: 0 },
    { x: 1, y: 10 },
    { x: 2, y: 20 },
  ];

  it('snaps to the closest sample', () => {
    expect(nearestAveragePoint(avg, 1.4)?.x).toBe(1);
    expect(nearestAveragePoint(avg, 1.6)?.x).toBe(2);
    expect(nearestAveragePoint(avg, -5)?.x).toBe(0);
    expect(nearestAveragePoint(avg, 99)?.x).toBe(2);
  });

  it('returns null with no average curve', () => {
    expect(nearestAveragePoint([], 1)).toBeNull();
  });
});

describe('pdpLinearDomain', () => {
  it('uses the raw extent, without a zero baseline', () => {
    expect(pdpLinearDomain([10, 20, 30])).toEqual([10, 30]);
  });

  it('spreads a flat domain and falls back when nothing is finite', () => {
    expect(pdpLinearDomain([5, 5])).toEqual([5 - 1e-6, 5 + 1e-6]);
    expect(pdpLinearDomain([Number.NaN])).toEqual([0, 1]);
  });
});
