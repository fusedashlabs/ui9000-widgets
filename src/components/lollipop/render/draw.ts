import { axisBottom, axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select, type Selection } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import { decorateAxisLabels, applyLeftGutterYAxisLabels, resolvePlotLeftMargin } from '../../../utils/axis-labels.js';
import {
  appendLollipopMarkerVertical,
  calculateNumTicks,
  FD,
  formatCompactNumber,
  hexWithAlpha,
  seriesColor as fdSeriesColor,
  type MarkerShape,
} from '../../../utils/fusedash-visual.js';
import {
  collectLabels,
  collectLollipopValueDomain,
  lollipopHorizontalMinSpan,
  stackSegments,
  type LollipopLayout,
  type LollipopOrientation,
  type LollipopPoint,
  type LollipopSeries,
} from '../lib/index.js';

export interface RenderLollipopOptions extends AxisLabelTooltipHandlers {
  series: LollipopSeries[];
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  orientation?: LollipopOrientation;
  /** Multi-series only — a single series always renders as the plain lollipop */
  layout?: LollipopLayout;
  /** FuseDash default: rhombus */
  marker?: MarkerShape;
  showGrid?: boolean;
  /** FuseDash categorical label order when available. */
  labelHint?: string[];
  xLabel?: string;
  yLabel?: string;
  /**
   * When set on a horizontal chart, the value axis is drawn here and pinned
   * below the scroll area (client `hasChartYOverflow` + bottom axis SVG).
   */
  xAxisContainer?: HTMLElement | null;
  onPointHover?: (payload: {
    seriesId: string;
    seriesName: string;
    point: LollipopPoint;
    event: MouseEvent;
  }) => void;
  onPointLeave?: () => void;
}

