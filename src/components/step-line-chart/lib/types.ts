/**
 * FuseDash `grafType` — drives the reference overlay drawn on top of the steps.
 *
 * - `none`  → plain step chart (`<StepLineChart>` without `grafType`)
 * - `curve` → KS plot: smooth "Ideal" curve + max-deviation (KS distance) marker
 * - `line`  → ROC curve: dashed "Random guessing" diagonal
 */
export type StepLineGrafType = 'none' | 'curve' | 'line';

export interface StepLinePoint {
  /** Category label, or a parsable date string for time mode */
  x: string;
  y: number;
}

export interface StepLineSeries {
  /** Stable id for legend / tooltip (FuseDash groupBy key) */
  id: string;
  /** Display name (defaults to id) */
  name?: string;
  /** Optional series color; falls back to palette / theme */
  color?: string;
  points: StepLinePoint[];
}

export interface StepLineChartData {
  /** Single-series points (chat MVP default) */
  points?: StepLinePoint[];
  /** Multi-series (replaces FuseDash `groupBy`) */
  series?: StepLineSeries[];
}

/** One row of the crosshair tooltip: every series' value at the hovered x. */
export interface StepLineHoverEntry {
  seriesId: string;
  seriesName: string;
  color: string;
  value: number;
}
