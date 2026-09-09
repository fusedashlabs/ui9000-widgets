import { FD } from '../../../utils/fusedash-visual.js';
import type { BiasVarianceSeries } from './types.js';

/** Client `extent(data, d => x)` with the Visx `[0, 1]` fallback. */
export function biasVarianceXDomain(series: BiasVarianceSeries[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    for (const p of s.points) {
      if (p.x < min) min = p.x;
      if (p.x > max) max = p.x;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min, min + 1];
  return [min, max];
}

/** Client `[0, max(y) * 1.1]` — the plot always sits on a zero baseline. */
export function biasVarianceYDomain(series: BiasVarianceSeries[]): [number, number] {
  let max = -Infinity;
  for (const s of series) {
    for (const p of s.points) {
      if (p.y > max) max = p.y;
    }
  }
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  return [0, max * FD.biasVarianceDomainPadFactor];
}

/** Union of every series' x values, ascending — the crosshair snaps to these. */
export function biasVarianceXValues(series: BiasVarianceSeries[]): number[] {
  const seen = new Set<number>();
  for (const s of series) {
    for (const p of s.points) seen.add(p.x);
  }
  return [...seen].sort((a, b) => a - b);
}
