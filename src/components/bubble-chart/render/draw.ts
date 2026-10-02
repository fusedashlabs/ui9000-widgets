import { axisBottom, axisLeft } from 'd3-axis';
import type { NumberValue } from 'd3-scale';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import { bubbleRadiusForValue, PUNCHCARD_MIN_LABEL_RADIUS } from '../../../utils/fuse-palette.js';
import {
  calculateNumTicks,
  FD,
  fdColors,
  formatCompactNumber,
  lightenColor,
} from '../../../utils/fusedash-visual.js';
import { bubbleXDomain, bubbleYDomain } from '../lib/domain.js';
import type { BubbleModel, BubblePoint } from '../lib/types.js';

export interface RenderBubbleChartOptions {
  model: BubbleModel;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  showGrid?: boolean;
  showTooltip?: boolean;
  onHover?: (payload: { point: BubblePoint; event: MouseEvent }) => void;
  onLeave?: () => void;
}

function formatAxisTick(value: number): string {
  const decimals = Number.isInteger(value) && Math.abs(value) < 1000 ? 0 : 2;
  return formatCompactNumber(value, decimals);
}

function bubbleFill(point: BubblePoint, color: string, hovered: boolean): string {
  if (point.y < 0) return lightenColor(FD.bubbleNegativeFill, 0.5);
  if (hovered) return color;
  const colorId = color.replace('#', 'hex');
  return `url(#bubble-gradient-${colorId})`;
}

function bubbleFillOpacity(point: BubblePoint, hovered: boolean): number {
  if (point.y < 0) return hovered ? 1 : 0.6;
  return hovered ? 0.6 : 1;
}

function bubbleStroke(point: BubblePoint, color: string): string {
  if (point.y < 0) return FD.bubbleNegativeFill;
  return color;
}

