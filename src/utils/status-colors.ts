import { lightTheme } from '@fuselab-creative/design-system';

type RGB = [number, number, number];

const DATA_VIZ = lightTheme.colors.dataViz.qualitative_12;

/**
 * What holds agents and how a goal stands, from the design system's dataViz
 * Qualitative 12: failed its red, blocked its orange, degraded its yellow,
 * awaiting its purple, on track its green. They stay the same on every page
 * style, so trouble reads the same whatever the style.
 */
export const STATUS = {
  awaiting: DATA_VIZ[4]!,
  blocked: DATA_VIZ[2]!,
  failed: DATA_VIZ[5]!,
  warn: DATA_VIZ[3]!,
  ok: DATA_VIZ[1]!,
} as const;

export type StatusTone = keyof typeof STATUS;

/** Contrast the status hues keep as text on the light room. */
const LIGHT_CONTRAST = 4.5;

const parse = (hex: string): RGB => {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toLinear = (c: RGB): RGB => c.map((v) => Math.pow(v / 255, 2.2)) as RGB;
const toSrgb = (c: RGB): RGB => c.map((v) => Math.round(Math.pow(Math.min(1, Math.max(0, v)), 1 / 2.2) * 255)) as RGB;
const scale = (c: RGB, k: number): RGB => c.map((v) => v * k) as RGB;
const relative = (c: RGB) => {
  const [r, g, b] = c.map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : Math.pow((v / 255 + 0.055) / 1.055, 2.4)));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

const LIGHT_ROOM = parse('#F6F7FB');

/** The same hue, darkened in linear light until it holds as text on the light room. */
function deepen(hex: string): RGB {
  const room = relative(LIGHT_ROOM);
  const base = toLinear(parse(hex));
  let k = 1;
  let out = parse(hex);
  while (k > 0.05 && (room + 0.05) / (relative(out) + 0.05) < LIGHT_CONTRAST) {
    k *= 0.97;
    out = toSrgb(scale(base, k));
  }
  return out;
}

/** The status hues as CSS: as they are on the dark room; in light mode deepened so they hold on white. */
export function statusCss(mode: 'light' | 'dark'): Record<StatusTone, string> {
  const out = {} as Record<StatusTone, string>;
  for (const [tone, hex] of Object.entries(STATUS) as [StatusTone, string][]) {
    out[tone] = mode === 'dark' ? hex : `rgb(${deepen(hex).join(',')})`;
  }
  return out;
}
