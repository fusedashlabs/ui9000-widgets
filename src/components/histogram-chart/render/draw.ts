import { axisBottom, axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import { applyLeftGutterYAxisLabels, resolvePlotLeftMargin } from '../../../utils/axis-labels.js';
import {
  calculateNumTicks,
  FD,
  fdColors,
  formatCompactNumber,
  seriesColor as fdSeriesColor,
} from '../../../utils/fusedash-visual.js';
import {
  collectBinKeys,
  collectYMax,
  type HistogramModel,
  type HistogramStack,
} from '../lib/index.js';

export interface RenderHistogramOptions extends AxisLabelTooltipHandlers {
  model: HistogramModel;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  showGrid?: boolean;
  xLabel?: string;
  yLabel?: string;
  onStackHover?: (payload: {
    binIndex: number;
    x0: number;
    x1: number;
    stack: HistogramStack;
    event: MouseEvent;
  }) => void;
  onStackLeave?: () => void;
}

function groupColor(
  group: string,
  groups: string[],
  override: string | undefined,
  theme: WidgetTheme,
): string {
  if (override) return override;
  const gi = Math.max(0, groups.indexOf(group));
  if (gi === 0 && theme.primary) return theme.primary;
  if (gi === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(gi);
}

/**
 * FuseDash HistogramChart plot — translate(margin) then inner plot scales.
 */
export function renderHistogramChart(
  container: HTMLElement,
  options: RenderHistogramOptions,
): void {
  const {
    model,
    width,
    height,
    margin = { ...FD.histogramMargin },
    theme,
    themeMode = 'light',
    showGrid = true,
    xLabel,
    yLabel,
    onStackHover,
    onStackLeave,
  } = options;

  container.replaceChildren();
  if (!model.bins.length || width <= 0 || height <= 0) return;

  const m = {
    top: margin.top,
    bottom: margin.bottom,
    left: resolvePlotLeftMargin(margin.left),
    right: Math.max(margin.right, 1),
  };

  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  if (plotW < 8 || plotH < 8) return;

  const yMax = collectYMax(model);
  const domainMax = yMax === 0 ? 1 : yMax * 1.2;
  const numTicks = calculateNumTicks(plotH);
  const binKeys = collectBinKeys(model);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', 'Histogram chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const g = svg
    .append('g')
    .attr('class', 'plot')
    .attr('transform', `translate(${m.left},${m.top})`);

  const xBand = scaleBand<string>().domain(binKeys).range([0, plotW]).padding(0);

  const xLinear = scaleLinear()
    .domain([model.xMin, model.xMax])
    .rangeRound([0, plotW])
    .clamp(true);

  const yScale = scaleLinear()
    .domain([0, domainMax])
    .nice()
    .range([plotH, 0]);

  const yTicks = yScale.ticks(numTicks);

  if (showGrid) {
    // y-grid (dashed horizontal)
    const yGrid = g.append('g').attr('class', 'y-grid');
    for (const t of yTicks) {
      yGrid
        .append('line')
        .attr('x1', 0)
        .attr('x2', plotW)
        .attr('y1', yScale(t))
        .attr('y2', yScale(t))
        .attr('stroke', fdColors(themeMode).gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('stroke-width', 1)
        .attr('shape-rendering', 'crispEdges');
    }

    // x-grid from linear axis ticks
    const xTicks = xLinear.ticks(Math.min(8, Math.max(2, binKeys.length)));
    const xGrid = g.append('g').attr('class', 'x-grid');
    for (const t of xTicks) {
      xGrid
        .append('line')
        .attr('x1', xLinear(t))
        .attr('x2', xLinear(t))
        .attr('y1', 0)
        .attr('y2', plotH)
        .attr('stroke', fdColors(themeMode).gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('stroke-width', 1)
        .attr('shape-rendering', 'crispEdges');
    }
  }

  // Stacked rects
  for (const bin of model.bins) {
    const key = String(bin.index);
    const bx = xBand(key) ?? 0;
    const bw = xBand.bandwidth();
    const binG = g.append('g').attr('class', `bin-group bin-${bin.index}`);

    for (const stack of bin.stacks) {
      const yTop = yScale(stack.end);
      const yBot = yScale(stack.start);
      const h = Math.max(0, yBot - yTop);
      const color = groupColor(stack.group, model.groups, stack.color, theme);

      const rect = binG
        .append('rect')
        .attr('class', 'bin')
        .attr('x', bx)
        .attr('width', bw)
        .attr('y', yTop)
        .attr('height', h)
        .attr('fill', color)
        .attr('fill-opacity', 0.8)
        .style('cursor', onStackHover ? 'pointer' : 'default');

      if (onStackHover) {
        rect
          .on('mouseenter', function (this: SVGRectElement, event: MouseEvent) {
            g.selectAll('.bin').attr('opacity', 0.2);
            select(this).attr('opacity', 1);
            onStackHover({
              binIndex: bin.index,
              x0: bin.x0,
              x1: bin.x1,
              stack,
              event,
            });
          })
          .on('mousemove', (event: MouseEvent) => {
            onStackHover({
              binIndex: bin.index,
              x0: bin.x0,
              x1: bin.x1,
              stack,
              event,
            });
          })
          .on('mouseleave', () => {
            g.selectAll('.bin').attr('opacity', 1);
            onStackLeave?.();
          });
      }
    }
  }

  // y-axis
  const yAxis = g
    .append('g')
    .attr('class', 'y-axis')
    .call(
      axisLeft(yScale)
        .tickValues(yTicks)
        .tickSize(0)
        .tickPadding(0)
        .tickFormat((d) => {
          const n = Number(d);
          const decimals = Number.isInteger(n) && Math.abs(n) < 1000 ? 0 : 2;
          return formatCompactNumber(n, decimals);
        }),
    );
  yAxis
    .select('.domain')
    .attr('stroke', fdColors(themeMode).axisStroke)
    .attr('stroke-dasharray', FD.gridDash);
  applyLeftGutterYAxisLabels(yAxis, m.left, { themeMode });

  yAxis
    .selectAll('.tick')
    .append('line')
    .attr('class', 'tick-line')
    .attr('x1', -4)
    .attr('x2', 0)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', fdColors(themeMode).axisStroke)
    .attr('stroke-width', 1);

  // x-axis (linear domain)
  const xAxis = g
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${plotH})`)
    .call(
      axisBottom(xLinear)
        .tickSizeOuter(0)
        .tickSize(0)
        .tickPadding(8)
        .tickFormat((d) => {
          const n = Number(d);
          const decimals = Number.isInteger(n) && Math.abs(n) < 1000 ? 0 : 2;
          return formatCompactNumber(n, decimals);
        }),
    );
  xAxis.select('.domain').attr('stroke', fdColors(themeMode).axisStroke);
  xAxis
    .selectAll('text')
    .attr('fill', fdColors(themeMode).axisLabelFill)
    .attr('font-size', FD.axisLabelSize)
    .attr('text-anchor', 'middle');

  const xTickNodes = xAxis.selectAll<SVGTextElement, number>('text').nodes();
  if (xTickNodes.length > 0) {
    select(xTickNodes[0]).attr('text-anchor', 'start');
    if (xTickNodes.length > 1) {
      select(xTickNodes[xTickNodes.length - 1]).attr('text-anchor', 'end');
    }
  }

  if (xLabel) {
    g.append('text')
      .attr('x', plotW / 2)
      .attr('y', plotH + m.bottom - 2)
      .attr('text-anchor', 'middle')
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(xLabel);
  }

  if (yLabel) {
    g.append('text')
      .attr('x', 4)
      .attr('y', -4)
      .attr('text-anchor', 'start')
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(yLabel);
  }
}
