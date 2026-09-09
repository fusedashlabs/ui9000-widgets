import type { ChartMarkerShape } from '../../../utils/chart-formatting/types.js';
import type { FuseWidgetLike } from '../../../utils/fuse-widget.js';

export interface ScatterPoint {
  x: number;
  y: number;
  groupKey: string;
  color: string;
  markerShape: ChartMarkerShape;
  row: Record<string, unknown>;
}

export interface ScatterGroup {
  key: string;
  label: string;
  color: string;
  shape: ChartMarkerShape;
}

export interface ScatterModel {
  points: ScatterPoint[];
  xField: string;
  yField: string;
  groupField?: string;
  groups: ScatterGroup[];
  axisDetails?: Record<string, { label?: string; measure_unit_type?: string }>;
}

export type ScatterChartData =
  | Array<{ x: number; y: number; group?: string; color?: string }>
  | FuseWidgetLike
  | ScatterModel
  | null
  | undefined;
