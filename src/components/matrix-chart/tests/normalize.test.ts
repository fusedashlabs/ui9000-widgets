import { describe, expect, it } from 'vitest';

import fusedashFixture from '../../../stories/fixtures/matrix.fusedash.json';
import { normalizeMatrixData, sortAxisDomain } from '../lib/index.js';
import { matrixColorRanges } from '../render/draw.js';

describe('normalizeMatrixData', () => {
  it('accepts MatrixCell[]', () => {
    const model = normalizeMatrixData([
      { x: 'Mon', y: 'Web', value: 10 },
      { x: 'Tue', y: 'Retail', value: 20 },
    ]);
    expect(model.cells).toHaveLength(2);
    expect(model.xDomain).toEqual(['Mon', 'Tue']);
    expect(model.yDomain).toEqual(['Web', 'Retail']);
    expect(model.rawValues).toEqual([10, 20]);
  });

  it('accepts { cells } and preserves explicit domains', () => {
    const model = normalizeMatrixData({
      cells: [
        { x: 'A', y: '1', value: 5 },
        { x: 'B', y: '2', value: 8 },
      ],
      xDomain: ['B', 'A'],
      yDomain: ['2', '1'],
    });
    expect(model.xDomain).toEqual(['B', 'A']);
    expect(model.yDomain).toEqual(['2', '1']);
  });

  it('mirrors client: groupBy on rows, xAxe on columns, sorted domains', () => {
    const model = normalizeMatrixData({
      data: [
        { day: 'Tue', channel: 'Web', orders: 12 },
        { day: 'Mon', channel: 'Retail', orders: 7 },
      ],
      xAxe: ['day'],
      yAxe: ['orders'],
      groupBy: ['channel'],
      uniqueValues: { channel: ['Web', 'Retail'] },
    });
    expect(model.categoryKey).toBe('channel');
    // sortAxisDomain: weekdays sort chronologically, rows sort alphabetically
    expect(model.xDomain).toEqual(['Mon', 'Tue']);
    expect(model.yDomain).toEqual(['Retail', 'Web']);
    expect(model.cells).toEqual([
      { x: 'Tue', y: 'Web', value: 12 },
      { x: 'Mon', y: 'Retail', value: 7 },
    ]);
  });

  it('keeps missing intersections out of the model so the plot can paint them empty', () => {
    const model = normalizeMatrixData({
      data: [{ day: 'Mon', channel: 'Web', orders: 12 }],
      xAxe: ['day'],
      yAxe: ['orders'],
      groupBy: ['channel'],
      uniqueValues: {
        day: ['Mon', 'Tue'],
        channel: ['Web', 'Retail'],
      },
    });
    expect(model.cells).toEqual([{ x: 'Mon', y: 'Web', value: 12 }]);
    // Both axes still list every declared category, including ones with no measurement
    expect(model.xDomain).toEqual(['Mon', 'Tue']);
    expect(model.yDomain).toEqual(['Retail', 'Web']);
    expect(model.rawValues).toEqual([12]);
  });

  it('follows groupBy even when another field comes first in row key order', () => {
    const model = normalizeMatrixData({
      xAxe: ['day'],
      yAxe: ['orders'],
      groupBy: ['channel'],
      uniqueValues: { day: ['Mon', 'Tue'], channel: ['Web', 'Retail'] },
      // A passthrough column sorts before `channel` in Object.keys order; the
      // client would category-key on it and plot nothing.
      data: [
        { day: 'Mon', datasetId: 'abc', orders: 12, channel: 'Web' },
        { day: 'Tue', datasetId: 'abc', orders: 7, channel: 'Retail' },
      ],
    });

    expect(model.categoryKey).toBe('channel');
    expect(model.yDomain).toEqual(['Retail', 'Web']);
    // Every cell must land inside the row domain, or the grid paints empty
    expect(model.cells.every((cell) => model.yDomain.includes(cell.y))).toBe(true);
    expect(model.cells).toContainEqual({ x: 'Mon', y: 'Web', value: 12 });
    expect(model.cells).toHaveLength(2);
  });

  it('prefers a uniqueValues-backed key when groupBy is absent from the rows', () => {
    const model = normalizeMatrixData({
      xAxe: ['day'],
      yAxe: ['orders'],
      groupBy: ['notOnTheRows'],
      uniqueValues: { channel: ['Web'] },
      data: [{ day: 'Mon', datasetId: 'abc', orders: 12, channel: 'Web' }],
    });
    expect(model.categoryKey).toBe('channel');
    expect(model.cells).toEqual([{ x: 'Mon', y: 'Web', value: 12 }]);
  });

  it('falls back to the first non-axis key when groupBy is missing', () => {
    const model = normalizeMatrixData({
      data: [{ region: 'EU', segment: 'SMB', total: 4 }],
      xAxe: ['region'],
      yAxe: ['total'],
      groupBy: null,
    });
    expect(model.categoryKey).toBe('segment');
    expect(model.cells).toEqual([{ x: 'EU', y: 'SMB', value: 4 }]);
  });

  it('returns empty for nullish / empty / unknown payloads', () => {
    const empty = {
      cells: [],
      xDomain: [],
      yDomain: [],
      rawValues: [],
      categoryKey: '',
      valueKey: '',
    };
    expect(normalizeMatrixData(null)).toEqual(empty);
    expect(normalizeMatrixData([])).toEqual(empty);
    expect(normalizeMatrixData({ cells: [] })).toEqual(empty);
    expect(normalizeMatrixData({ nope: true })).toEqual(empty);
    expect(normalizeMatrixData({ data: [] })).toEqual(empty);
  });
});

