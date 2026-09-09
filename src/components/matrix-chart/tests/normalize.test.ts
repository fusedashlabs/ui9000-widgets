import { describe, expect, it } from 'vitest';

import fusedashFixture from '../../../stories/fixtures/matrix.fusedash.json';
import { normalizeMatrixData, sortAxisDomain } from '../lib/index.js';
import { horizontalLabelAngle, matrixColorRanges, matrixLayout } from '../render/draw.js';

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

  it('zero-fills the grid from uniqueValues like filledArrayWithZeroData', () => {
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
    expect(model.cells).toHaveLength(4);
    expect(model.cells).toContainEqual({ x: 'Tue', y: 'Retail', value: 0 });
    // Filler zeros must not reach the color ramp
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
    // Zero-fill uses the same field, so the grid is complete
    expect(model.cells).toHaveLength(4);
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

  it('normalizes the FuseDash mock into a dense grid', () => {
    expect(model.categoryKey).toBe('MD_Status');
    expect(model.valueKey).toBe('quantity kS');
    expect(model.xDomain).toHaveLength(94);
    expect(model.yDomain).toHaveLength(50);
    expect(model.cells).toHaveLength(94 * 50);
    expect(model.rawValues).toHaveLength(fusedashFixture.data.length);
  });

  it('builds a seven-band sequential ramp from the real values only', () => {
    const ranges = matrixColorRanges(model);
    expect(ranges).toHaveLength(7);
    expect(ranges[0].color).toBe('#D6D3FF');
    expect(ranges[6].color).toBe('#3C33B5');
    expect(ranges[6].end).toBe(Math.max(...model.rawValues));
  });

  it('pins the header and overflows once the rows exceed the row limit', () => {
    const layout = matrixLayout(model, 400, { top: 20, bottom: 30 });
    expect(layout.separateTopAxis).toBe(true);
    // 50 rows never shrink below the 16px floor
    expect(layout.rowsHeight).toBe(50 * 16);
    expect(layout.needsScroll).toBe(true);
  });
});

describe('matrixLayout', () => {
  it('keeps the header inline and fills the viewport for few rows', () => {
    const model = normalizeMatrixData([
      { x: 'A', y: 'one', value: 1 },
      { x: 'B', y: 'two', value: 2 },
    ]);
    const layout = matrixLayout(model, 300, { top: 20, bottom: 30 });
    expect(layout.separateTopAxis).toBe(false);
    expect(layout.topAxisHeight).toBe(41);
    expect(layout.needsScroll).toBe(false);
    expect(layout.contentHeight).toBeLessThanOrEqual(300);
  });
});

describe('horizontalLabelAngle', () => {
  it('leaves labels flat when they fit their band', () => {
    expect(horizontalLabelAngle(40, 80, 11)).toBe(0);
  });

  it('goes vertical when the band is narrower than the line height', () => {
    expect(horizontalLabelAngle(60, 10, 11)).toBe(-90);
  });

  it('tilts in 5-degree steps in between', () => {
    const angle = horizontalLabelAngle(60, 40, 11);
    expect(angle).toBeLessThan(0);
    expect(angle).toBeGreaterThan(-90);
    expect(Math.abs(angle % 5)).toBe(0);
  });
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
