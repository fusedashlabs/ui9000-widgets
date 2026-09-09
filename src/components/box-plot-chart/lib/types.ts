export type BoxPlotOrientation = 'vertical' | 'horizontal';

export interface BoxPlotBox {
  /** Category on the categorical axis (e.g. year). */
  label: string;
  /** Series / group color key. */
  group?: string;
  color?: string;
  min?: number;
  q1: number;
  median: number;
  q3: number;
  max?: number;
  smallestNonOutlier: number;
  biggestNonOutlier: number;
  outliers?: number[];
}

export interface BoxPlotModel {
  orientation: BoxPlotOrientation;
  boxes: BoxPlotBox[];
  groups: string[];
  /** Ordered categorical-axis labels (e.g. years from uniqueValues). */
  categoryLabels?: string[];
}

/** FuseDash-style aggregate row. */
export interface FuseDashBoxPlotRow {
  _id?: Record<string, string | number | null | undefined>;
  q1?: number;
  median?: number;
  q3?: number;
  min?: number;
  max?: number;
  smallestNonOutlier?: number;
  biggestNonOutlier?: number;
  outliers?: number[];
  sample_count?: number;
  [key: string]: unknown;
}

export interface FuseDashBoxPlotPayload {
  orientation?: BoxPlotOrientation;
  xAxe?: string | string[];
  yAxe?: string | string[];
  groupBy?: string | string[];
  uniqueValues?: Record<string, string[]>;
  data: FuseDashBoxPlotRow[];
}

export interface BoxPlotBoxesPayload {
  orientation?: BoxPlotOrientation;
  boxes: BoxPlotBox[];
}
