import { describe, expect, it } from 'vitest';

import { normalizeScatterData } from '../lib/normalize.js';
import { paddedLinearDomain } from '../lib/domain.js';

import scatterFixture from '../../../stories/fixtures/scatter.fusedash.json';

describe('normalizeScatterData', () => {
  it('scatter.fusedash.json → points with two groups', () => {
    const model = normalizeScatterData(scatterFixture as never);
    expect(model.points.length).toBe(456);
    expect(model.groups.length).toBe(2);
    expect(model.xField).toBe('totalIncome');
    expect(model.yField).toBe('totalOutcome');
    expect(model.groups.map((g) => g.key)).toEqual(['Diebold Nixdorf', 'NCR']);
  });

  it('accepts simple x/y rows', () => {
    const model = normalizeScatterData([
      { x: 1, y: 2, group: 'A' },
      { x: 3, y: 4, group: 'B' },
    ]);
    expect(model.points.length).toBe(2);
  });

  it('returns empty for invalid payload', () => {
    expect(normalizeScatterData(null).points).toEqual([]);
  });
});

describe('paddedLinearDomain', () => {
  it('adds padding without forcing zero', () => {
    const [min, max] = paddedLinearDomain([100, 200, 300]);
    expect(min).toBe(90);
    expect(max).toBe(310);
  });
});
