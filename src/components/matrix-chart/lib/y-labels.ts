/**
 * Y-axis label room for the matrix (FUS-4142). The preview used a fixed 80px
 * gutter and cut every row label at 9 characters ("Healthcar…",
 * "2nd Amend…") even with room to spare. The gutter now follows the longest
 * label (at least 80px, at most 180px or a third of a wide chart), and the cut
 * is taken from that gutter, as on the dashboard.
 */
export const MATRIX_Y_LABEL_MIN_GUTTER = 80;
export const MATRIX_Y_LABEL_MAX_GUTTER = 180;
/** Gap between the end of a row label and the first cell. */
export const MATRIX_Y_LABEL_PADDING = 16;
/** Average glyph width of the UI font relative to the font size. */
const CHAR_WIDTH_RATIO = 0.6;

export function matrixYLabelGutter(
  labels: string[],
  chartWidth: number,
  fontSize: number,
): number {
  const longest = labels.reduce((max, label) => Math.max(max, String(label).length), 0);
  const wanted = Math.ceil(longest * fontSize * CHAR_WIDTH_RATIO + MATRIX_Y_LABEL_PADDING);
  const limit = Math.max(MATRIX_Y_LABEL_MAX_GUTTER, Math.floor((chartWidth || 0) * 0.35));
  return Math.min(Math.max(wanted, MATRIX_Y_LABEL_MIN_GUTTER), limit);
}

/** Characters of a row label that fit in `gutter`. */
export function matrixYLabelMaxChars(gutter: number, fontSize: number): number {
  return Math.max(
    3,
    Math.floor((gutter - MATRIX_Y_LABEL_PADDING) / (fontSize * CHAR_WIDTH_RATIO)),
  );
}
