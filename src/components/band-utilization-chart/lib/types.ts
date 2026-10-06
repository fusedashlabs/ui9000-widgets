/** One colored share inside a row. Width is this value over 100, not over the row sum. */
export interface BandSegment {
  seriesId: string;
  name: string;
  value: number;
  /** Label already formatted from the value field's axis detail. */
  text: string;
  color: string;
  /** Start as a fraction of the 100% whole. */
  start: number;
  /** Width as a fraction of the 100% whole. */
  span: number;
}

export interface BandSeries {
  id: string;
  name: string;
  color: string;
}

export interface BandRow {
  label: string;
  segments: BandSegment[];
  /** Raw sum of the shares. Not forced to 100. */
  sum: number;
  complete: boolean;
}

export interface BandModel {
  title: string;
  /** From `axisDetails` on the value field. Empty when the widget has no unit. */
  unit: string;
  /** WidgetItem `legend`. */
  legend: boolean;
  /** WidgetItem `tooltip`. */
  tooltip: boolean;
  series: BandSeries[];
  rows: BandRow[];
  empty: boolean;
}
