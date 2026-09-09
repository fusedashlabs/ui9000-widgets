import { calculateScaleLinearDomain, FD } from '../../../utils/fusedash-visual.js';
import type { SparkLineSeries } from './types.js';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar-only strings are parsed in local time (matches FuseDash). */
export function parseXDate(x: string): Date {
  const match = DATE_ONLY.exec(x);
  if (match) {
    const [year, month, day] = x.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(x);
}

/** Unique x values; optional FuseDash `uniqueValues[xAxe]` order. */
export function collectSparkXDomain(
  series: SparkLineSeries[],
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

/** SparkLineChart always uses datetime x — sort ascending. */
export function orderSparkXDomain(xDomain: string[]): string[] {
  return [...xDomain].sort((a, b) => parseXDate(a).valueOf() - parseXDate(b).valueOf());
}

/** FuseDash y domain: extent × 1.2 before `.nice()`. */
export function collectSparkYDomain(series: SparkLineSeries[]): [number, number] {
  const values: number[] = [];
  for (const s of series) {
    for (const p of s.points) {
      if (Number.isFinite(p.y)) values.push(p.y);
    }
  }
  if (!values.length) return [0, 1];
  const [min, max] = calculateScaleLinearDomain(values);
  if (min === 0 && max === 0) return [0, 1];
  const pad = FD.sparkDomainPadFactor;
  return [min * pad, max * pad];
}
