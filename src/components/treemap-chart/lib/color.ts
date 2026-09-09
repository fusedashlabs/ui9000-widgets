import { generateBreakPoints } from '../../../utils/fuse-palette.js';
import { FD } from '../../../utils/fusedash-visual.js';

function channels(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function toHex(r: number, g: number, b: number): string {
  const part = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Mirrors client `lightenColor` — mix `amount` of white into the color. */
export function lightenColor(color: string, amount: number): string {
  const [r, g, b] = channels(color);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** Mirrors client `darkenColor` — mix `amount` of black into the color. */
export function darkenColor(color: string, amount: number): string {
  const [r, g, b] = channels(color);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/**
 * Mirrors client `getTreemapRangeColors` — seven shades of the group color,
 * from +55% white (low band) to −35% black (high band).
 */
export function treemapRangeColors(baseColor: string): string[] {
  const steps = FD.treemapRangeSteps;
  const min = FD.treemapRangeMinShift;
  const max = FD.treemapRangeMaxShift;
  return Array.from({ length: steps }, (_, i) => {
    const shift = min + (max - min) * (i / (steps - 1));
    return shift < 0 ? darkenColor(baseColor, Math.abs(shift)) : lightenColor(baseColor, shift);
  });
}

/**
 * Mirrors client `hasLightColor` — perceived brightness over white,
 * so the label flips to dark text on pale tiles.
 */
export function hasLightColor(color: string): boolean {
  const [r, g, b] = channels(color);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}

/**
 * Band edges for the color ramp. Client uses the widget `palette.range` when it
 * carries at least two stops, otherwise `[0, ...generateBreakPoints(sorted)]`.
 */
export function treemapValueRanges(values: number[], paletteRange?: number[] | null): number[] {
  if (Array.isArray(paletteRange) && paletteRange.length >= 2) return paletteRange;
  const sorted = [...values].sort((a, b) => a - b);
  return [0, ...generateBreakPoints(sorted)];
}

/**
 * Mirrors client `baseGetColorByValue` — the band whose `[start, end)` window
 * holds the value (the last band is inclusive), clamped to the ramp ends.
 */
export function treemapColorForValue(
  value: number | undefined,
  ranges: number[],
  rangeColors: string[],
  baseColor: string,
): string {
  const fallback = rangeColors[0] ?? baseColor;
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (ranges.length < 2) return fallback;

  const lastIndex = ranges.length - 2;
  const idx = ranges.slice(0, -1).findIndex((start, i) => {
    const end = ranges[i + 1];
    return i === lastIndex ? value >= start && value <= end : value >= start && value < end;
  });
  const lastColorIndex = Math.max(0, rangeColors.length - 1);

  if (idx === -1) {
    return value > ranges[ranges.length - 1]
      ? (rangeColors[lastColorIndex] ?? baseColor)
      : fallback;
  }

  return rangeColors[Math.min(idx, lastColorIndex)] ?? baseColor;
}
