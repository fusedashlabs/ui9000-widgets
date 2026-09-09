import type { ParallelCoordinatesRow } from './types.js';

/**
 * Per-axis `[min, max]`, mirroring client `extent(chartData, d => d[key])`.
 * A flat axis is widened by 1 so its scale keeps a usable range.
 */
export function axisExtent(
  rows: ParallelCoordinatesRow[],
  axis: string,
): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const value = row.values[axis];
    if (value == null || !Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min, min + 1];
  return [min, max];
}

/** One extent per axis, keyed by axis name. */
export function axisExtents(
  rows: ParallelCoordinatesRow[],
  axes: string[],
): Map<string, [number, number]> {
  const map = new Map<string, [number, number]>();
  for (const axis of axes) map.set(axis, axisExtent(rows, axis));
  return map;
}

/**
 * Ticks an axis can show without its labels colliding — the client leans on
 * d3's default count, which overruns at chat widths.
 */
export function tickCountForSpan(span: number): number {
  if (!Number.isFinite(span) || span <= 0) return 2;
  return Math.max(2, Math.min(8, Math.round(span / 80)));
}
