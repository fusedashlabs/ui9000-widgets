import { describe, expect, it } from 'vitest';

import { FD } from '../../../utils/fusedash-visual.js';
import {
  BAR_GROUP_INNER_GAP,
  BAR_GROUP_PADDING,
  barGroupedBandPadding,
  barGroupedMinCategorySpan,
  barGroupSpan,
  barHorizontalMinSpan,
  barMinCategorySpan,
  barRowPitch,
} from '../lib/layout.js';

describe('bar chart layout', () => {
  it('uses FuseDash row pitch 24 + 16×2', () => {
    expect(barRowPitch()).toBe(FD.barRowThickness + FD.barRowSpacing * 2);
    expect(barRowPitch()).toBe(56);
  });

  it('matches client plain-horizontal min height', () => {
    // n * 56 + 32
    expect(barMinCategorySpan(1)).toBe(88);
    expect(barMinCategorySpan(12)).toBe(12 * 56 + 32);
  });

  it('matches client grouped-horizontal group span', () => {
    // 5 series: 24*5 + 4*4 = 136
    expect(barGroupSpan(5)).toBe(5 * 24 + 4 * BAR_GROUP_INNER_GAP);
    expect(BAR_GROUP_PADDING).toBe(32);
  });

  it('matches client grouped-horizontal min height', () => {
    expect(barGroupedMinCategorySpan(1, 5)).toBe(136 + 32);
    expect(barGroupedMinCategorySpan(14, 5)).toBe(14 * (136 + 32));
  });

  it('derives band padding from the 32px group gutter', () => {
    expect(barGroupedBandPadding(5)).toBeCloseTo(32 / (136 + 32));
  });

  it('picks the grouped formula only for multi-series grouped layout', () => {
    expect(barHorizontalMinSpan(8, 1, 'grouped')).toBe(barMinCategorySpan(8));
    expect(barHorizontalMinSpan(8, 5, 'stacked')).toBe(barMinCategorySpan(8));
    expect(barHorizontalMinSpan(8, 5, 'grouped')).toBe(
      barGroupedMinCategorySpan(8, 5),
    );
  });
});
