import type { FuseWidgetLike } from '../../../utils/fuse-widget.js';

/** One filled wedge of the disc — a single row of the (sorted) chart data. */
export interface PolarAreaSector {
  /** Category value (`widget.xAxe[0]`). */
  key: string;
  /** Group key when `groupBy` is set — also the color / legend key. */
  group?: string;
  label: string;
  value: number;
  color: string;
}

export interface PolarAreaLegendEntry {
  key: string;
  label: string;
  color: string;
}

export interface PolarAreaModel {
  sectors: PolarAreaSector[];
  /**
   * Radial spoke order — client `categories`: `uniqueValues[xAxe]` filtered to
   * values present in the data, falling back to first-seen data order.
   */
  categories: string[];
  legend: PolarAreaLegendEntry[];
  maxValue: number;
  /** True when wedges are split by `groupBy` inside each category. */
  grouped?: boolean;
  xField?: string;
  yField?: string;
  groupField?: string;
  axisDetails?: Record<string, { label?: string; measure_unit_symbol?: string }>;
}

export type PolarAreaLabelValue = { label: string; value: number; color?: string };

export type PolarAreaPoint = { x: string | number; y: number };

export type PolarAreaChartData =
  | PolarAreaLabelValue[]
  | { points: PolarAreaPoint[] }
  | PolarAreaModel
  | FuseWidgetLike
  | null
  | undefined;
