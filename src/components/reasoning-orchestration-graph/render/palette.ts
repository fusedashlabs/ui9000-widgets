import { lightTheme } from '@fuselab-creative/design-system';

import { parseChartStyleId, qualitativePalette, type ChartStyleId } from '../../../utils/chart-theme.js';
import { fdColors, hexWithAlpha } from '../../../utils/fusedash-visual.js';
import { STATUS, statusCss } from '../../goals-perimeter/render/scene-palette.js';
import type { ReasoningModel, ReasoningNode } from '../lib/index.js';

/**
 * Every colour comes from the design system. Models take the page style's
 * qualitative palette, like every other chart. Pruned and failed take the
 * dataViz orange-red the goals graphs use for a blocked status and for
 * claims against a goal, deepened on light so it holds as text, as theirs is.
 * A path with no model ends in the first model colour. Ink, labels, rules and notes are the design
 * system's grays: light ink on dark, dark ink on light. The highlighted path
 * starts in that ink and warms to the colour at its far end.
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
  halo: '#FFFFFF',
  root: GRAY['13'],
  rootHalo: hexWithAlpha(GRAY['13'], 28),
  pathStart: GRAY['13'],
  noteFill: hexWithAlpha('#FFFFFF', 96),
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

/** The highlighted path's middle: its start ink, two fifths of the way to its far end's colour. */
export function pathMid(palette: OrchestrationPalette, end: string): string {
  /** `#rrggbb` or `rgb(r, g, b)`, as the status colours come on light. */
  const parse = (color: string): number[] | null => {
    if (/^#[0-9a-f]{6}/i.test(color)) {
      const n = Number.parseInt(color.slice(1, 7), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const rgb = /^rgb\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(color);
    return rgb ? rgb.slice(1, 4).map(Number) : null;
  };
  const a = parse(palette.pathStart);
  const b = parse(end);
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
