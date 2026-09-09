/**
 * Input for universal chart formatting and markers.
 * Ported from mcp-ui `helpers/chartFormatting` — used to derive formatting (colors)
 * and markers (shapes) from groupBy / uniqueValues / data.
 */
export interface UniversalFormattingInput {
  /** Chart type (e.g. lineChart, barChart, pieChart, scatterplotChart). */
  chartType: string;
  /** Primary grouping field (e.g. groupBy[0]). For pie/donut use xAxe[0]. */
  groupByField?: string | null;
  /** Unique values per field — main source for keys. */
  uniqueValues?: Record<string, string[]>;
  /** Raw data; used to derive keys when uniqueValues[groupByField] is missing. */
  data?: Record<string, unknown>[];
  /** First x-axis field; used for pie/donut or as fallback. */
  xAxeField?: string;
  /** Existing formatting — if keys match, returned as-is. */
  existingFormatting?: { key: string; color: string }[];
  /** Existing markers — if keys match, returned as-is. */
  existingMarkers?: { key: string; shape: string }[];
}

/** One formatting entry (color index 1–12). Compatible with FuseDash IFormatting. */
export interface ChartFormattingItem {
  key: string;
  color: string;
}

/** Marker shape. Aligned with FuseDash IMarkers. */
export type ChartMarkerShape =
  | 'donut'
  | 'circle'
  | 'square'
  | 'rhombus'
  | 'triangle'
  | 'cross';

/** One marker entry. Compatible with FuseDash IMarkersType. */
export interface ChartMarkerItem {
  key: string;
  shape: ChartMarkerShape;
}
