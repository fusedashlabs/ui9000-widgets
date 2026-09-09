export interface MatrixCell {
  /** Column category (client `xAxe`) */
  x: string;
  /** Row category (client `groupBy` / first additional data key) */
  y: string;
  value: number;
}

import type { AxisDetail } from '../../../utils/axis-units.js';

export interface MatrixModel {
  /** Zero-filled grid — mirrors client `filledArrayWithZeroData` */
  cells: MatrixCell[];
  xDomain: string[];
  yDomain: string[];
  /**
   * Values as they came in, before zero-filling. Client `MatrixChart` builds
   * its color ranges from these, so filler cells stay "no data".
   */
  rawValues: number[];
  /** Row-category field name — the tooltip's first label. */
  categoryKey: string;
  /** Measure field name (client `yAxe[0]`) — picks the value's unit. */
  valueKey: string;
  /** Per-field labels and measure units from the widget. */
  axisDetails?: Record<string, AxisDetail>;
}

export interface MatrixCellsPayload {
  cells: MatrixCell[];
  xDomain?: string[];
  yDomain?: string[];
}

/** Chat cells or a FuseDash WidgetItem (`data` + `xAxe`/`yAxe`/`groupBy`/`uniqueValues`). */
export type MatrixInput =
  | MatrixCell[]
  | MatrixCellsPayload
  | Record<string, unknown>;
