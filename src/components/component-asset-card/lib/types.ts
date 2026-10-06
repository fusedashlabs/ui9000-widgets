export type ComponentAssetLevel = 'ok' | 'warning' | 'critical' | 'neutral';

/**
 * Operational limits for the metric. `above` (default) means higher is worse:
 * a reading is critical at or past `critical`, warning at or past `warning`.
 */
export interface ComponentAssetThresholds {
  warning?: number | string;
  critical?: number | string;
  direction?: 'above' | 'below';
}

/** The one primary metric. A status shows only with `level` or `thresholds`. */
export interface ComponentAssetMetricInput {
  label?: string;
  name?: string;
  value?: number | string;
  unit?: string;
  level?: string;
  thresholds?: ComponentAssetThresholds;
}

/**
 * Change against a reference point. The arrow follows the sign unless
 * `direction` is given. `better` says which way is good; without it up reads
 * as good, as in the design.
 */
export interface ComponentAssetDeltaInput {
  value?: number | string;
  unit?: string;
  label?: string;
  direction?: 'up' | 'down' | 'flat';
  better?: 'up' | 'down';
}

export type ComponentAssetTrendPointInput =
  | number
  | string
  | { value?: number | string; y?: number | string; level?: string };

/** Recent readings, oldest first. Fewer than two → no trend. */
export interface ComponentAssetTrendInput {
  points?: ComponentAssetTrendPointInput[];
}

export interface ComponentAssetImageInput {
  src?: string;
  url?: string;
  alt?: string;
}

export interface ComponentAssetPayload {
  chartType?: string;
  name?: string;
  title?: string;
  /** Asset id, device name or equipment reference shown in the badge. */
  assetId?: string;
  badge?: string;
  image?: string | ComponentAssetImageInput | null;
  metric?: ComponentAssetMetricInput | null;
  delta?: number | string | ComponentAssetDeltaInput | null;
  trend?: ComponentAssetTrendInput | ComponentAssetTrendPointInput[] | null;
}

export interface ComponentAssetStatus {
  label: string;
  level: Exclude<ComponentAssetLevel, 'neutral'>;
}

export interface ComponentAssetImage {
  src: string;
  alt: string;
}

export interface ComponentAssetMetric {
  label: string;
  /** Value with its unit, ready to print. */
  display: string;
  status: ComponentAssetStatus | null;
}

export interface ComponentAssetDelta {
  direction: 'up' | 'down' | 'flat';
  /** Magnitude with its unit, no sign — the arrow carries the direction. */
  display: string;
  label: string;
  tone: 'ok' | 'critical' | 'neutral';
}

export interface ComponentAssetTrendPoint {
  value: number;
  level: ComponentAssetLevel;
}

export interface ComponentAssetModel {
  title: string;
  assetId: string;
  image: ComponentAssetImage | null;
  metric: ComponentAssetMetric | null;
  delta: ComponentAssetDelta | null;
  /** At least two points, or null. */
  trend: ComponentAssetTrendPoint[] | null;
  empty: boolean;
}
