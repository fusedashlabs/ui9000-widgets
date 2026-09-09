import { calculateScaleLinearDomain } from '../../../utils/fusedash-visual.js';
import type { LollipopLayout, LollipopSeries } from './types.js';

export function valueAt(
  series: LollipopSeries,
  label: string,
): number | undefined {
  const point = series.points.find((p) => p.label === label);
  return point && Number.isFinite(point.value) ? point.value : undefined;
}

export interface LollipopStackSegment {
  series: LollipopSeries;
  seriesIndex: number;
  start: number;
  end: number;
  value: number;
}

/** Positive and negative halves stack away from 0 independently (FuseDash). */
export function stackSegments(
  series: LollipopSeries[],
  label: string,
): LollipopStackSegment[] {
  let pos = 0;
  let neg = 0;
  const out: LollipopStackSegment[] = [];
  series.forEach((s, seriesIndex) => {
    const value = valueAt(s, label);
    if (value == null || value === 0) return;
    if (value > 0) {
      const start = pos;
      pos += value;
      out.push({ series: s, seriesIndex, start, end: pos, value });
    } else {
      const start = neg;
      neg += value;
      out.push({ series: s, seriesIndex, start, end: neg, value });
    }
  });
  return out;
}

export function collectLabels(
  series: LollipopSeries[],
  labelHint?: string[],
): string[] {
  const seen = new Set<string>();
  const fromData: string[] = [];
  for (const s of series) {
    for (const p of s.points) {
      if (!seen.has(p.label)) {
        seen.add(p.label);
        fromData.push(p.label);
      }
    }
  }
  if (labelHint?.length) {
    const ordered = labelHint.filter((l) => seen.has(l));
    for (const l of fromData) {
      if (!ordered.includes(l)) ordered.push(l);
    }
    return ordered;
  }
  return fromData;
}

export function collectValueExtent(series: LollipopSeries[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    for (const p of s.points) {
      if (p.value < min) min = p.value;
      if (p.value > max) max = p.value;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  // Always include 0 baseline for lollipop stems
  min = Math.min(0, min);
  max = Math.max(0, max);
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  return [min, max];
}

/**
 * Value-axis domain used by the plot: `calculateScaleLinearDomain` × 1.2
 * (FuseDash lollipop). Stacked layout uses per-category stack totals.
 */
export function collectLollipopValueDomain(
  series: LollipopSeries[],
  layout: LollipopLayout = 'grouped',
  labelHint?: string[],
): [number, number] {
  const stacked = layout === 'stacked' && series.length > 1;
  const values: number[] = [];
  if (stacked) {
    for (const label of collectLabels(series, labelHint)) {
      let pos = 0;
      let neg = 0;
      for (const s of series) {
        const v = valueAt(s, label);
        if (v == null) continue;
        if (v > 0) pos += v;
        else neg += v;
      }
      if (pos) values.push(pos);
      if (neg) values.push(neg);
    }
  } else {
    for (const s of series) {
      for (const p of s.points) {
        if (Number.isFinite(p.value)) values.push(p.value);
      }
    }
  }
  const [minV, maxV] = calculateScaleLinearDomain(values);
  const domainMin = minV * 1.2;
  const domainMax = maxV === 0 && minV === 0 ? 1 : maxV * 1.2;
  return [domainMin, domainMax];
}
