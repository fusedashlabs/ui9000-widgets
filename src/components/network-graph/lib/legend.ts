import type { NetworkRange } from './types.js';

/**
 * FuseDash RangeInput: left stays strictly below right, right strictly above
 * left — thumbs never share a slot (same as map bubble legend).
 */
export function slideThumb(
  current: NetworkRange,
  edge: 'leftSlider' | 'rightSlider',
  raw: number,
  rangeCount: number,
): NetworkRange {
  const max = Math.max(rangeCount, 1);
  if (edge === 'leftSlider') {
    return {
      leftSlider: Math.max(0, Math.min(current.rightSlider - 1, raw)),
      rightSlider: current.rightSlider,
    };
  }
  return {
    leftSlider: current.leftSlider,
    rightSlider: Math.max(current.leftSlider + 1, Math.min(max, raw)),
  };
}

export function sliderIndexFromPointer(
  clientX: number,
  track: { left: number; width: number },
  rangeCount: number,
): number {
  const max = Math.max(rangeCount, 1);
  if (track.width <= 0) return 0;
  const ratio = (clientX - track.left) / track.width;
  return Math.max(0, Math.min(max, Math.round(ratio * max)));
}

/** FuseDash RangeInput `getThumbPosition` — percent along that thumb's track. */
export function thumbTrackPercent(value: number, rangeCount: number): string {
  const max = Math.max(rangeCount, 1);
  return `${(value / max) * 100}%`;
}

/** FuseDash RangeInput track shift: 7px when a thumb sits on 0 or MAX. */
export function rangeTrackOffset(
  edge: 'left' | 'right',
  value: number,
  rangeCount: number,
): string {
  const max = Math.max(rangeCount, 1);
  if (edge === 'left') return value === 0 ? '7px' : '0px';
  return value === max ? '7px' : '0px';
}
