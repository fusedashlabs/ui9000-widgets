import { axisBottom, axisLeft } from 'd3-axis';
import { scaleLinear } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import { curveCatmullRom, line as d3Line } from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import {
  applyLeftGutterYAxisLabels,
  decorateAxisLabels,
  resolvePlotLeftMargin,
  type AxisLabelTooltipHandlers,
} from '../../../utils/axis-labels.js';
import { calculateNumTicks, FD } from '../../../utils/fusedash-visual.js';
import {
  collectPExtent,
  collectValueExtent,
  formatImpurityTick,
  formatProbability,
  nearestPoint,
  splitAnnotation,
  type GiniImpurityEntropyModel,
  type GiniSeriesPoint,
} from '../lib/index.js';

/** One series' reading at the hovered probability. */
export interface GiniHoverEntry {
  seriesId: string;
  seriesName: string;
  color: string;
  value: number;
}

export interface RenderGiniImpurityEntropyChartOptions
  extends AxisLabelTooltipHandlers {
  model: GiniImpurityEntropyModel;
  width: number;
  height: number;
  /** Client `DEFAULT_MARGIN` when omitted by the host */
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  showGrid?: boolean;
  themeMode?: 'light' | 'dark';
  onHover?: (payload: {
    p: number;
    entries: GiniHoverEntry[];
    /** Curve nearest the cursor — the one left undimmed */
    activeSeriesId: string | null;
    event: MouseEvent;
  }) => void;
  onLeave?: () => void;
}

/**
 * FuseDash GiniImpurityEntropyChart plot — visual parity via D3.
 * Coordinate system matches the client: the linear scales carry the margins in
 * their range, so there is no translated plot group.
 */
