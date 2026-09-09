import { describe, expect, it } from 'vitest';
import {
  collectLabels,
  collectLollipopValueDomain,
  collectValueExtent,
  normalizeLollipopData,
  stackSegments,
} from '../lib/index.js';

describe('normalizeLollipopData', () => {
  it('accepts [{label,value}]', () => {
    const series = normalizeLollipopData([
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].points).toEqual([
      { label: 'A', value: 10, color: undefined },
      { label: 'B', value: 20, color: undefined },
    ]);
  });

  it('accepts multi-series', () => {
    const series = normalizeLollipopData({
      series: [
        {
          id: 'a',
          name: 'A',
          points: [
            { label: 'Q1', value: 5 },
            { label: 'Q2', value: 8 },
          ],
        },
        {
          id: 'b',
          points: [
            { label: 'Q1', value: 3 },
            { label: 'Q2', value: 4 },
          ],
        },
      ],
    });
    expect(series).toHaveLength(2);
    expect(collectLabels(series)).toEqual(['Q1', 'Q2']);
    expect(collectValueExtent(series)).toEqual([0, 8]);
  });

  it('FuseDash widget without groupBy → one series', () => {
    const series = normalizeLollipopData({
      chartType: 'lollipopChart',
      xAxe: ['cat'],
      yAxe: ['v'],
      groupBy: [],
      uniqueValues: { cat: ['A', 'B'] },
      data: [
        { cat: 'A', v: 10 },
        { cat: 'B', v: 20 },
      ],
    });
    expect(series).toHaveLength(1);
    expect(series[0].points.map((p) => p.label)).toEqual(['A', 'B']);
  });

  it('FuseDash widget with groupBy → one series per group', () => {
    const series = normalizeLollipopData({
      chartType: 'lollipopChart',
      xAxe: ['year'],
      yAxe: ['price'],
      groupBy: ['seg'],
      uniqueValues: { year: ['2013'], seg: ['Fresh', 'Other'] },
      data: [
        { year: '2013', price: 10, seg: 'Fresh' },
        { year: '2013', price: 4, seg: 'Other' },
      ],
    });
    expect(series.map((s) => s.id)).toEqual(['Fresh', 'Other']);
    expect(series[0].points).toMatchObject([
      { label: '2013', value: 10 },
    ]);
  });

  it('returns empty for nullish', () => {
    expect(normalizeLollipopData(null)).toEqual([]);
    expect(normalizeLollipopData([])).toEqual([]);
  });
});

describe('stackSegments / collectLollipopValueDomain', () => {
  const series = [
    {
      id: 'a',
      points: [
        { label: 'Q1', value: 5 },
        { label: 'Q2', value: 8 },
      ],
    },
    {
      id: 'b',
      points: [
        { label: 'Q1', value: 3 },
        { label: 'Q2', value: 4 },
      ],
    },
  ];

  it('stacks positive values away from 0', () => {
    expect(stackSegments(series, 'Q1')).toEqual([
      { series: series[0], seriesIndex: 0, start: 0, end: 5, value: 5 },
      { series: series[1], seriesIndex: 1, start: 5, end: 8, value: 3 },
    ]);
  });

  it('uses stack totals for the stacked domain', () => {
    const grouped = collectLollipopValueDomain(series, 'grouped');
    const stacked = collectLollipopValueDomain(series, 'stacked');
    expect(grouped[1]).toBeCloseTo(8 * 1.2);
    expect(stacked[1]).toBeCloseTo(12 * 1.2);
  });
});

