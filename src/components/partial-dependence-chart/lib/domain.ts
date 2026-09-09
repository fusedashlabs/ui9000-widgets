/**
 * Client PDP axis domain: raw extent, no zero baseline and no padding, with a
 * hairline spread so a flat series still gets a usable scale.
 */
export function pdpLinearDomain(values: Iterable<number>): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min - 1e-6, max + 1e-6];
  return [min, max];
}
