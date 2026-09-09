import type { ChartMarkerShape } from '../../../utils/chart-formatting/types.js';

export interface RadarPoint {
  category: string;
  value: number;
}

export interface RadarSeries {
  id: string;
  name: string;
  color?: string;
  marker: ChartMarkerShape;
  points: RadarPoint[];
}

export interface RadarChartData {
  categories?: string[];
  series?: Array<{
    id: string;
    name?: string;
    color?: string;
    marker?: ChartMarkerShape;
    points: Array<{ category?: string; label?: string; x?: string | number; value?: number; y?: number }>;
  }>;
  points?: Array<{ category?: string; label?: string; x?: string | number; value?: number; y?: number }>;
}

export interface RadarModel {
  series: RadarSeries[];
  categories: string[];
  xField: string;
  yField: string;
  groupBy?: string;
  axisDetails?: Record<string, { label?: string; measure_unit_symbol?: string }>;
}
