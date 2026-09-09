import type { BoxPlotBox, BoxPlotModel } from './types.js';

export function collectLabels(model: BoxPlotModel): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of model.boxes) {
    if (!seen.has(b.label)) {
      seen.add(b.label);
      out.push(b.label);
    }
  }
  return out;
}

/** Values that affect the linear scale (whiskers + outliers). */
export function collectValueExtent(boxes: BoxPlotBox[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;

  const push = (v: number | undefined) => {
    if (v == null || !Number.isFinite(v)) return;
    if (v < min) min = v;
    if (v > max) max = v;
  };

  for (const b of boxes) {
    push(b.smallestNonOutlier);
    push(b.biggestNonOutlier);
    push(b.q1);
    push(b.q3);
    push(b.median);
    push(b.min);
    push(b.max);
    for (const o of b.outliers ?? []) push(o);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  return [min, max];
}

/** Domain padded * 1.1 — matches client Horizontal/Vertical BoxPlotChart. */
export function boxPlotLinearDomain(boxes: BoxPlotBox[]): [number, number] {
  const [min, max] = collectValueExtent(boxes);
  const domainMin = min < 0 ? min * 1.1 : 0;
  const domainMax = max === 0 && min === 0 ? 1 : max * 1.1;
  return [domainMin, domainMax];
}
