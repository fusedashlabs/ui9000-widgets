import { LOSS_COLORS } from '../lib/normalize.js';
import type { LossBand, LossLevel } from '../lib/types.js';

export type TickPaint = LossLevel | 'rest';

/** Colour of one tick. Past the marker the tick stays grey, even inside a band. */
export function tickPaint(
  index: number,
  count: number,
  ratio: number,
  min: number,
  max: number,
  bands: readonly LossBand[],
): TickPaint {
  if (count <= 0) return 'rest';
  const center = (index + 0.5) / count;
  if (center > ratio + 1e-6) return 'rest';
  const value = min + center * (max - min);
  const band = bands.find((item) => value >= item.from && value < item.to)
    ?? bands.find((item) => value >= item.from && value <= item.to);
  return band?.level ?? 'rest';
}

export function tickColor(paint: TickPaint): string {
  return LOSS_COLORS[paint];
}

/** Fill for one tick. A band colour in the payload replaces the level palette. */
export function tickFill(
  index: number,
  count: number,
  ratio: number,
  min: number,
  max: number,
  bands: readonly LossBand[],
): string {
  const paint = tickPaint(index, count, ratio, min, max, bands);
  if (paint === 'rest') return LOSS_COLORS.rest;
  const center = (index + 0.5) / count;
  const value = min + center * (max - min);
  const band = bands.find((item) => value >= item.from && value < item.to)
    ?? bands.find((item) => value >= item.from && value <= item.to);
  return band?.color ?? LOSS_COLORS[paint];
}

/** How many bars fill the track at the Figma density (about 5px bar, 3px gap). */
export function tickCountForWidth(width: number): number {
  if (!(width > 0)) return 53;
  const bar = 5;
  const gap = 3;
  return Math.max(16, Math.min(80, Math.floor((width + gap) / (bar + gap))));
}
