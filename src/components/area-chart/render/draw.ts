import { axisBottom, axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { area, curveLinear, line as d3Line } from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import {
  applyLeftGutterYAxisLabels,
  decorateAxisLabels,
  resolvePlotLeftMargin,
} from '../../../utils/axis-labels.js';
import {
  appendGlowFilter,
  appendLineMarker,
  calculateNumTicks,
  calculateScaleLinearDomain,
  FD,
  formatCompactNumber,
  type MarkerShape,
  seriesColor as fdSeriesColor,
} from '../../../utils/fusedash-visual.js';
import { collectXDomain, type AreaModel, type AreaSeries } from '../lib/index.js';

interface PlotPoint {
  x: number;
  y0: number;
  y1: number;
  category: string;
  value: number;
}

export interface RenderAreaChartOptions extends AxisLabelTooltipHandlers {
  model: AreaModel;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  marker?: MarkerShape;
  showPoints?: boolean;
  showGrid?: boolean;
  xDomainHint?: string[];
  themeMode?: 'light' | 'dark';
  xLabel?: string;
  yLabel?: string;
  onPointHover?: (payload: {
    seriesId: string;
    seriesName: string;
    category: string;
    value: number;
    event: MouseEvent;
  }) => void;
  onPointLeave?: () => void;
}

function resolveColor(series: AreaSeries, index: number, theme: WidgetTheme): string {
  if (series.color) return series.color;
  if (index === 0 && theme.primary) return theme.primary;
  if (index === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(index);
}

function safeGradientId(key: string): string {
  return `area-gradient-${key.replace(/[^a-zA-Z0-9]/g, '')}`;
}

function toPlotPoints(
  series: AreaSeries,
  xScale: ReturnType<typeof scaleBand<string>>,
): PlotPoint[] {
  return series.points
    .filter((p) => xScale(p.x) != null)
    .map((p) => {
      const bx = xScale(p.x) ?? 0;
      const x = bx + xScale.bandwidth() / 2;
      return {
        x,
        y0: p.y0,
        y1: p.y1,
        category: p.x,
        value: p.y1 - p.y0,
      };
    });
}

/** FuseDash AreaChart — D3 rewrite (grouped + stacked). */
export function renderAreaChart(container: HTMLElement, options: RenderAreaChartOptions): void {
  const {
    model,
    width,
    height,
    margin = { ...FD.lineMargin },
    theme,
    marker = 'donut',
    showPoints = true,
    showGrid = true,
    xDomainHint,
    themeMode = 'light',
    xLabel,
    yLabel,
    onPointHover,
    onPointLeave,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  const axisLabels: AxisLabelTooltipHandlers = {
    onAxisLabelHover,
    onAxisLabelLeave,
  };

  container.replaceChildren();
  const { series } = model;
  if (!series.length || width <= 0 || height <= 0) return;

  const m = {
    top: margin.top,
    bottom: margin.bottom,
    left: resolvePlotLeftMargin(margin.left),
    right: Math.max(margin.right, 1),
  };
  const plotTop = m.top;
  const plotBottom = height - m.bottom;
  const plotLeft = m.left;
  const plotRight = width - m.right;
  if (plotRight - plotLeft < 8 || plotBottom - plotTop < 8) return;

  const xDomain = collectXDomain(
    series.map((s) => ({ ...s, points: s.points.map((p) => ({ x: p.x, y: p.y1 })) })),
    xDomainHint,
  );

  const allY: number[] = [];
  for (const s of series) {
    for (const p of s.points) {
      allY.push(p.y0, p.y1);
    }
  }
  const [minY, maxY] = calculateScaleLinearDomain(allY);
  const numTicks = calculateNumTicks(height);
  const isGrouped = series.length > 1;

  const xScale = scaleBand<string>()
    .domain(xDomain)
    .range([plotLeft, plotRight])
    .padding(-1);

  const yScale = scaleLinear()
    .domain([minY, maxY])
    .range([plotBottom, plotTop]);

  const yTicks = yScale.ticks(numTicks);
  const zeroY = yScale(0);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', 'Area chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const glowUrl = appendGlowFilter(svg);
  const defs = svg.select<SVGDefsElement>('defs');

  for (const s of series) {
    const color = resolveColor(s, series.indexOf(s), theme);
    const grad = defs
      .append('linearGradient')
      .attr('id', safeGradientId(s.id))
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', FD.areaGradientTopOpacity);
    grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', FD.areaGradientBottomOpacity);
  }

  const root = svg.append('g').attr('class', 'plot');

  if (showGrid) {
    const grid = root.append('g').attr('class', 'grid');
    for (const cat of xDomain) {
      const bx = xScale(cat);
      if (bx == null) continue;
      const x = bx + xScale.bandwidth() / 2;
      grid
        .append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', plotTop)
        .attr('y2', plotBottom)
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('shape-rendering', 'crispEdges');
    }
    for (const t of yTicks) {
      grid
        .append('line')
        .attr('x1', plotLeft)
        .attr('x2', plotRight)
        .attr('y1', yScale(t))
        .attr('y2', yScale(t))
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('shape-rendering', 'crispEdges');
    }
    grid
      .append('line')
      .attr('x1', plotRight)
      .attr('x2', plotRight)
      .attr('y1', plotTop)
      .attr('y2', plotBottom)
      .attr('stroke', FD.gridStroke)
      .attr('stroke-dasharray', FD.gridDash)
      .attr('shape-rendering', 'crispEdges');

    if (Number.isFinite(zeroY)) {
      grid
        .append('line')
        .attr('x1', plotLeft)
        .attr('x2', plotRight)
        .attr('y1', zeroY)
        .attr('y2', zeroY)
        .attr('stroke', FD.gridStroke)
        .attr('shape-rendering', 'crispEdges');
    }
  }

  const areaGen = area<PlotPoint>()
    .x((d) => d.x)
    .y0((d) => yScale(d.y0))
    .y1((d) => yScale(d.y1))
    .curve(curveLinear);

  const lineGen = d3Line<PlotPoint>()
    .x((d) => d.x)
    .y((d) => yScale(d.y1))
    .curve(curveLinear);

  series.forEach((s, i) => {
    const color = resolveColor(s, i, theme);
    const plotPoints = toPlotPoints(s, xScale);
    if (!plotPoints.length) return;

    const layer = root.append('g').attr('class', `series series-${s.id}`);

    layer
      .append('path')
      .datum(plotPoints)
      .attr('class', 'area')
      .attr('fill', `url(#${safeGradientId(s.id)})`)
      .attr('pointer-events', 'none')
      .attr('d', areaGen);

    layer
      .append('path')
      .datum(plotPoints)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', FD.lineStrokeWidth)
      .attr('filter', glowUrl || null)
      .attr('pointer-events', 'none')
      .attr('d', lineGen);

    const shape = s.marker ?? marker;
    if (showPoints && shape !== 'disabled') {
      const markersG = layer.append('g').attr('class', 'markers');
      for (const p of plotPoints) {
        const cy = yScale(p.y1);
        const hit = markersG
          .append('g')
          .attr('class', 'marker')
          .style('cursor', onPointHover ? 'pointer' : 'default');

        appendLineMarker(hit, {
          shape,
          color,
          cx: p.x,
          cy,
          r: FD.markerRadius,
          themeMode,
        });

        hit
          .append('circle')
          .attr('cx', p.x)
          .attr('cy', cy)
          .attr('r', 10)
          .attr('fill', 'transparent');

        if (onPointHover) {
          hit
            .on('mouseenter', (event: MouseEvent) => {
              if (isGrouped) {
                root.selectAll('.series').attr('opacity', 0.2);
                layer.attr('opacity', 1);
              }
              onPointHover({
                seriesId: s.id,
                seriesName: s.name ?? s.id,
                category: p.category,
                value: p.value,
                event,
              });
            })
            .on('mouseleave', () => {
              if (isGrouped) {
                root.selectAll('.series').attr('opacity', 1);
              }
              onPointLeave?.();
            });
        }
      }
    }
  });

  const xAxis = root
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${plotBottom})`)
    .call(axisBottom(xScale).tickSize(0).tickPadding(8).tickFormat((d) => String(d)));
  xAxis.select('.domain').attr('stroke', FD.axisStroke);
  xAxis.selectAll('line').attr('stroke', 'none');
  xAxis
    .selectAll('text')
    .attr('fill', FD.axisLabelFill)
    .attr('font-size', FD.axisLabelSize)
    .attr('text-anchor', 'middle');

  const xTickNodes = xAxis.selectAll<SVGTextElement, string>('text').nodes();
  if (xTickNodes.length > 0) {
    select(xTickNodes[0]).attr('text-anchor', 'start');
    if (xTickNodes.length > 1) {
      select(xTickNodes[xTickNodes.length - 1]).attr('text-anchor', 'end');
    }
  }

  decorateAxisLabels(xAxis, { slotWidth: xScale.bandwidth(), ...axisLabels });

  const yAxis = root
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${plotLeft},0)`)
    .call(
      axisLeft(yScale)
        .tickValues(yTicks)
        .tickSize(5)
        .tickPadding(6)
        .tickFormat((d) => {
          const n = Number(d);
          const decimals = Number.isInteger(n) && Math.abs(n) < 1000 ? 0 : 2;
          return formatCompactNumber(n, decimals);
        }),
    );
  yAxis.select('.domain').attr('stroke', 'none');
  yAxis.selectAll('line').attr('stroke', FD.axisStroke).attr('stroke-dasharray', FD.gridDash);
  applyLeftGutterYAxisLabels(yAxis, plotLeft);

  if (xLabel) {
    root
      .append('text')
      .attr('x', (plotLeft + plotRight) / 2)
      .attr('y', height - 2)
      .attr('text-anchor', 'middle')
      .attr('fill', FD.axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(xLabel);
  }

  if (yLabel) {
    root
      .append('text')
      .attr('x', 4)
      .attr('y', 11)
      .attr('text-anchor', 'start')
      .attr('fill', FD.axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(yLabel);
  }
}
