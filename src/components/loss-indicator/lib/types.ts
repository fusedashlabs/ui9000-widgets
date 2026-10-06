export type LossLevel = 'ok' | 'warning' | 'severe' | 'critical';

export type LossTrend = 'up' | 'down' | 'flat';

export interface LossBand {
  from: number;
  to: number;
  level: LossLevel;
  /** Optional override. Absent → the level colour. */
  color?: string;
}

/**
 * Flat reading kept for direct payloads.
 * The host document is a WidgetItem: `name`, `yAxe`, `data`, `axisDetails`,
 * `limitsDomains`, and `domainsLimits`. `uniqueValues` is the column domain, not the axis.
 */
export interface LossIndicatorInput {
  label?: string;
  name?: string;
  value?: number | string;
  unit?: string;
  min?: number | string;
  max?: number | string;
  ticks?: Array<number | string> | string;
  bands?: LossBand[] | string;
  trend?: string;
  /** Fraction digits for the value. Absent → the number is shown as given. */
  decimals?: number | string;
  chartType?: string;
}

export interface LossIndicatorModel {
  label: string;
  value: number;
  /** Display text, e.g. `24.30%`. */
  valueText: string;
  unit: string;
  min: number;
  max: number;
  /** Axis labels already formatted, with their 0–1 position on the scale. */
  ticks: Array<{ value: number; label: string; position: number }>;
  bands: LossBand[];
  /** 0–1 position of the current value. */
  ratio: number;
  level: LossLevel;
  trend?: 'up' | 'down';
  empty: boolean;
}
