import type { ViolinGroup, ViolinModel } from './types.js';

/** Finite sample extent across all groups. */
export function collectValueExtent(groups: ViolinGroup[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const g of groups) {
    for (const v of g.samples) {
      if (!Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  return [min, max];
}

export function collectGroupIds(model: ViolinModel): string[] {
  return model.groups.map((g) => g.id);
}

export function sampleExtent(samples: number[]): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of samples) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return [lo, hi];
}
