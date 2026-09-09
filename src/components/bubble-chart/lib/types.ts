import type { PunchcardColorRange } from '../../../utils/fuse-palette.js';
import type { FuseWidgetLike } from '../../../utils/fuse-widget.js';

export interface BubblePoint {
  x: number;
  y: number;
  groupKey: string;
  color: string;
  row: Record<string, unknown>;
}

export interface BubbleGroup {
  key: string;
  label: string;
  color: string;
}

export interface BubbleModel {
  points: BubblePoint[];
  xField: string;
  yField: string;
  groupField?: string;
  groups: BubbleGroup[];
  colorRanges: PunchcardColorRange[];
  axisDetails?: Record<string, { label?: string; measure_unit_type?: string }>;
}

export type BubbleChartData =
  | Array<{ x: number; y: number; group?: string; color?: string }>
  | FuseWidgetLike
  | BubbleModel
  | null
  | undefined;
