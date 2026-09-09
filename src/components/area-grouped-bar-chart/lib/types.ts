import type { FuseWidgetLike } from '../../../utils/fuse-widget.js';

export interface AreaGroupedBarLinePoint {
  x: string;
  y: number;
}

export interface AreaGroupedBarGroup {
  key: string;
  label: string;
  color: string;
}

export interface AreaGroupedBarModel {
  /** Ordered X categories (uniqueValues ∩ data) */
  categories: string[];
  /** Ordered groupBy keys for nested bars */
  groups: AreaGroupedBarGroup[];
  /** bars[category][groupKey] = numeric value */
  barsByCategory: Record<string, Record<string, number>>;
  /** Line/area series — one point per category */
  linePoints: AreaGroupedBarLinePoint[];
  lineColor: string;
  lineLabel: string;
  lineField: string;
  barField: string;
  xField: string;
  groupField: string;
  axisDetails?: Record<
    string,
    { label?: string; measure_unit_symbol?: string; measure_unit?: string }
  >;
}

export type AreaGroupedBarChartInput =
  | FuseWidgetLike
  | AreaGroupedBarModel
  | null
  | undefined;
