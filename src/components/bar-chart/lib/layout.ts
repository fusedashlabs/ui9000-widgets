import { FD } from '../../../utils/fusedash-visual.js';
import type { BarLayout } from './types.js';

/**
 * HorizontalGroupedBarChart inner gap between bars in a group
 * (`barSpacing = 4` in the client new design).
 */
export const BAR_GROUP_INNER_GAP = 4;
/**
 * Space between category bands on grouped horizontal charts —
 * client `groupPadding = 32` (`2 * barRowSpacing`).
 */
export const BAR_GROUP_PADDING = FD.barRowSpacing * 2;

/** Preferred row pitch for plain / stacked horizontal bars: 24 + 16×2. */
export function barRowPitch(): number {
  return FD.barRowThickness + FD.barRowSpacing * 2;
}

/**
 * Span of one grouped-horizontal category (bars + inner gaps), matching
 * client `numBarsInGroup * 24 + (n − 1) * 4`.
 */
export function barGroupSpan(seriesCount: number): number {
  const n = Math.max(seriesCount, 1);
  return n * FD.barRowThickness + BAR_GROUP_INNER_GAP * Math.max(n - 1, 0);
}

/**
 * Minimum plot height for a plain or stacked horizontal bar chart.
 * Client: `n * (24 + 16×2) + 16×2`.
 */
export function barMinCategorySpan(categoryCount: number): number {
  if (categoryCount <= 0) return 0;
  return categoryCount * barRowPitch() + FD.barRowSpacing * 2;
}

/**
 * Minimum plot height for a grouped horizontal bar chart.
 * Client: `nCategories * (groupSpan + 32)`.
 */
export function barGroupedMinCategorySpan(
  categoryCount: number,
  seriesCount: number,
): number {
  if (categoryCount <= 0) return 0;
  return categoryCount * (barGroupSpan(seriesCount) + BAR_GROUP_PADDING);
}

/** Band padding so grouped-horizontal categories keep a 32px gutter. */
export function barGroupedBandPadding(seriesCount: number): number {
  const step = barGroupSpan(seriesCount) + BAR_GROUP_PADDING;
  return step > 0 ? BAR_GROUP_PADDING / step : 0;
}

/**
 * Minimum categorical span for a horizontal bar chart. Grouped (multi-series,
 * not stacked) uses the grouped formula; plain and stacked share the row pitch.
 */
export function barHorizontalMinSpan(
  categoryCount: number,
  seriesCount: number,
  layout: BarLayout = 'grouped',
): number {
  const grouped = seriesCount > 1 && layout !== 'stacked';
  return grouped
    ? barGroupedMinCategorySpan(categoryCount, seriesCount)
    : barMinCategorySpan(categoryCount);
}
