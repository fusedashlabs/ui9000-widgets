import { describe, expect, it } from 'vitest';

import { normalizeBubbleData, bubbleRadiusForValue } from '../lib/normalize.js';
import { bubbleXDomain, bubbleYDomain } from '../lib/domain.js';
import { generateBubbleColorRanges } from '../../../utils/fuse-palette.js';

import bubbleFixture from '../../../stories/fixtures/bubble.fusedash.json';

describe('normalizeBubbleData', () => {
  it('bubble.fusedash.json → 50 points, default group', () => {
    const model = normalizeBubbleData(bubbleFixture as never);
    expect(model.points.length).toBe(50);
    expect(model.groups.length).toBe(1);
    expect(model.xField).toBe('numberIncomeTransaction');
    expect(model.yField).toBe('totalOutcome');
    expect(model.colorRanges.length).toBeGreaterThan(0);
  });

  it('groupBy → one series per market segment', () => {
    const model = normalizeBubbleData({
      ...(bubbleFixture as object),
      groupBy: ['MD_Market_segment'],
      xAxe: ['quantity'],
      yAxe: ['price'],
      uniqueValues: {
        MD_Market_segment: ['Fresh', 'Processing'],
      },
      formatting: [
        { key: 'Fresh', color: '1' },
        { key: 'Processing', color: '2' },
      ],
      data: [
        { quantity: 42, price: 3180, MD_Market_segment: 'Fresh' },
        { quantity: 156, price: 980, MD_Market_segment: 'Processing' },
        { quantity: 71, price: 3410, MD_Market_segment: 'Fresh' },
      ],
    } as never);
    expect(model.groupField).toBe('MD_Market_segment');
    expect(model.groups.map((g) => g.key)).toEqual(['Fresh', 'Processing']);
    expect(model.points.length).toBe(3);
    expect(new Set(model.points.map((p) => p.color)).size).toBe(2);
  });

  it('accepts simple x/y rows', () => {
    const model = normalizeBubbleData([
      { x: 1, y: 100, group: 'A' },
      { x: 2, y: 200, group: 'B' },
    ]);
    expect(model.points.length).toBe(2);
    expect(model.groups.length).toBe(2);
  });

  it('returns empty for invalid payload', () => {
    expect(normalizeBubbleData(null).points).toEqual([]);
  });
});

describe('bubble domains and radii', () => {
  it('bubbleXDomain adds 10% padding', () => {
    const [min, max] = bubbleXDomain([100, 200]);
    expect(min).toBe(90);
    expect(max).toBe(210);
  });

  it('bubbleYDomain adds asymmetric 20% padding', () => {
    const [min, max] = bubbleYDomain([100, 200]);
    expect(min).toBe(90);
    expect(max).toBe(220);
  });

  it('generateBubbleColorRanges maps abs(y) to radii', () => {
    const ranges = generateBubbleColorRanges([100, 500, 5000]);
    expect(ranges.length).toBeGreaterThan(0);
    expect(ranges[0].color).toBe('transparent');
    expect(bubbleRadiusForValue(5000, ranges)).toBeGreaterThan(5);
  });
});
