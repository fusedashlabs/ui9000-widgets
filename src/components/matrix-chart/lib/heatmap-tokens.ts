import {
  pickQualitativePalette,
  seriesInk,
  sequentialColors,
} from '../../../utils/fuse-palette.js';
import { fdColors, hexWithAlpha } from '../../../utils/fusedash-visual.js';

/** Colours of the heatmap: the matrix chart and the heatmap view of the network graph. */
export interface HeatmapTokens {
  cell: string;
  emptyCell: string;
  negativeCell: string;
  gridLine: string;
  hoverCell: string;
  rowTotal: string;
  columnTotal: string;
  header: string;
  labelFrom: string;
  labelTo: string;
  bar: string;
  text: string;
  headerText: string;
  /** A colour, or `auto` to pick the readable one for each total. */
  totalsText: string;
  title: string;
  caption: string;
  subtitle: string;
  dotRing: string;
  /** Fill opacity of the largest column and row totals. */
  columnTotalsMax: number;
  rowTotalsMax: number;
  cornerIconOpacity: number;
}

const DARK_CELL_STEP = 3;
const SURFACE = 'var(--ui9000-color-surface, #ffffff)';
const SURFACE_MUTED = 'var(--ui9000-color-surface-muted, #f3f4f6)';

/** Dots in front of the row names when the caller gives no row colours. */
export function heatmapRowDotColors(): string[] {
  return pickQualitativePalette(0, 12);
}

/** Call inside `withSeriesMode`: cells and totals follow the page style. */
export function heatmapTokens(mode: 'light' | 'dark'): HeatmapTokens {
  const fd = fdColors(mode);
  const dark = mode === 'dark';
  // The deepest step of the ramp sinks into a dark surface.
  const ramp = sequentialColors();
  const cell = seriesInk(ramp[dark ? DARK_CELL_STEP : ramp.length - 1], mode);
  const [rowTotal, columnTotal] = pickQualitativePalette(0, 2);
  return {
    cell,
    emptyCell: hexWithAlpha(cell, dark ? 3 : 2),
    negativeCell: SURFACE_MUTED,
    gridLine: hexWithAlpha(fd.gridStroke, dark ? 50 : 40),
    hoverCell: fd.networkLabelText,
    rowTotal,
    columnTotal,
    header: SURFACE_MUTED,
    labelFrom: SURFACE,
    labelTo: SURFACE_MUTED,
    bar: hexWithAlpha(cell, 45),
    text: fd.networkLabelText,
    headerText: fd.axisLabelFill,
    totalsText: 'auto',
    title: fd.networkLabelText,
    caption: fd.networkLabelText,
    subtitle: fd.axisLabelFill,
    dotRing: 'transparent',
    columnTotalsMax: dark ? 0.76 : 1,
    rowTotalsMax: dark ? 0.92 : 1,
    cornerIconOpacity: dark ? 0.5 : 1,
  };
}
