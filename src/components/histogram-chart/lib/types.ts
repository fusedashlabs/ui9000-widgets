export interface HistogramStack {
  group: string;
  count: number;
  color?: string;
  start: number;
  end: number;
}

export interface HistogramBin {
  index: number;
  x0: number;
  x1: number;
  stacks: HistogramStack[];
}

export interface HistogramModel {
  bins: HistogramBin[];
  groups: string[];
  xMin: number;
  xMax: number;
}

/** Simple chat payload: one bar per item. */
export interface HistogramLabelValue {
  label: string;
  value: number;
  color?: string;
}

/** Structured bin with optional pre-stacked groups. */
export interface HistogramBinInput {
  x0: number;
  x1: number;
  stacks: Array<{ group: string; count: number; color?: string }>;
}

export interface HistogramBinsPayload {
  bins: HistogramBinInput[];
  xMin?: number;
  xMax?: number;
}

/** FuseDash-ish bucket rows. */
export interface HistogramFuseRow {
  bucketIndex: number;
  count: number;
  group?: string;
  _id?: Record<string, unknown> | string;
  color?: string;
}

export interface HistogramFusePayload {
  xMin: number;
  xMax: number;
  groups?: string[];
  data: HistogramFuseRow[];
}

export type HistogramChartData =
  | HistogramLabelValue[]
  | HistogramBinsPayload
  | HistogramFusePayload
  /** Nested FuseDash widget blob (`data[0].histogramResults`). */
  | Record<string, unknown>;
