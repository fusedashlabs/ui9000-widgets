import { select } from 'd3-selection';

import type { EntropyStrip, ReasoningOrchestrationModel } from '../lib/index.js';
import { modelColors, orchestrationPalette } from './palette.js';

export interface EntropyStripOptions {
  entropy: EntropyStrip;
  model: ReasoningOrchestrationModel;
  width: number;
  height: number;
  themeMode: 'light' | 'dark';
  styleId?: string;
  highlightColor: string;
  onStepHover?: (step: number, values: { label: string; value: number }[], event: MouseEvent) => void;
  onLeave?: () => void;
}

/** Colour of an entropy series: its model, else the first two model slots. */
export function entropyColors(
  entropy: EntropyStrip,
  model: ReasoningOrchestrationModel,
  themeMode: 'light' | 'dark',
  styleId: string = 'default',
): string[] {
  const palette = orchestrationPalette(themeMode, styleId);
  const colorOf = modelColors(palette, model.models);
  return entropy.series.map((series, i) => colorOf(series.modelId) ?? palette.models[i % palette.models.length]!);
}

/**
 * Step entropy as a barcode: one tick per step, the first series up from the
 * midline and the second down, so two runs read against each other. Called-out
 * step ranges get a band and full-strength ticks.
 */
export function renderEntropyStrip(container: HTMLElement, options: EntropyStripOptions): void {
  const { entropy, width, height, themeMode, highlightColor } = options;
  container.replaceChildren();
  if (width <= 0 || height <= 0) return;
  const palette = orchestrationPalette(themeMode, options.styleId);
  const colors = entropyColors(entropy, options.model, themeMode, options.styleId);
  const step = width / entropy.steps;
  const mid = entropy.series.length > 1 ? height / 2 : height - 1;
  const reach = entropy.series.length > 1 ? height / 2 - 1 : height - 2;
  const max = Math.max(1e-9, ...entropy.series.flatMap((series) => series.values));
  const inRange = (i: number) => entropy.highlight.some((range) => i >= range.from && i <= range.to);

  const svg = select(container)
    .append('svg')
    .attr('class', 'ro-entropy-svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('aria-hidden', 'true')
    .style('display', 'block');

  svg
    .selectAll('rect.ro-entropy-band')
    .data(entropy.highlight)
    .join('rect')
    .attr('class', 'ro-entropy-band')
    .attr('x', (range) => range.from * step)
    .attr('width', (range) => (range.to - range.from + 1) * step)
    .attr('height', height)
    .attr('fill', highlightColor)
    .attr('fill-opacity', 0.12);
  svg
    .append('line')
    .attr('class', 'ro-entropy-mid')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', mid)
    .attr('y2', mid)
    .attr('stroke', palette.rule);

  entropy.series.forEach((series, s) => {
    const up = s === 0;
    svg
      .append('g')
      .attr('class', `ro-entropy-series ro-entropy-series--${s}`)
      .selectAll('rect')
      .data(series.values.map((value, i) => ({ value, i })))
      .join('rect')
      .attr('x', (d) => d.i * step + step * 0.2)
      .attr('width', Math.max(0.8, step * 0.6))
      .attr('y', (d) => (up ? mid - (d.value / max) * reach : mid))
      .attr('height', (d) => Math.max(0.5, (d.value / max) * reach))
      .attr('fill', (d) => (inRange(d.i) ? palette.pathStart : colors[s]!))
      .attr('fill-opacity', (d) => (inRange(d.i) ? 1 : 0.3 + 0.6 * (d.value / max)));
  });

  svg
    .append('rect')
    .attr('class', 'ro-entropy-hit')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'transparent')
    .on('mousemove', (event: MouseEvent) => {
      const rect = (event.currentTarget as SVGRectElement).getBoundingClientRect();
      const scale = rect.width ? width / rect.width : 1;
      const i = Math.max(0, Math.min(entropy.steps - 1, Math.floor(((event.clientX - rect.left) * scale) / step)));
      options.onStepHover?.(
        i,
        entropy.series
          .filter((series) => series.values[i] !== undefined)
          .map((series, s) => ({ label: series.label || `Series ${s + 1}`, value: series.values[i]! })),
        event,
      );
    })
    .on('mouseleave', () => options.onLeave?.());
}
