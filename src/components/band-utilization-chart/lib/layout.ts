/** The band is always one whole. Shares are not divided by the row sum. */
export const BAND_WHOLE = 100;

export const BAND_ROW_HEIGHT = 28;
export const BAND_ROW_GAP = 14;
export const BAND_PLOT_PAD_Y = 6;
export const BAND_LABEL_GAP = 12;
export const BAND_RIGHT_PAD = 4;
export const BAND_RADIUS = 7;
/** Below this pixel width the in-segment label is hidden; the tooltip still has it. */
export const BAND_MIN_LABEL_PX = 32;
export const BAND_LABEL_CHAR_PX = 7.2;
export const BAND_LABEL_MIN = 28;
export const BAND_LABEL_MAX = 180;

export function bandContentHeight(rowCount: number): number {
  if (rowCount <= 0) return 0;
  return (
    BAND_PLOT_PAD_Y * 2 +
    rowCount * BAND_ROW_HEIGHT +
    (rowCount - 1) * BAND_ROW_GAP
  );
}

export function labelGutter(labels: string[]): number {
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
  return Math.min(
    BAND_LABEL_MAX,
    Math.max(BAND_LABEL_MIN, Math.ceil(longest * BAND_LABEL_CHAR_PX)),
  );
}

/** Keep the row name inside the gutter. The rest stays available on the title tooltip. */
export function fitRowLabel(label: string, gutter: number): string {
  const maxChars = Math.max(1, Math.floor(Math.max(0, gutter - 2) / BAND_LABEL_CHAR_PX));
  if (label.length <= maxChars) return label;
  const keep = Math.max(1, maxChars - 1);
  return `${label.slice(0, keep)}…`;
}

export function plotWidth(width: number, gutter: number): number {
  return Math.max(0, width - gutter - BAND_LABEL_GAP - BAND_RIGHT_PAD);
}

/** Place each share on the 0–1 whole. A row that sums to 80 occupies 0.8, not 1. */
export function placeOnWhole(values: number[]): Array<{ start: number; span: number }> {
  let cursor = 0;
  return values.map((raw) => {
    const value = Number.isFinite(raw) && raw > 0 ? raw : 0;
    const start = cursor / BAND_WHOLE;
    const span = value / BAND_WHOLE;
    cursor += value;
    return { start, span };
  });
}
