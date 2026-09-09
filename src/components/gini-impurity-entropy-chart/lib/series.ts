import { DEFAULT_SERIES_KEYS, type GiniSeriesPoint } from './types.js';

/**
 * Client `extractSeriesFromData`: one series per metric column, keyed by the
 * x-axis column, sorted ascending by `p`.
 */
export function extractSeriesFromData(
  data: unknown,
  xField: string,
  seriesKeys?: string[],
): Record<string, GiniSeriesPoint[]> {
  const rows = Array.isArray(data)
    ? (data as Array<Record<string, unknown>>)
    : [];
  const keys = seriesKeys?.length ? seriesKeys : DEFAULT_SERIES_KEYS;

  const result: Record<string, GiniSeriesPoint[]> = {};
  for (const key of keys) result[key] = [];

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const p = Number(row[xField]);
    if (!Number.isFinite(p)) continue;

    for (const key of keys) {
      if (row[key] === undefined) continue;
      const value = Number(row[key]);
      if (Number.isFinite(value)) result[key].push({ p, value });
    }
  }

  for (const key of keys) result[key].sort((a, b) => a.p - b.p);
  return result;
}

/**
 * Client `getNearestValue`, returning the point so the crosshair can sit on it.
 * Binary search over the `p`-sorted series — keeps hover off the O(n) path.
 */
export function nearestPoint(
  points: GiniSeriesPoint[],
  p: number,
): GiniSeriesPoint | null {
  if (!points.length) return null;

  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].p < p) lo = mid + 1;
    else hi = mid;
  }

  let best = points[lo];
  let bestDist = Math.abs(best.p - p);
  for (const candidate of [points[lo - 1], points[lo + 1]]) {
    if (!candidate) continue;
    const dist = Math.abs(candidate.p - p);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return best;
}
