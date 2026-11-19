import { lightTheme } from '@fuselab-creative/design-system';

import { parseChartStyleId, qualitativePalette, type ChartStyleId } from '../../../utils/chart-theme.js';
import { fdColors, hexWithAlpha } from '../../../utils/fusedash-visual.js';
import { STATUS, statusCss } from '../../../utils/status-colors.js';
import type { ReasoningModel, ReasoningNode } from '../lib/index.js';

/**
 * The plot's colours come from the design system; a model's own `color` from
 * the payload wins over its palette slot. Models take the page style's
 * qualitative palette, like every other chart. Pruned and failed take the
 * dataViz orange-red the goals graphs use for a blocked status, deepened on
 * light so it holds as text. Ink, labels, rules and notes are the design
 * system's grays, and white on light. The highlighted path starts in that ink
 * and warms to the colour at its far end.
 */
export interface OrchestrationPalette {
  /** Model colours in order; a model's own `color` wins. */
  models: string[];
  /** Nodes and links that name no model. */
  neutralNode: string;
  neutralLink: string;
  pruned: string;
  /** Stage boundary arcs and the depth readout. */
  rule: string;
  label: string;
  /** Halo behind plot text where the host sets no surface colour. */
  halo: string;
  root: string;
  rootHalo: string;
  /** The highlighted path's ink at the root; it warms toward its far end's colour. */
  pathStart: string;
  /** Far end of a path, and a note's accent, when no model names a colour: the first model colour. */
  glow: string;
  noteFill: string;
  noteStroke: string;
  noteText: string;
  noteMuted: string;
}

const GRAY = lightTheme.colors.ui.gray;
const WHITE = lightTheme.colors.white;

/** What depends only on the theme; the models and the fallback end follow the page style. */
type ThemeColors = Omit<OrchestrationPalette, 'models' | 'glow'>;

const DARK: ThemeColors = {
  neutralNode: hexWithAlpha(GRAY['05'], 62),
  neutralLink: hexWithAlpha(GRAY['05'], 17),
  pruned: STATUS.blocked,
  rule: hexWithAlpha(GRAY['05'], 16),
  label: fdColors('dark').axisLabelFill,
  halo: fdColors('dark').mapSpikeHalo,
  root: GRAY['01'],
  rootHalo: hexWithAlpha(GRAY['01'], 40),
  pathStart: GRAY['01'],
  noteFill: hexWithAlpha(GRAY['14'], 92),
  noteStroke: hexWithAlpha(GRAY['01'], 14),
  noteText: GRAY['01'],
  noteMuted: GRAY['05'],
};

const LIGHT: ThemeColors = {
  neutralNode: hexWithAlpha(GRAY['09'], 50),
  neutralLink: hexWithAlpha(GRAY['09'], 15),
  pruned: statusCss('light').blocked,
  rule: hexWithAlpha(GRAY['09'], 16),
  label: fdColors('light').axisLabelFill,
  halo: WHITE,
  root: GRAY['13'],
  rootHalo: hexWithAlpha(GRAY['13'], 28),
  pathStart: GRAY['13'],
  noteFill: hexWithAlpha(WHITE, 96),
  noteStroke: hexWithAlpha(GRAY['13'], 14),
  noteText: GRAY['13'],
  noteMuted: GRAY['09'],
};

export function orchestrationPalette(
  mode: 'light' | 'dark',
  styleId: ChartStyleId | string = 'default',
): OrchestrationPalette {
  const base = mode === 'dark' ? DARK : LIGHT;
  const models = qualitativePalette(parseChartStyleId(styleId), 12).slice(0, 6);
  return { ...base, models, glow: models[0]! };
}

/** A model's colour: its own, else its palette slot. */
export function modelColor(palette: OrchestrationPalette, model: ReasoningModel | undefined): string {
  if (!model) return palette.neutralNode;
  return model.color ?? palette.models[model.index % palette.models.length]!;
}

/** Pruned and failed nodes draw in the pruned red. */
export function isDropped(node: Pick<ReasoningNode, 'state'> | undefined): boolean {
  return node?.state === 'pruned' || node?.state === 'failed';
}

/**
 * The highlighted path's colour at its far end: the pruned red when it ends on
 * a pruned or failed node, else its model's colour, else the palette's orange.
 */
export function chainEndColor(palette: OrchestrationPalette, end: Pick<ReasoningNode, 'state'> | undefined, modelColor: string | null | undefined): string {
  if (isDropped(end)) return palette.pruned;
  return modelColor ?? palette.glow;
}

/**
 * `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()` and `hsl()`/`hsla()`
 * as red, green and blue (alpha dropped). Named colours are not parsed.
 */
export function parseCssColor(color: string): [number, number, number] | null {
  const value = color.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value)?.[1];
  if (hex && hex.length !== 5 && hex.length !== 7) {
    const full = hex.length <= 4 ? [...hex.slice(0, 3)].map((c) => c + c).join('') : hex.slice(0, 6);
    const n = Number.parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const fn = /^(rgba?|hsla?)\(\s*([^)]*)\)$/i.exec(value);
  if (!fn) return null;
  const parts = fn[2]!.split(/[\s,/]+/).filter(Boolean).slice(0, 3);
  if (parts.length < 3) return null;
  const num = (part: string, max: number) =>
    part.endsWith('%') ? (Number.parseFloat(part) / 100) * max : Number.parseFloat(part);
  if (fn[1]!.toLowerCase().startsWith('rgb')) {
    const rgb = parts.map((part) => Math.round(Math.min(255, Math.max(0, num(part, 255)))));
    return rgb.some(Number.isNaN) ? null : (rgb as [number, number, number]);
  }
  const h = (((Number.parseFloat(parts[0]!) % 360) + 360) % 360) / 360;
  const sat = num(parts[1]!, 1);
  const light = num(parts[2]!, 1);
  if ([h, sat, light].some(Number.isNaN)) return null;
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const channel = (t: number) => {
    const k = (t + 1) % 1;
    const v = k < 1 / 6 ? p + (q - p) * 6 * k : k < 1 / 2 ? q : k < 2 / 3 ? p + (q - p) * (2 / 3 - k) * 6 : p;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

/**
 * The highlighted path's middle: its start ink, two fifths of the way to its
 * far end's colour. A colour `parseCssColor` cannot read (a named colour)
 * keeps the start ink, so the gradient runs from the ink straight to the end.
 */
export function pathMid(palette: OrchestrationPalette, end: string): string {
  const a = parseCssColor(palette.pathStart);
  const b = parseCssColor(end);
  if (!a || !b) return palette.pathStart;
  return `#${a.map((v, i) => Math.round(v + (b[i]! - v) * 0.4).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Colour lookup by model id, neutral when the id names no model. */
export function modelColors(
  palette: OrchestrationPalette,
  models: ReasoningModel[],
): (id: string | null | undefined) => string | null {
  const byId = new Map(models.map((model) => [model.id, modelColor(palette, model)]));
  return (id) => (id ? (byId.get(id) ?? null) : null);
}
