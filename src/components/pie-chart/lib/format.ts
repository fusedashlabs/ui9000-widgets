import type { PieSlice } from './types.js';

/** FuseDash `formatNumber(value, 2)` for legend percentages. */
export function formatPiePercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(digits);
}

/** FuseDash legend label: `12.34% - January`. */
export function formatPieLegendLabel(slice: PieSlice): string {
  return `${formatPiePercent(slice.percentage)}% - ${slice.label}`;
}
