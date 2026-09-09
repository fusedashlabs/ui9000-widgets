/** Client HorizontalLollipop `barHeight`. */
export const LOLLIPOP_ROW_HEIGHT = 10;
/** Client `groupPadding = barHeight * 2`. */
export const LOLLIPOP_GROUP_PADDING = LOLLIPOP_ROW_HEIGHT * 2;

/**
 * Height of one category band: `barHeight * groupsCount`.
 * Grouped and stacked both size the band from series count (client `groupsCount`).
 */
export function lollipopGroupHeight(seriesCount: number): number {
  return LOLLIPOP_ROW_HEIGHT * Math.max(seriesCount, 1);
}

/**
 * Minimum plot height for a horizontal lollipop.
 * Client: `yAxes.length * (groupHeight + groupPadding)`.
 * Grouped and stacked both size the band from series count (client `groupsCount`).
 */
export function lollipopHorizontalMinSpan(
  categoryCount: number,
  seriesCount: number,
): number {
  if (categoryCount <= 0) return 0;
  return categoryCount * (lollipopGroupHeight(seriesCount) + LOLLIPOP_GROUP_PADDING);
}
