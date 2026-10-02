import { axisLeft } from 'd3-axis';
import { scaleLinear, scaleTime } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import { area as d3Area, line as d3Line } from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import {
  applyLeftGutterYAxisLabels,
  decorateManualAxisLabel,
  resolvePlotLeftMargin,
} from '../../../utils/axis-labels.js';
import {
  calculateNumTicks,
  FD,
  fdColors,
  formatCompactNumber,
  seriesColor as fdSeriesColor,
} from '../../../utils/fusedash-visual.js';
import {
  collectSparkXDomain,
  collectSparkYDomain,
  makeDateLabelFormatter,
  orderSparkXDomain,
  parseXDate,
  selectTickIndices,
  type SparkLineHoverEntry,
  type SparkLinePoint,
  type SparkLineSeries,
} from '../lib/index.js';

export interface RenderSparkLineChartOptions extends AxisLabelTooltipHandlers {
  series: SparkLineSeries[];
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  showGrid?: boolean;
  showArea?: boolean;
  xDomainHint?: string[];
  showTooltip?: boolean;
  xLabel?: string;
  yLabel?: string;
  onHover?: (payload: {
    x: string;
    xLabel: string;
    entries: SparkLineHoverEntry[];
    event: MouseEvent;
  }) => void;
  onLeave?: () => void;
}

