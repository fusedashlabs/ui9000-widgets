import type { PunchcardModel } from './types.js';

export function collectValueExtent(model: PunchcardModel): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const c of model.cells) {
    if (!Number.isFinite(c.value)) continue;
    if (c.value < min) min = c.value;
    if (c.value > max) max = c.value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [Math.min(0, min - pad), max + pad];
  }
  return [Math.min(0, min), max];
}

export function maxAbsValue(model: PunchcardModel): number {
  let max = 0;
  for (const c of model.cells) {
    if (!Number.isFinite(c.value)) continue;
    const a = Math.abs(c.value);
    if (a > max) max = a;
  }
  return max || 1;
}
