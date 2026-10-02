import { axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear, scaleTime } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import { curveCatmullRom, curveStepAfter, line as d3Line } from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import { decorateManualAxisLabel, applyLeftGutterYAxisLabels, resolvePlotLeftMargin } from '../../../utils/axis-labels.js';
import {
  calculateNumTicks,
  FD,
  fdColors,
  formatCompactNumber,
  seriesColor as fdSeriesColor,
} from '../../../utils/fusedash-visual.js';
import {
  averageYByX,
  collectStepXDomain,
  collectStepYDomain,
  formatCompact,
  isDateXDomain,
  makeDateLabelFormatter,
  orderStepXDomain,
  parseXDate,
  selectTickIndices,
  type StepLineGrafType,
  type StepLineHoverEntry,
  type StepLinePoint,
  type StepLineSeries,
} from '../lib/index.js';

export interface RenderStepLineChartOptions extends AxisLabelTooltipHandlers {
  series: StepLineSeries[];
  width: number;
  height: number;
  /** FuseDash StepLineChart margins when omitted by host */
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  /** Reference overlay: `curve` = KS plot, `line` = ROC diagonal */
  grafType?: StepLineGrafType;
  showGrid?: boolean;
  /** FuseDash `uniqueValues[xAxe]` order when available. */
  xDomainHint?: string[];
  /** Crosshair + per-series dots on hover */
  showTooltip?: boolean;
  themeMode?: 'light' | 'dark';
  xLabel?: string;
  yLabel?: string;
  onHover?: (payload: {
    x: string;
    xLabel: string;
    entries: StepLineHoverEntry[];
    event: MouseEvent;
  }) => void;
  onLeave?: () => void;
}

