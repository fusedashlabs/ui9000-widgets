/**
 * FuseDash palette resolution — mirrors
 * `client/.../getQualitativePalette` + `getCurrentColor` + SequentialColors1.
 */

export type FuseFormattingEntry = { key?: string; color?: string | number };

export const QUALITATIVE_2: string[] = ['#473DD9', '#36C4A5'];

export const QUALITATIVE_4: string[] = [
  '#473DD9',
  '#36C4A5',
  '#FF8C47',
  '#56546D',
];

/** Qualitative12Colors.default */
export const QUALITATIVE_12: string[] = [
  '#473DD9',
  '#938CFF',
  '#36C4A5',
  '#ADF4E5',
  '#BDBCC8',
  '#56546D',
  '#FF8C47',
  '#FFCEB0',
  '#FF4781',
  '#FFB0C9',
  '#47B0FF',
  '#B0DDFF',
];

/** SequentialColors1.default — punchcard magnitude bands */
export const SEQUENTIAL_1: string[] = [
  '#D6D3FF',
  '#B5B0FF',
  '#938CFF',
  '#7369FF',
  '#5448FF',
  '#473DD9',
  '#3C33B5',
];

/** FuseDash punchcard discrete radii per color band */
export const PUNCHCARD_RADII = [5, 10, 14, 17, 20, 24, 26] as const;

/** Client PunchcardChart bubble + frame tokens */
export const PUNCHCARD_MAX_BUBBLE_RADIUS = 30;
export const PUNCHCARD_MIN_BUBBLE_RADIUS = 8;
export const PUNCHCARD_MIN_LABEL_RADIUS = 16;
export const PUNCHCARD_BOTTOM_MARGIN = 21;
export const PUNCHCARD_LABEL_GUTTER_PAD = 10;

/** Tight left gutter from longest Y category (years ≈ 40px, not fixed 80). */
export function punchcardLeftGutter(
  categories: string[],
  fontSize = 11,
): number {
  const longest = categories.reduce(
    (max, c) => Math.max(max, String(c).length),
    0,
  );
  const chars = Math.max(longest, 3);
  return Math.ceil(chars * fontSize * 0.6) + PUNCHCARD_LABEL_GUTTER_PAD + 8;
}

/** @deprecated Use punchcardLeftGutter() */
export const PUNCHCARD_LEFT_MARGIN = 80;

/** Max bubble radius that fits the plot without clipping (FuseDash range inset). */
export function punchcardLayoutMaxRadius(
  plotWidth: number,
  plotHeight: number,
  xCount: number,
  yCount: number,
): number {
  if (xCount <= 0 || yCount <= 0) return PUNCHCARD_MAX_BUBBLE_RADIUS;
  const byX = plotWidth / xCount / 2;
  const byY = plotHeight / yCount / 2;
  return Math.min(PUNCHCARD_MAX_BUBBLE_RADIUS, byX, byY);
}

/**
 * Client rule: formatting.length ≤2 → Q2, 3–4 → Q4, >4 → Q12.
 * Falls back to seriesCount when formatting is empty.
 */
export function pickQualitativePalette(
  formattingCount: number,
  seriesCount = 1,
): string[] {
  const n = formattingCount > 0 ? formattingCount : seriesCount;
  if (n > 4) return QUALITATIVE_12;
  if (n > 2) return QUALITATIVE_4;
  return QUALITATIVE_2;
}

/**
 * Resolve hex for a formatting key (group / category / "default").
 * Color indices are 1-based strings matching palette `key`.
 */
export function resolveFormattingColor(
  formatting: FuseFormattingEntry[] | null | undefined,
  key: string,
  seriesCount = 1,
): string {
  const colors = formatting?.length
    ? formatting
    : [{ key: 'default', color: '1' }];
  const palette = pickQualitativePalette(colors.length, seriesCount);
  const entry = colors.find((item) => String(item.key) === String(key));
  const raw = entry?.color ?? colors[0]?.color ?? 1;
  const colorIndex = Number(raw);
  const idx = Number.isFinite(colorIndex) ? colorIndex : 1;
  // Client: find by key string first, else cycle (colorIndex - 1) % length
  const direct = palette[idx - 1];
  if (direct) return direct;
  return palette[(((idx - 1) % palette.length) + palette.length) % palette.length];
}

/** Apply qualitative colors onto a list of series/group ids. */
export function colorMapForKeys(
  keys: string[],
  formatting?: FuseFormattingEntry[] | null,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const key of keys) {
    map.set(key, resolveFormattingColor(formatting, key, keys.length));
  }
  return map;
}

export type PunchcardColorRange = {
  color: string;
  radius: number;
  start: number;
  end: number;
};

