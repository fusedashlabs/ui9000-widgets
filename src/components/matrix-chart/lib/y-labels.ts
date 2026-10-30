const MATRIX_Y_LABEL_MIN_GUTTER = 80;
const MATRIX_Y_LABEL_MAX_GUTTER = 180;
const MATRIX_Y_LABEL_PADDING = 16;
const CHAR_WIDTH_RATIO = 0.6;

/** Left gutter for the row labels: fits the longest label, at most 180px or 35% of a wide chart. */
export function matrixYLabelGutter(
  labels: readonly string[],
  chartWidth: number,
  fontSize: number,
): number {
  const longest = labels.reduce((max, label) => Math.max(max, String(label).length), 0);
  const wanted = Math.ceil(longest * fontSize * CHAR_WIDTH_RATIO + MATRIX_Y_LABEL_PADDING);
  const limit = Math.max(MATRIX_Y_LABEL_MAX_GUTTER, Math.floor((chartWidth || 0) * 0.35));
  return Math.min(Math.max(wanted, MATRIX_Y_LABEL_MIN_GUTTER), limit);
}

/** Characters of a row label that fit the gutter; a longer label is cut. */
export function matrixYLabelMaxChars(gutter: number, fontSize: number): number {
  return Math.max(3, Math.floor((gutter - MATRIX_Y_LABEL_PADDING) / (fontSize * CHAR_WIDTH_RATIO)));
}
