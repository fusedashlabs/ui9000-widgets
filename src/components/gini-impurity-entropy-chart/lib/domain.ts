import type { GiniSeries } from './types.js';

/** Widths a flat domain is padded by so a constant curve still has a range. */
const FLAT_DOMAIN_EPSILON = 1e-6;

function extentOf(values: number[], fallback: [number, number]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
  // Client: `sameP` / `sameY` widen a degenerate domain instead of clamping.
  if (!(max > min)) return [min - FLAT_DOMAIN_EPSILON, max + FLAT_DOMAIN_EPSILON];
  return [min, max];
}

/**
 * X domain from every sampled `p`. The client fits the data rather than
 * assuming [0, 1], so a partial probability sweep still fills the plot.
 */
export function collectPExtent(series: GiniSeries[]): [number, number] {
  const values: number[] = [];
  for (const s of series) {
    for (const point of s.points) values.push(point.p);
  }
  return extentOf(values, [0, 1]);
}

/** Y domain from every metric value — not zero-anchored, matching the client. */
export function collectValueExtent(series: GiniSeries[]): [number, number] {
  const values: number[] = [];
  for (const s of series) {
    for (const point of s.points) values.push(point.value);
  }
  return extentOf(values, [0, 1]);
}
