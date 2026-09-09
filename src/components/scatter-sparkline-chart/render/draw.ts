import { axisLeft } from 'd3-axis';
import { scaleLinear, scaleTime } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import {
  area as d3Area,
  line as d3Line,
  symbol,
  symbolCircle,
  symbolCross,
  symbolSquare,
  symbolTriangle,
  type SymbolType,
} from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import {
  applyLeftGutterYAxisLabels,
  decorateManualAxisLabel,
  resolvePlotLeftMargin,
} from '../../../utils/axis-labels.js';
import type { ChartMarkerShape } from '../../../utils/chart-formatting/types.js';
import {
  calculateNumTicks,
  calculateScaleLinearDomain,
  FD,
  formatCompactNumber,
  seriesColor as fdSeriesColor,
} from '../../../utils/fusedash-visual.js';
import {
  collectSparkXDomain,
  makeDateLabelFormatter,
  orderSparkXDomain,
  parseXDate,
  selectTickIndices,
  type SparkLineHoverEntry,
  type SparkLinePoint,
  type SparkLineSeries,
} from '../../spark-line-chart/lib/index.js';
import { collectScatterSparklineYDomain } from '../lib/domain.js';
import type { ScatterSparklineModel, ScatterSparklineRawPoint } from '../lib/types.js';

export interface RenderScatterSparklineOptions extends AxisLabelTooltipHandlers {
  model: ScatterSparklineModel;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  showGrid?: boolean;
  xDomainHint?: string[];
  showTooltip?: boolean;
  onLineHover?: (payload: {
    x: string;
    xLabel: string;
    entries: SparkLineHoverEntry[];
    event: MouseEvent;
  }) => void;
  onPointHover?: (payload: {
    point: ScatterSparklineRawPoint;
    event: MouseEvent;
  }) => void;
  onLeave?: () => void;
}

const MARKER_HALF = 20;

