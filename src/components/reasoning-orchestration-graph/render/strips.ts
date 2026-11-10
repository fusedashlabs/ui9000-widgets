import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import { CHART_TYPE } from '../../../utils/chart-theme.js';

import {
  breadthByDepth,
  formatStageMetric,
  type EntropyStrip,
  type ReasoningOrchestrationModel,
  type ReasoningStage,
} from '../lib/index.js';
import { MONO_ADVANCE, MONO_FONT } from './draw.js';
import { modelColors, orchestrationPalette } from './palette.js';

const LABEL_FONT = CHART_TYPE.axis;

function fit(value: string, room: number): string {
  const chars = Math.floor(room / (LABEL_FONT * MONO_ADVANCE));
  if (chars <= 1) return '';
  return value.length > chars ? `${value.slice(0, chars - 1)}…` : value;
}

export interface TopChartOptions {
  model: ReasoningOrchestrationModel;
  width: number;
  height: number;
  themeMode: 'light' | 'dark';
  styleId?: string;
  /** Node ids of the highlighted chain; their depths are lit. */
  chain: string[];
  highlightColor: string;
  onStageHover?: (stage: ReasoningStage, nodes: number, event: MouseEvent) => void;
  onLeave?: () => void;
}

/**
 * Top chart: breadth at each depth as a bar, the stages as segments over it,
 * each with its name, the compared metric and a bar for that metric. Depths
 * the highlighted path passes through are lit.
 */
export function renderTopChart(container: HTMLElement, options: TopChartOptions): void {
  const { model, width, height, themeMode, styleId, chain, highlightColor } = options;
  container.replaceChildren();
  if (width <= 0 || height <= 0) return;
  const palette = orchestrationPalette(themeMode, styleId);
  const colorOf = modelColors(palette, model.models);
  const breadth = breadthByDepth(model);
  const columns = breadth.length;
  const x = scaleLinear().domain([0, columns]).range([0, width]);
  const column = width / columns;
  const barWidth = Math.max(1, Math.min(6, column * 0.18));
  const top = 13;
  const bandBottom = height - 6;
  const maxBreadth = Math.max(1, ...breadth);
  // Square root, so one dense frontier does not flatten every other depth.
  const barHeight = (count: number) =>
    count ? Math.max(1, Math.sqrt(count / maxBreadth) * (bandBottom - top)) : 0;
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const lit = new Set(chain.map((id) => Math.round(byId.get(id)?.depth ?? -1)));

  const svg = select(container)
    .append('svg')
    .attr('class', 'ro-top-svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('aria-hidden', 'true')
    .style('display', 'block')
    .style('font-family', MONO_FONT);

  svg
    .append('g')
    .attr('class', 'ro-breadth')
    .selectAll('rect')
    .data(breadth.map((count, depth) => ({ count, depth })))
    .join('rect')
    .attr('class', (d) => (lit.has(d.depth) ? 'ro-breadth-bar is-lit' : 'ro-breadth-bar'))
    .attr('x', (d) => x(d.depth) + (column - barWidth) / 2)
    .attr('width', barWidth)
    .attr('y', (d) => bandBottom - barHeight(d.count))
    .attr('height', (d) => barHeight(d.count))
    .attr('fill', (d) => (lit.has(d.depth) ? highlightColor : palette.label))
    .attr('fill-opacity', (d) => (lit.has(d.depth) ? 0.95 : 0.4));

  const stages = model.stages.length
    ? model.stages
    : [
        {
          id: 'depth',
          label: 'Depth',
          index: 0,
          depthFrom: 0,
          depthTo: columns - 1,
          status: null,
          modelId: null,
          metrics: {},
        } satisfies ReasoningStage,
      ];
  const metric = model.stageMetric;
  const metricMax = metric ? Math.max(...stages.map((stage) => Math.abs(stage.metrics[metric.key] ?? 0)), 1e-9) : 1;

  const segments = svg
    .append('g')
    .attr('class', 'ro-stages')
    .selectAll('g')
    .data(stages)
    .join('g')
    .attr('class', 'ro-stage')
    .attr('data-status', (stage) => stage.status ?? '');
  const x0 = (stage: ReasoningStage) => x(Math.max(0, Math.round(stage.depthFrom)));
  const x1 = (stage: ReasoningStage) => x(Math.min(columns, Math.round(stage.depthTo) + 1));

  segments
    .filter((stage) => stage.index > 0)
    .append('line')
    .attr('x1', x0)
    .attr('x2', x0)
    .attr('y1', 0)
    .attr('y2', height)
    .attr('stroke', palette.rule);
  segments.each(function (stage) {
    const g = select(this);
    const left = x0(stage);
    const right = x1(stage);
    const room = right - left - 6;
    const value = metric && stage.metrics[metric.key] !== undefined ? formatStageMetric(metric, stage.metrics[metric.key]!) : '';
    const valueRoom = value ? (value.length + 1) * LABEL_FONT * MONO_ADVANCE : 0;
    const showValue = value && room - valueRoom > LABEL_FONT * MONO_ADVANCE * 3;
    const color = stage.status === 'active' ? highlightColor : palette.label;
    g.append('text')
      .attr('class', 'ro-stage-label')
      .attr('x', left + 3)
      .attr('y', 9)
      .attr('font-size', LABEL_FONT)
      .attr('letter-spacing', '0.04em')
      .attr('fill', color)
      .attr('fill-opacity', stage.status === 'pending' ? 0.55 : 1)
      .text(fit(stage.label.toUpperCase(), showValue ? room - valueRoom : room));
    if (showValue) {
      g.append('text')
        .attr('class', 'ro-stage-value')
        .attr('x', right - 3)
        .attr('y', 9)
        .attr('text-anchor', 'end')
        .attr('font-size', LABEL_FONT)
        .attr('fill', palette.noteText)
        .text(value);
    }
    if (metric && stage.metrics[metric.key] !== undefined) {
      const share = Math.abs(stage.metrics[metric.key]!) / metricMax;
      g.append('rect')
        .attr('class', 'ro-stage-metric')
        .attr('x', left + 3)
        .attr('y', height - 3)
        .attr('height', 2)
        .attr('width', Math.max(1, (right - left - 6) * share))
        .attr('fill', colorOf(stage.modelId) ?? palette.label);
    }
    g.append('rect')
      .attr('class', 'ro-stage-hit')
      .attr('x', left)
      .attr('width', Math.max(0, right - left))
      .attr('height', height)
      .attr('fill', 'transparent')
      .on('mousemove', (event: MouseEvent) => {
        const nodes = breadth.slice(Math.round(stage.depthFrom), Math.round(stage.depthTo) + 1).reduce((a, b) => a + b, 0);
        options.onStageHover?.(stage, nodes, event);
      })
      .on('mouseleave', () => options.onLeave?.());
  });
}

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
