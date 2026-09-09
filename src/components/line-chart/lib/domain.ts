import type { LineSeries } from './types.js';

export function collectXDomain(
  series: LineSeries[],
  xDomainHint?: string[],
): string[] {
  const seen = new Set<string>();
  const fromData: string[] = [];
  for (const s of series) {
    for (const p of s.points) {
      if (!seen.has(p.x)) {
        seen.add(p.x);
        fromData.push(p.x);
      }
    }
  }
  if (xDomainHint?.length) {
    const ordered = xDomainHint.filter((x) => seen.has(x));
    for (const x of fromData) {
      if (!ordered.includes(x)) ordered.push(x);
    }
    return ordered;
  }
  return fromData;
}

export function collectYExtent(series: LineSeries[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    for (const p of s.points) {
      if (p.y < min) min = p.y;
      if (p.y > max) max = p.y;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  return [min, max];
}
