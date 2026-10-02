import { axisBottom, axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear, type ScaleLinear } from 'd3-scale';
import { select, type Selection } from 'd3-selection';

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
  fdColors,
  formatCompactNumber,
  seriesColor as fdSeriesColor,
} from '../../../utils/fusedash-visual.js';
import {
  boxPlotLinearDomain,
  collectLabels,
  type BoxPlotBox,
  type BoxPlotModel,
  type BoxPlotOrientation,
} from '../lib/index.js';
import {
  BIN_BORDER_RADIUS,
  BIN_SIZE,
  boxPlotGroupSpan,
  boxPlotMinCategorySpan,
} from '../lib/layout.js';

export interface RenderBoxPlotOptions extends AxisLabelTooltipHandlers {
  model: BoxPlotModel;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  orientation?: BoxPlotOrientation;
  showGrid?: boolean;
  /** When set, horizontal x-axis renders here (fixed below scroll). */
  xAxisContainer?: HTMLElement | null;
  xLabel?: string;
  yLabel?: string;
  onBoxHover?: (payload: {
    box: BoxPlotBox;
    event: MouseEvent;
  }) => void;
  onBoxLeave?: () => void;
}

const OUTLIER_RADIUS = 3;

function resolveGroupColor(
  groupIndex: number,
  box: BoxPlotBox,
  theme: WidgetTheme,
): string {
  if (box.color) return box.color;
  if (groupIndex === 0 && theme.primary) return theme.primary;
  if (groupIndex === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(groupIndex);
}

function roundedBoxVertical(
  cx: number,
  yQ3: number,
  yQ1: number,
  binW: number,
  r: number,
): string {
  const half = binW / 2;
  const radius = Math.min(r, half, Math.abs(yQ1 - yQ3) / 2);
  return `
    M${cx - half},${yQ3 + radius}
    a${radius},${radius} 0 0 1 ${radius},-${radius}
    H${cx + half - radius}
    a${radius},${radius} 0 0 1 ${radius},${radius}
    V${yQ1 - radius}
    a${radius},${radius} 0 0 1 -${radius},${radius}
    H${cx - half + radius}
    a${radius},${radius} 0 0 1 -${radius},-${radius}
    Z
  `;
}

function roundedBoxHorizontal(
  cy: number,
  xQ1: number,
  xQ3: number,
  binH: number,
  r: number,
): string {
  const half = binH / 2;
  const radius = Math.min(r, half, Math.abs(xQ3 - xQ1) / 2);
  return `
    M${xQ1},${cy - half + radius}
    a${radius},${radius} 0 0 1 ${radius},-${radius}
    H${xQ3 - radius}
    a${radius},${radius} 0 0 1 ${radius},${radius}
    V${cy + half - radius}
    a${radius},${radius} 0 0 1 -${radius},${radius}
    H${xQ1 + radius}
    a${radius},${radius} 0 0 1 -${radius},-${radius}
    Z
  `;
}

function attachHover(
  root: Selection<SVGGElement, unknown, null, undefined>,
  bin: Selection<SVGGElement, unknown, null, undefined>,
  box: BoxPlotBox,
  onBoxHover: RenderBoxPlotOptions['onBoxHover'],
  onBoxLeave: RenderBoxPlotOptions['onBoxLeave'],
): void {
  if (!onBoxHover) return;
  bin
    .style('cursor', 'pointer')
    .on('mouseenter', function (this: SVGGElement, event: MouseEvent) {
      root.selectAll('.bin-container').attr('opacity', 0.2);
      select(this).attr('opacity', 1);
      onBoxHover({ box, event });
    })
    .on('mousemove', (event: MouseEvent) => {
      onBoxHover({ box, event });
    })
    .on('mouseleave', () => {
      root.selectAll('.bin-container').attr('opacity', 1);
      onBoxLeave?.();
    });
}

function renderHorizontalValueAxis(
  host: Selection<SVGGElement, unknown, null, undefined>,
  xScale: ScaleLinear<number, number>,
  xTicks: number[],
  themeMode: 'light' | 'dark',
): void {
  host
    .call(
      axisBottom(xScale)
        .tickValues(xTicks)
        .tickSize(0)
        .tickPadding(8)
        .tickFormat((d) => {
          const n = Number(d);
          const decimals = Number.isInteger(n) && Math.abs(n) < 1000 ? 0 : 2;
          return formatCompactNumber(n, decimals);
        }),
    )
    .call((g) => g.select('.domain').attr('stroke', fdColors(themeMode).axisStroke));

  host
    .selectAll('text')
    .attr('fill', fdColors(themeMode).axisLabelFill)
    .attr('font-size', FD.axisLabelSize)
    .attr('text-anchor', 'middle');

  const xTickNodes = host.selectAll<SVGTextElement, number>('text').nodes();
  if (xTickNodes.length > 0) {
    select(xTickNodes[0]).attr('text-anchor', 'start');
    if (xTickNodes.length > 1) {
      select(xTickNodes[xTickNodes.length - 1]).attr('text-anchor', 'end');
    }
  }
}

/**
 * FuseDash Vertical / Horizontal BoxPlot — visual parity via D3.
 * Category bands sized for grouped bins (`BIN_SIZE` × groups + padding).
 */
export function renderBoxPlotChart(
  container: HTMLElement,
  options: RenderBoxPlotOptions,
): void {
  const {
    model,
    width,
    height,
    margin = { ...FD.boxPlotMargin },
    theme,
    themeMode = 'light',
    orientation = model.orientation ?? 'vertical',
    showGrid = true,
    xAxisContainer = null,
    xLabel,
    yLabel,
    onBoxHover,
    onBoxLeave,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  const axisLabels: AxisLabelTooltipHandlers = {
    onAxisLabelHover,
    onAxisLabelLeave,
  };

  container.replaceChildren();
  xAxisContainer?.replaceChildren();
  if (!model.boxes.length || width <= 0 || height <= 0) return;

  const groups = model.groups.length ? model.groups : ['default'];
  const labels =
    model.categoryLabels?.length ? model.categoryLabels : collectLabels(model);
  const horizontal = orientation === 'horizontal';
  const fixedBottomAxis = horizontal && !!xAxisContainer;
  const groupCount = groups.length;
  const groupSpan = boxPlotGroupSpan(groupCount);

  const m = {
    top: margin.top,
    bottom: margin.bottom,
    left: resolvePlotLeftMargin(margin.left),
    right: Math.max(margin.right, 12),
  };

  const plotWAvail = width - m.left - m.right;
  const plotHAvail = fixedBottomAxis
    ? height - m.top
    : height - m.top - m.bottom;
  const minCategorySpan = boxPlotMinCategorySpan(labels.length, groupCount);
  const plotW = horizontal ? plotWAvail : Math.max(plotWAvail, minCategorySpan);
  const plotH = horizontal
    ? fixedBottomAxis
      ? minCategorySpan
      : Math.max(plotHAvail, minCategorySpan)
    : plotHAvail;

  if (plotW < 8 || plotH < 8) return;

  const svgW = horizontal ? width : m.left + plotW + m.right;
  const svgH = horizontal
    ? fixedBottomAxis
      ? m.top + plotH
      : m.top + plotH + m.bottom
    : height;

  const [domainMin, domainMax] = boxPlotLinearDomain(model.boxes);
  const numTicks = calculateNumTicks(height);
  const groupColorIndex = new Map(groups.map((g, i) => [g, i]));

  const groupScale = scaleBand<string>()
    .domain(groups)
    .range([0, groupSpan])
    .padding(0);

  const groupOffset = (groupKey: string): number =>
    -groupSpan / 2 + (groupScale(groupKey) ?? 0) + BIN_SIZE / 2;

  container.style.height = `${svgH}px`;
  container.style.minHeight = `${svgH}px`;

  const svg = select(container)
    .append('svg')
    .attr('width', svgW)
    .attr('height', svgH)
    .attr('role', 'img')
    .attr('aria-label', 'Box plot chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const plot = svg
    .append('g')
    .attr('class', 'plot')
    .attr('transform', `translate(${m.left},${m.top})`);

  if (!horizontal) {
    const xScale = scaleBand<string>()
      .domain(labels)
      .range([0, plotW])
      .padding(0);

    const yScale = scaleLinear()
      .domain([domainMin, domainMax])
      .nice()
      .clamp(true)
      .range([plotH, 0]);

    const groupOffsetX = groupOffset;

    const yTicks = yScale.ticks(numTicks);

    if (showGrid) {
      const grid = plot.append('g').attr('class', 'grid');
      for (const cat of labels) {
        const bx = xScale(cat);
        if (bx == null) continue;
        const cx = bx + xScale.bandwidth() / 2;
        grid
          .append('line')
          .attr('x1', cx)
          .attr('x2', cx)
          .attr('y1', 0)
          .attr('y2', plotH)
          .attr('stroke', fdColors(themeMode).gridStroke)
          .attr('stroke-dasharray', '1 2')
          .attr('shape-rendering', 'crispEdges');
      }
      for (const t of yTicks) {
        grid
          .append('line')
          .attr('x1', 0)
          .attr('x2', plotW)
          .attr('y1', yScale(t))
          .attr('y2', yScale(t))
          .attr('stroke', fdColors(themeMode).gridStroke)
          .attr('stroke-dasharray', '1 2')
          .attr('shape-rendering', 'crispEdges');
      }
      if (domainMin < 0) {
        grid
          .append('line')
          .attr('x1', 0)
          .attr('x2', plotW)
          .attr('y1', yScale(0))
          .attr('y2', yScale(0))
          .attr('stroke', fdColors(themeMode).gridStroke)
          .attr('shape-rendering', 'crispEdges');
      }
    }

    for (const group of groups) {
      const gi = groupColorIndex.get(group) ?? 0;
      const groupX = groupOffsetX(group);
      for (const box of model.boxes.filter(
        (b) => (b.group ?? 'default') === group,
      )) {
        if (xScale(box.label) == null) continue;
        const cx =
          (xScale(box.label) ?? 0) + xScale.bandwidth() / 2 + groupX;
        const color = resolveGroupColor(gi, box, theme);
        const yQ1 = yScale(box.q1);
        const yQ3 = yScale(box.q3);
        const yMed = yScale(box.median);
        const yLo = yScale(box.smallestNonOutlier);
        const yHi = yScale(box.biggestNonOutlier);

        const bin = plot.append('g').attr('class', 'bin-container').attr('opacity', 1);

        bin
          .append('line')
          .attr('class', 'bin-range')
          .attr('x1', cx)
          .attr('x2', cx)
          .attr('y1', yHi)
          .attr('y2', yLo)
          .attr('stroke', fdColors(themeMode).axisLabelFill)
          .attr('stroke-width', 1);

        const capW = BIN_SIZE / 2 - 2;
        for (const y of [yLo, yHi]) {
          bin
            .append('line')
            .attr('class', 'bin-limits-line')
            .attr('x1', cx - capW)
            .attr('x2', cx + capW)
            .attr('y1', y)
            .attr('y2', y)
            .attr('stroke', fdColors(themeMode).axisLabelFill)
            .attr('stroke-width', 1);
        }

        bin
          .append('path')
          .attr('class', 'bin-quartile')
          .attr('fill', color)
          .attr(
            'd',
            roundedBoxVertical(cx, yQ3, yQ1, BIN_SIZE, BIN_BORDER_RADIUS),
          );

        bin
          .append('line')
          .attr('class', 'bin-median')
          .attr('x1', cx - BIN_SIZE / 2 + 2)
          .attr('x2', cx + BIN_SIZE / 2 - 2)
          .attr('y1', yMed)
          .attr('y2', yMed)
          .attr('stroke', fdColors(themeMode).axisLabelFill)
          .attr('stroke-width', 2);

        for (const ov of box.outliers ?? []) {
          if (!Number.isFinite(ov)) continue;
          bin
            .append('circle')
            .attr('class', 'bin-outlier')
            .attr('cx', cx)
            .attr('cy', yScale(ov))
            .attr('r', OUTLIER_RADIUS)
            .attr('fill', 'transparent')
            .attr('stroke', fdColors(themeMode).axisLabelFill)
            .attr('stroke-width', 1);
        }

        attachHover(plot, bin, box, onBoxHover, onBoxLeave);
      }
    }

    const xAxis = plot
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${plotH})`)
      .call(axisBottom(xScale).tickSize(0).tickPadding(8));
    xAxis.select('.domain').attr('stroke', fdColors(themeMode).axisStroke);
    xAxis.selectAll('line').attr('stroke', 'none');
    xAxis
      .selectAll('text')
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .attr('text-anchor', 'middle');
    decorateAxisLabels(xAxis, {
      slotWidth: xScale.bandwidth(),
      ...axisLabels,
    });

    const yAxis = plot
      .append('g')
      .attr('class', 'y-axis')
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
      .attr('stroke', fdColors(themeMode).axisStroke)
      .attr('stroke-dasharray', '1 2');
    applyLeftGutterYAxisLabels(yAxis, m.left, { themeMode });
  } else {
    const yScale = scaleBand<string>()
      .domain(labels)
      .range([0, plotH])
      .padding(0);

    const xScale = scaleLinear()
      .domain([domainMin, domainMax])
      .nice()
      .clamp(true)
      .range([0, plotW]);

    const xTicks = xScale.ticks(numTicks);

    if (showGrid) {
      const grid = plot.append('g').attr('class', 'grid');
      for (const t of xTicks) {
        grid
          .append('line')
          .attr('x1', xScale(t))
          .attr('x2', xScale(t))
          .attr('y1', 0)
          .attr('y2', plotH)
          .attr('stroke', fdColors(themeMode).gridStroke)
          .attr('stroke-dasharray', '1 2')
          .attr('shape-rendering', 'crispEdges');
      }
      if (domainMin < 0) {
        grid
          .append('line')
          .attr('x1', xScale(0))
          .attr('x2', xScale(0))
          .attr('y1', 0)
          .attr('y2', plotH)
          .attr('stroke', fdColors(themeMode).gridStroke)
          .attr('shape-rendering', 'crispEdges');
      }

      plot
        .append('g')
        .attr('class', 'y-grid')
        .call(
          axisLeft(yScale)
            .tickSize(-plotW)
            .tickFormat(() => ''),
        )
        .call((g) => g.select('.domain').remove())
        .selectAll('line')
        .attr('stroke', fdColors(themeMode).gridStroke)
        .attr('stroke-dasharray', '1 2')
        .attr('shape-rendering', 'crispEdges')
        .attr('transform', `translate(0, ${-yScale.bandwidth() / 2})`);
    }

    for (const group of groups) {
      const gi = groupColorIndex.get(group) ?? 0;
      const groupY = groupOffset(group);
      for (const box of model.boxes.filter(
        (b) => (b.group ?? 'default') === group,
      )) {
        if (yScale(box.label) == null) continue;
        const cy =
          (yScale(box.label) ?? 0) + groupY + yScale.bandwidth() / 2;
        const color = resolveGroupColor(gi, box, theme);
        const xQ1 = xScale(box.q1);
        const xQ3 = xScale(box.q3);
        const xMed = xScale(box.median);
        const xLo = xScale(box.smallestNonOutlier);
        const xHi = xScale(box.biggestNonOutlier);

        const bin = plot.append('g').attr('class', 'bin-container').attr('opacity', 1);

        bin
          .append('line')
          .attr('class', 'bin-range')
          .attr('x1', xLo)
          .attr('x2', xHi)
          .attr('y1', cy)
          .attr('y2', cy)
          .attr('stroke', fdColors(themeMode).axisLabelFill)
          .attr('stroke-width', 1);

        const capH = BIN_SIZE / 2 - 2;
        for (const x of [xLo, xHi]) {
          bin
            .append('line')
            .attr('class', 'bin-limits-line')
            .attr('x1', x)
            .attr('x2', x)
            .attr('y1', cy - capH)
            .attr('y2', cy + capH)
            .attr('stroke', fdColors(themeMode).axisLabelFill)
            .attr('stroke-width', 1);
        }

        bin
          .append('path')
          .attr('class', 'bin-quartile')
          .attr('fill', color)
          .attr(
            'd',
            roundedBoxHorizontal(cy, xQ1, xQ3, BIN_SIZE, BIN_BORDER_RADIUS),
          );

        bin
          .append('line')
          .attr('class', 'bin-median')
          .attr('x1', xMed)
          .attr('x2', xMed)
          .attr('y1', cy - BIN_SIZE / 2 + 2)
          .attr('y2', cy + BIN_SIZE / 2 - 2)
          .attr('stroke', fdColors(themeMode).axisLabelFill)
          .attr('stroke-width', 2);

        for (const ov of box.outliers ?? []) {
          if (!Number.isFinite(ov)) continue;
          bin
            .append('circle')
            .attr('class', 'bin-outlier')
            .attr('cx', xScale(ov))
            .attr('cy', cy)
            .attr('r', OUTLIER_RADIUS)
            .attr('fill', 'transparent')
            .attr('stroke', fdColors(themeMode).axisLabelFill)
            .attr('stroke-width', 1);
        }

        attachHover(plot, bin, box, onBoxHover, onBoxLeave);
      }
    }

    const yAxis = plot
      .append('g')
      .attr('class', 'y-axis')
      .call(axisLeft(yScale).tickSize(0).tickPadding(8));
    yAxis.select('.domain').attr('stroke', fdColors(themeMode).axisStroke);
    applyLeftGutterYAxisLabels(yAxis, m.left, { ...axisLabels, themeMode });

    if (fixedBottomAxis && xAxisContainer) {
      const axisSvg = select(xAxisContainer)
        .append('svg')
        .attr('width', svgW)
        .attr('height', m.bottom)
        .attr('role', 'presentation')
        .style('display', 'block')
        .style('font-family', theme.fontFamily);

      renderHorizontalValueAxis(
        axisSvg
          .append('g')
          .attr('class', 'x-axis')
          .attr('transform', `translate(${m.left},0)`),
        xScale,
        xTicks,
        themeMode,
      );

      if (xLabel) {
        axisSvg
          .append('text')
          .attr('x', m.left + plotW / 2)
          .attr('y', m.bottom - 2)
          .attr('text-anchor', 'middle')
          .attr('fill', fdColors(themeMode).axisLabelFill)
          .attr('font-size', FD.axisLabelSize)
          .text(xLabel);
      }
    } else {
      renderHorizontalValueAxis(
        plot
          .append('g')
          .attr('class', 'x-axis')
          .attr('transform', `translate(0,${plotH})`),
        xScale,
        xTicks,
        themeMode,
      );
    }
  }

  if (xLabel && !(horizontal && fixedBottomAxis)) {
    svg
      .append('text')
      .attr('x', m.left + plotW / 2)
      .attr('y', svgH - 2)
      .attr('text-anchor', 'middle')
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(xLabel);
  }

  if (yLabel) {
    svg
      .append('text')
      .attr('x', 4)
      .attr('y', 11)
      .attr('text-anchor', 'start')
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(yLabel);
  }
}
