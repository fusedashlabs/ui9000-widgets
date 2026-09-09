import { generateBreakPoints } from '../../../utils/breakpoints.js';

export { generateBreakPoints };

export interface SankeyColorRange {
  color: string;
  start: number;
  end: number;
}

/**
 * Mirrors the client `generateColorRanges` effect: one range per palette step,
 * the last one stretched to 3x so the largest link still finds a bucket.
 */
export function buildColorRanges(
  values: number[],
  colors: string[],
): SankeyColorRange[] {
  if (!colors.length) return [];
  const unique = [...new Set(values.filter((v) => Number.isFinite(v)))];
  const steps = generateBreakPoints(unique, colors.length);

  return steps.map((step, i) => ({
    color: colors[i],
    start: Math.trunc(step),
    end: Math.trunc(i === steps.length - 1 ? step * 3 : steps[i + 1]),
  }));
}

export function pickRangeColor(
  ranges: SankeyColorRange[],
  value: number,
  fallback: string,
): string {
  if (!ranges.length) return fallback;
  const hit = ranges.find((r) => r.start <= value && r.end >= value);
  return (hit ?? ranges[ranges.length - 1]).color;
}
