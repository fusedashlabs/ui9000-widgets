import { axisBottom, axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select, type Selection } from 'd3-selection';
import { area, curveCatmullRom } from 'd3-shape';

type PlotG = Selection<SVGGElement, unknown, null, undefined>;

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import {
  applyLeftGutterYAxisLabels,
  decorateAxisLabels,
  resolvePlotLeftMargin,
} from '../../../utils/axis-labels.js';
import {
  calculateNumTicks,
  FD,
  formatCompactNumber,
  seriesColor as fdSeriesColor,
} from '../../../utils/fusedash-visual.js';
import {
  collectValueExtent,
  densityGrid,
  kde,
  quantile,
  sampleExtent,
  silvermanBandwidth,
  type ViolinGroup,
  type ViolinModel,
  type ViolinOrientation,
} from '../lib/index.js';

export interface RenderViolinOptions extends AxisLabelTooltipHandlers {
  model: ViolinModel;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  orientation?: ViolinOrientation;
  showGrid?: boolean;
  xLabel?: string;
  yLabel?: string;
}

const BAND_PADDING = 0.2;
const FILL_OPACITY = 0.18;
const BOX_OPACITY = 0.25;
const AXIS_TICK_STROKE = '#939ba7';
const BOTTOM_TICK_PAD = 8;
const MAX_CATEGORY_LABEL = 25;
const MAX_HORIZONTAL_Y_LABEL = 5;

