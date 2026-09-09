import { describe, expect, it } from 'vitest';

import { normalizeAreaData } from '../lib/normalize.js';

import areaFixture from '../../../stories/fixtures/area.fusedash.json';

describe('normalizeAreaData', () => {
  it('area.fusedash.json → five grouped series × eight years', () => {
    const model = normalizeAreaData(areaFixture as never);
    expect(model.layout).toBe('grouped');
    expect(model.series.length).toBe(5);
    expect(model.series[0].points.length).toBe(8);
    expect(model.series[0].points[0].x).toBe('2013');
    expect(model.series[0].points[0].y1).toBeGreaterThan(0);
  });

  it('detects stacked layout from widget.stacked + groupBy', () => {
    const model = normalizeAreaData({
      ...(areaFixture as object),
      stacked: true,
    } as never);
    expect(model.layout).toBe('stacked');
    expect(model.series.length).toBe(5);
    expect(model.series[0].points.every((p) => p.y1 >= p.y0)).toBe(true);
  });

  it('no groupBy → one series (single)', () => {
    const model = normalizeAreaData({
      ...(areaFixture as object),
      groupBy: [],
    } as never);
    expect(model.layout).toBe('grouped');
    expect(model.series.length).toBe(1);
    expect(model.series[0].points.length).toBe(8);
  });

  it('returns empty for invalid payload', () => {
    expect(normalizeAreaData(null).series).toEqual([]);
  });
});
