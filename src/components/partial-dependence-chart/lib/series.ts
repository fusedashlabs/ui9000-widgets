import type { IcePoint } from './types.js';

export function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** First index whose `x >= target`, or `points.length` when every x is smaller. */
function lowerBoundX(points: IcePoint[], target: number): number {
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].x < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Average the ICE curves on the union of their x values — client
 * `computeAverageSeries`, with the linear `findIndex` scan replaced by a binary
 * search so a dense mock stays O(x · groups · log n).
 * Each group must already be sorted by x.
 */
export function computeAverageSeries(groups: Iterable<IcePoint[]>): IcePoint[] {
  const curves = [...groups].filter((points) => points.length > 0);
  if (!curves.length) return [];

  const xValues = new Set<number>();
  for (const points of curves) {
    for (const p of points) xValues.add(p.x);
  }
  const xs = [...xValues].sort((a, b) => a - b);

  return xs.map((x) => {
    let sum = 0;
    let count = 0;
    for (const points of curves) {
      const i = lowerBoundX(points, x);
      if (i >= points.length) {
        // x sits past this curve — hold its last value
        sum += points[points.length - 1].y;
      } else if (i === 0) {
        sum += points[0].y;
      } else {
        const p0 = points[i - 1];
        const p1 = points[i];
        const t = (x - p0.x) / Math.max(1e-12, p1.x - p0.x);
        sum += p0.y + t * (p1.y - p0.y);
      }
      count += 1;
    }
    return { x, y: count ? sum / count : 0 };
  });
}

/**
 * Value of the average curve closest to `x` — backs the client's
 * "tooltip shows nearest avg value" pointermove handler.
 */
export function nearestAveragePoint(
  averageSeries: IcePoint[],
  x: number,
): IcePoint | null {
  if (!averageSeries.length) return null;
  const idx = lowerBoundX(averageSeries, x);
  let best: IcePoint | null = null;
  let bestDist = Infinity;
  for (const candidate of [averageSeries[idx - 1], averageSeries[idx], averageSeries[idx + 1]]) {
    if (!candidate) continue;
    const dist = Math.abs(candidate.x - x);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return best;
}
