import { FD } from '../../../utils/fusedash-visual.js';
import type { PolarAreaSector } from './types.js';

/** Text anchor for a category label, mirroring the client's angle test. */
export function polarLabelAnchor(labelAngle: number): 'start' | 'middle' | 'end' {
  if (Math.abs(labelAngle) === Math.PI / 2) return 'middle';
  return labelAngle < Math.PI / 2 && labelAngle > -Math.PI / 2 ? 'start' : 'end';
}

/**
 * Sector angles — client `xScale = scaleLinear([0, n] → [0, 2π])` evaluated at
 * `i` and `i + 1`. Angle 0 is 12 o'clock (d3 `arc` convention).
 */
export function polarSectorAngles(
  count: number,
): Array<{ startAngle: number; endAngle: number }> {
  if (count <= 0) return [];
  const slice = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_v, i) => ({
    startAngle: i * slice,
    endAngle: (i + 1) * slice,
  }));
}

/**
 * Split each category's equal slice among the groups that have a value there.
 * Sector order must match `sectors` (category-major, then group order).
 */
export function polarGroupedSectorAngles(
  categories: string[],
  sectors: PolarAreaSector[],
): Array<{ startAngle: number; endAngle: number }> {
  if (!categories.length || !sectors.length) return [];
  const slice = (Math.PI * 2) / categories.length;
  const countByCategory = new Map<string, number>();
  const indexInCategory = new Map<PolarAreaSector, number>();
  for (const sector of sectors) {
    const next = countByCategory.get(sector.key) ?? 0;
    indexInCategory.set(sector, next);
    countByCategory.set(sector.key, next + 1);
  }
  return sectors.map((sector) => {
    const categoryIndex = Math.max(0, categories.indexOf(sector.key));
    const members = countByCategory.get(sector.key) ?? 1;
    const offset = indexInCategory.get(sector) ?? 0;
    const inner = slice / members;
    const base = categoryIndex * slice;
    return { startAngle: base + offset * inner, endAngle: base + (offset + 1) * inner };
  });
}

/** Radial grid / tick values: `maxValue * step / steps` for step 1…steps. */
export function polarRadialTicks(maxValue: number, steps: number): number[] {
  if (!Number.isFinite(maxValue) || maxValue <= 0 || steps <= 0) return [];
  return Array.from({ length: steps }, (_v, i) => ((i + 1) * maxValue) / steps);
}

export function polarMaxValue(sectors: PolarAreaSector[]): number {
  let max = 0;
  for (const sector of sectors) {
    if (sector.value > max) max = sector.value;
  }
  return max;
}

/**
 * Side room reserved for the category labels, measured off the longest one.
 * FuseDash sizes the disc from the raw box and lets long names run past the
 * SVG edge; chat widgets are far narrower, so — as with `punchcardLeftGutter`
 * and the bar-chart label gutter — the gutter is derived from the labels and
 * the disc shrinks into what is left.
 */
export function polarLabelGutter(categories: string[], plotWidth: number): number {
  const longest = categories.reduce((max, c) => Math.max(max, String(c).length), 0);
  const estimated = longest * FD.polarCategoryLabelSize * FD.polarLabelCharWidth;
  const ceiling = Math.min(
    FD.polarLabelGutterMax,
    Math.max(0, plotWidth) * FD.polarLabelGutterMaxFraction,
  );
  return Math.max(FD.polarLabelGutterMin, Math.min(estimated, ceiling));
}

/** Disc radius that leaves room for the labels ring on all four sides. */
export function polarOuterRadius(
  plotWidth: number,
  plotHeight: number,
  labelGutter: number,
): number {
  const byWidth = plotWidth / 2 - labelGutter - FD.polarCategoryLabelOffset;
  const byHeight =
    plotHeight / 2 - FD.polarCategoryLabelOffset - FD.polarCategoryLabelSize / 2;
  return Math.max(0, Math.min(byWidth, byHeight));
}
