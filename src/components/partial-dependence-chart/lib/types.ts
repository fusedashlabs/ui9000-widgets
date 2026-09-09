import type { FuseWidgetLike } from '../../../utils/fuse-widget.js';

/** One point on an ICE (Individual Conditional Expectation) curve. */
export interface IcePoint {
  x: number;
  y: number;
}

export interface IceSeries {
  /** groupBy value the curve was built from */
  key: string;
  points: IcePoint[];
}

export interface PartialDependenceModel {
  /** One curve per groupBy value, each sorted by x. */
  iceSeries: IceSeries[];
  /** Average curve computed locally — never taken from the payload. */
  averageSeries: IcePoint[];
  xField: string;
  yField: string;
  groupField?: string;
  /** Single brand color shared by the ICE band and the average line. */
  color: string;
  axisDetails?: Record<string, { label?: string; measure_unit_symbol?: string }>;
}

/** Chat shapes accepted alongside the FuseDash widget payload. */
export type PartialDependenceChartData =
  | Array<{ x: number; y: number; group?: string }>
  | Array<{ label: string | number; value: number }>
  | { points: Array<{ x: number; y: number }> }
  | { series: Array<{ id: string; name?: string; points: Array<{ x: number; y: number }> }> }
  | FuseWidgetLike
  | PartialDependenceModel
  | null
  | undefined;
