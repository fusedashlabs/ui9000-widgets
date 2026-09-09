import { describe, expect, it } from 'vitest';

import {
  LOLLIPOP_GROUP_PADDING,
  LOLLIPOP_ROW_HEIGHT,
  lollipopGroupHeight,
  lollipopHorizontalMinSpan,
} from '../lib/layout.js';

describe('lollipop horizontal layout', () => {
  it('matches client barHeight / groupPadding', () => {
    expect(LOLLIPOP_ROW_HEIGHT).toBe(10);
    expect(LOLLIPOP_GROUP_PADDING).toBe(20);
  });

  it('sizes a category band from series count', () => {
    expect(lollipopGroupHeight(1)).toBe(10);
    expect(lollipopGroupHeight(5)).toBe(50);
  });

  it('matches client calculatedHeight = n * (groupHeight + groupPadding)', () => {
    expect(lollipopHorizontalMinSpan(8, 1)).toBe(8 * 30);
    expect(lollipopHorizontalMinSpan(8, 5)).toBe(8 * 70);
    expect(lollipopHorizontalMinSpan(0, 5)).toBe(0);
  });
});
