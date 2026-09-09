import type { FuseAxisDetail } from '../../../utils/format-text.js';
import type { FuseWidgetLike } from '../../../utils/fuse-widget.js';

/** One ring of the radial bar chart. */
export interface RadialBarDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface RadialBarModel {
  /**
   * Rings from the inside out. The client sorts `data` by `uniqueValues[xAxe]`
   * and then reverses it, so the last category ends up on the innermost ring.
   */
  bars: RadialBarDatum[];
  /** Legend keeps the `uniqueValues` order, i.e. the reverse of `bars`. */
  legend: RadialBarDatum[];
  xField?: string;
  yField?: string;
  axisDetails?: Record<string, FuseAxisDetail>;
}

export type RadialBarLabelValue = { label: string; value: number; color?: string };

export type RadialBarPoints = {
  points: Array<{ x: string | number; y: number }>;
};

export type RadialBarChartData =
  | RadialBarLabelValue[]
  | RadialBarPoints
  | RadialBarModel
  | FuseWidgetLike
  | null
  | undefined;
