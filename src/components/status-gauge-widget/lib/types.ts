export type StatusLevel = 'ok' | 'warning' | 'critical' | 'neutral';

export interface StatusGaugeAxisDetail {
  label?: string;
  measure_unit?: string;
  measure_unit_symbol?: string;
  measure_unit_type?: string;
  type?: string;
  subtype?: string;
}

/** One `WidgetItem.data` row. `role: "gauge"` is the semicircle; every other row is a card. */
export interface StatusGaugeRowInput {
  key?: string;
  role?: string;
  value?: number | string;
  status?: string;
  level?: string;
  min?: number | string;
  max?: number | string;
  /** Bar fill, 0–1. Omitted → derived from value between min and max. */
  ratio?: number | string;
  label?: string;
  unit?: string;
  [key: string]: unknown;
}

export interface StatusGaugePayload {
  name?: string;
  title?: string;
  description?: string;
  subtitle?: string;
  chartType?: string;
  xAxe?: string[];
  yAxe?: string[];
  data?: StatusGaugeRowInput[];
  axisDetails?: Record<string, StatusGaugeAxisDetail>;
}

export interface StatusGaugeItem {
  key: string;
  role: 'gauge' | 'metric';
  value: number;
  label: string;
  unit: string;
  status: string;
  level: StatusLevel;
  min: number;
  max: number;
  /** 0–1 fill for the metric bar, or the gauge needle position. */
  ratio: number;
}

export interface StatusGaugeModel {
  title: string;
  subtitle: string;
  gauge: StatusGaugeItem | null;
  metrics: StatusGaugeItem[];
  empty: boolean;
}