describe('DEFAULT_MATRIX fixture', () => {
  const model = normalizeMatrixData(fusedashFixture);

  it('keeps the FuseDash mock sparse inside the full axis domains', () => {
    expect(model.categoryKey).toBe('MD_Status');
    expect(model.valueKey).toBe('quantity kS');
    // 'Blocky ' and 'Blocky' are one column.
    expect(model.xDomain).toHaveLength(93);
    expect(model.yDomain).toHaveLength(50);
    expect(model.cells.length).toBeLessThanOrEqual(fusedashFixture.data.length);
    expect(model.cells.length).toBeLessThan(93 * 50);
    expect(model.rawValues).toHaveLength(fusedashFixture.data.length);
  });

  it('builds a seven-step legend from the largest value', () => {
    const ranges = matrixColorRanges(model);
    expect(ranges).toHaveLength(7);
    // The strongest colour of SequentialColors1 in the default page style.
    expect(ranges[0].color).toBe('color-mix(in srgb, #3C33B5 15%, transparent)');
    expect(ranges[6].color).toBe('color-mix(in srgb, #3C33B5 100%, transparent)');
    expect(ranges[6].end).toBe(Math.max(...model.rawValues));
  });
});

describe('categories that differ only in spaces', () => {
  const widget = (aggregationFunction?: string) => ({
    data: [
      { seed: 'OP ', segment: 'Red', revenue: 10 },
      { seed: 'OP', segment: 'Red  ', revenue: 30 },
      { seed: 'F1', segment: 'Red', revenue: 5 },
    ],
    xAxe: ['seed'],
    yAxe: ['revenue'],
    groupBy: ['segment'],
    uniqueValues: { seed: ['OP', 'F1'], segment: ['Red'] },
    aggregationFunction,
  });

  it('are one column and one row', () => {
    const model = normalizeMatrixData(widget());
    expect(model.xDomain).toEqual(['F1', 'OP']);
    expect(model.yDomain).toEqual(['Red']);
  });

  it('add up by default', () => {
    expect(normalizeMatrixData(widget()).cells).toEqual([
      { x: 'OP', y: 'Red', value: 40 },
      { x: 'F1', y: 'Red', value: 5 },
    ]);
  });

  it.each([
    ['min', 10],
    ['max', 30],
    ['avg', 20],
    ['sum', 40],
  ])('combine the way the widget aggregates: %s', (aggregation, value) => {
    expect(normalizeMatrixData(widget(aggregation)).cells[0].value).toBe(value);
  });

  it('keep categories that differ inside the name apart', () => {
    const model = normalizeMatrixData({
      data: [
        { seed: 'A', segment: 'New York', revenue: 1 },
        { seed: 'A', segment: 'NewYork', revenue: 2 },
        { seed: 'A', segment: 'Red  wine', revenue: 3 },
        { seed: 'A', segment: 'Red wine', revenue: 4 },
      ],
      xAxe: ['seed'],
      yAxe: ['revenue'],
      groupBy: ['segment'],
    });
    expect([...model.yDomain].sort()).toEqual(['New York', 'NewYork', 'Red  wine'].sort());
    expect(model.cells.find((cell) => cell.y === 'Red  wine')?.value).toBe(7);
  });

  it.each(['median', 'distinct', 'first', 'last'])(
    'are not merged when %s cannot be rebuilt from its parts',
    (aggregation) => {
      const model = normalizeMatrixData(widget(aggregation));
      expect(model.xDomain).toHaveLength(3);
      expect(model.yDomain).toHaveLength(2);
      expect(model.cells.map((cell) => cell.value).sort((a, b) => a - b)).toEqual([5, 10, 30]);
    },
  );
});

describe('sortAxisDomain', () => {
  it('sorts numbers numerically', () => {
    expect(sortAxisDomain(['10', '2', '1'])).toEqual(['1', '2', '10']);
  });

  it('sorts weekdays chronologically', () => {
    expect(sortAxisDomain(['Wed', 'Mon', 'Tue'])).toEqual(['Mon', 'Tue', 'Wed']);
  });

  it('falls back to locale compare', () => {
    expect(sortAxisDomain(['Retail', 'Web', 'Mobile'])).toEqual([
      'Mobile',
      'Retail',
      'Web',
    ]);
  });
});
