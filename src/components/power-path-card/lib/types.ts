export type PowerPathLevel = 'ok' | 'warning' | 'critical' | 'neutral';

/**
 * Operational limits for one metric. `above` (default) means higher is worse:
 * the value is critical at or past `critical`, warning at or past `warning`.
 */
export interface PowerPathThresholds {
  warning?: number | string;
  critical?: number | string;
  direction?: 'above' | 'below';
}

/** One parameter row. A status shows only with `level`, `status` or `thresholds`. */
export interface PowerPathMetricInput {
  key?: string;
  label?: string;
  name?: string;
  value?: number | string;
  unit?: string;
  status?: string;
  level?: string;
  thresholds?: PowerPathThresholds;
  [key: string]: unknown;
}

/** Existing health score. Without `value` the summary is not drawn. */
export interface PowerPathHealthInput {
  label?: string;
  value?: number | string;
  /** Defaults to `%`. Pass `""` for a bare number. */
  unit?: string;
  status?: string;
  level?: string;
  /** Recent readings, oldest first. Fewer than two → no line. */
  points?: Array<number | string | { value?: number | string; y?: number | string }>;
}

/** Active fault. Absent, `null`, `active: false` or no text → no banner. */
export interface PowerPathFaultInput {
  active?: boolean;
  level?: string;
  message?: string;
  details?: string[];
}

export interface PowerPathBadgeInput {
  label?: string;
}

export interface PowerPathPayload {
  chartType?: string;
  name?: string;
  title?: string;
  badge?: string | PowerPathBadgeInput;
  health?: PowerPathHealthInput | null;
  fault?: string | PowerPathFaultInput | null;
  data?: PowerPathMetricInput[];
}

export interface PowerPathStatus {
  label: string;
  level: PowerPathLevel;
}

export interface PowerPathMetric {
  key: string;
  label: string;
  /** Value with its unit, ready to print. */
  display: string;
  status: PowerPathStatus | null;
}

export interface PowerPathHealth {
  label: string;
  value: number;
  /** Score with its unit, ready to print. */
  display: string;
  level: PowerPathLevel;
  points: number[];
}

export interface PowerPathFault {
  level: 'warning' | 'critical';
  text: string;
}

export interface PowerPathModel {
  title: string;
  badge: string;
  health: PowerPathHealth | null;
  fault: PowerPathFault | null;
  metrics: PowerPathMetric[];
  empty: boolean;
}
