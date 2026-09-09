export interface SparkLinePoint {
  /** Parsable date string (datetime x) */
  x: string;
  y: number;
}

export interface SparkLineSeries {
  id: string;
  name?: string;
  color?: string;
  points: SparkLinePoint[];
}

export interface SparkLineChartData {
  points?: SparkLinePoint[];
  series?: SparkLineSeries[];
}

export interface SparkLineHoverEntry {
  seriesId: string;
  seriesName: string;
  color: string;
  value: number;
}
