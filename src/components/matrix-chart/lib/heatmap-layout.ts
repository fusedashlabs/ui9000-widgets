import { CHART_TYPE } from '../../../utils/chart-theme.js';

// Heatmap design values, in px at 1x. Every box (label, total, cell) paints its
// own 1px inner border, so two neighbours read as a 2px line.
export const CELL_PITCH = 32;
export const MIN_CELL_PITCH = 16;
export const LABEL_WIDTH = 134;
export const MIN_LABEL_WIDTH = 80;
export const HEADER_HEIGHT = 135;
/** Lowest column header (short names such as F1 / OP). */
export const MIN_HEADER_HEIGHT = 40;
/** Rows shrink down to this so that a few of them fit a low widget. */
export const MIN_FIT_ROW_PITCH = 22;
export const TOTALS_SIZE = CELL_PITCH;
export const FONT_SIZE = CHART_TYPE.axis;
export const LINE_HEIGHT = CHART_TYPE.axisLine;
export const MAX_LABEL_LINES = 2;
export const LABEL_PADDING_LEFT = 13;
export const LABEL_PADDING_RIGHT = 10;
export const HEADER_PADDING_BOTTOM = 7;
export const HEADER_PADDING_TOP = 8;
export const TOTALS_TEXT_PADDING = 2;
/** The largest row total fills this share of the label column. */
export const LABEL_BAR_MAX_SHARE = 0.724;

/** Steps of the cell colour shown in the Low - High legend. */
export const LEGEND_OPACITY_STEPS = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];

export type MeasureText = (text: string, fontSize: number) => number;

/** Measures text in `fontFamily`; a character estimate where there is no canvas. */
export function createTextMeasure(fontFamily: string): MeasureText {
  let context: CanvasRenderingContext2D | null | undefined;
  return (text, fontSize) => {
    if (context === undefined) {
      try {
        context =
          typeof document === 'undefined'
            ? null
            : document.createElement('canvas').getContext('2d');
      } catch {
        context = null;
      }
    }
    if (!context) return text.length * fontSize * 0.55;
    context.font = `${fontSize}px ${fontFamily}`;
    return context.measureText(text).width;
  };
}

/** Text width in the chart font. */
export const measureTextWidth: MeasureText = createTextMeasure('Inter, sans-serif');

/** Key of one cell in the `values` map of a heatmap. */
export function heatmapCellKey(row: string, column: string): string {
  return `${row}\u0000${column}`;
}

const ELLIPSIS = '...';

function cutToWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  measure: MeasureText,
): string {
  let cut = text;
  while (cut.length > 1 && measure(`${cut}${ELLIPSIS}`, fontSize) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}${ELLIPSIS}`;
}

/**
 * Splits `text` into at most `maxLines` lines that fit `maxWidth`. Words stay
 * whole; the last line ends with "..." when the text does not fit.
 */
export function wrapLabel(
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines: number,
  measure: MeasureText = measureTextWidth,
): string[] {
  const words = String(text ?? '')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length || maxWidth <= 0 || maxLines <= 0) return [];

  const lines: string[] = [];
  let current = '';
  let index = 0;

  for (; index < words.length; index += 1) {
    const word = words[index];
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = '';
      if (lines.length === maxLines) break;
      index -= 1;
      continue;
    }
    // A single word wider than the line.
    lines.push(cutToWidth(word, maxWidth, fontSize, measure));
    if (lines.length === maxLines) {
      index += 1;
      break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  const restIndex = lines.length === maxLines ? index : words.length;
  if (restIndex < words.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.endsWith(ELLIPSIS)
      ? last
      : cutToWidth(`${last} ${words[restIndex]}`, maxWidth, fontSize, measure);
  }
  return lines;
}

/**
 * Height of a row: the design's pitch, or the rows' share of the height left
 * under the header when they fill the widget. Below the pitch only when all
 * rows then fit at `minFitPitch` or more; more rows than that scroll.
 */
export function getRowPitch(options: {
  pitch: number;
  cellPitch: number;
  isInKpi: boolean;
  fillHeight: boolean;
  /** Height under the header and the column totals; 0 before measuring. */
  availableHeight: number;
  rowCount: number;
  minFitPitch?: number;
}): number {
  const { pitch, cellPitch, isInKpi, fillHeight, availableHeight, rowCount } = options;
  if (isInKpi) return cellPitch;
  if (!fillHeight || !rowCount || !(availableHeight > 0)) return pitch;
  const share = Math.floor(availableHeight / rowCount);
  return share >= Math.min(pitch, options.minFitPitch ?? pitch) ? share : pitch;
}

/** Column header height: room for the longest column name, at most `maxHeight`. */
export function getHeaderHeight(options: {
  columnLabels: string[];
  fontSize: number;
  minHeight: number;
  maxHeight: number;
  /** Room above and below the name. */
  padding: number;
  measure?: MeasureText;
}): number {
  const { columnLabels, fontSize, minHeight, maxHeight, padding } = options;
  const measure = options.measure ?? measureTextWidth;
  const longest = Math.max(0, ...columnLabels.map((label) => measure(label, fontSize)));
  // 2 px to spare: the label may be drawn in a slightly wider font.
  return Math.min(maxHeight, Math.max(minHeight, Math.ceil(longest + padding) + 2));
}

/**
 * Largest total first (equal totals keep their order); an axis with an order of
 * its own (numbers, dates, weekdays) keeps it.
 */
export function orderByTotals(
  domain: string[],
  totals: Map<string, number>,
  keepOrder: boolean,
): string[] {
  return keepOrder
    ? domain
    : [...domain].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
}

export interface HeatmapColumnCells {
  /** Cells with a value, top to bottom. */
  cells: Array<{ rowIndex: number; value: number }>;
  /** Runs of empty cells: [first row, row after the last one]. */
  emptyRuns: Array<[number, number]>;
}

export interface HeatmapCells {
  columns: HeatmapColumnCells[];
  /** Sums of the positive values of each row / column. */
  rowTotals: Map<string, number>;
  columnTotals: Map<string, number>;
}

/**
 * Splits the matrix into filled cells and runs of empty ones, so a sparse
 * matrix is drawn with a few shapes per column instead of one per cell.
 */
export function getHeatmapCells(
  rows: string[],
  columns: string[],
  values: Map<string, number>,
): HeatmapCells {
  const rowTotals = new Map<string, number>();
  const columnTotals = new Map<string, number>();

  const columnCells = columns.map((column) => {
    const cells: HeatmapColumnCells['cells'] = [];
    const emptyRuns: HeatmapColumnCells['emptyRuns'] = [];
    let runStart = -1;
    rows.forEach((row, rowIndex) => {
      const value = values.get(heatmapCellKey(row, column)) ?? 0;
      // Zero and NaN draw as empty cells.
      if (!value) {
        if (runStart < 0) runStart = rowIndex;
        return;
      }
      if (runStart >= 0) {
        emptyRuns.push([runStart, rowIndex]);
        runStart = -1;
      }
      cells.push({ rowIndex, value });
      if (value > 0) {
        rowTotals.set(row, (rowTotals.get(row) ?? 0) + value);
        columnTotals.set(column, (columnTotals.get(column) ?? 0) + value);
      }
    });
    if (runStart >= 0) emptyRuns.push([runStart, rows.length]);
    return { cells, emptyRuns };
  });

  return { columns: columnCells, rowTotals, columnTotals };
}

export interface FittedTotals {
  texts: string[];
  /** The texts run up along the boxes (turned -90 degrees). */
  rotated: boolean;
}

const FULL_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
const SHORT_FORMAT = new Intl.NumberFormat('en-US', { notation: 'compact' });

/**
 * Texts for a line of totals boxes: the full numbers when all of them fit, else
 * short ones (136K), else the same turned along the boxes. The whole line takes
 * one form. A text that fits in no form is left out; the tooltip still shows it.
 */
export function fitTotals(
  values: number[],
  width: number,
  height: number,
  fontSize: number,
  padding: number,
  measure: MeasureText = measureTextWidth,
): FittedTotals {
  const full = values.map((value) => FULL_FORMAT.format(value));
  const short = values.map((value) => SHORT_FORMAT.format(value));
  const fits = (text: string, room: number) =>
    measure(text, fontSize) <= room - padding * 2;
  const allFit = (texts: string[], room: number) => texts.every((text) => fits(text, room));

  if (allFit(full, width)) return { texts: full, rotated: false };
  if (allFit(short, width)) return { texts: short, rotated: false };
  // Turned text needs a line of the font across the box.
  if (height > width && width >= fontSize + 2) {
    if (allFit(full, height)) return { texts: full, rotated: true };
    return { texts: short.map((text) => (fits(text, height) ? text : '')), rotated: true };
  }
  return { texts: short.map((text) => (fits(text, width) ? text : '')), rotated: false };
}

type Rgb = [number, number, number];

/** Parses "#RRGGBB", "#RGB", "rgb(r, g, b)" or "rgba(r, g, b, a)". */
export function parseColor(color: string): Rgb | null {
  const value = String(color ?? '').trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split('')
            .map((digit) => digit + digit)
            .join('')
        : hex[1];
    return [0, 2, 4].map((index) => parseInt(digits.slice(index, index + 2), 16)) as Rgb;
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(',').map((part) => Number(part.trim()));
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      return [parts[0], parts[1], parts[2]];
    }
  }
  return null;
}

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio of two colours. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** The candidate with the higher contrast on `fill` painted at `opacity` over `background`. */
export function getReadableTextColor(
  fill: string,
  opacity: number,
  background: string,
  candidates: [string, string],
): string {
  const fillRgb = parseColor(fill);
  const backgroundRgb = parseColor(background);
  if (!fillRgb || !backgroundRgb) return candidates[0];

  const alpha = Math.min(Math.max(opacity, 0), 1);
  const surface = fillRgb.map(
    (channel, index) => channel * alpha + backgroundRgb[index] * (1 - alpha),
  ) as Rgb;
  const [first, second] = candidates.map((candidate) => {
    const rgb = parseColor(candidate);
    return rgb ? contrastRatio(rgb, surface) : 0;
  });
  return first >= second ? candidates[0] : candidates[1];
}