/** Mirrors client `generateBreakPoints` (quantile ladder, default 7). */
export function generateBreakPoints(
  values: number[],
  numBreaks = 7,
): number[] {
  const sorted = values
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((v) => Number.isFinite(v))
    .slice()
    .sort((a, b) => a - b);
  if (!sorted.length || numBreaks < 2) return [];

  const breakPoints: number[] = [];
  for (let i = 0; i < numBreaks; i++) {
    const quantilePosition = (i / (numBreaks - 1)) * (sorted.length - 1);
    const lowerIndex = Math.max(0, Math.floor(quantilePosition));
    const upperIndex = Math.min(sorted.length - 1, Math.ceil(quantilePosition));
    const weight = quantilePosition - lowerIndex;
    breakPoints.push(
      sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight,
    );
  }
  return breakPoints;
}

/** Mirrors client `generateColorRanges` for punchcard bubbles. */
export function generatePunchcardColorRanges(
  values: number[],
  variations: string[] = SEQUENTIAL_1,
): PunchcardColorRange[] {
  if (!variations.length || !values.length) return [];

  const sortedValues = [...new Set(values.map(Math.abs))].sort((a, b) => a - b);
  const steps = generateBreakPoints(sortedValues);
  if (!steps.length) return [];

  return steps.map((_step, i) => ({
    color: variations[i] ?? variations[variations.length - 1] ?? '#473DD9',
    radius: PUNCHCARD_RADII[i] ?? PUNCHCARD_RADII[PUNCHCARD_RADII.length - 1],
    start:
      -Math.ceil(
        i === steps.length - 1
          ? sortedValues[sortedValues.length - 1]
          : steps[i + 1],
      ) - 1,
    end:
      Math.ceil(
        i === steps.length - 1
          ? sortedValues[sortedValues.length - 1]
          : steps[i + 1],
      ) + 1,
  }));
}

export function punchcardColorForValue(
  value: number,
  ranges: PunchcardColorRange[],
): string {
  if (!ranges.length) return SEQUENTIAL_1[0];
  if (!value) return ranges[0].color;
  const range = ranges.find((r) => value >= r.start && value <= r.end);
  return range?.color ?? ranges[0].color;
}

export function punchcardRadiusForValue(
  value: number,
  ranges: PunchcardColorRange[],
): number {
  if (!ranges.length) return 5;
  const abs = Math.abs(value);
  const range = ranges.find((r) => abs >= r.start && abs <= r.end);
  return range?.radius ?? 5;
}

/** Mirrors client BubbleChart `generateColorRanges` — transparent bands, radius-only. */
export function generateBubbleColorRanges(
  values: number[],
  ranges?: number[] | null,
): PunchcardColorRange[] {
  if (!values.length) return [];

  const absValues = [...new Set(values.map(Math.abs))].sort((a, b) => a - b);
  const absCount = absValues.length;
  const steps = ranges?.length ? ranges : generateBreakPoints(absValues);
  if (!steps.length) return [];

  return steps.map((step, i) => ({
    color: 'transparent',
    radius: PUNCHCARD_RADII[i] ?? PUNCHCARD_RADII[PUNCHCARD_RADII.length - 1],
    start: step,
    end:
      i === steps.length - 1
        ? absCount > 0
          ? absValues[absCount - 1]
          : 0
        : steps[i + 1],
  }));
}

/** Alias — bubble radii use the same abs(y) band lookup as punchcard. */
export const bubbleRadiusForValue = punchcardRadiusForValue;

/** Scale discrete band radii when plot is shorter than FuseDash default height. */
export function punchcardScaledRadius(
  value: number,
  ranges: PunchcardColorRange[],
  layoutMaxR: number,
): number {
  const raw = punchcardRadiusForValue(value, ranges);
  const bandMax = Math.max(...ranges.map((r) => r.radius), PUNCHCARD_MIN_BUBBLE_RADIUS);
  const scale = layoutMaxR / Math.max(bandMax, PUNCHCARD_MIN_BUBBLE_RADIUS);
  return Math.max(
    PUNCHCARD_MIN_BUBBLE_RADIUS,
    Math.min(layoutMaxR, raw * Math.min(1, scale)),
  );
}

export type SequentialColorRange = {
  color: string;
  start: number;
  end: number;
};

/**
 * Mirrors client `generateColorRanges` (MatrixChart / palette legend):
 * a quantile ladder over the distinct values, one band per palette color.
 */
export function generateSequentialColorRanges(
  values: number[],
  variations: string[] = SEQUENTIAL_1,
  ranges?: number[] | null,
): SequentialColorRange[] {
  if (!variations.length || !values.length) return [];

  const sortedValues = [...new Set(values)].sort((a, b) => a - b);
  const steps = ranges?.length ? ranges : generateBreakPoints(sortedValues);
  const count = Math.min(steps.length, variations.length);

  const out: SequentialColorRange[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      color: variations[i],
      start: Number(steps[i]),
      end:
        i === count - 1
          ? sortedValues[sortedValues.length - 1]
          : Number(steps[i + 1]),
    });
  }
  return out;
}

/** Client `getColor`: first band containing the value, else the lowest band. */
export function sequentialColorForValue(
  value: number,
  ranges: SequentialColorRange[],
): string | null {
  if (!ranges.length) return null;
  const range = ranges.find((r) => value >= r.start && value <= r.end);
  return range?.color ?? ranges[0].color;
}
