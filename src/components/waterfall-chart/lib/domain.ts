import type { WaterfallModel, WaterfallStep } from './types.js';

/** Extent of start/end values for the linear domain. */
export function collectValueExtent(steps: WaterfallStep[]): [number, number] {
  if (!steps.length) return [0, 0];
  let min = Infinity;
  let max = -Infinity;
  for (const s of steps) {
    min = Math.min(min, s.start, s.end);
    max = Math.max(max, s.start, s.end);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 0];
  return [min, max];
}

/** Category labels in step order. */
export function collectLabels(model: WaterfallModel): string[] {
  return model.steps.map((s) => s.label);
}

/**
 * Client domain: pad positive/negative extents by `padFactor`, clamp through 0, then `.nice()`.
 */
export function waterfallLinearDomain(
  steps: WaterfallStep[],
  padFactor = 1.2,
): [number, number] {
  const [minRaw, maxRaw] = collectValueExtent(steps);
  const minValue = Math.min(0, minRaw) * (minRaw < 0 ? padFactor : 1);
  const maxValue = Math.max(0, maxRaw) * (maxRaw > 0 ? padFactor : 1);
  return [minValue, maxValue];
}
