export type LineCurve = 'linear' | 'monotone' | 'step';

export interface LinePoint {
  x: string;
  y: number;
}

export interface LineSeries {
  /** Stable id for legend / tooltip */
  id: string;
  /** Display name (defaults to id) */
  name?: string;
  /** Optional series color; falls back to palette / theme */
  color?: string;
  points: LinePoint[];
}

export interface LineChartData {
  /** Single-series points (chat MVP default) */
  points?: LinePoint[];
  /** Multi-series (replaces FuseDash GroupedLineChart) */
  series?: LineSeries[];
}
