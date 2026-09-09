import { describe, expect, it } from 'vitest';

import { computeDonutInnerRadius, MIN_DONUT_THICKNESS } from '../lib/domain.js';
import { normalizeDonutData } from '../lib/index.js';

import donutFixture from '../../../stories/fixtures/donut.fusedash.json';

describe('computeDonutInnerRadius', () => {
  it('matches FuseDash thickness ratio with minimum ring width', () => {
    expect(computeDonutInnerRadius(100)).toBe(70);
    expect(computeDonutInnerRadius(50)).toBe(25);
    expect(computeDonutInnerRadius(40)).toBe(40 - MIN_DONUT_THICKNESS);
  });
});

describe('normalizeDonutData', () => {
  it('donut.fusedash.json → 12 slices in calendar order', () => {
    const model = normalizeDonutData(donutFixture as never);
    expect(model.slices.length).toBe(12);
    expect(model.slices[0].label).toBe('January');
    expect(model.slices[11].label).toBe('December');
    expect(model.total).toBeGreaterThan(0);
  });

  it('returns empty for invalid payload', () => {
    expect(normalizeDonutData(null).slices).toEqual([]);
  });
});
