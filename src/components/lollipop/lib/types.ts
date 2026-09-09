export type LollipopOrientation = 'vertical' | 'horizontal';

/**
 * FuseDash `stacked` — only meaningful with more than one series (`groupBy`).
 * A single series always renders as the plain lollipop chart.
 */
export type LollipopLayout = 'grouped' | 'stacked';

export interface LollipopPoint {
  label: string;
  value: number;
  color?: string;
}

export interface LollipopSeries {
  id: string;
  name?: string;
  color?: string;
  points: LollipopPoint[];
}

export interface LollipopChartData {
  points?: LollipopPoint[];
  series?: LollipopSeries[];
}