function resolveColor(series: SparkLineSeries, index: number, theme: WidgetTheme): string {
  if (series.color) return series.color;
  if (index === 0 && theme.primary) return theme.primary;
  if (index === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(index);
}

function markerSymbol(shape: ChartMarkerShape): SymbolType {
  switch (shape) {
    case 'cross':
      return symbolCross;
    case 'square':
    case 'rhombus':
      return symbolSquare;
    case 'triangle':
      return symbolTriangle;
    default:
      return symbolCircle;
  }
}

function markerRotation(shape: ChartMarkerShape): number {
  if (shape === 'rhombus' || shape === 'cross') return 45;
  return 0;
}

function stableJitterMs(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return ((hash % 5) - 2) * 2 * 60 * 60 * 1000;
}

/** FuseDash ScatterSparklineChart — aggregated line + jittered scatter markers. */
export function renderScatterSparklineChart(
  container: HTMLElement,
  options: RenderScatterSparklineOptions,
): void {
  const {
    model,
    width,
    height,
    margin = { ...FD.sparkLineMargin },
    theme,
    showGrid = true,
    xDomainHint,
    showTooltip = true,
    onLineHover,
    onPointHover,
    onLeave,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  const { series, scatterPoints } = model;
  const axisLabels: AxisLabelTooltipHandlers = {
    onAxisLabelHover,
    onAxisLabelLeave,
  };

  container.replaceChildren();
  if ((!series.length && !scatterPoints.length) || width <= 0 || height <= 0) return;

  const m = {
    top: margin.top,
    bottom: margin.bottom,
    left: resolvePlotLeftMargin(margin.left),
    right: Math.max(margin.right, 12),
  };
  const plotTop = m.top;
  const plotBottom = height - m.bottom;
  const plotLeft = m.left;
  const plotRight = width - m.right;
  if (plotRight - plotLeft < 8 || plotBottom - plotTop < 8) return;

  const xDomain = orderSparkXDomain(collectSparkXDomain(series, xDomainHint));
  if (xDomain.length < 1) return;

  const dates = xDomain.map(parseXDate);
  const timeScale = scaleTime()
    .domain([dates[0], dates[dates.length - 1] ?? dates[0]])
    .range([plotLeft, plotRight]);

  const xPos = (x: string): number => {
    const t = parseXDate(x);
    return Number.isNaN(t.valueOf()) ? NaN : timeScale(t);
  };

  const [minY, maxY] = collectScatterSparklineYDomain(series, scatterPoints);
  const yScale = scaleLinear().domain([minY, maxY]).nice().range([plotBottom, plotTop]);
  const yTicks = yScale.ticks(calculateNumTicks(height));

  const dateLabel = makeDateLabelFormatter(dates);
  const xTickDates = timeScale.ticks();
  const xTickLabel = (d: Date): string => dateLabel(d);

  const isDatetimeX = model.axisDetails?.[model.xField]?.type === 'datetime';
  const allYValues: number[] = [];
  for (const s of series) {
    for (const p of s.points) {
      if (Number.isFinite(p.y)) allYValues.push(p.y);
    }
  }
  for (const p of scatterPoints) {
    if (Number.isFinite(p.y)) allYValues.push(p.y);
  }
  const [minYAxe] = calculateScaleLinearDomain(allYValues);
  const baselineValue = minYAxe > 0 ? minYAxe : 0;
  const y0 = yScale(baselineValue);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', 'Scatter sparkline chart')
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
      .attr('stroke', FD.gridStroke)
      .attr('shape-rendering', 'crispEdges');
  }

  const xIndex = new Map(xDomain.map((x, i) => [x, i]));
  const lineGen = d3Line<SparkLinePoint>()
    .defined((d) => Number.isFinite(d.y) && Number.isFinite(xPos(d.x)))
    .x((d) => xPos(d.x))
    .y((d) => yScale(d.y));

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
    const gradientId = `scatter-sparkline-gradient-${s.id.replace(/\W/g, '_')}`;

    group
      .append('defs')
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0')
      .attr('y1', '0')
      .attr('x2', '0')
      .attr('y2', '1')
      .selectAll('stop')
      .data([
        { offset: '0%', opacity: 0.25 },
        { offset: '100%', opacity: 0 },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', color)
      .attr('stop-opacity', (d) => d.opacity);

    group
      .append('path')
      .attr('class', 'area')
      .datum(ordered)
      .attr('fill', `url(#${gradientId})`)
      .attr('pointer-events', 'none')
      .attr('d', areaGen);

    group
      .append('path')
      .attr('class', 'line')
      .datum(ordered)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', FD.sparkLineStrokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('pointer-events', 'none')
      .attr('d', lineGen);

    group
      .append('path')
      .attr('class', 'line-hit')
      .datum(ordered)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(0,0,0,0.001)')
      .attr('stroke-width', 22)
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
      .attr('fill', FD.axisLabelFill)
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
    .attr('stroke', FD.axisStroke)
    .attr('stroke-dasharray', '1,2');
  yAxis.selectAll('.tick line').attr('stroke', FD.axisStroke);
  applyLeftGutterYAxisLabels(yAxis, plotLeft);

  const markerLayer = root.append('g').attr('class', 'scatter-markers');
  for (const point of scatterPoints) {
    const jitterKey = `${point.x}-${point.y}`;
    const baseDate = parseXDate(point.x);
    const scatterOffsetMs = isDatetimeX ? stableJitterMs(jitterKey) : 0;
    const jitteredDate = new Date(baseDate.getTime() + scatterOffsetMs);
    const rawX = isDatetimeX ? timeScale(jitteredDate) : xPos(point.x);
    const x = Math.min(
      plotRight - MARKER_HALF,
      Math.max(plotLeft + MARKER_HALF, rawX),
    );
    const y = yScale(point.y);
    const rotation = markerRotation(point.markerShape);
    const isDonut = point.markerShape === 'donut';
    const pathGen = symbol().type(markerSymbol(point.markerShape)).size(FD.scatterMarkerSize);

    markerLayer
      .append('g')
      .attr('class', 'scatter-marker')
      .datum(point)
      .attr('transform', `translate(${x},${y}) rotate(${rotation})`)
      .append('path')
      .attr('d', pathGen)
      .attr('fill', isDonut ? 'none' : point.color)
      .attr('stroke', point.color)
      .attr('stroke-width', isDonut ? 1.5 : 0);
  }

  if (!showTooltip) return;

  const guideColor = model.lineColor || resolveColor(series[0], 0, theme);
  const hoverLayer = root.append('g').attr('class', 'hover').attr('pointer-events', 'none');
  const guide = hoverLayer
    .append('line')
    .attr('stroke', guideColor)
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', FD.sparkGuideDash)
    .attr('opacity', 0);
  const dotsG = hoverLayer.append('g').attr('class', 'hover-dots');

  let pointHoverActive = false;

  const hideGuide = (): void => {
    guide.attr('opacity', 0);
    dotsG.selectAll('*').remove();
  };

  const clearHover = (): void => {
    if (pointHoverActive) return;
    hideGuide();
    onLeave?.();
  };

  const sparklineByGroupAndX = new Map<string, Map<string, SparkLinePoint>>();
  for (const s of series) {
    const map = new Map<string, SparkLinePoint>();
    for (const p of s.points) map.set(p.x, p);
    sparklineByGroupAndX.set(s.id, map);
  }

  const nearestX = (px: number): string | null => {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < dates.length; i++) {
      const dist = Math.abs(timeScale(dates[i]) - px);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return xDomain[bestIdx] ?? null;
  };

  root.selectAll('.line-hit').each(function () {
    select(this)
      .style('cursor', 'crosshair')
      .on('mousemove', (event: MouseEvent) => {
        if (pointHoverActive || !onLineHover) return;
        const [px] = pointer(event, svg.node());
        const x = nearestX(px);
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
          const pt = sparklineByGroupAndX.get(s.id)?.get(x);
          if (!pt || !Number.isFinite(pt.y)) return;
          const color = resolveColor(s, i, theme);
          entries.push({
            seriesId: s.id,
            seriesName: s.name ?? s.id,
            color,
            value: pt.y,
          });
          dotsG
            .append('circle')
            .attr('cx', gx)
            .attr('cy', yScale(pt.y))
            .attr('r', FD.sparkHoverDotRadius)
            .attr('fill', color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        });

        onLineHover({ x, xLabel: dateLabel(parseXDate(x)), entries, event });
      })
      .on('mouseleave', clearHover);
  });

  markerLayer.selectAll('.scatter-marker').each(function () {
    const g = select(this);
    g.style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent) {
        pointHoverActive = true;
        hideGuide();
        const pt = g.datum() as ScatterSparklineRawPoint;
        onPointHover?.({ point: pt, event });
      })
      .on('mousemove', function (event: MouseEvent) {
        const pt = g.datum() as ScatterSparklineRawPoint;
        onPointHover?.({ point: pt, event });
      })
      .on('mouseleave', () => {
        pointHoverActive = false;
        onLeave?.();
      });
  });
}
