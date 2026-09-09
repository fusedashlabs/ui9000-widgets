import { describe, expect, it } from 'vitest';

import {
  rangeTrackOffset,
  slideThumb,
  sliderIndexFromPointer,
  thumbTrackPercent,
} from '../lib/legend.js';

describe('network legend thumbs', () => {
  it('rejects thumbs that would invert or meet', () => {
    expect(slideThumb({ leftSlider: 0, rightSlider: 7 }, 'leftSlider', 7, 7)).toEqual({
      leftSlider: 6,
      rightSlider: 7,
    });
    expect(slideThumb({ leftSlider: 0, rightSlider: 7 }, 'rightSlider', 0, 7)).toEqual({
      leftSlider: 0,
      rightSlider: 1,
    });
  });

  it('positions thumbs as a percent and shifts the track 7px at the ends', () => {
    expect(thumbTrackPercent(0, 7)).toBe('0%');
    expect(thumbTrackPercent(7, 7)).toBe('100%');
    expect(thumbTrackPercent(3, 7)).toBe(`${(3 / 7) * 100}%`);
    expect(rangeTrackOffset('left', 0, 7)).toBe('7px');
    expect(rangeTrackOffset('right', 7, 7)).toBe('7px');
    expect(rangeTrackOffset('left', 2, 7)).toBe('0px');
  });

  it('maps a pointer to a bucket index', () => {
    expect(sliderIndexFromPointer(50, { left: 0, width: 100 }, 7)).toBe(4);
    expect(sliderIndexFromPointer(0, { left: 0, width: 100 }, 7)).toBe(0);
    expect(sliderIndexFromPointer(100, { left: 0, width: 100 }, 7)).toBe(7);
  });
});
