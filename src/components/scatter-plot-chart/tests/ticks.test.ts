// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { areAllIntegers, formatScatterTick, getTickDecimals } from '../lib/index.js';
import type { ScatterPoint } from '../lib/index.js';
import { renderScatterPlot } from '../render/draw.js';

// FUS-4162: "Volume vs support" — X = n (whole numbers), Y = support pct (0.4 … 0.7).
const rows: Array<[number, number]> = [
  [64, 0.476], [96, 0.675], [145, 0.427], [147, 0.464], [257, 0.675], [347, 0.457],
  [382, 0.636], [488, 0.42], [498, 0.68], [500, 0.653], [532, 0.671], [722, 0.455],
  [756, 0.528], [768, 0.413], [769, 0.432], [797, 0.436], [802, 0.553], [803, 0.618],
  [813, 0.654], [836, 0.594], [897, 0.473], [913, 0.505],
];
const points: ScatterPoint[] = rows.map(([x, y]) => ({
  x,
  y,
  groupKey: 'all',
  color: '#4338ca',
  markerShape: 'circle',
  row: { n: x, support_pct: y },
}));

function axisLabels(axis: 'x-axis' | 'y-axis'): string[] {
  const host = document.createElement('div');
  document.body.append(host);
  renderScatterPlot(host, {
    points,
    width: 760,
    height: 320,
    theme: DEFAULT_THEME,
    xField: 'n',
    yField: 'support_pct',
  });
  return Array.from(host.querySelectorAll(`.${axis} .tick text`)).map((t) => t.textContent ?? '');
}

describe('scatter plot tick labels in the chat preview (FUS-4162)', () => {
  it('labels every Y tick of a 0..1 axis', () => {
    const labels = axisLabels('y-axis');
    expect(labels.length).toBeGreaterThan(2);
    expect(labels.every((l) => /^0\.\d+$/.test(l))).toBe(true);
  });

  it('keeps whole-number labels on an axis of counts', () => {
    const labels = axisLabels('x-axis');
    expect(labels.filter(Boolean).every((l) => /^\d+(\.\d)?K?$/.test(l))).toBe(true);
  });

  it('derives the decimals from the tick step and keeps percent axes in percent', () => {
    expect(getTickDecimals([0.4, 0.45, 0.5])).toBe(2);
    expect(getTickDecimals([0, 100, 200])).toBe(0);
    expect(formatScatterTick(0.45, { integerOnly: false, decimals: 2 })).toBe('0.45');
    expect(formatScatterTick(0.45, { integerOnly: false, decimals: 2, isPercentage: true })).toBe('45');
    expect(formatScatterTick(2.5, { integerOnly: true, decimals: 1 })).toBe('');
    expect(
      [0, 0.5, 1].map((t) => formatScatterTick(t, { integerOnly: true, decimals: 1 })),
    ).toEqual(['0', '', '1']);
    expect(areAllIntegers([1, 2])).toBe(true);
    expect(areAllIntegers([0.5])).toBe(false);
  });
});
