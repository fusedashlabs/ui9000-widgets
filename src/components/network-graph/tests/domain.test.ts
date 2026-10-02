import { describe, expect, it } from 'vitest';

import {
  FULL_RANGE,
  LINK_WIDTH,
  MAX_LINK_WIDTH,
  MIN_LINK_WIDTH,
  legendRanges,
  networkForces,
  nodeColor,
  nodeSizeKey,
  scaleLinkWidthByMax,
  visibleNodeIds,
} from '../lib/domain.js';
import { formatLegendValue, formatLinkValue, formatNodeValue } from '../lib/format.js';
import { normalizeNetworkGraphData } from '../lib/normalize.js';
import type { NetworkGraphInput } from '../lib/types.js';

import networkFixture from '../../../stories/fixtures/network-graph.fusedash.json';

const model = normalizeNetworkGraphData(networkFixture as NetworkGraphInput);

describe('node sizing', () => {
  it('buckets the fixture across the seven size keys', () => {
    const keys = model.nodes.map((n) => nodeSizeKey(n.value, model.breakpoints));
    expect(keys).toEqual([
      '3xl',
      'md',
      '2xl',
      'md',
      'lg',
      'sm',
      'xs',
      'xl',
      '3xl',
      'xl',
    ]);
  });

  it('falls back to sm without a value or break points', () => {
    expect(nodeSizeKey(undefined, model.breakpoints)).toBe('sm');
    expect(nodeSizeKey(10, [])).toBe('sm');
  });
});

describe('nodeColor', () => {
  it('prefers an explicit colour, then the category, then the default', () => {
    expect(nodeColor({ id: 'a', label: 'a', type: 'bank', color: '#123456' })).toBe('#123456');
    expect(nodeColor({ id: 'a', label: 'a', type: 'bank', color: '#473DD9' }, 'dark')).toBe('#473DD9');
    expect(nodeColor({ id: 'a', label: 'a', type: 'bank' })).toBe('#2563EB');
    expect(nodeColor({ id: 'a', label: 'a', type: 'nope' })).toBe('#64748B');
  });
});

describe('scaleLinkWidthByMax', () => {
  it('spans the client stroke range and stays above the resting width at the top', () => {
    expect(scaleLinkWidthByMax(0, 100)).toBe(MIN_LINK_WIDTH);
    expect(scaleLinkWidthByMax(100, 100)).toBe(MAX_LINK_WIDTH);
    expect(scaleLinkWidthByMax(100, 100)).toBeGreaterThan(LINK_WIDTH);
    expect(scaleLinkWidthByMax(5, 0)).toBe(MIN_LINK_WIDTH);
  });
});

describe('visibleNodeIds', () => {
  it('is null for the full window', () => {
    expect(visibleNodeIds(model, FULL_RANGE)).toBeNull();
  });

  it('keeps only nodes whose bucket falls inside the window', () => {
    const ids = visibleNodeIds(model, { leftSlider: 5, rightSlider: 7 });
    expect([...(ids ?? [])]).toEqual(['citigroup', 'capital_one', 'wells_fargo']);
  });

  it('drops nodes without a numeric value once filtering is on', () => {
    const partial = normalizeNetworkGraphData({
      nodes: [{ id: 'a', value: 1 }, { id: 'b' }],
      links: [],
    });
    const ids = visibleNodeIds(partial, { leftSlider: 0, rightSlider: 6 });
    expect([...(ids ?? [])]).toEqual(['a']);
  });
});

describe('legendRanges', () => {
  it('stretches the last bucket to 3x, like the client legend', () => {
    const ranges = legendRanges(model.breakpoints);
    expect(ranges).toHaveLength(7);
    expect(ranges[0].radius).toBe(4);
    expect(ranges[6].radius).toBe(32);
    expect(ranges[6].end).toBe(model.breakpoints[6] * 3);
    expect(ranges[0].end).toBe(model.breakpoints[1]);
  });
});

describe('networkForces', () => {
  it('scales with the container and never collides tighter than the largest node', () => {
    const small = networkForces(320, 200, 32);
    const large = networkForces(1400, 1400, 32);

    expect(Math.abs(small.charge)).toBeLessThan(Math.abs(large.charge));
    expect(small.collide).toBeGreaterThanOrEqual(68);
    expect(large.linkDistance).toBeLessThanOrEqual(100);
    expect(small.linkDistance).toBeGreaterThanOrEqual(20);
  });
});

describe('formatting', () => {
  it('matches the client label helpers', () => {
    expect(formatLinkValue(12600)).toBe('12.6K');
    expect(formatLinkValue(2000)).toBe('2K');
    expect(formatLinkValue(950)).toBe('950');
    expect(formatNodeValue(2405.7)).toBe('$2405.70');
    expect(formatNodeValue(undefined)).toBe('');
    expect(formatLegendValue(65, 2)).toBe('65.00');
    expect(formatLegendValue(2405.7, 2)).toBe('2.4 K');
  });
});
