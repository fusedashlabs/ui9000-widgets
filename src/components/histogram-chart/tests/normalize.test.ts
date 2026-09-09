import { describe, expect, it } from 'vitest';
import {
  collectYMax,
  normalizeHistogramData,
} from '../lib/index.js';

describe('normalizeHistogramData', () => {
  it('accepts [{label,value}]', () => {
    const model = normalizeHistogramData([
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
    ]);
    expect(model.bins).toHaveLength(2);
    expect(model.groups).toEqual(['Series']);
    expect(model.bins[0].stacks[0]).toMatchObject({
      group: 'Series',
      count: 10,
      start: 0,
      end: 10,
    });
    expect(model.bins[1].x0).toBe(1);
    expect(model.bins[1].x1).toBe(2);
    expect(collectYMax(model)).toBe(20);
  });

  it('accepts stacked bins object', () => {
    const model = normalizeHistogramData({
      xMin: 0,
      xMax: 20,
      bins: [
        {
          x0: 0,
          x1: 10,
          stacks: [
            { group: 'A', count: 3 },
            { group: 'B', count: 5 },
          ],
        },
        {
          x0: 10,
          x1: 20,
          stacks: [{ group: 'A', count: 2 }],
        },
      ],
    });
    expect(model.bins).toHaveLength(2);
    expect(model.groups).toEqual(['A', 'B']);
    expect(model.bins[0].stacks[1]).toMatchObject({
      group: 'B',
      count: 5,
      start: 3,
      end: 8,
    });
    expect(model.xMin).toBe(0);
    expect(model.xMax).toBe(20);
    expect(collectYMax(model)).toBe(8);
  });

  it('FuseDash nested widget without groupBy → one series', () => {
    const model = normalizeHistogramData({
      chartType: 'histogramChart',
      groupBy: [],
      uniqueValues: {},
      data: [
        {
          min: 0,
          max: 20,
          histogramResults: [
            { _id: {}, count: 4, bucketIndex: 0 },
            { _id: {}, count: 7, bucketIndex: 1 },
          ],
        },
      ],
    });
    expect(model.groups).toEqual(['default']);
    expect(model.bins).toHaveLength(2);
    expect(model.bins[0].stacks).toMatchObject([
      { group: 'default', count: 4, start: 0, end: 4 },
    ]);
    expect(model.xMin).toBe(0);
    expect(model.xMax).toBe(20);
    expect(collectYMax(model)).toBe(7);
  });

  it('FuseDash nested widget with groupBy → stacked bins', () => {
    const model = normalizeHistogramData({
      chartType: 'histogramChart',
      groupBy: ['weather-main'],
      uniqueValues: { 'weather-main': ['Clouds', 'Rain'] },
      data: [
        {
          min: 0,
          max: 10,
          histogramResults: [
            { _id: { 'weather-main': 'Clouds' }, count: 3, bucketIndex: 0 },
            { _id: { 'weather-main': 'Rain' }, count: 5, bucketIndex: 0 },
            { _id: { 'weather-main': 'Clouds' }, count: 2, bucketIndex: 1 },
          ],
        },
      ],
    });
    expect(model.groups).toEqual(['Clouds', 'Rain']);
    expect(model.bins).toHaveLength(2);
    expect(model.bins[0].stacks).toMatchObject([
      { group: 'Clouds', count: 3, start: 0, end: 3 },
      { group: 'Rain', count: 5, start: 3, end: 8 },
    ]);
    expect(model.bins[1].stacks).toMatchObject([
      { group: 'Clouds', count: 2, start: 0, end: 2 },
    ]);
    expect(collectYMax(model)).toBe(8);
  });

  it('returns empty for nullish / empty', () => {
    expect(normalizeHistogramData(null)).toEqual({
      bins: [],
      groups: [],
      xMin: 0,
      xMax: 1,
    });
    expect(normalizeHistogramData([])).toEqual({
      bins: [],
      groups: [],
      xMin: 0,
      xMax: 1,
    });
  });
});
