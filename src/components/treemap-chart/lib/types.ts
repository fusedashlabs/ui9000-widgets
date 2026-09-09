import type { FuseAxisDetail, FuseWidgetLike } from '../../../utils/fuse-widget.js';

/**
 * FuseDash routes on a *second* dimension: `subgroup` distinct from
 * `groupBy[0]` renders one card per group (`TreemapGroup`), anything else
 * renders a single area-proportional treemap (`TreemapSingle`). See FUS-3868.
 */
export type TreemapMode = 'single' | 'grouped';

/** One leaf rectangle — area encodes `value`, fill encodes its magnitude band. */
export interface TreemapTile {
  /** Case/whitespace-normalized grouping key */
  key: string;
  /** Display label (first-seen trimmed spelling) */
  label: string;
  value: number;
  color: string;
  /** True when `color` is bright enough to need dark text (client `hasLightColor`) */
  lightFill: boolean;
}

/** One card of the grouped treemap: a group header plus its subgroup tiles. */
export interface TreemapGroupCard {
  key: string;
  label: string;
  tiles: TreemapTile[];
}

export interface TreemapModel {
  mode: TreemapMode;
  /** Single mode leaves; empty in grouped mode */
  tiles: TreemapTile[];
  /** Grouped mode cards; empty in single mode */
  groups: TreemapGroupCard[];
  /** Sequential band colors, low → high — the palette legend in single mode */
  rangeColors: string[];
  /** FuseDash `groupBy[0] ?? xAxe[0]` — the category dimension */
  categoryField?: string;
  /** FuseDash `metric[0] ?? yAxe[0]` — the measured column */
  valueField?: string;
  /** FuseDash `subgroup` — the nested dimension, and each card's caption */
  subgroupField?: string;
  axisDetails?: Record<string, FuseAxisDetail>;
}

/** Chat shorthand: one tile per point. */
export interface TreemapPoint {
  x: string;
  y: number;
}

/** Chat shorthand: one card per series, one tile per point. */
export interface TreemapSeries {
  id: string;
  name?: string;
  color?: string;
  points: TreemapPoint[];
}

export type TreemapLabelValue = { label: string; value: number; color?: string };

export type TreemapChartData =
  | TreemapLabelValue[]
  | { points: TreemapPoint[] }
  | { series: TreemapSeries[] }
  | FuseWidgetLike
  | null
  | undefined;
