import { calculateScaleLinearDomain, FD } from '../../../utils/fusedash-visual.js';
import type { BarLayout, BarOrientation, BarSeries } from './types.js';

/**
 * Category axis domain — first series order wins (normalize keeps uniqueValues
 * order), then any categories only present in sibling series.
 */
export function collectBarCategories(series: BarSeries[]): string[] {
  if (!series.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of series) {
    for (const p of s.points) {
      if (!seen.has(p.x)) {
        seen.add(p.x);
        out.push(p.x);
      }
    }
  }
  return out;
}

/** Value of one series at one category, or `undefined` when the row is absent. */
export function valueAt(series: BarSeries, category: string): number | undefined {
  const point = series.points.find((p) => p.x === category);
  return point && Number.isFinite(point.y) ? point.y : undefined;
}

/** Running totals across categories — FuseDash `cumulativeValues`. */
export function cumulativeValues(series: BarSeries, categories: string[]): number[] {
  let acc = 0;
  return categories.map((c) => {
    acc += valueAt(series, c) ?? 0;
    return acc;
  });
}

/**
 * Per-category positive and negative stack totals — the extent a stacked bar
 * actually occupies (FuseDash sums the signs separately so mixed stacks grow
 * away from the baseline in both directions).
 */
export function stackTotals(
  series: BarSeries[],
  categories: string[],
): { positive: number[]; negative: number[] } {
  const positive: number[] = [];
  const negative: number[] = [];
  for (const c of categories) {
    let pos = 0;
    let neg = 0;
    for (const s of series) {
      const v = valueAt(s, c);
      if (v == null) continue;
      if (v > 0) pos += v;
      else neg += Math.abs(v);
    }
    positive.push(pos);
    negative.push(neg);
  }
  return { positive, negative };
}

/**
 * Headroom multiplier applied to the raw extent, matching each FuseDash
 * variant: the plain vertical chart pads by 1.2, the horizontal family by 1.1,
 * and the grouped vertical chart not at all.
 */
export function barPadFactor(
  orientation: BarOrientation,
  grouped: boolean,
): number {
  if (orientation === 'horizontal') return FD.barHorizontalPadFactor;
  return grouped ? 1 : FD.barDomainPadFactor;
}

export interface BarValueDomainOptions {
  orientation?: BarOrientation;
  layout?: BarLayout;
  /** Extend the domain so the cumulative overlay fits (FuseDash `cumulativeLine`) */
  cumulativeMax?: number;
}

/**
 * Value-axis extent: Y for vertical charts, X for horizontal ones.
 *
 * Grouped/plain charts take `calculateScaleLinearDomain` over every bar value;
 * stacked charts take the per-category stack totals plus FuseDash's flat 10%
 * pad on the larger side. `.nice()` is left to the scale.
 */
export function collectBarValueDomain(
  series: BarSeries[],
  options: BarValueDomainOptions = {},
): [number, number] {
  const { orientation = 'vertical', layout = 'grouped', cumulativeMax } = options;
  const categories = collectBarCategories(series);
  const stacked = layout === 'stacked' && series.length > 1;

  if (stacked) {
    const { positive, negative } = stackTotals(series, categories);
    const maxPositive = positive.length ? Math.max(...positive) : 0;
    const maxNegative = negative.length ? Math.max(...negative) : 0;
    if (!maxPositive && !maxNegative) return [0, 1];
    const pad = Math.max(maxPositive, maxNegative) * FD.barStackedPadFraction;
    return [
      maxNegative > 0 ? -(maxNegative + pad) : 0,
      maxPositive > 0 ? maxPositive + pad : 0,
    ];
  }

  const values: number[] = [];
  for (const s of series) {
    for (const p of s.points) {
      if (Number.isFinite(p.y)) values.push(p.y);
    }
  }
  if (!values.length) return [0, 1];

  const [min, max] = calculateScaleLinearDomain(values);
  const factor = barPadFactor(orientation, series.length > 1);
  const paddedMax = Math.max(max * factor, cumulativeMax ?? -Infinity);
  const paddedMin = min * factor;
  if (paddedMin === 0 && paddedMax === 0) return [0, 1];
  return [paddedMin, paddedMax];
}

/**
 * FuseDash baseline rule: bars grow from zero when the domain straddles it,
 * otherwise from whichever end of the domain is closest to zero.
 */
export function resolveBaseline(domain: [number, number]): number {
  const [min, max] = domain;
  if (max > 0 && min < 0) return 0;
  return max > 0 ? min : max;
}

/**
 * Offset of one bar from its group's centre — port of FuseDash `getBarPosition`.
 *
 * Bars step by `thickness + 1`; an odd count puts the middle bar dead centre,
 * an even count straddles the centre by half a step.
 */
export function groupedBarOffset(
  thickness: number,
  index: number,
  count: number,
  gap: number = FD.barGroupGap,
): number {
  const current = index + 1;
  const half = count / 2;
  const step = thickness + gap;

  if (count % 2) {
    const centre = Math.ceil(half);
    if (current < centre) return -step * (centre - current);
    if (current === centre) return 0;
    return step * (current - centre);
  }

  if (current <= half) return -(step * (half - current + 0.5));
  return step * (current - half - 0.5);
}
