import { axisBottom, axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { curveLinear, curveMonotoneX, curveStepAfter, line as d3Line } from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import { decorateAxisLabels, applyLeftGutterYAxisLabels, resolvePlotLeftMargin } from '../../../utils/axis-labels.js';
import {
  appendGlowFilter,
  appendLineMarker,
  calculateNumTicks,
  calculateScaleLinearDomain,
  FD,
  formatCompactNumber,
  hexWithAlpha,
  seriesColor as fdSeriesColor,
  type MarkerShape,
} from '../../../utils/fusedash-visual.js';
import {
  collectXDomain,
  type LineCurve,
  type LinePoint,
  type LineSeries,
} from '../lib/index.js';

export interface RenderLineChartOptions extends AxisLabelTooltipHandlers {
  series: LineSeries[];
  width: number;
  height: number;
  /** FuseDash new-design margins when omitted by host */
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  curve?: LineCurve;
  /** FuseDash default: donut */
  marker?: MarkerShape;
  showPoints?: boolean;
  showArea?: boolean;
  showGrid?: boolean;
  /** FuseDash `uniqueValues[xAxe]` order when available. */
  xDomainHint?: string[];
  showGlow?: boolean;
  themeMode?: 'light' | 'dark';
  xLabel?: string;
  yLabel?: string;
  onPointHover?: (payload: {
    seriesId: string;
    seriesName: string;
    point: LinePoint;
    event: MouseEvent;
  }) => void;
  onPointLeave?: () => void;
}

function curveFactory(curve: LineCurve) {
  switch (curve) {
    case 'step':
      return curveStepAfter;
    case 'monotone':
      return curveMonotoneX;
    default:
      return curveLinear;
  }
}

function resolveColor(series: LineSeries, index: number, theme: WidgetTheme): string {
  if (series.color) return series.color;
  if (index === 0 && theme.primary) return theme.primary;
  if (index === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(index);
}

/**
 * FuseDash SingleLineChart / GroupedLineChart plot — visual parity via D3.
 * Coordinate system matches Visx: scales include margin in range (no plot-group translate).
 */
export function renderLineChart(
  container: HTMLElement,
  options: RenderLineChartOptions,
): void {
  const {
    series,
    width,
    height,
    margin = { ...FD.lineMargin },
    theme,
    curve = 'linear',
    marker = 'donut',
    showPoints = true,
    showGrid = true,
    xDomainHint,
    showGlow = true,
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

  const xDomain = collectXDomain(series, xDomainHint);
  const allY: number[] = [];
  for (const s of series) {
    for (const p of s.points) {
      if (Number.isFinite(p.y)) allY.push(p.y);
    }
  }
  const [minY, maxY] = calculateScaleLinearDomain(allY);
  const numTicks = calculateNumTicks(height);
  const isGrouped = series.length > 1;

  // FuseDash: scaleBand + padding -1; points at x + bandwidth/2
  const xScale = scaleBand<string>()
    .domain(xDomain)
    .range([plotLeft, plotRight])
    .padding(-1);

  const yScale = scaleLinear()
    .domain([minY, maxY])
    .range([plotBottom, plotTop]);

  const yTicks = yScale.ticks(numTicks);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', 'Line chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const glowUrl = showGlow ? appendGlowFilter(svg) : '';

  const root = svg.append('g').attr('class', 'plot');

  // --- Grid (FuseDash dashed #afb3bb) ---
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
        .attr('stroke-dasharray', '1,2')
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
        .attr('stroke-dasharray', '1 2')
        .attr('shape-rendering', 'crispEdges');
    }

    // right edge guide
    grid
      .append('line')
      .attr('x1', plotRight)
      .attr('x2', plotRight)
      .attr('y1', plotTop)
      .attr('y2', plotBottom)
      .attr('stroke', FD.gridStroke)
      .attr('stroke-dasharray', '1, 2')
      .attr('shape-rendering', 'crispEdges');
  }

  const lineGen = d3Line<LinePoint>()
    .defined((d) => Number.isFinite(d.y) && xScale(d.x) != null)
    .x((d) => (xScale(d.x) ?? 0) + xScale.bandwidth() / 2)
    .y((d) => yScale(d.y))
    .curve(curveFactory(curve));

  const hoverGuide = root
    .append('line')
    .attr('class', 'hover-guide')
    .attr('stroke', themeMode === 'dark' ? FD.hoverGuideDark : FD.hoverGuideLight)
    .attr('stroke-width', 2)
    .attr('opacity', 0)
    .attr('pointer-events', 'none');

  series.forEach((s, i) => {
    const color = resolveColor(s, i, theme);
    const layer = root.append('g').attr('class', `series series-${s.id}`);
    // Single: hex@80%; Grouped: opaque stroke (client GroupedLineChart)
    const stroke = isGrouped ? color : hexWithAlpha(color, FD.lineStrokeAlphaPct);

    layer
      .append('path')
      .datum(s.points)
      .attr('fill', 'none')
      .attr('stroke', stroke)
      .attr('stroke-width', FD.lineStrokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('filter', glowUrl || null)
      .attr('d', lineGen);

    if (showPoints && marker !== 'disabled') {
      const markersG = layer.append('g').attr('class', 'markers');

      for (const p of s.points) {
        if (!Number.isFinite(p.y) || xScale(p.x) == null) continue;
        const cx = (xScale(p.x) ?? 0) + xScale.bandwidth() / 2;
        const cy = yScale(p.y);
        const hit = markersG
          .append('g')
          .attr('class', 'marker')
          .style('cursor', onPointHover ? 'pointer' : 'default');

        appendLineMarker(hit, {
          shape: marker,
          color,
          cx,
          cy,
          r: FD.markerRadius,
          themeMode,
        });

        // invisible hit target
        hit
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 10)
          .attr('fill', 'transparent')
          .attr('stroke', 'none');

        if (onPointHover) {
          hit
            .on('mouseenter', (event: MouseEvent) => {
              hoverGuide
                .attr('x1', cx)
                .attr('x2', cx)
                .attr('y1', plotTop)
                .attr('y2', plotBottom)
                .attr('opacity', 0.8);
              // Dim sibling series (FuseDash legacy hover; new-design keeps opacity 1 —
              // still useful in chat for multi-series readability)
              if (isGrouped) {
                root.selectAll('.series').attr('opacity', 0.2);
                layer.attr('opacity', 1);
              }
              onPointHover({
                seriesId: s.id,
                seriesName: s.name ?? s.id,
                point: p,
                event,
              });
            })
            .on('mouseleave', () => {
              hoverGuide.attr('opacity', 0);
              if (isGrouped) {
                root.selectAll('.series').attr('opacity', 1);
              }
              onPointLeave?.();
            });
        }
      }
    }
  });

  // --- Axes (FuseDash AxisBottom / AxisLeft) ---
  const xAxis = root
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${plotBottom})`)
    .call(
      axisBottom(xScale)
        .tickSize(0)
        .tickPadding(8)
        .tickFormat((d) => String(d)),
    );
  xAxis.select('.domain').attr('stroke', FD.axisStroke);
  xAxis.selectAll('line').attr('stroke', 'none');
  xAxis
    .selectAll('text')
    .attr('fill', FD.axisLabelFill)
    .attr('font-size', FD.axisLabelSize)
    .attr('text-anchor', 'middle');

  // Keep first/last X labels inside the SVG (scaleBand edge ticks otherwise clip)
  const xTickNodes = xAxis.selectAll<SVGTextElement, string>('text').nodes();
  if (xTickNodes.length > 0) {
    select(xTickNodes[0]).attr('text-anchor', 'start');
    if (xTickNodes.length > 1) {
      select(xTickNodes[xTickNodes.length - 1]).attr('text-anchor', 'end');
    }
  }

  // padding(-1) makes bandwidth ~2× the gap between ticks, so labels
  // truncate to the max and collide. Fit each label to the tick step.
  decorateAxisLabels(xAxis, {
    slotWidth: xScale.step(),
    ...axisLabels,
  });

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
  // hide axis line; dashed tick strokes like FuseDash
  yAxis.select('.domain').attr('stroke', 'none');
  yAxis
    .selectAll('line')
    .attr('stroke', FD.axisStroke)
    .attr('stroke-dasharray', '1 2');
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

  // Unit: horizontal top-left — never rotate through Y ticks
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
