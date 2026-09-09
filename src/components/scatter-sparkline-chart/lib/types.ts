import type { ChartMarkerShape } from '../../../utils/chart-formatting/types.js';
import type { SparkLinePoint, SparkLineSeries } from '../../spark-line-chart/lib/types.js';

export interface ScatterSparklineRawPoint {
  x: string;
  y: number;
  groupKey: string;
  color: string;
  markerShape: ChartMarkerShape;
  row: Record<string, unknown>;
}

export interface ScatterSparklineModel {
  series: SparkLineSeries[];
  scatterPoints: ScatterSparklineRawPoint[];
  xField: string;
  yField: string;
  groupField?: string;
  lineColor: string;
  pointLegendColor: string;
  lineLegendLabel: string;
  pointLegendLabel: string;
  axisDetails?: Record<
    string,
    { label?: string; type?: string; subtype?: string; measure_unit?: string }
  >;
}

export interface ScatterSparklineChartData {
  series?: SparkLineSeries[];
  scatterPoints?: ScatterSparklineRawPoint[];
  points?: SparkLinePoint[];
}

export interface ScatterSparklineLineHoverEntry {
  seriesId: string;
  seriesName: string;
  color: string;
  value: number;
}
