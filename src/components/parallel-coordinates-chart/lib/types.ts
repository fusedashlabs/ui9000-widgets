export type ParallelCoordinatesOrientation = 'horizontal' | 'vertical';

/** One polyline: a single record crossing every dimension axis. */
export interface ParallelCoordinatesRow {
  /** Value of the identity field (`xAxe`), used for sort order and tooltips. */
  id: string;
  /** Dimension key → numeric value; `null` breaks the polyline at that axis. */
  values: Record<string, number | null>;
}

export interface ParallelCoordinatesModel {
  orientation: ParallelCoordinatesOrientation;
  /** Dimension keys in `uniqueValues` order — one axis each. */
  axes: string[];
  rows: ParallelCoordinatesRow[];
  /** Field the rows were sorted and labelled by (client `xAxe`). */
  idKey: string;
  /** Axis whose value drives the line colour until another axis is clicked. */
  colorKey: string;
  /** Low end of the colour ramp (formatting key `defaultMin`). */
  minColor: string;
  /** High end of the colour ramp (formatting key `defaultMax`). */
  maxColor: string;
  /** Fallback for rows whose colour axis has no finite value. */
  lineColor: string;
}

/** FuseDash `parallelCoordinatesChart` widget payload. */
export interface ParallelCoordinatesFusePayload {
  data: Array<Record<string, unknown>>;
  orientation?: string | null;
  xAxe?: string | string[] | null;
  yAxe?: string | string[] | null;
  /** `Object.values()` of this object supplies the axis keys. */
  uniqueValues?: Record<string, string[]> | Array<Record<string, string[]>> | null;
  formatting?: Array<{ key?: string; color?: string | number }> | null;
}

/** Chat payload that names its own axes. */
export interface ParallelCoordinatesRowsPayload {
  orientation?: string | null;
  /** Omit to infer from the numeric keys of the first row. */
  axes?: string[] | null;
  /** Field to label lines by; defaults to the first non-numeric key. */
  idKey?: string | null;
  rows: Array<Record<string, unknown>>;
}

export type ParallelCoordinatesInput =
  | Array<Record<string, unknown>>
  | ParallelCoordinatesRowsPayload
  | ParallelCoordinatesFusePayload;