function resolveColor(
  group: ViolinGroup,
  index: number,
  theme: WidgetTheme,
): string {
  if (group.color) return group.color;
  if (index === 0 && theme.primary) return theme.primary;
  if (index === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(index);
}

function maxDensity(densities: Array<{ x: number; y: number }>): number {
  let m = 0;
  for (const d of densities) {
    if (d.y > m) m = d.y;
  }
  return m || 1;
}

function drawBoxOverlayVertical(
  g: PlotG,
  samples: number[],
  cx: number,
  bandwidth: number,
  yScale: (v: number) => number,
  color: string,
): void {
  const q1 = quantile(samples, 0.25);
  const q2 = quantile(samples, 0.5);
  const q3 = quantile(samples, 0.75);
  const vmin = Math.min(...samples);
  const vmax = Math.max(...samples);
  const bw = Math.min(18, bandwidth * 0.5);

  g.append('rect')
    .attr('x', cx - bw / 2)
    .attr('width', bw)
    .attr('y', yScale(q3))
    .attr('height', Math.max(1, yScale(q1) - yScale(q3)))
    .attr('fill', color)
    .attr('opacity', BOX_OPACITY)
    .attr('stroke', color);

  g.append('line')
    .attr('x1', cx - bw / 2 + 2)
    .attr('x2', cx + bw / 2 - 2)
    .attr('y1', yScale(q2))
    .attr('y2', yScale(q2))
    .attr('stroke', color)
    .attr('stroke-width', 1);

  g.append('line')
    .attr('x1', cx)
    .attr('x2', cx)
    .attr('y1', yScale(vmax))
    .attr('y2', yScale(vmin))
    .attr('stroke', color)
    .attr('stroke-width', 1);

  const cap = Math.min(6, bw / 2);
  g.append('line')
    .attr('x1', cx - cap)
    .attr('x2', cx + cap)
    .attr('y1', yScale(vmax))
    .attr('y2', yScale(vmax))
    .attr('stroke', color)
    .attr('stroke-width', 1);
  g.append('line')
    .attr('x1', cx - cap)
    .attr('x2', cx + cap)
    .attr('y1', yScale(vmin))
    .attr('y2', yScale(vmin))
    .attr('stroke', color)
    .attr('stroke-width', 1);
}

function drawBoxOverlayHorizontal(
  g: PlotG,
  samples: number[],
  cy: number,
  bandwidth: number,
  xScale: (v: number) => number,
  color: string,
): void {
  const q1 = quantile(samples, 0.25);
  const q2 = quantile(samples, 0.5);
  const q3 = quantile(samples, 0.75);
  const vmin = Math.min(...samples);
  const vmax = Math.max(...samples);
  const bh = Math.min(18, bandwidth * 0.5);

  g.append('rect')
    .attr('y', cy - bh / 2)
    .attr('height', bh)
    .attr('x', xScale(q1))
    .attr('width', Math.max(1, xScale(q3) - xScale(q1)))
    .attr('fill', color)
    .attr('opacity', BOX_OPACITY)
    .attr('stroke', color);

  g.append('line')
    .attr('y1', cy - bh / 2 + 2)
    .attr('y2', cy + bh / 2 - 2)
    .attr('x1', xScale(q2))
    .attr('x2', xScale(q2))
    .attr('stroke', color)
    .attr('stroke-width', 1);

  g.append('line')
    .attr('y1', cy)
    .attr('y2', cy)
    .attr('x1', xScale(vmin))
    .attr('x2', xScale(vmax))
    .attr('stroke', color)
    .attr('stroke-width', 1);

  const cap = Math.min(6, bh / 2);
  g.append('line')
    .attr('x1', xScale(vmin))
    .attr('x2', xScale(vmin))
    .attr('y1', cy - cap)
    .attr('y2', cy + cap)
    .attr('stroke', color)
    .attr('stroke-width', 1);
  g.append('line')
    .attr('x1', xScale(vmax))
    .attr('x2', xScale(vmax))
    .attr('y1', cy - cap)
    .attr('y2', cy + cap)
    .attr('stroke', color)
    .attr('stroke-width', 1);
}

function appendYTickLines(plot: PlotG): void {
  plot
    .selectAll('.y-axis .tick')
    .append('line')
    .attr('class', 'tick-line')
    .attr('x1', -8)
    .attr('x2', 0)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', AXIS_TICK_STROKE)
    .attr('stroke-width', '1px');
}

/**
 * FuseDash Vertical / Horizontal ViolinChart — KDE area + box overlay.
 * Coordinate system: translate(margin) then plot-local scales (client parity).
 */
export function renderViolinChart(
  container: HTMLElement,
  options: RenderViolinOptions,
): void {
  const {
    model,
    width,
    height,
    theme,
    orientation = model.orientation ?? 'vertical',
    showGrid = true,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  const defaultMargin =
    orientation === 'horizontal'
      ? FD.violinHorizontalMargin
      : FD.violinVerticalMargin;
  const margin = options.margin ?? { ...defaultMargin };

  container.replaceChildren();
  if (!model.groups.length || width <= 0 || height <= 0) return;

  const m = {
    top: margin.top,
    bottom: margin.bottom,
    left: resolvePlotLeftMargin(margin.left),
    right: Math.max(margin.right, 1),
  };

  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  if (plotW < 8 || plotH < 8) return;

  const groupIds = model.groups.map((g) => g.id);
  const [vmin, vmax] = collectValueExtent(model.groups);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', 'Violin chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const plot = svg
    .append('g')
    .attr('transform', `translate(${m.left},${m.top})`);

  const axisHandlers: AxisLabelTooltipHandlers = {
    onAxisLabelHover,
    onAxisLabelLeave,
  };

  if (orientation === 'vertical') {
    const xScale = scaleBand<string>()
      .domain(groupIds)
      .range([0, plotW])
      .padding(BAND_PADDING);
    const yScale = scaleLinear()
      .domain([vmin, vmax])
      .nice()
      .range([plotH, 0]);
    const xWidth = scaleLinear()
      .domain([0, 1])
      .range([0, (xScale.bandwidth() || 20) / 2]);

    if (showGrid) {
      const numTicks = Math.max(2, Math.round(plotH / 60));
      plot
        .append('g')
        .attr('class', 'grid-y')
        .selectAll('line')
        .data(yScale.ticks(numTicks))
        .join('line')
        .attr('x1', 0)
        .attr('x2', plotW)
        .attr('y1', (d) => yScale(d))
        .attr('y2', (d) => yScale(d))
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('shape-rendering', 'crispEdges');

      plot
        .append('g')
        .attr('class', 'grid-x')
        .call(
          axisBottom(xScale)
            .tickSize(plotH)
            .tickFormat(() => ''),
        )
        .call((g) => g.select('.domain').remove())
        .selectAll('line')
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('stroke-width', 1)
        .attr('shape-rendering', 'crispEdges');
    }

    const xAxis = plot
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${plotH})`)
      .call(
        axisBottom(xScale)
          .tickSizeOuter(0)
          .tickSize(0)
          .tickPadding(BOTTOM_TICK_PAD),
      )
      .call((g) => g.selectAll('.domain').attr('stroke', FD.axisStroke));

    xAxis
      .selectAll('text')
      .attr('fill', FD.axisLabelFill)
      .attr('font-size', FD.axisLabelSize);
    decorateAxisLabels(xAxis, {
      maxLength: MAX_CATEGORY_LABEL,
      slotWidth: xScale.bandwidth(),
      ...axisHandlers,
    });

    const yAxis = plot
      .append('g')
      .attr('class', 'y-axis')
      .call(
        axisLeft(yScale)
          .ticks(calculateNumTicks(plotH))
          .tickSize(0)
          .tickPadding(8)
          .tickFormat((d) => formatCompactNumber(Number(d))),
      )
      .call((g) => g.select('.domain').remove());

    applyLeftGutterYAxisLabels(yAxis, m.left, {
      maxLength: MAX_CATEGORY_LABEL,
      ...axisHandlers,
    });
    appendYTickLines(plot);

    model.groups.forEach((group, gi) => {
      const color = resolveColor(group, gi, theme);
      const samples = group.samples;
      const ext = sampleExtent(samples);
      if (!ext) return;
      const [lo, hi] = ext;
      const grid = densityGrid(lo, hi, 40);
      const h = silvermanBandwidth(samples, lo, hi);
      const densities = kde(samples, h, grid);
      const maxD = maxDensity(densities);
      const centerX = (xScale(group.id) || 0) + xScale.bandwidth() / 2;

      const shape = area<{ x: number; y: number }>()
        .x0((d) => centerX - xWidth(d.y / maxD))
        .x1((d) => centerX + xWidth(d.y / maxD))
        .y((d) => yScale(d.x))
        .curve(curveCatmullRom.alpha(0.6));

      plot
        .append('path')
        .datum(densities)
        .attr('d', shape)
        .attr('fill', color)
        .attr('opacity', FILL_OPACITY)
        .attr('stroke', color)
        .attr('stroke-width', 1);

      drawBoxOverlayVertical(
        plot,
        samples,
        centerX,
        xScale.bandwidth(),
        yScale,
        color,
      );
    });
  } else {
    const yScale = scaleBand<string>()
      .domain(groupIds)
      .range([0, plotH])
      .padding(BAND_PADDING);
    const xScale = scaleLinear()
      .domain([vmin, vmax])
      .nice()
      .range([0, plotW]);
    const yWidth = scaleLinear()
      .domain([0, 1])
      .range([0, (yScale.bandwidth() || 20) / 2]);

    if (showGrid) {
      const numTicks = Math.max(2, Math.round(plotW / 80));
      plot
        .append('g')
        .attr('class', 'grid-x')
        .selectAll('line')
        .data(xScale.ticks(numTicks))
        .join('line')
        .attr('x1', (d) => xScale(d))
        .attr('x2', (d) => xScale(d))
        .attr('y1', 0)
        .attr('y2', plotH)
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('shape-rendering', 'crispEdges');

      plot
        .append('g')
        .attr('class', 'grid-y')
        .call(
          axisLeft(yScale)
            .tickSize(-plotW)
            .tickFormat(() => ''),
        )
        .call((g) => g.select('.domain').remove())
        .selectAll('line')
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('stroke-width', 1)
        .attr('shape-rendering', 'crispEdges');
    }

    const xAxis = plot
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${plotH})`)
      .call(
        axisBottom(xScale)
          .ticks(calculateNumTicks(plotW))
          .tickSizeOuter(0)
          .tickSize(0)
          .tickPadding(BOTTOM_TICK_PAD)
          .tickFormat((d) => formatCompactNumber(Number(d))),
      )
      .call((g) => g.selectAll('.domain').attr('stroke', FD.axisStroke));

    xAxis
      .selectAll('text')
      .attr('fill', FD.axisLabelFill)
      .attr('font-size', FD.axisLabelSize);
    decorateAxisLabels(xAxis, {
      maxLength: MAX_HORIZONTAL_Y_LABEL,
      ...axisHandlers,
    });

    const yAxis = plot
      .append('g')
      .attr('class', 'y-axis')
      .call(axisLeft(yScale).tickSize(0).tickPadding(8))
      .call((g) => g.select('.domain').remove());

    applyLeftGutterYAxisLabels(yAxis, m.left, {
      maxLength: MAX_HORIZONTAL_Y_LABEL,
      slotWidth: undefined,
      ...axisHandlers,
    });
    appendYTickLines(plot);

    model.groups.forEach((group, gi) => {
      const color = resolveColor(group, gi, theme);
      const samples = group.samples;
      const ext = sampleExtent(samples);
      if (!ext) return;
      const [lo, hi] = ext;
      const grid = densityGrid(lo, hi, 40);
      const h = silvermanBandwidth(samples, lo, hi);
      const densities = kde(samples, h, grid);
      const maxD = maxDensity(densities);
      const centerY = (yScale(group.id) || 0) + yScale.bandwidth() / 2;

      const shape = area<{ x: number; y: number }>()
        .y0((d) => centerY - yWidth(d.y / maxD))
        .y1((d) => centerY + yWidth(d.y / maxD))
        .x((d) => xScale(d.x))
        .curve(curveCatmullRom.alpha(0.6));

      plot
        .append('path')
        .datum(densities)
        .attr('d', shape)
        .attr('fill', color)
        .attr('opacity', FILL_OPACITY)
        .attr('stroke', color)
        .attr('stroke-width', 1);

      drawBoxOverlayHorizontal(
        plot,
        samples,
        centerY,
        yScale.bandwidth(),
        xScale,
        color,
      );
    });
  }
}
