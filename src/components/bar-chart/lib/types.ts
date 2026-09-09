/** FuseDash `orientation` — picks the vertical or horizontal variant family. */
export type BarOrientation = 'vertical' | 'horizontal';

/**
 * FuseDash `stacked` — only meaningful with more than one series (FuseDash
 * `groupBy`). A single series always renders as the plain bar chart.
 */
export type BarLayout = 'grouped' | 'stacked';

export interface BarPoint {
  /** Category label */
  x: string;
  y: number;
}

export interface BarSeries {
  /** Stable id for legend / tooltip (FuseDash groupBy key) */
  id: string;
  /** Display name (defaults to id) */
  name?: string;
  /** Optional series color; falls back to theme / palette */
  color?: string;
  points: BarPoint[];
}

export interface BarChartData {
  /** Single-series points (chat MVP default) */
  points?: BarPoint[];
  /** Multi-series (replaces FuseDash `groupBy`) */
  series?: BarSeries[];
}

/** One hovered bar, handed to the element so it can render the tooltip. */
export interface BarHoverEntry {
  seriesId: string;
  seriesName: string;
  color: string;
  value: number;
}
