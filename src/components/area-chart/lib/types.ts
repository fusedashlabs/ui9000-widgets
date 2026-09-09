import type { MarkerShape } from '../../../utils/fusedash-visual.js';

export type AreaLayout = 'grouped' | 'stacked';

export interface AreaPoint {
  x: string;
  /** Grouped: value; stacked: unused when y0/y1 set */
  y: number;
  /** Data-space baseline (0 for grouped) */
  y0: number;
  /** Data-space top */
  y1: number;
}

export interface AreaSeries {
  id: string;
  name?: string;
  color?: string;
  marker?: MarkerShape;
  points: AreaPoint[];
}

export interface AreaModel {
  layout: AreaLayout;
  series: AreaSeries[];
  xField?: string;
  yField?: string;
  groupField?: string;
  axisDetails?: Record<
    string,
    { label?: string; measure_unit_symbol?: string; measure_unit?: string }
  >;
  uniqueValuesHint?: string[];
}

export interface AreaChartData {
  layout?: AreaLayout;
  series?: AreaSeries[];
}

export type AreaChartInput =
  | AreaChartData
  | AreaSeries[]
  | Record<string, unknown>
  | null
  | undefined;