function resolveColor(series: StepLineSeries, index: number, theme: WidgetTheme): string {
  if (series.color) return series.color;
  if (index === 0 && theme.primary) return theme.primary;
  if (index === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(index);
}

/**
 * FuseDash StepLineChart (incl. KSPlotChart / ROCCurveChart) plot — D3 rewrite.
 *
 * Coordinate system matches Visx: scales carry the margin in their range, so
 * there is no inner plot translate.
 */
export function renderStepLineChart(
  container: HTMLElement,
  options: RenderStepLineChartOptions,
): void {
  const {
    series,
    width,
    height,
    margin = { ...FD.stepLineMargin },
    theme,
    themeMode = 'light',
    grafType = 'none',
    showGrid = true,
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

  // FuseDash renders into a viewBox of `width + 20`; drawing at true width means
  // we need a few px of right gutter so the last X label isn't clipped.
  const m = {
    top: margin.top,
    bottom: margin.bottom,
    left: resolvePlotLeftMargin(margin.left),
    right: Math.max(margin.right, 12),
  };
  // the horizontal unit label sits above the plot, not on top of the first Y tick
  const plotTop = m.top + (yLabel ? 12 : 0);
  const plotBottom = height - m.bottom - (xLabel ? 12 : 0);
  const plotLeft = m.left;
  const plotRight = width - m.right;
  if (plotRight - plotLeft < 8 || plotBottom - plotTop < 8) return;

  // --- Domains / scales -----------------------------------------------------
  const xDomain = orderStepXDomain(collectStepXDomain(series, xDomainHint));
  const dateMode = isDateXDomain(xDomain);
  const dates = dateMode ? xDomain.map(parseXDate) : [];

  const timeScale = dateMode
    ? scaleTime()
        .domain([dates[0], dates[dates.length - 1]])
        .range([plotLeft, plotRight])
    : null;

  // FuseDash uses scaleBand padding 0.1 here (unlike LineChart's -1)
  const bandScale = dateMode
    ? null
    : scaleBand<string>().domain(xDomain).range([plotLeft, plotRight]).padding(0.1);

  const xPos = (x: string): number => {
    if (timeScale) {
      const t = parseXDate(x);
      return Number.isNaN(t.valueOf()) ? NaN : timeScale(t);
    }
    const b = bandScale?.(x);
    return b == null ? NaN : b + (bandScale?.bandwidth() ?? 0) / 2;
  };

  const [minY, maxY] = collectStepYDomain(series);
  const yScale = scaleLinear().domain([minY, maxY]).nice().range([plotBottom, plotTop]);
  const yTicks = yScale.ticks(calculateNumTicks(height));

  const dateLabel = dateMode ? makeDateLabelFormatter(dates) : null;
  const xTickLabel = (x: string): string => (dateLabel ? dateLabel(parseXDate(x)) : x);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', 'Step line chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const root = svg.append('g').attr('class', 'plot');

  // --- Grid (FuseDash dashed #afb3bb + solid zero line) ---------------------
  if (showGrid) {
    const grid = root.append('g').attr('class', 'grid');

    for (const x of xDomain) {
      const px = xPos(x);
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

    // solid baseline at y = 0 (the domain always spans zero)
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

  // --- Steps ----------------------------------------------------------------
  const xIndex = new Map(xDomain.map((x, i) => [x, i]));
  const lineGen = d3Line<StepLinePoint>()
    .defined((d) => Number.isFinite(d.y) && Number.isFinite(xPos(d.x)))
    .x((d) => xPos(d.x))
    .y((d) => yScale(d.y))
    .curve(curveStepAfter);

  series.forEach((s, i) => {
    const color = resolveColor(s, i, theme);
    const ordered = [...s.points].sort(
      (a, b) => (xIndex.get(a.x) ?? 0) - (xIndex.get(b.x) ?? 0),
    );
    if (!ordered.length) return;

    root
      .append('g')
      .attr('class', `series series-${s.id}`)
      .append('path')
      .datum(ordered)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', FD.stepStrokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('d', lineGen);
  });

  // --- Reference overlay (KS "Ideal" / ROC "Random guessing") ---------------
  const idealByIndex = buildIdealValues(series, xDomain, grafType, minY, maxY);

  if (idealByIndex) {
    const points: StepLinePoint[] = xDomain
      .map((x, i) => ({ x, y: idealByIndex[i] }))
      .filter((p) => Number.isFinite(p.y));

    const overlayGen = d3Line<StepLinePoint>()
      .x((d) => xPos(d.x))
      .y((d) => yScale(d.y));
    if (grafType === 'curve') overlayGen.curve(curveCatmullRom.alpha(0.5));

    root
      .append('path')
      .attr('class', `overlay overlay-${grafType}`)
      .datum(points)
      .attr('fill', 'none')
      .attr('stroke', grafType === 'line' ? theme.textMuted : FD.stepIdealColor)
      .attr('stroke-width', grafType === 'line' ? FD.stepGuessWidth : FD.stepIdealWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', grafType === 'line' ? FD.stepGuessDash : null)
      .attr('d', overlayGen);
  }

  // --- Max deviation marker (KS distance, curve only) -----------------------
  if (grafType === 'curve' && idealByIndex) {
    const base = series.find((s) => s.id === 'default') ?? series[0];
    let best: { x: string; actual: number; ideal: number; diff: number } | null = null;
    xDomain.forEach((x, i) => {
      const actual = base.points.find((p) => p.x === x)?.y;
      const ideal = idealByIndex[i];
      if (!Number.isFinite(actual) || !Number.isFinite(ideal)) return;
      const diff = Math.abs((actual as number) - ideal);
      if (!best || diff > best.diff) {
        best = { x, actual: actual as number, ideal, diff };
      }
    });

    if (best) {
      const marker = best as { x: string; actual: number; ideal: number; diff: number };
      const mx = xPos(marker.x);
      const yActual = yScale(marker.actual);
      const yIdeal = yScale(marker.ideal);
      const yTop = Math.min(yActual, yIdeal);
      const yBottom = Math.max(yActual, yIdeal);
      const yMid = (yTop + yBottom) / 2;
      const label = formatCompact(marker.diff);
      const labelWidth = label.length * 7 + 12;
      const labelHeight = 18;

      const g = root
        .append('g')
        .attr('class', 'max-deviation')
        .attr('pointer-events', 'none');

      g.append('line')
        .attr('x1', mx)
        .attr('x2', mx)
        .attr('y1', yTop)
        .attr('y2', yBottom)
        .attr('stroke', FD.stepDeviationFill)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.95);

      g.append('path')
        .attr('d', `M ${mx} ${yTop + 8} L ${mx - 6} ${yTop} L ${mx + 6} ${yTop} Z`)
        .attr('fill', FD.stepDeviationFill);
      g.append('path')
        .attr(
          'd',
          `M ${mx} ${yBottom - 8} L ${mx - 6} ${yBottom} L ${mx + 6} ${yBottom} Z`,
        )
        .attr('fill', FD.stepDeviationFill);

      g.append('rect')
        .attr('x', mx - labelWidth / 2)
        .attr('y', yMid - labelHeight / 2)
        .attr('width', labelWidth)
        .attr('height', labelHeight)
        .attr('rx', 9)
        .attr('ry', 9)
        .attr('fill', FD.stepDeviationFill)
        .attr('opacity', 0.98);
      g.append('text')
        .attr('x', mx)
        .attr('y', yMid + 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('fill', '#ffffff')
        .text(label);
    }
  }

  // --- Axes -----------------------------------------------------------------
  // X labels are drawn by hand (thinned) — the chat host has no room for the
  // rotating FuseDash `useVisxDynamicAxisLabel` component.
  const xAxis = root.append('g').attr('class', 'x-axis');
  const tickLabels = xDomain.map(xTickLabel);
  const tickPositions = xDomain.map(xPos);
  for (const i of selectTickIndices(tickLabels, tickPositions)) {
    const isFirst = i === 0;
    const isLast = i === xDomain.length - 1;
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
  // FuseDash keeps the Y axis line, dashed like the grid
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

  // Unit stays horizontal top-left — never rotated through the Y ticks
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

  // --- Crosshair hover ------------------------------------------------------
  if (!showTooltip || !onHover) return;

  const guideColor = resolveColor(series[0], 0, theme);
  const hoverLayer = root.append('g').attr('class', 'hover').attr('pointer-events', 'none');
  const guide = hoverLayer
    .append('line')
    .attr('stroke', guideColor)
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', FD.stepGuideDash)
    .attr('opacity', 0);
  const dotsG = hoverLayer.append('g').attr('class', 'hover-dots');

  const clearHover = (): void => {
    guide.attr('opacity', 0);
    dotsG.selectAll('*').remove();
    onLeave?.();
  };

  const nearestIndex = (px: number): number => {
    if (timeScale) {
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
    }
    if (!bandScale) return 0;
    const step = bandScale.step() || 1;
    const pad = (step * bandScale.paddingInner()) / 2;
    const idx = Math.floor((px - plotLeft + pad) / step);
    return Math.max(0, Math.min(idx, xDomain.length - 1));
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
      const entries: StepLineHoverEntry[] = [];
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
          .attr('r', FD.stepHoverDotRadius)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
      });

      onHover({ x, xLabel: xTickLabel(x), entries, event });
    })
    .on('mouseleave', clearHover);
}

/**
 * FuseDash `idealData`: anchor on the mean y of the first and last x that have
 * data, then either connect them straight (`line`) or with a logistic ramp
 * (`curve`) remapped onto that range.
 *
 * Deviation from FuseDash: it gates this on date-mode x values only, which
 * leaves ROC/KS charts with categorical x (the common chat payload) without a
 * reference line. Here it renders in both modes.
 */
function buildIdealValues(
  series: StepLineSeries[],
  xDomain: string[],
  grafType: StepLineGrafType,
  minY: number,
  maxY: number,
): number[] | null {
  if (grafType === 'none' || xDomain.length < 2) return null;

  const avg = averageYByX(series, xDomain);
  let firstIdx = avg.findIndex((v) => Number.isFinite(v));
  if (firstIdx < 0) firstIdx = 0;
  let lastIdx = avg.length - 1;
  for (let i = avg.length - 1; i >= 0; i--) {
    if (Number.isFinite(avg[i])) {
      lastIdx = i;
      break;
    }
  }

  const yStart = Number.isFinite(avg[firstIdx]) ? avg[firstIdx] : minY;
  const yEnd = Number.isFinite(avg[lastIdx]) ? avg[lastIdx] : maxY;

  if (grafType === 'line') {
    return xDomain.map((_, i) =>
      i === 0
        ? yStart
        : i === xDomain.length - 1
          ? yEnd
          : yStart + ((yEnd - yStart) * i) / (xDomain.length - 1),
    );
  }

  // logistic ramp — position taken from time when x is a date, else from index
  const dateMode = isDateXDomain(xDomain);
  const t0 = dateMode ? parseXDate(xDomain[0]).valueOf() : 0;
  const t1 = dateMode ? parseXDate(xDomain[xDomain.length - 1]).valueOf() : xDomain.length - 1;
  const span = Math.max(1, t1 - t0);
  const k = 10;

  return xDomain.map((x, i) => {
    const t = dateMode ? parseXDate(x).valueOf() : i;
    const s = (t - t0) / span;
    const y01 = 1 / (1 + Math.exp(-k * (s - 0.5)));
    return yStart + (yEnd - yStart) * y01;
  });
}
