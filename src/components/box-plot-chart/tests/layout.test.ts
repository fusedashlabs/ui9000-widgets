import { describe, expect, it } from 'vitest';

import {
  BIN_BAND_PADDING,
  BIN_SIZE,
  boxPlotGroupSpan,
  boxPlotMinCategorySpan,
} from '../lib/layout.js';

describe('boxPlot layout', () => {
  it('matches client group span for 5 crops', () => {
    // 12*5 + 4*4 = 76
    expect(boxPlotGroupSpan(5)).toBe(76);
  });

  it('requires 100px per year band with 5 groups', () => {
    expect(boxPlotMinCategorySpan(1, 5)).toBe(76 + BIN_BAND_PADDING);
    expect(boxPlotMinCategorySpan(8, 5)).toBe(8 * (76 + BIN_BAND_PADDING));
  });

  it('single group uses BIN_SIZE span', () => {
    expect(boxPlotGroupSpan(1)).toBe(BIN_SIZE);
  });
});
