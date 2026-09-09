import type { FuseWidgetLike } from '../../../utils/fuse-widget.js';

export interface PieSlice {
  key: string;
  label: string;
  value: number;
  color: string;
  percentage: number;
}

export interface PieModel {
  slices: PieSlice[];
  total: number;
  xField?: string;
  yField?: string;
  axisDetails?: Record<string, { label?: string; measure_unit_symbol?: string }>;
  uniqueValuesHint?: string[];
}

export type PieLabelValue = { label: string; value: number; color?: string };

export type PieChartData =
  | PieLabelValue[]
  | PieModel
  | FuseWidgetLike
  | null
  | undefined;
