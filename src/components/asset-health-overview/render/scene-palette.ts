import { lightTheme } from '@fuselab-creative/design-system';

import { qualitativePalette, sequentialPalette, type ChartStyleId } from '../../../utils/chart-theme.js';

/**
 * The arena's colours, from the page style's palettes — the same ones every
 * other chart paints with — so a page restyled to `palette1`…`palette4`
 * restyles the arena with it.
 *
 * SequentialColors1 lights the scene: the smoke and the glass, each goal's
 * glow, the healthy agents' faint cast, the hairline instruments and the
 * floor. The secondary colour (the second of Qualitative2) is the traffic:
 * the calls running to the diamonds and the light travelling along links.
 * What holds agents keeps its own hue on every page (the painters' `HOLD`
 * colours), so trouble reads the same whatever the style.
 *
 * In light mode the scene is drawn in ink rather than light: the picture is
 * built the same way, and its last pass turns light into ink of `ink`'s colour
 * (coloured marks keep their hue, darkened), on a pale room; the hairlines and
 * the floor take the ramp's deep end.
 */

export type RGB = [number, number, number];

export interface ScenePalette {
  mode: 'light' | 'dark';
  /** Light mode: the ink neutral light turns into (sRGB 0–1); the painter's healthy agents too. */
  ink: RGB;
  /** The scene's light (linear, high range): smoke, goal glow, link glow. Matches the original cool blue in brightness. */
  light: RGB;
  /** Light caught by the glass at its limb (linear, max channel 1). */
  glass: RGB;
  /** Healthy agents: white with a breath of the light (linear). */
  agent: RGB;
  /** Traffic: calls and the lights along links (linear). */
  traffic: RGB;
  /** The same, for the canvas painter and CSS. */
  agentCss: string;
  trafficCss: string;
  /** Hairline instruments: rings, ticks, orbits, links, leaders. */
  line: string;
  /** The halo under the progress arc, the glint's halo, and the glint itself. */
  arcGlow: string;
  glint: string;
  glintStroke: string;
  /** The floor grid and the mist pooled round the room. */
  grid: string;
  mist: string;
  floorMist: string;
  /** Motes along the edges, as `r,g,b` (lightest first) and how often each is picked. */
  motes: string[];
}


/** Luminance the scene light keeps, whatever its hue: the original cool blue's. */
const LIGHT_LUMINANCE = 0.458;

const parse = (hex: string): RGB => {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toLinear = (c: RGB): RGB => c.map((v) => Math.pow(v / 255, 2.2)) as RGB;
const toSrgb = (c: RGB): RGB => c.map((v) => Math.round(Math.pow(Math.min(1, Math.max(0, v)), 1 / 2.2) * 255)) as RGB;
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => v + (b[i]! - v) * t) as RGB;
const scale = (c: RGB, k: number): RGB => c.map((v) => v * k) as RGB;
const luminance = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const rgb = (c: RGB) => `${c[0]},${c[1]},${c[2]}`;
/** CSS colour with an alpha: space-separated, as the slash form requires. */
const rgba = (c: RGB, a: number) => `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`;
const WHITE: RGB = [1, 1, 1];
const INK: RGB = parse('#F1F4F8');
/** The room's own graphite mist, which the palette only tints: lit from above, and pooled low. */
const MIST: RGB = [139, 163, 190];
const FLOOR_MIST: RGB = [82, 100, 122];
/** Light mode's ink: a deep slate, a little of the ramp's deepest step in it. */
const SLATE: RGB = parse('#1E293B');

const DATA_VIZ = lightTheme.colors.dataViz.qualitative_12;

/**
 * What holds agents and how a goal stands, from the design system's dataViz
 * Qualitative 12: failed its red, blocked its orange, slowed and over budget
 * its yellow, awaiting its purple, on track its green. They stay the same on
 * every page style, so trouble reads the same whatever the style.
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
const LIGHT_ROOM = parse('#F6F7FB');
const relative = (c: RGB) => luminance(c.map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : Math.pow((v / 255 + 0.055) / 1.055, 2.4))) as RGB);

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
    out[tone] = mode === 'dark' ? hex : `rgb(${rgb(deepen(hex))})`;
  }
  return out;
}

export function scenePalette(styleId: ChartStyleId, mode: 'light' | 'dark' = 'dark'): ScenePalette {
  const ramp = sequentialPalette(styleId).map(parse);
  const step = (i: number) => ramp[Math.min(ramp.length - 1, i)]!;
  const secondary = parse(qualitativePalette(styleId, 2)[1] ?? qualitativePalette('default', 2)[1]!);

  // the light is the ramp's third step, raised to the brightness the scene was lit with
  const hue = toLinear(step(2));
  const light = scale(hue, Math.min(LIGHT_LUMINANCE / Math.max(1e-3, luminance(hue)), 1.6 / Math.max(...hue)));
  const glassRaw = mix(WHITE, toLinear(step(1)), 0.6);
  const glass = scale(glassRaw, 1 / Math.max(...glassRaw));
  const agent = mix(WHITE, toLinear(step(0)), 0.45);
  // traffic is bright: the secondary, lifted towards white so a small spark still reads
  const traffic = mix(toLinear(secondary), WHITE, 0.25);

  const srgbAgent = toSrgb(agent);
  const srgbTraffic = toSrgb(traffic);
  const ink = mix(SLATE, step(6), 0.35).map(Math.round) as RGB;
  const inkUnit = ink.map((v) => v / 255) as RGB;
  if (mode === 'light') {
    const deepTraffic = mix(secondary, SLATE, 0.2).map(Math.round) as RGB;
    return {
      mode,
      ink: inkUnit,
      light,
      glass,
      agent,
      traffic,
      agentCss: `rgb(${rgb(ink)})`,
      trafficCss: `rgb(${rgb(deepTraffic)})`,
      line: `rgb(${rgb(mix(parse('#334155'), step(6), 0.35).map(Math.round) as RGB)})`,
      arcGlow: rgba(step(4), 0.35),
      glint: rgba(step(3), 0.5),
      glintStroke: `rgb(${rgb(step(5))})`,
      grid: `rgb(${rgb(step(5))})`,
      mist: rgb(step(1)),
      floorMist: rgb(step(2)),
      motes: [rgb(step(4)), rgb(deepTraffic), rgb(step(5)), rgb(step(6))],
    };
  }
  const line = mix(INK, step(0), 0.45).map(Math.round) as RGB;
  return {
    mode,
    ink: inkUnit,
    light,
    glass,
    agent,
    traffic,
    agentCss: `rgb(${rgb(srgbAgent)})`,
    trafficCss: `rgb(${rgb(srgbTraffic)})`,
    line: `rgb(${rgb(line)})`,
    arcGlow: rgba(step(2), 0.6),
    glint: rgba(step(1), 0.9),
    glintStroke: '#ffffff',
    grid: `rgb(${rgb(step(2))})`,
    mist: rgb(mix(MIST, step(3), 0.5).map(Math.round) as RGB),
    floorMist: rgb(mix(FLOOR_MIST, step(5), 0.5).map(Math.round) as RGB),
    motes: [rgb(step(1)), rgb(mix(secondary, [255, 255, 255], 0.35).map(Math.round) as RGB), rgb(step(2)), rgb(step(4))],
  };
}