/** FuseDash BubbleChart — linear axes, abs(y) radius bands, grouped bubble fill. */
export function renderBubbleChart(
  container: HTMLElement,
  options: RenderBubbleChartOptions,
): void {
  const {
    model,
    width,
    height,
    margin = (() => {
      const inset = FD.bubbleMaxRadius / 2 + 1;
      const base = FD.bubbleBaseMargin;
      return {
        top: base.top + inset,
        right: base.right + inset,
        bottom: base.bottom,
        left: base.left,
      };
    })(),
    themeMode = 'light',
    showGrid = true,
    showTooltip = true,
    onHover,
    onLeave,
  } = options;

  container.replaceChildren();
  const { points, colorRanges } = model;
  if (!points.length || width <= 0 || height <= 0) return;

  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);
  if (innerWidth <= 0 || innerHeight <= 0) return;

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const [xMin, xMax] = bubbleXDomain(xValues);
  const [yMin, yMax] = bubbleYDomain(yValues);

  const xScale = scaleLinear<number, number>().domain([xMin, xMax]).range([0, innerWidth]).nice();
  const yScale = scaleLinear<number, number>().domain([yMin, yMax]).range([innerHeight, 0]).nice();

  const yTicks = calculateNumTicks(innerHeight);
  const xTicks = calculateNumTicks(innerWidth);
  const gridStroke = fdColors(themeMode).gridStroke;
  const axisStroke = fdColors(themeMode).axisStroke;
  const labelFill = fdColors(themeMode).axisLabelFill;

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'Bubble chart');

  const defs = svg.append('defs');
  const usedColors = new Set(points.filter((p) => p.y >= 0).map((p) => p.color));
  for (const color of usedColors) {
    const colorId = color.replace('#', 'hex');
    const gradient = defs
      .append('linearGradient')
      .attr('id', `bubble-gradient-${colorId}`)
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');
    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color)
      .attr('stop-opacity', '0.3');
    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color)
      .attr('stop-opacity', '0.1');
  }

  const plot = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  if (showGrid) {
    plot
      .append('g')
      .attr('class', 'y-grid')
      .call(
        axisLeft(yScale)
          .ticks(yTicks)
          .tickSize(-innerWidth)
          .tickFormat(() => ''),
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('line')
      .attr('stroke', gridStroke)
      .attr('stroke-dasharray', FD.gridDash)
      .attr('stroke-width', 1);

    plot
      .append('g')
      .attr('class', 'x-grid')
      .call(
        axisBottom(xScale)
          .ticks(xTicks)
          .tickSize(innerHeight)
          .tickFormat(() => ''),
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('line')
      .attr('stroke', gridStroke)
      .attr('stroke-dasharray', FD.gridDash)
      .attr('stroke-width', 1);
  }

  plot
    .append('g')
    .attr('class', 'y-axis')
    .call(
      axisLeft(yScale)
        .ticks(yTicks)
        .tickSize(0)
        .tickPadding(8)
        .tickFormat((d: NumberValue) => {
          const numeric = typeof d === 'number' ? d : d.valueOf();
          return Number.isInteger(numeric) ? formatAxisTick(numeric) : '';
        }),
    )
    .call((g) =>
      g
        .select('.domain')
        .attr('stroke', gridStroke)
        .attr('stroke-dasharray', FD.gridDash),
    )
    .selectAll('text')
    .attr('dx', `-${margin.left - 10}px`)
    .attr('fill', labelFill)
    .attr('font-size', FD.axisLabelSize)
    .attr('text-anchor', 'start');

  plot
    .selectAll('.y-axis .tick')
    .append('line')
    .attr('x1', -8)
    .attr('x2', 0)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', axisStroke)
    .attr('stroke-width', 1);

  plot
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(
      axisBottom(xScale)
        .ticks(xTicks)
        .tickSizeOuter(0)
        .tickSize(0)
        .tickPadding(8)
        .tickFormat((d: NumberValue) => {
          const numeric = typeof d === 'number' ? d : d.valueOf();
          return Number.isInteger(numeric) ? formatAxisTick(numeric) : '';
        }),
    )
    .call((g) => g.select('.domain').attr('stroke', axisStroke));

  const bubbleLayer = plot.append('g').attr('class', 'bubbles');
  const containers = bubbleLayer
    .selectAll('g')
    .data(points)
    .enter()
    .append('g')
    .attr('class', 'bubble-container')
    .attr('opacity', 1);

  containers.each(function (point) {
    const g = select(this);
    const cx = xScale(point.x);
    const cy = yScale(point.y);
    const radius = bubbleRadiusForValue(point.y, colorRanges);

    g.append('circle')
      .attr('class', 'bubble')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', radius)
      .attr('fill', bubbleFill(point, point.color, false))
      .attr('fill-opacity', bubbleFillOpacity(point, false))
      .attr('stroke', bubbleStroke(point, point.color))
      .attr('stroke-width', 1);

    if (radius >= PUNCHCARD_MIN_LABEL_RADIUS) {
      g.append('text')
        .attr('class', 'bubble-label')
        .attr('x', cx)
        .attr('y', cy)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#000')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('paint-order', 'stroke fill')
        .attr('font-size', 12)
        .attr('pointer-events', 'none')
        .text(formatCompactNumber(point.y));
    }
  });

  if (showTooltip && onHover) {
    containers
      .style('cursor', 'pointer')
      .on('mouseenter', function (this: SVGGElement, event: MouseEvent, point) {
        bubbleLayer.selectAll('.bubble-container').attr('opacity', FD.donutArcOpacityDimmed);
        select(this).attr('opacity', 1);
        select(this)
          .select('.bubble')
          .attr('fill', bubbleFill(point, point.color, true))
          .attr('fill-opacity', bubbleFillOpacity(point, true))
          .attr('stroke-width', 2);
        onHover({ point, event });
      })
      .on('mousemove', (event: MouseEvent, point) => {
        onHover({ point, event });
      })
      .on('mouseleave', () => {
        containers.attr('opacity', 1);
        containers.select('.bubble').each(function (point: BubblePoint) {
          select(this)
            .attr('fill', bubbleFill(point, point.color, false))
            .attr('fill-opacity', bubbleFillOpacity(point, false))
            .attr('stroke-width', 1);
        });
        onLeave?.();
      });
  }
}
