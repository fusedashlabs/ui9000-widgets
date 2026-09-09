import { describe, expect, it } from 'vitest';

import { normalizeAreaGroupedBarData } from '../lib/normalize.js';
import { areaGroupedBarYDomain } from '../lib/domain.js';

import fixture from '../../../stories/fixtures/area-grouped-bar.fusedash.json';

describe('normalizeAreaGroupedBarData', () => {
  it('area-grouped-bar.fusedash.json → non-empty categories, groups, line points', () => {
    const model = normalizeAreaGroupedBarData(fixture as never);
    expect(model.categories.length).toBeGreaterThan(0);
    expect(model.groups.length).toBe(5);
    expect(model.groups.map((g) => g.key)).toEqual(['0', '1', '2', '3', '4']);
    expect(model.linePoints.length).toBe(model.categories.length);
    expect(model.linePoints.length).toBeGreaterThan(0);
    expect(model.lineField).toBe('oldpeak');
    expect(model.barField).toBe('trestbps');
    expect(model.xField).toBe('age');
    expect(model.groupField).toBe('ca');
    expect(model.lineColor).toBeTruthy();
    expect(model.groups.every((g) => g.color)).toBe(true);
  });

  it('returns empty for invalid payload', () => {
    expect(normalizeAreaGroupedBarData(null).categories).toEqual([]);
    expect(normalizeAreaGroupedBarData(null).linePoints).toEqual([]);
  });

  it('y domain spans line + bar metrics', () => {
    const model = normalizeAreaGroupedBarData(fixture as never);
    const [min, max] = areaGroupedBarYDomain(model);
    expect(min).toBeLessThanOrEqual(0);
    expect(max).toBeGreaterThan(0);
  });
});