function resolveColor(series: LollipopSeries, index: number, theme: WidgetTheme): string {
  if (series.color) return series.color;
  if (index === 0 && theme.primary) return theme.primary;
  if (index === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(index);
}

/**
 * FuseDash Vertical / Horizontal Lollipop plot — visual parity via D3.
 * Scales include margin in range (Visx coordinate system).
 */
export function renderLollipopChart(
  container: HTMLElement,
  options: RenderLollipopOptions,
): void {
  const {
    series,
    width,
    height,
    margin = { ...FD.lollipopMargin },
    theme,
    orientation = 'vertical',
    layout = 'grouped',
    marker = 'rhombus',
    showGrid = true,
    labelHint,
    xLabel,
    yLabel,
    xAxisContainer = null,
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
  xAxisContainer?.replaceChildren();
  if (!series.length || width <= 0 || height <= 0) return;

  const labels = collectLabels(series, labelHint);
  const vertical = orientation === 'vertical';
  const stacked = layout === 'stacked' && series.length > 1;
  const m = {
    top: margin.top,
    bottom: margin.bottom,
    left: resolvePlotLeftMargin(margin.left),
    right: Math.max(margin.right, 12),
  };
  const fixedBottomAxis = !vertical && !!xAxisContainer;
  const plotTop = m.top;
  const plotLeft = m.left;
  const plotRight = width - m.right;
  const bottomGutter = vertical || !fixedBottomAxis ? m.bottom : 0;
  const minSpan = vertical
    ? 0
    : lollipopHorizontalMinSpan(labels.length, series.length);
  const plotHAvail = height - plotTop - bottomGutter;
  const plotH = vertical ? plotHAvail : Math.max(plotHAvail, minSpan);
  const plotBottom = plotTop + plotH;
  const svgH = vertical
    ? height
    : plotTop + plotH + (fixedBottomAxis ? 0 : bottomGutter);
  if (plotRight - plotLeft < 8 || plotH < 8) return;

  if (!vertical) {
    container.style.height = `${svgH}px`;
    container.style.minHeight = `${svgH}px`;
  } else {
    container.style.height = '';
    container.style.minHeight = '';
  }

  const [domainMin, domainMax] = collectLollipopValueDomain(
    series,
    stacked ? 'stacked' : 'grouped',
    labelHint,
  );
  const numTicks = calculateNumTicks(vertical ? height : width);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', svgH)
    .attr('role', 'img')
    .attr('aria-label', 'Lollipop chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const root = svg.append('g').attr('class', 'plot');

  if (vertical) {
    const xScale = scaleBand<string>()
      .domain(labels)
      .range([plotLeft, plotRight])
      .padding(0);

    const yScale = scaleLinear()
      .domain([domainMin, domainMax])
      .nice()
      .range([plotBottom, plotTop]);

    const yTicks = yScale.ticks(numTicks);

    if (showGrid) {
      const grid = root.append('g').attr('class', 'grid');

      for (const cat of labels) {
        const bx = xScale(cat);
        if (bx == null) continue;
        grid
          .append('line')
          .attr('x1', bx)
          .attr('x2', bx)
          .attr('y1', plotTop)
          .attr('y2', plotBottom)
          .attr('stroke', FD.gridStroke)
          .attr('stroke-dasharray', '1 2')
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

      grid
        .append('line')
        .attr('x1', plotRight)
        .attr('x2', plotRight)
        .attr('y1', plotTop)
        .attr('y2', plotBottom)
        .attr('stroke', '#e0e0e0')
        .attr('stroke-dasharray', '1 2')
        .attr('shape-rendering', 'crispEdges');

      // baseline at 0
      grid
        .append('line')
        .attr('x1', plotLeft)
        .attr('x2', plotRight)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', FD.gridStroke)
        .attr('shape-rendering', 'crispEdges');
    }

    const zeroY = yScale(0);

    const bindHover = (
      g: Selection<SVGGElement, unknown, null, undefined>,
      s: LollipopSeries,
      p: LollipopPoint,
    ): void => {
      if (!onPointHover) return;
      g.on('mouseenter', (event: MouseEvent) => {
        onPointHover({
          seriesId: s.id,
          seriesName: s.name ?? s.id,
          point: p,
          event,
        });
      }).on('mouseleave', () => onPointLeave?.());
    };

    const drawVerticalMark = (
      s: LollipopSeries,
      si: number,
      p: LollipopPoint,
      cx: number,
      cyTip: number,
      cyBase: number,
    ): void => {
      const color = p.color ?? resolveColor(s, si, theme);
      const layer = root.append('g').attr('class', `series series-${s.id}`);
      const g = layer
        .append('g')
        .attr('class', 'lollipop')
        .style('cursor', onPointHover ? 'pointer' : 'default');
      g.append('line')
        .attr('class', 'stem')
        .attr('x1', cx)
        .attr('x2', cx)
        .attr('y1', cyTip + 2)
        .attr('y2', cyBase)
        .attr('stroke', hexWithAlpha(color, FD.lollipopStemAlphaPct))
        .attr('stroke-width', FD.lollipopStemWidth);
      appendLollipopMarkerVertical(g, { shape: marker, color, cx, cy: cyTip });
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cyTip)
        .attr('r', 12)
        .attr('fill', 'transparent');
      bindHover(g, s, p);
    };

    if (stacked) {
      for (const label of labels) {
        const bx = xScale(label);
        if (bx == null) continue;
        const cx = bx + xScale.bandwidth() / 2;
        for (const seg of stackSegments(series, label)) {
          drawVerticalMark(
            seg.series,
            seg.seriesIndex,
            { label, value: seg.value, color: seg.series.color },
            cx,
            yScale(seg.end),
            yScale(seg.start),
          );
        }
      }
    } else {
      series.forEach((s, si) => {
        const offset =
          series.length > 1
            ? ((si - (series.length - 1) / 2) * xScale.bandwidth()) /
              Math.max(series.length, 1)
            : 0;
        s.points.forEach((p) => {
          if (xScale(p.label) == null || !Number.isFinite(p.value)) return;
          const cx = (xScale(p.label) ?? 0) + xScale.bandwidth() / 2 + offset;
          drawVerticalMark(s, si, p, cx, yScale(p.value), zeroY);
        });
      });
    }

    const xAxis = root
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${plotBottom})`)
      .call(axisBottom(xScale).tickSize(0).tickPadding(8));
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

    decorateAxisLabels(xAxis, {
      slotWidth: xScale.bandwidth(),
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
    yAxis.select('.domain').attr('stroke', 'none');
    yAxis
      .selectAll('line')
      .attr('stroke', FD.axisStroke)
      .attr('stroke-dasharray', '1 2');
    applyLeftGutterYAxisLabels(yAxis, plotLeft);
  } else {
    // Horizontal: categories on Y, values on X (FuseDash HorizontalLollipop)
    const yScale = scaleBand<string>()
      .domain(labels)
      .range([plotTop, plotBottom])
      .padding(0);

    const xScale = scaleLinear()
      .domain([domainMin, domainMax])
      .nice()
      .range([plotLeft, plotRight]);

    const xTicks = xScale.ticks(numTicks);

    if (showGrid) {
      const grid = root.append('g').attr('class', 'grid');
      for (const t of xTicks) {
        grid
          .append('line')
          .attr('x1', xScale(t))
          .attr('x2', xScale(t))
          .attr('y1', plotTop)
          .attr('y2', plotBottom)
          .attr('stroke', FD.gridStroke)
          .attr('stroke-dasharray', '1 2')
          .attr('shape-rendering', 'crispEdges');
      }
      grid
        .append('line')
        .attr('x1', xScale(0))
        .attr('x2', xScale(0))
        .attr('y1', plotTop)
        .attr('y2', plotBottom)
        .attr('stroke', FD.gridStroke)
        .attr('shape-rendering', 'crispEdges');
    }

    const zeroX = xScale(0);

    const bindHoverH = (
      g: Selection<SVGGElement, unknown, null, undefined>,
      s: LollipopSeries,
      p: LollipopPoint,
    ): void => {
      if (!onPointHover) return;
      g.on('mouseenter', (event: MouseEvent) => {
        onPointHover({
          seriesId: s.id,
          seriesName: s.name ?? s.id,
          point: p,
          event,
        });
      }).on('mouseleave', () => onPointLeave?.());
    };

    const drawHorizontalMark = (
      s: LollipopSeries,
      si: number,
      p: LollipopPoint,
      cy: number,
      xTip: number,
      xBase: number,
    ): void => {
      const color = p.color ?? resolveColor(s, si, theme);
      const layer = root.append('g').attr('class', `series series-${s.id}`);
      const g = layer
        .append('g')
        .style('cursor', onPointHover ? 'pointer' : 'default');
      const x1 = Math.min(xBase, xTip);
      const x2 = Math.max(xBase, xTip);
      g.append('line')
        .attr('x1', x1)
        .attr('x2', x2)
        .attr('y1', cy)
        .attr('y2', cy)
        .attr('stroke', hexWithAlpha(color, FD.lollipopStemAlphaPct))
        .attr('stroke-width', FD.lollipopStemWidth);
      appendLollipopMarkerVertical(g, { shape: marker, color, cx: xTip, cy });
      bindHoverH(g, s, p);
    };

    if (stacked) {
      for (const label of labels) {
        const by = yScale(label);
        if (by == null) continue;
        const cy = by + yScale.bandwidth() / 2;
        for (const seg of stackSegments(series, label)) {
          drawHorizontalMark(
            seg.series,
            seg.seriesIndex,
            { label, value: seg.value, color: seg.series.color },
            cy,
            xScale(seg.end),
            xScale(seg.start),
          );
        }
      }
    } else {
      series.forEach((s, si) => {
        const color = resolveColor(s, si, theme);
        const layer = root.append('g').attr('class', `series series-${s.id}`);
        const offset =
          series.length > 1
            ? ((si - (series.length - 1) / 2) * yScale.bandwidth()) /
              Math.max(series.length, 1)
            : 0;
        s.points.forEach((p) => {
          if (yScale(p.label) == null || !Number.isFinite(p.value)) return;
          const cy = (yScale(p.label) ?? 0) + yScale.bandwidth() / 2 + offset;
          const cx = xScale(p.value);
          const markerColor = p.color ?? color;
          const g = layer
            .append('g')
            .style('cursor', onPointHover ? 'pointer' : 'default');
          g.append('line')
            .attr('x1', zeroX)
            .attr('x2', p.value >= 0 ? cx - 2 : cx)
            .attr('y1', cy)
            .attr('y2', cy)
            .attr('stroke', hexWithAlpha(markerColor, FD.lollipopStemAlphaPct))
            .attr('stroke-width', FD.lollipopStemWidth);
          appendLollipopMarkerVertical(g, {
            shape: marker,
            color: markerColor,
            cx,
            cy,
          });
          bindHoverH(g, s, p);
        });
      });
    }

    const yAxis = root
      .append('g')
      .attr('transform', `translate(${plotLeft},0)`)
      .call(axisLeft(yScale).tickSize(0).tickPadding(8));
    yAxis.select('.domain').attr('stroke', FD.axisStroke);
    yAxis.selectAll('line').attr('stroke', 'none');
    applyLeftGutterYAxisLabels(yAxis, plotLeft, axisLabels);

    const renderValueAxis = (
      target: Selection<SVGGElement, unknown, null, undefined>,
      y: number,
    ) => {
      const xAxis = target
        .append('g')
        .attr('class', 'value-axis')
        .attr('transform', `translate(0,${y})`)
        .call(
          axisBottom(xScale)
            .tickValues(xTicks)
            .tickSize(5)
            .tickPadding(6)
            .tickFormat((d) => {
              const n = Number(d);
              const decimals = Number.isInteger(n) && Math.abs(n) < 1000 ? 0 : 2;
              return formatCompactNumber(n, decimals);
            }),
        );
      xAxis.select('.domain').attr('stroke', FD.axisStroke);
      xAxis
        .selectAll('text')
        .attr('fill', FD.axisLabelFill)
        .attr('font-size', FD.axisLabelSize)
        .attr('text-anchor', 'middle');

      const xTickNodes = xAxis.selectAll<SVGTextElement, number>('text').nodes();
      if (xTickNodes.length > 0) {
        select(xTickNodes[0]).attr('text-anchor', 'start');
        if (xTickNodes.length > 1) {
          select(xTickNodes[xTickNodes.length - 1]).attr('text-anchor', 'end');
        }
      }
    };

    if (fixedBottomAxis && xAxisContainer) {
      const axisSvg = select(xAxisContainer)
        .append('svg')
        .attr('width', width)
        .attr('height', m.bottom)
        .attr('role', 'presentation')
        .style('display', 'block')
        .style('font-family', theme.fontFamily);
      renderValueAxis(axisSvg.append('g'), 1);
      if (xLabel) {
        axisSvg
          .append('text')
          .attr('x', (plotLeft + plotRight) / 2)
          .attr('y', m.bottom - 2)
          .attr('text-anchor', 'middle')
          .attr('fill', FD.axisLabelFill)
          .attr('font-size', FD.axisLabelSize)
          .text(xLabel);
      }
    } else {
      renderValueAxis(root, plotBottom);
    }
  }

  if (xLabel && !(fixedBottomAxis)) {
    root
      .append('text')
      .attr('x', (plotLeft + plotRight) / 2)
      .attr('y', svgH - 2)
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
