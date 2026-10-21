import { parseChartStyleId, qualitativePalette, type ChartStyleId } from '../../../utils/chart-theme.js';
import type { ReasoningModel } from '../lib/index.js';

/**
 * Dark is sampled from the design board: the explore model's cool blue, the
 * repair model's orange, a red for pruned candidates, and a white active path
 * that warms to its model's colour at the far end. Light keeps the hues one
 * step darker so they hold on white, and draws the path in ink.
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
  /** Active path from the root (start) to its far end (end defaults to its model). */
  pathStart: string;
  pathMid: string;
  glow: string;
  noteFill: string;
  noteStroke: string;
  noteText: string;
  noteMuted: string;
}

const DARK: OrchestrationPalette = {
  models: [],
  neutralNode: 'rgba(214, 220, 232, 0.62)',
  neutralLink: 'rgba(196, 205, 222, 0.17)',
  pruned: '#ff5d5d',
  rule: 'rgba(196, 205, 222, 0.16)',
  label: '#7d8696',
  halo: '#13161d',
  root: '#ffffff',
  rootHalo: 'rgba(255, 255, 255, 0.4)',
  pathStart: '#ffffff',
  pathMid: '#ffe4d2',
  glow: '#ffb08a',
  noteFill: 'rgba(15, 18, 25, 0.92)',
  noteStroke: 'rgba(255, 255, 255, 0.14)',
  noteText: '#e6e9ef',
  noteMuted: '#9aa3b2',
};

const LIGHT: OrchestrationPalette = {
  models: [],
  neutralNode: 'rgba(55, 65, 81, 0.5)',
  neutralLink: 'rgba(55, 65, 81, 0.15)',
  pruned: '#e03131',
  rule: 'rgba(55, 65, 81, 0.16)',
  label: '#6b7280',
  halo: '#ffffff',
  root: '#111827',
  rootHalo: 'rgba(17, 24, 39, 0.28)',
  pathStart: '#111827',
  pathMid: '#7c2d12',
  glow: '#fb923c',
  noteFill: 'rgba(255, 255, 255, 0.96)',
  noteStroke: 'rgba(17, 24, 39, 0.14)',
  noteText: '#111827',
  noteMuted: '#4b5563',
};

export function orchestrationPalette(
  mode: 'light' | 'dark',
  styleId: ChartStyleId | string = 'default',
): OrchestrationPalette {
  const base = mode === 'dark' ? DARK : LIGHT;
  return {
    ...base,
    models: qualitativePalette(parseChartStyleId(styleId), 12).slice(0, 6),
  };
}

/** A model's colour: its own, else its palette slot. */
export function modelColor(palette: OrchestrationPalette, model: ReasoningModel | undefined): string {
  if (!model) return palette.neutralNode;
  return model.color ?? palette.models[model.index % palette.models.length]!;
}

/** Colour lookup by model id, neutral when the id names no model. */
export function modelColors(
  palette: OrchestrationPalette,
  models: ReasoningModel[],
): (id: string | null | undefined) => string | null {
  const byId = new Map(models.map((model) => [model.id, modelColor(palette, model)]));
  return (id) => (id ? (byId.get(id) ?? null) : null);
}
