import { describe, expect, it } from 'vitest';

import fusedashFixture from '../../../stories/fixtures/parallel-coordinates.fusedash.json';
import {
  MAX_PARALLEL_LINES,
  axisExtent,
  formatAxisTick,
  normalizeParallelCoordinatesData,
  resolveParallelFormatting,
  tickCountForSpan,
  type ParallelCoordinatesFusePayload,
} from '../lib/index.js';

const FUSEDASH_MOCK = fusedashFixture as unknown as ParallelCoordinatesFusePayload;

describe('normalizeParallelCoordinatesData', () => {
  it('accepts the FuseDash DEFAULT_PARALLEL_COORDINATES_CHART mock', () => {
    const model = normalizeParallelCoordinatesData(FUSEDASH_MOCK);

    expect(model.orientation).toBe('horizontal');
    expect(model.axes).toEqual(FUSEDASH_MOCK.uniqueValues?.['dimensions' as never]);
    expect(model.rows).toHaveLength(15);
    expect(model.idKey).toBe('id');
    // `yAxe` is "dimensions" — the field holding the axis list, not an axis, so
    // the client falls through to the first dimension.
    expect(model.colorKey).toBe('sepalLength');
    expect(model.minColor).toBe('#473DD9');
    expect(model.maxColor).toBe('#36C4A5');
  });

  it('sorts rows ascending by xAxe and keeps every dimension value', () => {
    const model = normalizeParallelCoordinatesData(FUSEDASH_MOCK);

    expect(model.rows.map((r) => r.id).slice(0, 3)).toEqual([
      'sample1',
      'sample2',
      'sample3',
    ]);
    expect(model.rows[0].values).toEqual({
      sepalLength: 5.1,
      sepalWidth: 3.5,
      petalLength: 1.4,
      petalWidth: 0.2,
    });
  });

  it('honours a yAxe that does name one of the dimensions', () => {
    const model = normalizeParallelCoordinatesData({
      ...FUSEDASH_MOCK,
      yAxe: ['petalWidth'],
    });

    expect(model.colorKey).toBe('petalWidth');
  });

  it('resolves the colour ramp from widget formatting', () => {
    const model = normalizeParallelCoordinatesData({
      ...FUSEDASH_MOCK,
      formatting: [
        { key: 'defaultMin', color: '2' },
        { key: 'defaultMax', color: '1' },
      ],
    });

    expect(model.minColor).toBe('#36C4A5');
    expect(model.maxColor).toBe('#473DD9');
  });

  it('cycles an out-of-range colour index like client getCurrentColor', () => {
    const model = normalizeParallelCoordinatesData({
      ...FUSEDASH_MOCK,
      // The ramp always resolves against the 2-colour qualitative palette, so
      // index 3 wraps back to the first entry instead of falling back to red.
      formatting: [{ key: 'defaultMin', color: '3' }],
    });

    expect(model.minColor).toBe('#473DD9');
    expect(model.maxColor).toBe('#36C4A5');
  });

  it('accepts a chat rows payload with explicit axes', () => {
    const model = normalizeParallelCoordinatesData({
      orientation: 'vertical',
      idKey: 'model',
      axes: ['accuracy', 'latencyMs'],
      rows: [
        { model: 'beta', accuracy: 0.86, latencyMs: 120 },
        { model: 'alpha', accuracy: 0.91, latencyMs: 240 },
      ],
    });

    expect(model.orientation).toBe('vertical');
    expect(model.axes).toEqual(['accuracy', 'latencyMs']);
    expect(model.rows.map((r) => r.id)).toEqual(['alpha', 'beta']);
    expect(model.colorKey).toBe('accuracy');
  });

  it('infers axes and the label field from plain rows', () => {
    const model = normalizeParallelCoordinatesData([
      { name: 'a', x: 1, y: 4 },
      { name: 'b', x: 2, y: 3 },
    ]);

    expect(model.idKey).toBe('name');
    expect(model.axes).toEqual(['x', 'y']);
    expect(model.rows).toHaveLength(2);
  });

  it('keeps a partial row and drops one with no numeric value', () => {
    const model = normalizeParallelCoordinatesData({
      axes: ['x', 'y'],
      idKey: 'name',
      rows: [
        { name: 'a', x: 1, y: null },
        { name: 'b', x: 'n/a', y: undefined },
      ],
    });

    expect(model.rows).toHaveLength(1);
    expect(model.rows[0].values).toEqual({ x: 1, y: null });
  });

  it('caps the polyline count so a raw dataset cannot flood the plot', () => {
    const rows = Array.from({ length: MAX_PARALLEL_LINES + 25 }, (_, i) => ({
      name: `r${i}`,
      x: i,
      y: i * 2,
    }));

    expect(normalizeParallelCoordinatesData(rows).rows).toHaveLength(
      MAX_PARALLEL_LINES,
    );
  });

  it('returns an empty model for invalid or axis-less payloads', () => {
    for (const input of [null, undefined, [], {}, { data: [] }, 'nope' as never]) {
      const model = normalizeParallelCoordinatesData(input as never);
      expect(model.axes).toEqual([]);
      expect(model.rows).toEqual([]);
    }
  });
});

describe('resolveParallelFormatting', () => {
  it('fills in the two ramp keys the settings panel writes', () => {
    expect(resolveParallelFormatting(undefined)).toEqual([
      { key: 'defaultMin', color: '1' },
      { key: 'defaultMax', color: '2' },
    ]);
  });

  it('keeps an entry the widget already carries', () => {
    expect(resolveParallelFormatting([{ key: 'defaultMax', color: '7' }])).toEqual([
      { key: 'defaultMin', color: '1' },
      { key: 'defaultMax', color: '7' },
    ]);
  });
});

describe('axisExtent', () => {
  const rows = normalizeParallelCoordinatesData(FUSEDASH_MOCK).rows;

  it('measures each dimension independently', () => {
    expect(axisExtent(rows, 'sepalLength')).toEqual([4.6, 7.1]);
    expect(axisExtent(rows, 'petalWidth')).toEqual([0.2, 2.5]);
  });

  it('widens a flat axis so the scale keeps a range', () => {
    expect(axisExtent([{ id: 'a', values: { x: 3 } }], 'x')).toEqual([3, 4]);
  });

  it('falls back to [0, 1] when nothing is finite', () => {
    expect(axisExtent([{ id: 'a', values: { x: null } }], 'x')).toEqual([0, 1]);
  });
});

describe('tickCountForSpan', () => {
  it('scales with the available span and stays within 2–8', () => {
    expect(tickCountForSpan(0)).toBe(2);
    expect(tickCountForSpan(160)).toBe(2);
    expect(tickCountForSpan(400)).toBe(5);
    expect(tickCountForSpan(5000)).toBe(8);
  });
});

describe('formatAxisTick', () => {
  it('trims the fixed decimals so dense axes stay narrow', () => {
    expect(formatAxisTick(4.6)).toBe('4.6');
    expect(formatAxisTick(5)).toBe('5');
    expect(formatAxisTick(0.2)).toBe('0.2');
    expect(formatAxisTick(1.05)).toBe('1.05');
  });

  it('keeps the K/M/B shortening', () => {
    expect(formatAxisTick(1400)).toBe('1.4K');
    expect(formatAxisTick(1000)).toBe('1K');
    expect(formatAxisTick(2_500_000)).toBe('2.5M');
  });
});
