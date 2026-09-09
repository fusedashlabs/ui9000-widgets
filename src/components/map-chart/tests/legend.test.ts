import { describe, expect, it } from 'vitest';

import {
  clampLayerSlider,
  defaultLayerSlider,
  featuresForYear,
  featuresInSliderRange,
  formatAverage,
  formatFieldLabel,
  formatLegendBucket,
  legendLayerOrder,
  legendSpikeHeight,
  slideThumb,
  sliderIndexFromPointer,
  sliderValueWindow,
  rangeTrackOffset,
  thumbTrackPercent,
} from '../lib/legend.js';
import type { ColorRange, GeoJsonFeature } from '../lib/types.js';

const RANGES: ColorRange[] = [
  { start: 0, end: 10, color: '#a', radius: 10, height: 8 },
  { start: 10, end: 20, color: '#b', radius: 15, height: 12 },
  { start: 20, end: 40, color: '#c', radius: 20, height: 16 },
];

function point(value: number, id: string): GeoJsonFeature {
  return {
    type: 'Feature',
    properties: { id, value },
    geometry: { type: 'Point', coordinates: [0, 0] },
  };
}

describe('map legend sliders', () => {
  it('defaults the right thumb to the bucket count (exclusive)', () => {
    expect(defaultLayerSlider(7)).toEqual({ leftSlider: 0, rightSlider: 7 });
    expect(defaultLayerSlider(0)).toEqual({ leftSlider: 0, rightSlider: 1 });
  });

  it('rejects thumbs that would invert or meet', () => {
    expect(clampLayerSlider({ leftSlider: 3, rightSlider: 3 }, 7)).toBeNull();
    expect(clampLayerSlider({ leftSlider: 4, rightSlider: 2 }, 7)).toBeNull();
    expect(clampLayerSlider({ leftSlider: 1, rightSlider: 5 }, 7)).toEqual({
      leftSlider: 1,
      rightSlider: 5,
    });
  });

  it('reads the value window from the inclusive-left exclusive-right buckets', () => {
    expect(sliderValueWindow(RANGES, { leftSlider: 0, rightSlider: 3 })).toEqual({
      start: 0,
      end: 40,
    });
    expect(sliderValueWindow(RANGES, { leftSlider: 1, rightSlider: 2 })).toEqual({
      start: 10,
      end: 20,
    });
  });

  it('keeps only features for the selected year', () => {
    const features = [
      point(5, 'a'),
      { ...point(8, 'b'), properties: { id: 'b', value: 8, year: '2020' } },
      { ...point(9, 'c'), properties: { id: 'c', value: 9, year: '2021' } },
    ];
    expect(featuresForYear(features, undefined, 'year').map((f) => f.properties?.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(featuresForYear(features, '2021', 'year').map((f) => f.properties?.id)).toEqual(['c']);
  });

  it('drops features outside the thumb window', () => {
    const features = [point(5, 'a'), point(15, 'b'), point(30, 'c')];
    const kept = featuresInSliderRange(features, RANGES, { leftSlider: 1, rightSlider: 2 });
    expect(kept.map((f) => f.properties?.id)).toEqual(['b']);
  });

  it('lists layers markers → spikes → bubbles → choropleth', () => {
    const ordered = legendLayerOrder([
      { visualisationType: 'choropleth' as const },
      { visualisationType: 'markers' as const },
      { visualisationType: 'bubbles' as const },
    ]);
    expect(ordered.map((l) => l.visualisationType)).toEqual(['markers', 'bubbles', 'choropleth']);
  });

  it('keeps a one-bucket gap so thumbs never occupy the same slot', () => {
    const current = { leftSlider: 2, rightSlider: 5 };
    expect(slideThumb(current, 'leftSlider', 5, 7)).toEqual({ leftSlider: 4, rightSlider: 5 });
    expect(slideThumb(current, 'rightSlider', 2, 7)).toEqual({ leftSlider: 2, rightSlider: 3 });
    expect(slideThumb(current, 'leftSlider', -3, 7)).toEqual({ leftSlider: 0, rightSlider: 5 });
    expect(slideThumb(current, 'rightSlider', 99, 7)).toEqual({ leftSlider: 2, rightSlider: 7 });
  });

  it('snaps pointer x to a bucket index', () => {
    expect(sliderIndexFromPointer(50, { left: 0, width: 100 }, 7)).toBe(4);
    expect(sliderIndexFromPointer(-10, { left: 0, width: 100 }, 7)).toBe(0);
    expect(sliderIndexFromPointer(400, { left: 0, width: 100 }, 7)).toBe(7);
  });

  it('positions thumbs as a percent and shifts the track 7px at the ends', () => {
    expect(thumbTrackPercent(0, 7)).toBe('0%');
    expect(thumbTrackPercent(7, 7)).toBe('100%');
    expect(thumbTrackPercent(3, 7)).toBe(`${(3 / 7) * 100}%`);
    expect(rangeTrackOffset('left', 0, 7)).toBe('7px');
    expect(rangeTrackOffset('left', 2, 7)).toBe('0px');
    expect(rangeTrackOffset('right', 7, 7)).toBe('7px');
    expect(rangeTrackOffset('right', 4, 7)).toBe('0px');
  });

  it('sizes legend spikes from DEFAULT_SPIKE_SIZES, not map spike heights', () => {
    expect(legendSpikeHeight(0)).toBe(6);
    expect(legendSpikeHeight(7)).toBe(43);
  });

  it('formats averages, field labels, and bucket edges like FuseDash', () => {
    expect(formatAverage(12.5)).toBe('12.50');
    expect(formatAverage(1200)).toBe('1,200');
    expect(formatFieldLabel('Country__created')).toBe('Country created');
    expect(formatFieldLabel('Temperature')).toBe('Temperature');
    expect(formatLegendBucket(12.5, 2)).toBe('12.50');
    expect(formatLegendBucket(2405.7, 2)).toBe('2.4 K');
  });
});