function resolveColor(series: SparkLineSeries, index: number, theme: WidgetTheme): string {
  if (series.color) return series.color;
  if (index === 0 && theme.primary) return theme.primary;
  if (index === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(index);
}

/**
 * FuseDash SparkLineChart plot — D3 rewrite.
 * Datetime x (scaleTime), linear lines, full axes + dashed grid.
 */
export function renderSparkLineChart(
  container: HTMLElement,
  options: RenderSparkLineChartOptions,
): void {
  const {
    series,
    width,
    height,
    margin = { ...FD.sparkLineMargin },
    theme,
    themeMode = 'light',
    showGrid = true,
    showArea = false,
    xDomainHint,
    showTooltip = true,
    xLabel,
    yLabel,
    onHover,
    onLeave,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  const axisLabels: AxisLabelTooltipHandlers = {
    onAxisLabelHover,
    onAxisLabelLeave,
  };

  container.replaceChildren();
  if (!series.length || width <= 0 || height <= 0) return;

  const m = {
    top: margin.top,
    bottom: margin.bottom,
    left: resolvePlotLeftMargin(margin.left),
    right: Math.max(margin.right, 12),
  };
  const plotTop = m.top + (yLabel ? 12 : 0);
  const plotBottom = height - m.bottom - (xLabel ? 12 : 0);
  const plotLeft = m.left;
  const plotRight = width - m.right;
  if (plotRight - plotLeft < 8 || plotBottom - plotTop < 8) return;

  const xDomain = orderSparkXDomain(collectSparkXDomain(series, xDomainHint));
  if (xDomain.length < 2) return;

  const dates = xDomain.map(parseXDate);
  const timeScale = scaleTime()
    .domain([dates[0], dates[dates.length - 1]])
    .range([plotLeft, plotRight]);

  const xPos = (x: string): number => {
    const t = parseXDate(x);
    return Number.isNaN(t.valueOf()) ? NaN : timeScale(t);
  };

  const [minY, maxY] = collectSparkYDomain(series);
  const yScale = scaleLinear().domain([minY, maxY]).nice().range([plotBottom, plotTop]);
  const yTicks = yScale.ticks(calculateNumTicks(height));

  const dateLabel = makeDateLabelFormatter(dates);
  const xTickDates = timeScale.ticks();
  const xTickLabel = (d: Date): string => dateLabel(d);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', showArea ? 'Spark area chart' : 'Spark line chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const root = svg.append('g').attr('class', 'plot');

  if (showGrid) {
    const grid = root.append('g').attr('class', 'grid');

    for (const tick of xTickDates) {
      const px = timeScale(tick);
      if (!Number.isFinite(px)) continue;
      grid
        .append('line')
        .attr('x1', px)
        .attr('x2', px)
        .attr('y1', plotTop)
        .attr('y2', plotBottom)
        .attr('stroke', fdColors(themeMode).gridStroke)
        .attr('stroke-dasharray', '1,2')
        .attr('shape-rendering', 'crispEdges');
    }

    grid
      .append('line')
      .attr('x1', plotRight)
      .attr('x2', plotRight)
      .attr('y1', plotTop)
      .attr('y2', plotBottom)
      .attr('stroke', fdColors(themeMode).gridStroke)
      .attr('stroke-dasharray', '1,2')
      .attr('shape-rendering', 'crispEdges');

    for (const t of yTicks) {
      grid
        .append('line')
        .attr('x1', plotLeft)
        .attr('x2', plotRight)
        .attr('y1', yScale(t))
        .attr('y2', yScale(t))
        .attr('stroke', fdColors(themeMode).gridStroke)
        .attr('stroke-dasharray', '1,2')
        .attr('shape-rendering', 'crispEdges');
    }

    grid
      .append('line')
      .attr('class', 'zero-line')
      .attr('x1', plotLeft)
      .attr('x2', plotRight)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', fdColors(themeMode).gridStroke)
      .attr('shape-rendering', 'crispEdges');
  }

  const xIndex = new Map(xDomain.map((x, i) => [x, i]));
  const lineGen = d3Line<SparkLinePoint>()
    .defined((d) => Number.isFinite(d.y) && Number.isFinite(xPos(d.x)))
    .x((d) => xPos(d.x))
    .y((d) => yScale(d.y));

  const y0 = yScale(0);
  const areaGen = d3Area<SparkLinePoint>()
    .defined((d) => Number.isFinite(d.y) && Number.isFinite(xPos(d.x)))
    .x((d) => xPos(d.x))
    .y0(y0)
    .y1((d) => yScale(d.y));

  series.forEach((s, i) => {
    const color = resolveColor(s, i, theme);
    const ordered = [...s.points].sort(
      (a, b) => (xIndex.get(a.x) ?? 0) - (xIndex.get(b.x) ?? 0),
    );
    if (!ordered.length) return;

    const group = root.append('g').attr('class', `series series-${s.id}`);

    if (showArea) {
      group
        .append('path')
        .attr('class', 'area')
        .datum(ordered)
        .attr('fill', color)
        .attr('fill-opacity', 0.1)
        .attr('pointer-events', 'none')
        .attr('d', areaGen);
    }

    group
      .append('path')
      .attr('class', 'line')
      .datum(ordered)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', FD.sparkLineStrokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('d', lineGen);
  });

  const xAxis = root.append('g').attr('class', 'x-axis');
  const tickLabels = xTickDates.map(xTickLabel);
  const tickPositions = xTickDates.map((d) => timeScale(d));
  for (const i of selectTickIndices(tickLabels, tickPositions)) {
    const isFirst = i === 0;
    const isLast = i === xTickDates.length - 1;
    const nextPos = isLast ? plotRight : tickPositions[i + 1];
    const prevPos = isFirst ? plotLeft : tickPositions[i - 1];
    const slotWidth = Math.min(
      Math.abs(nextPos - tickPositions[i]),
      Math.abs(tickPositions[i] - prevPos),
    );
    const tickSel = xAxis
      .append('text')
      .attr('x', tickPositions[i])
      .attr('y', plotBottom + 16)
      .attr('text-anchor', isFirst ? 'start' : isLast ? 'end' : 'middle')
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('font-size', FD.axisLabelSize);
    decorateManualAxisLabel(tickSel, tickLabels[i], {
      slotWidth,
      ...axisLabels,
    });
  }

  const yAxis = root
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${plotLeft},0)`)
    .call(
      axisLeft(yScale)
        .tickValues(yTicks)
        .tickSize(4)
        .tickPadding(6)
        .tickFormat((d) => {
          const n = Number(d);
          const decimals = Number.isInteger(n) && Math.abs(n) < 1000 ? 0 : 2;
          return formatCompactNumber(n, decimals);
        }),
    );
  yAxis
    .select('.domain')
    .attr('stroke', fdColors(themeMode).axisStroke)
    .attr('stroke-dasharray', '1,2');
  yAxis.selectAll('.tick line').attr('stroke', fdColors(themeMode).axisStroke);
  applyLeftGutterYAxisLabels(yAxis, plotLeft, { themeMode });

  if (xLabel) {
    root
      .append('text')
      .attr('x', (plotLeft + plotRight) / 2)
      .attr('y', height - 2)
      .attr('text-anchor', 'middle')
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(xLabel);
  }

  if (yLabel) {
    root
      .append('text')
      .attr('x', 4)
      .attr('y', 11)
      .attr('text-anchor', 'start')
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(yLabel);
  }

  if (!showTooltip || !onHover) return;

  const guideColor = resolveColor(series[0], 0, theme);
  const hoverLayer = root.append('g').attr('class', 'hover').attr('pointer-events', 'none');
  const guide = hoverLayer
    .append('line')
    .attr('stroke', guideColor)
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', FD.sparkGuideDash)
    .attr('opacity', 0);
  const dotsG = hoverLayer.append('g').attr('class', 'hover-dots');

  const clearHover = (): void => {
    guide.attr('opacity', 0);
    dotsG.selectAll('*').remove();
    onLeave?.();
  };

  const nearestIndex = (px: number): number => {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < dates.length; i++) {
      const dist = Math.abs(timeScale(dates[i]) - px);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  root
    .append('rect')
    .attr('class', 'hover-target')
    .attr('x', plotLeft)
    .attr('y', plotTop)
    .attr('width', plotRight - plotLeft)
    .attr('height', plotBottom - plotTop)
    .attr('rx', 14)
    .attr('fill', 'transparent')
    .on('mousemove', (event: MouseEvent) => {
      const [px] = pointer(event, svg.node());
      const idx = nearestIndex(px);
      const x = xDomain[idx];
      if (x == null) return;
      const gx = xPos(x);
      if (!Number.isFinite(gx)) return;

      guide
        .attr('x1', gx)
        .attr('x2', gx)
        .attr('y1', plotTop)
        .attr('y2', plotBottom)
        .attr('opacity', 1);

      dotsG.selectAll('*').remove();
      const entries: SparkLineHoverEntry[] = [];
      series.forEach((s, i) => {
        const point = s.points.find((p) => p.x === x);
        if (!point || !Number.isFinite(point.y)) return;
        const color = resolveColor(s, i, theme);
        entries.push({
          seriesId: s.id,
          seriesName: s.name ?? s.id,
          color,
          value: point.y,
        });
        dotsG
          .append('circle')
          .attr('cx', gx)
          .attr('cy', yScale(point.y))
          .attr('r', FD.sparkHoverDotRadius)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
      });

      onHover({ x, xLabel: dateLabel(parseXDate(x)), entries, event });
    })
    .on('mouseleave', clearHover);
}
