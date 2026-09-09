import { describe, expect, it } from 'vitest';
import {
  collectValueExtent,
  maxAbsValue,
  normalizePunchcardData,
} from '../lib/index.js';

describe('normalizePunchcardData', () => {
  it('accepts PunchcardCell[]', () => {
    const model = normalizePunchcardData([
      { x: 'Mon', y: 'AM', value: 10 },
      { x: 'Tue', y: 'PM', value: 20 },
    ]);
    expect(model.cells).toHaveLength(2);
    expect(model.xDomain).toEqual(['Mon', 'Tue']);
    expect(model.yDomain).toEqual(['AM', 'PM']);
  });

  it('accepts { cells } and preserves domains', () => {
    const model = normalizePunchcardData({
      cells: [
        { x: 'A', y: '1', value: 5 },
        { x: 'B', y: '2', value: 8, color: '#f00' },
      ],
      xDomain: ['B', 'A'],
      yDomain: ['2', '1'],
    });
    expect(model.cells[1].color).toBe('#f00');
    expect(model.xDomain).toEqual(['B', 'A']);
    expect(model.yDomain).toEqual(['2', '1']);
    expect(collectValueExtent(model)).toEqual([0, 8]);
    expect(maxAbsValue(model)).toBe(8);
  });

  it('mirrors client: groupBy categories on Y, yAxe as measure', () => {
    const model = normalizePunchcardData({
      data: [
        { day: 'Mon', hour: '9am', count: 12 },
        { day: 'Mon', hour: '10am', count: 7 },
        { day: 'Tue', hour: '9am', count: 15 },
      ],
      xAxe: ['day'],
      yAxe: ['count'],
      groupBy: ['hour'],
    });
    expect(model.cells).toEqual([
      { x: 'Mon', y: '9am', value: 12, color: undefined },
      { x: 'Mon', y: '10am', value: 7, color: undefined },
      { x: 'Tue', y: '9am', value: 15, color: undefined },
    ]);
    expect(model.xDomain).toEqual(['Mon', 'Tue']);
    expect(model.yDomain).toEqual(['9am', '10am']);
  });

  it('mirrors client DEFAULT_PUNCHCARD: groupBy null → uniqueValues key as Y', () => {
    const model = normalizePunchcardData({
      chartType: 'punchcardChart',
      xAxe: ['year'],
      yAxe: ['revenue euro'],
      groupBy: null,
      uniqueValues: {
        year: ['2013', '2014'],
      },
      data: [
        { year: '2013', 'revenue euro': 100 },
        { year: '2014', 'revenue euro': 200 },
      ],
    });
    expect(model.cells).toEqual([
      { x: '2013', y: '2013', value: 100, color: undefined },
      { x: '2014', y: '2014', value: 200, color: undefined },
    ]);
    expect(model.xDomain).toEqual(['2013', '2014']);
    expect(model.yDomain).toEqual(['2013', '2014']);
  });

  it('returns empty for nullish / empty', () => {
    expect(normalizePunchcardData(null)).toEqual({
      cells: [],
      xDomain: [],
      yDomain: [],
    });
    expect(normalizePunchcardData([])).toEqual({
      cells: [],
      xDomain: [],
      yDomain: [],
    });
    expect(normalizePunchcardData({ cells: [] })).toEqual({
      cells: [],
      xDomain: [],
      yDomain: [],
    });
  });
});
