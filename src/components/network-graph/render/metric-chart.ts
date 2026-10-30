import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { area, line } from 'd3-shape';

import { GRAPH_PANEL_COLORS, MONTHS, type PeriodPoint } from '../lib/index.js';

const CHART_HEIGHT = 170;
const CHART_PAD = { top: 8, right: 4, bottom: 44, left: 26 };

export interface RenderMetricChartOptions {
  series: PeriodPoint[];
  width: number;
  height?: number;
  themeMode?: 'light' | 'dark';
  /** Unique id for the gradient of this chart. */
  idPrefix: string;
  /** Name of the metric, for the screen reader label. */
  label?: string;
  onPointHover?: (point: PeriodPoint, event: MouseEvent) => void;
  onPointLeave?: () => void;
}

/** Line and area of one metric over time, with month and year labels. */
export function renderMetricChart(container: HTMLElement, options: RenderMetricChartOptions): void {
  const { series, width, height = CHART_HEIGHT, idPrefix, label } = options;
  const { themeMode = 'light', onPointHover, onPointLeave } = options;
  container.replaceChildren();
  if (series.length < 2 || !width) return;

  const colors = GRAPH_PANEL_COLORS[themeMode];
  const plotWidth = width - CHART_PAD.left - CHART_PAD.right;
  const plotHeight = height - CHART_PAD.top - CHART_PAD.bottom;
  const start = series[0].time;
  const end = series[series.length - 1].time;
  const max = Math.max(10, Math.ceil(Math.max(...series.map((point) => point.value)) / 10) * 10);
  const x = scaleLinear()
    .domain([start, end === start ? start + 1 : end])
    .range([CHART_PAD.left, CHART_PAD.left + plotWidth]);
  const y = scaleLinear()
    .domain([0, max])
    .range([CHART_PAD.top + plotHeight, CHART_PAD.top]);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', label ? `${label} over time` : 'Metric over time')
    .style('display', 'block')
    // The label of a month that starts at the edge stays whole.
    .style('overflow', 'visible');

  const gradient = svg
    .append('defs')
    .append('linearGradient')
    .attr('id', idPrefix)
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', 0)
    .attr('y2', 1);
  gradient
    .append('stop')
    .attr('offset', 0)
    .attr('stop-color', colors.chartLine)
    .attr('stop-opacity', 0.45);
  gradient
    .append('stop')
    .attr('offset', 1)
    .attr('stop-color', colors.chartLine)
    .attr('stop-opacity', 0.05);

  for (let tick = 0; tick <= max; tick += 10) {
    svg
      .append('line')
      .attr('x1', CHART_PAD.left)
      .attr('x2', CHART_PAD.left + plotWidth)
      .attr('y1', y(tick))
      .attr('y2', y(tick))
      .attr('stroke', colors.line);
    svg
      .append('text')
      .attr('x', 0)
      .attr('y', y(tick))
      .attr('dominant-baseline', 'central')
      .attr('font-size', 11)
      .attr('fill', colors.muted)
      .text(String(tick).padStart(2, '0'));
  }

  svg
    .append('path')
    .attr(
      'd',
      area<PeriodPoint>()
        .x((point) => x(point.time))
        .y0(y(0))
        .y1((point) => y(point.value))(series),
    )
    .attr('fill', `url(#${idPrefix})`);
  svg
    .append('path')
    .attr('class', 'metric-line')
    .attr(
      'd',
      line<PeriodPoint>()
        .x((point) => x(point.time))
        .y((point) => y(point.value))(series),
    )
    .attr('fill', 'none')
    .attr('stroke', colors.chartLine)
    .attr('stroke-width', 1.5);

  for (const point of series) {
    svg
      .append('circle')
      .attr('class', 'metric-point')
      .attr('cx', x(point.time))
      .attr('cy', y(point.value))
      .attr('r', 3)
      .attr('fill', colors.bar)
      .attr('stroke', colors.chartLine)
      .attr('stroke-width', 1.2);
  }

  const first = new Date(start);
  let month = Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1);
  while (month <= end) {
    const date = new Date(month);
    svg
      .append('text')
      .attr('class', 'metric-month')
      .attr('x', x(month))
      .attr('y', height - CHART_PAD.bottom + 16)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', colors.muted)
      .text(MONTHS[date.getUTCMonth()]);
    month = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  }
  // The year of the latest point.
  svg
    .append('text')
    .attr('class', 'metric-year')
    .attr('x', CHART_PAD.left + plotWidth / 2)
    .attr('y', height - 6)
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('fill', colors.muted)
    .text(new Date(end).getUTCFullYear());

  const hoverLine = svg
    .append('line')
    .attr('y1', CHART_PAD.top)
    .attr('y2', height - CHART_PAD.bottom)
    .attr('stroke', colors.muted)
    .attr('stroke-dasharray', '2 3')
    .attr('pointer-events', 'none')
    .style('visibility', 'hidden');
  const hoverDot = svg
    .append('circle')
    .attr('r', 5)
    .attr('fill', colors.chartLine)
    .attr('stroke', colors.bar)
    .attr('stroke-width', 2)
    .attr('pointer-events', 'none')
    .style('visibility', 'hidden');

  // The point nearest to the pointer, along the time axis.
  svg
    .on('pointermove', (event: PointerEvent) => {
      const pointerX = event.clientX - (svg.node() as SVGSVGElement).getBoundingClientRect().left;
      let nearest = series[0];
      for (const point of series) {
        if (Math.abs(x(point.time) - pointerX) < Math.abs(x(nearest.time) - pointerX)) {
          nearest = point;
        }
      }
      hoverLine.attr('x1', x(nearest.time)).attr('x2', x(nearest.time)).style('visibility', 'visible');
      hoverDot.attr('cx', x(nearest.time)).attr('cy', y(nearest.value)).style('visibility', 'visible');
      onPointHover?.(nearest, event);
    })
    .on('pointerleave', () => {
      hoverLine.style('visibility', 'hidden');
      hoverDot.style('visibility', 'hidden');
      onPointLeave?.();
    });
}
