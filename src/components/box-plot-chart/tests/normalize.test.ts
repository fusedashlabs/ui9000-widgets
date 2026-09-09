import { describe, expect, it } from 'vitest';
import {
  boxPlotLinearDomain,
  collectLabels,
  collectValueExtent,
  normalizeBoxPlotData,
} from '../lib/index.js';

const sampleBox = {
  label: '2013',
  group: 'Carrot',
  q1: 10,
  median: 20,
  q3: 30,
  smallestNonOutlier: 5,
  biggestNonOutlier: 40,
  outliers: [50],
};

describe('normalizeBoxPlotData', () => {
  it('accepts BoxPlotBox[]', () => {
    const model = normalizeBoxPlotData([sampleBox]);
    expect(model.boxes).toHaveLength(1);
    expect(model.boxes[0].label).toBe('2013');
    expect(model.groups).toEqual(['Carrot']);
    expect(model.orientation).toBe('vertical');
  });

  it('accepts { orientation, boxes }', () => {
    const model = normalizeBoxPlotData({
      orientation: 'horizontal',
      boxes: [sampleBox, { ...sampleBox, label: '2014', group: 'Onion' }],
    });
    expect(model.orientation).toBe('horizontal');
    expect(model.boxes).toHaveLength(2);
    expect(model.groups).toEqual(['Carrot', 'Onion']);
    expect(collectLabels(model)).toEqual(['2013', '2014']);
  });

  it('accepts FuseDash rows with xAxe / groupBy', () => {
    const model = normalizeBoxPlotData({
      orientation: 'vertical',
      xAxe: 'year',
      groupBy: 'MD_Crop',
      data: [
        {
          _id: { year: '2013', MD_Crop: 'Carrot' },
          q1: 189208,
          median: 485150,
          q3: 14000000,
          smallestNonOutlier: 43663,
          biggestNonOutlier: 20000000,
          outliers: [25000000],
        },
        {
          _id: { year: '2013', MD_Crop: 'Onion' },
          q1: 100,
          median: 200,
          q3: 300,
          smallestNonOutlier: 50,
          biggestNonOutlier: 400,
          outliers: [],
        },
      ],
    });
    expect(model.boxes).toHaveLength(2);
    expect(model.boxes[0]).toMatchObject({
      label: '2013',
      group: 'Carrot',
      q1: 189208,
      median: 485150,
    });
    expect(model.groups).toEqual(['Carrot', 'Onion']);
    expect(collectValueExtent(model.boxes)[1]).toBe(25000000);
    expect(boxPlotLinearDomain(model.boxes)[0]).toBe(0);
  });

  it('no groupBy → one series (single)', () => {
    const model = normalizeBoxPlotData({
      orientation: 'horizontal',
      xAxe: ['weekday'],
      uniqueValues: { weekday: ['Mon', 'Tue'] },
      data: [
        {
          _id: { weekday: 'Mon' },
          q1: 3.4,
          median: 5.1,
          q3: 7.8,
          smallestNonOutlier: 1.2,
          biggestNonOutlier: 12.6,
          outliers: [18.4],
        },
        {
          _id: { weekday: 'Tue' },
          q1: 4.0,
          median: 5.8,
          q3: 8.2,
          smallestNonOutlier: 1.8,
          biggestNonOutlier: 13.7,
        },
      ],
    });
    expect(model.boxes).toHaveLength(2);
    expect(model.boxes.every((b) => b.group == null)).toBe(true);
    expect(model.groups).toEqual(['default']);
    expect(model.categoryLabels).toEqual(['Mon', 'Tue']);
  });

  it('returns empty for nullish / empty', () => {
    const empty = {
      orientation: 'vertical' as const,
      boxes: [],
      groups: [],
      categoryLabels: [],
    };
    expect(normalizeBoxPlotData(null)).toEqual(empty);
    expect(normalizeBoxPlotData([])).toEqual(empty);
    expect(normalizeBoxPlotData(undefined)).toEqual(empty);
  });

  it('preserves uniqueValues order for groups and years', () => {
    const model = normalizeBoxPlotData({
      orientation: 'horizontal',
      xAxe: ['year'],
      groupBy: ['MD_Crop'],
      uniqueValues: {
        year: ['2013', '2014'],
        MD_Crop: ['Onion', 'Carrot'],
      },
      data: [
        {
          _id: { year: '2014', MD_Crop: 'Carrot' },
          q1: 1,
          median: 2,
          q3: 3,
          smallestNonOutlier: 0,
          biggestNonOutlier: 4,
        },
        {
          _id: { year: '2013', MD_Crop: 'Onion' },
          q1: 1,
          median: 2,
          q3: 3,
          smallestNonOutlier: 0,
          biggestNonOutlier: 4,
        },
      ],
    });
    expect(model.categoryLabels).toEqual(['2013', '2014']);
    expect(model.groups).toEqual(['Onion', 'Carrot']);
  });
});