export function renderGiniImpurityEntropyChart(
  container: HTMLElement,
  options: RenderGiniImpurityEntropyChartOptions,
): void {
  const {
    model,
    width,
    height,
    margin = { ...FD.giniMargin },
    theme,
    showGrid = true,
    themeMode = 'light',
    onHover,
    onLeave,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  container.replaceChildren();
  if (!model.series.length || width <= 0 || height <= 0) return;

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

  const xScale = scaleLinear()
    .domain(collectPExtent(model.series))
    .range([plotLeft, plotRight]);
  const yScale = scaleLinear()
    .domain(collectValueExtent(model.series))
    .range([plotBottom, plotTop]);

  const numTicks = calculateNumTicks(height);
  const yTicks = yScale.ticks(numTicks);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', 'Gini impurity and entropy chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const root = svg.append('g').attr('class', 'plot');

  // --- Grid: horizontal only, like the client ---
  if (showGrid) {
    const grid = root.append('g').attr('class', 'grid');
    for (const tick of yTicks) {
      grid
        .append('line')
        .attr('x1', plotLeft)
        .attr('x2', plotRight)
        .attr('y1', yScale(tick))
        .attr('y2', yScale(tick))
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('shape-rendering', 'crispEdges');
    }
  }

  // --- Confidence band sits under the curves ---
  const { overlays } = model;
  if (overlays.showCI && overlays.ci) {
    const [lo, hi] = overlays.ci;
    root
      .append('rect')
      .attr('class', 'ci-band')
      .attr('x', xScale(lo))
      .attr('y', plotTop)
      .attr('width', Math.max(0, xScale(hi) - xScale(lo)))
      .attr('height', plotBottom - plotTop)
      .attr('fill', FD.giniOverlayColor)
      .attr('fill-opacity', FD.giniOverlayBandOpacity);
  }

  // --- Curves (client: Catmull-Rom, alpha 0.5) ---
  const lineGen = d3Line<GiniSeriesPoint>()
    .defined((d) => Number.isFinite(d.value))
    .x((d) => xScale(d.p))
    .y((d) => yScale(d.value))
    .curve(curveCatmullRom.alpha(FD.giniCurveAlpha));

  const curves = root.append('g').attr('class', 'curves');
  const curvePaths = model.series.map((series) =>
    curves
      .append('path')
      .attr('class', `curve curve-${series.id}`)
      .datum(series.points)
      .attr('fill', 'none')
      .attr('stroke', series.color)
      .attr('stroke-width', FD.lineStrokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-dasharray', series.dash ?? null)
      .attr('d', lineGen),
  );

  // --- p-hat guide ---
  if (overlays.showPHat && overlays.pHat !== undefined) {
    const x = xScale(overlays.pHat);
    root
      .append('line')
      .attr('class', 'p-hat-guide')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', plotTop)
      .attr('y2', plotBottom)
      .attr('stroke', FD.giniOverlayColor)
      .attr('stroke-width', FD.lineStrokeWidth)
      .attr('stroke-dasharray', FD.giniOverlayDash);
  }

  // --- Candidate split: child markers + the ΔGini they buy ---
  const split = splitAnnotation(overlays);
  if (split) {
    const group = root.append('g').attr('class', 'split-anno');
    const markers: Array<[number, number]> = [
      [split.pLeft, split.leftValue],
      [split.pRight, split.rightValue],
    ];
    for (const [p, value] of markers) {
      group
        .append('circle')
        .attr('cx', xScale(p))
        .attr('cy', yScale(value))
        .attr('r', FD.giniSplitMarkerRadius)
        .attr('fill', FD.giniSplitMarkerFill)
        .attr('stroke', FD.giniSplitMarkerStroke)
        .attr('stroke-width', 1.5);
    }
    group
      .append('text')
      .attr('class', 'split-label')
      .attr('x', xScale((split.pLeft + split.pRight) / 2))
      .attr(
        'y',
        yScale(Math.max(split.leftValue, split.rightValue)) -
          FD.giniSplitLabelOffset,
      )
      .attr('text-anchor', 'middle')
      .attr('fill', FD.axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(`ΔGini = ${split.delta.toFixed(3)}`);
  }

  // --- Axes ---
  const xAxis = root
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${plotBottom})`)
    .call(
      axisBottom(xScale)
        .ticks(numTicks)
        .tickSize(0)
        .tickPadding(8)
        .tickFormat((d) => formatProbability(Number(d))),
    );
  xAxis.select('.domain').attr('stroke', FD.axisStroke);
  xAxis
    .selectAll('text')
    .attr('fill', FD.axisLabelFill)
    .attr('font-size', FD.axisLabelSize);
  decorateAxisLabels(xAxis, { onAxisLabelHover, onAxisLabelLeave });

  const yAxis = root
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${plotLeft},0)`)
    .call(
      axisLeft(yScale)
        .tickValues(yTicks)
        .tickSize(5)
        .tickPadding(6)
        .tickFormat((d) => formatImpurityTick(Number(d))),
    );
  yAxis.select('.domain').attr('stroke', 'none');
  yAxis
    .selectAll('line')
    .attr('stroke', FD.axisStroke)
    .attr('stroke-dasharray', FD.gridDash);
  applyLeftGutterYAxisLabels(yAxis, plotLeft);

  if (model.xLabel) {
    root
      .append('text')
      .attr('class', 'x-axis-label')
      .attr('x', (plotLeft + plotRight) / 2)
      .attr('y', height - 2)
      .attr('text-anchor', 'middle')
      .attr('fill', FD.axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(model.xLabel);
  }

  // Unit: horizontal top-left — never rotate through the Y ticks
  if (model.yLabel) {
    root
      .append('text')
      .attr('class', 'y-axis-label')
      .attr('x', 4)
      .attr('y', 11)
      .attr('text-anchor', 'start')
      .attr('fill', FD.axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(model.yLabel);
  }

  if (!onHover) return;

  // --- Crosshair: the curves are dense, so one hover reads every series,
  //     while the curve nearest the cursor stays lit and the rest fade ---
  const hover = root.append('g').attr('class', 'hover').attr('opacity', 0);
  const guide = hover
    .append('line')
    .attr('class', 'hover-guide')
    .attr('y1', plotTop)
    .attr('y2', plotBottom)
    .attr('stroke', themeMode === 'dark' ? FD.hoverGuideDark : FD.hoverGuideLight)
    .attr('stroke-width', FD.lineStrokeWidth)
    .attr('pointer-events', 'none');
  const dots = model.series.map((series) =>
    hover
      .append('circle')
      .attr('class', 'hover-dot')
      .attr('r', FD.markerRadius)
      .attr('fill', series.color)
      .attr('stroke', themeMode === 'dark' ? '#000' : '#fff')
      .attr('stroke-width', 1.5)
      .attr('pointer-events', 'none'),
  );

  root
    .append('rect')
    .attr('class', 'hover-surface')
    .attr('x', plotLeft)
    .attr('y', plotTop)
    .attr('width', plotRight - plotLeft)
    .attr('height', plotBottom - plotTop)
    .attr('fill', 'transparent')
    .on('mousemove', (event: MouseEvent) => {
      const [mx] = pointer(event, container);
      const p = xScale.invert(mx);
      const hits = model.series.map((series) =>
        nearestPoint(series.points, p),
      );

      const anchor = hits.find((hit) => hit !== null);
      if (!anchor) {
        hover.attr('opacity', 0);
        curvePaths.forEach((path) => path.attr('opacity', 1));
        return;
      }

      // Vertical distance from the cursor picks the curve being read.
      const [, my] = pointer(event, container);
      let activeIndex = -1;
      let activeDistance = Infinity;
      hits.forEach((hit, i) => {
        if (!hit) return;
        const distance = Math.abs(yScale(hit.value) - my);
        if (distance < activeDistance) {
          activeDistance = distance;
          activeIndex = i;
        }
      });

      const entries: GiniHoverEntry[] = [];
      hits.forEach((hit, i) => {
        const active = i === activeIndex;
        curvePaths[i].attr('opacity', active ? 1 : FD.giniCurveDimOpacity);
        if (!hit) {
          dots[i].attr('opacity', 0);
          return;
        }
        dots[i]
          .attr('opacity', active ? 1 : FD.giniCurveDimOpacity)
          .attr('cx', xScale(hit.p))
          .attr('cy', yScale(hit.value));
        const series = model.series[i];
        entries.push({
          seriesId: series.id,
          seriesName: series.name,
          color: series.color,
          value: hit.value,
        });
      });

      guide.attr('x1', xScale(anchor.p)).attr('x2', xScale(anchor.p));
      hover.attr('opacity', 1);
      onHover({
        p: anchor.p,
        entries,
        activeSeriesId: activeIndex >= 0 ? model.series[activeIndex].id : null,
        event,
      });
    })
    .on('mouseleave', () => {
      hover.attr('opacity', 0);
      curvePaths.forEach((path) => path.attr('opacity', 1));
      onLeave?.();
    });
}
