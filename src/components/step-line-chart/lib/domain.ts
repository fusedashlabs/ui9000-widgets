import { calculateScaleLinearDomain, FD } from '../../../utils/fusedash-visual.js';
import type { StepLineSeries } from './types.js';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse an x value as a date.
 *
 * `new Date('2024-01-01')` is spec'd to be parsed as UTC midnight, which then
 * renders as the *previous* day west of Greenwich. Calendar-only strings are
 * therefore built in local time so the label matches the payload.
 */
export function parseXDate(x: string): Date {
  const match = DATE_ONLY.exec(x);
  if (match) {
    const [year, month, day] = x.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(x);
}

/** Unique x values across every series; optional FuseDash `uniqueValues` order. */
export function collectStepXDomain(
  series: StepLineSeries[],
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

/**
 * FuseDash `isXDateMode`: every x parses as a date AND there are at least two
 * distinct instants. A single date (or repeated identical ones) stays categorical.
 */
export function isDateXDomain(xDomain: string[]): boolean {
  if (!xDomain.length) return false;
  const times: number[] = [];
  for (const x of xDomain) {
    const t = parseXDate(x).valueOf();
    if (Number.isNaN(t)) return false;
    times.push(t);
  }
  return new Set(times).size >= 2;
}

/** Time mode sorts ascending; category mode keeps the payload order. */
export function orderStepXDomain(xDomain: string[]): string[] {
  if (!isDateXDomain(xDomain)) return xDomain;
  return [...xDomain].sort((a, b) => parseXDate(a).valueOf() - parseXDate(b).valueOf());
}

/**
 * FuseDash y domain: `calculateScaleLinearDomain` extent scaled by 1.2 on both
 * ends (`.nice()` is applied by the scale itself).
 */
export function collectStepYDomain(series: StepLineSeries[]): [number, number] {
  const values: number[] = [];
  for (const s of series) {
    for (const p of s.points) {
      if (Number.isFinite(p.y)) values.push(p.y);
    }
  }
  if (!values.length) return [0, 1];
  const [min, max] = calculateScaleLinearDomain(values);
  if (min === 0 && max === 0) return [0, 1];
  const pad = FD.stepDomainPadFactor;
  return [min * pad, max * pad];
}

/**
 * Mean y at each x, across series — the anchor FuseDash uses to place the
 * `Ideal` / `Random guessing` overlay.
 */
export function averageYByX(series: StepLineSeries[], xDomain: string[]): number[] {
  return xDomain.map((x) => {
    let sum = 0;
    let count = 0;
    for (const s of series) {
      const point = s.points.find((p) => p.x === x);
      const v = Number(point?.y);
      if (Number.isFinite(v)) {
        sum += v;
        count += 1;
      }
    }
    return count ? sum / count : NaN;
  });
}
