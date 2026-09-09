/** FuseDash HorizontalBoxPlotChart / VerticalBoxPlotChart layout constants. */
export const BIN_SIZE = 12;
export const BIN_GROUP_GAP = 4;
/** Space between category bands — `BIN_SIZE * 2` in client. */
export const BIN_BAND_PADDING = BIN_SIZE * 2;
export const BIN_BORDER_RADIUS = 2;

export function boxPlotGroupSpan(groupCount: number): number {
  if (groupCount <= 0) return BIN_SIZE;
  return BIN_SIZE * groupCount + BIN_GROUP_GAP * Math.max(groupCount - 1, 0);
}

/** Minimum plot span along the categorical axis (height horizontal, width vertical). */
export function boxPlotMinCategorySpan(
  categoryCount: number,
  groupCount: number,
): number {
  if (categoryCount <= 0) return 0;
  const groupSpan = boxPlotGroupSpan(groupCount);
  return categoryCount * (groupSpan + BIN_BAND_PADDING);
}

/** Per-group offset within a category band — matches client `groupY` / `groupX`. */
export function boxPlotGroupOffset(
  groupIndex: number,
  groupCount: number,
): number {
  const groupSpan = boxPlotGroupSpan(groupCount);
  const step = groupCount > 0 ? groupSpan / groupCount : BIN_SIZE;
  return -groupSpan / 2 + groupIndex * step + BIN_SIZE / 2;
}
