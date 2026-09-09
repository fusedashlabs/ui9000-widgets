/** Fit axis to data span with padding — FuseDash FUS-3440 (no forced zero baseline). */
export function paddedLinearDomain(values: number[], padRatio = 0.05): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [0, 1];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min;
  const pad = span > 0 ? span * padRatio : 1;
  return [min - pad, max + pad];
}
