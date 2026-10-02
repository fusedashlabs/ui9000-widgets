import { axisBottom, axisLeft } from 'd3-axis';
import { scaleBand } from 'd3-scale';
import { select } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import {
  decorateAxisLabels,
  layoutPunchcardYAxisLabels,
} from '../../../utils/axis-labels.js';
import {
  generatePunchcardColorRanges,
  punchcardColorForValue,
  PUNCHCARD_BOTTOM_MARGIN,
  PUNCHCARD_LABEL_GUTTER_PAD,
  PUNCHCARD_MIN_LABEL_RADIUS,
  punchcardLayoutMaxRadius,
  punchcardLeftGutter,
  punchcardScaledRadius,
  SEQUENTIAL_1,
} from '../../../utils/fuse-palette.js';
import { FD, fdColors } from '../../../utils/fusedash-visual.js';
import {
  formatCompact,
  type PunchcardCell,
  type PunchcardModel,
} from '../lib/index.js';

const X_AXIS_TICK_PADDING = 6;

export interface RenderPunchcardOptions extends AxisLabelTooltipHandlers {
  model: PunchcardModel;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  showGrid?: boolean;
  xLabel?: string;
  yLabel?: string;
  onCellHover?: (payload: {
    cell: PunchcardCell;
    event: MouseEvent;
  }) => void;
  onCellLeave?: () => void;
}

/**
 * FuseDash PunchcardChart — inner plot coords (translate margin), tight label gutter.
 */
export function renderPunchcardChart(
  container: HTMLElement,
  options: RenderPunchcardOptions,
): void {
  const {
    model,
    width,
    height,
    margin = { ...FD.punchcardMargin },
    theme,
    themeMode = 'light',
    showGrid = true,
    xLabel,
    yLabel,
    onCellHover,
    onCellLeave,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  const axisLabels: AxisLabelTooltipHandlers = {
    onAxisLabelHover,
    onAxisLabelLeave,
  };

  container.replaceChildren();
  if (!model.cells.length || width <= 0 || height <= 0) return;

  const xDomain = model.xDomain.length
    ? model.xDomain
    : [...new Set(model.cells.map((c) => c.x))];
  const yDomain = model.yDomain.length
    ? model.yDomain
    : [...new Set(model.cells.map((c) => c.y))];

  const leftGutter = punchcardLeftGutter(yDomain);
  const m = {
    top: margin.top,
    bottom: margin.bottom || PUNCHCARD_BOTTOM_MARGIN,
    left: leftGutter,
    right: margin.right,
  };

  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  if (innerW < 8 || innerH < 8) return;

  const values = model.cells.map((c) => c.value).filter(Number.isFinite);
  const ranges = generatePunchcardColorRanges(values, SEQUENTIAL_1);

  const layoutMaxR = punchcardLayoutMaxRadius(
    innerW,
    innerH,
    xDomain.length,
    yDomain.length,
  );

  // Client: scaleBand.rangeRound([maxR, size - maxR]).paddingOuter(-0.5)
  const xScale = scaleBand<string>()
    .domain(xDomain)
    .range([layoutMaxR, innerW - layoutMaxR])
    .paddingInner(0)
    .paddingOuter(-0.5);

  const yScale = scaleBand<string>()
    .domain(yDomain)
    .range([layoutMaxR, innerH - layoutMaxR])
    .paddingInner(0)
    .paddingOuter(-0.5);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', 'Punchcard chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const defs = svg.append('defs');
  const usedColors = new Set<string>();
  for (const cell of model.cells) {
    usedColors.add(punchcardColorForValue(cell.value, ranges));
  }
  for (const color of usedColors) {
    const colorId = color.replace('#', 'hex');
    const gradient = defs
      .append('linearGradient')
      .attr('id', `bubble-gradient-${colorId}`)
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');
    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color)
      .attr('stop-opacity', '0.3');
    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color)
      .attr('stop-opacity', '0.1');
  }

  const plot = svg
    .append('g')
    .attr('class', 'plot')
    .attr('transform', `translate(${m.left},${m.top})`);

  if (showGrid) {
    const grid = plot.append('g').attr('class', 'grid');

    for (const cat of xDomain) {
      const bx = xScale(cat);
      if (bx == null) continue;
      const cx = bx + xScale.bandwidth() / 2;
      grid
        .append('line')
        .attr('x1', cx)
        .attr('x2', cx)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', fdColors(themeMode).gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('shape-rendering', 'crispEdges');
    }

    for (const cat of yDomain) {
      const by = yScale(cat);
      if (by == null) continue;
      const cy = by + yScale.bandwidth() / 2;
      grid
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', cy)
        .attr('y2', cy)
        .attr('stroke', fdColors(themeMode).gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('shape-rendering', 'crispEdges');
    }
  }

  // Full plot border — d3 domain stops at first/last band, not plot edge
  const frame = plot.append('g').attr('class', 'plot-frame');
  frame
    .append('line')
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', 0)
    .attr('y2', innerH)
    .attr('stroke', fdColors(themeMode).axisStroke)
    .attr('shape-rendering', 'crispEdges');
  frame
    .append('line')
    .attr('x1', 0)
    .attr('x2', innerW)
    .attr('y1', innerH)
    .attr('y2', innerH)
    .attr('stroke', fdColors(themeMode).axisStroke)
    .attr('shape-rendering', 'crispEdges');

  const layer = plot.append('g').attr('class', 'bubbles');

  for (const cell of model.cells) {
    const bx = xScale(cell.x);
    const by = yScale(cell.y);
    if (bx == null || by == null || !Number.isFinite(cell.value)) continue;

    const cx = bx + xScale.bandwidth() / 2;
    const cy = by + yScale.bandwidth() / 2;
    const color = cell.color ?? punchcardColorForValue(cell.value, ranges);
    const r = punchcardScaledRadius(cell.value, ranges, layoutMaxR);
    const colorId = color.replace('#', 'hex');
    const isNeg = cell.value < 0;

    const g = layer
      .append('g')
      .attr('class', 'bubble')
      .style('cursor', onCellHover ? 'pointer' : 'default');

    g.append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', r)
      .attr('fill', isNeg ? '#DADAE1' : `url(#bubble-gradient-${colorId})`)
      .attr('fill-opacity', isNeg ? 0.6 : 1)
      .attr('stroke', isNeg ? '#DADAE1' : color)
      .attr('stroke-width', 1);

    if (r >= PUNCHCARD_MIN_LABEL_RADIUS) {
      g.append('text')
        .attr('x', cx)
        .attr('y', cy)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#000')
        .attr('font-size', 12)
        .attr('pointer-events', 'none')
        .text(formatCompact(cell.value));
    }

    if (onCellHover) {
      g.on('mouseenter', function (this: SVGGElement, event: MouseEvent) {
        plot.selectAll('.bubble').attr('opacity', 0.2);
        select(this).attr('opacity', 1);
        onCellHover({ cell, event });
      })
        .on('mousemove', (event: MouseEvent) => {
          onCellHover({ cell, event });
        })
        .on('mouseleave', () => {
          plot.selectAll('.bubble').attr('opacity', 1);
          onCellLeave?.();
        });
    }
  }

  const yAxis = plot
    .append('g')
    .attr('class', 'y-axis')
    .call(axisLeft(yScale).tickSize(0).tickPadding(4));
  yAxis.select('.domain').remove();
  yAxis.selectAll('line').attr('stroke', 'none');
  yAxis
    .selectAll('text')
    .attr('fill', fdColors(themeMode).axisLabelFill)
    .attr('font-size', FD.axisLabelSize);

  decorateAxisLabels(yAxis, {
    slotWidth: leftGutter - PUNCHCARD_LABEL_GUTTER_PAD,
    ...axisLabels,
  });
  layoutPunchcardYAxisLabels(yAxis, leftGutter, PUNCHCARD_LABEL_GUTTER_PAD);

  const xAxis = plot
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerH})`)
    .call(axisBottom(xScale).tickSize(0).tickPadding(X_AXIS_TICK_PADDING));
  xAxis.select('.domain').remove();
  xAxis.selectAll('line').attr('stroke', 'none');
  xAxis
    .selectAll('text')
    .attr('fill', fdColors(themeMode).axisLabelFill)
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

  if (xLabel) {
    svg
      .append('text')
      .attr('x', m.left + innerW / 2)
      .attr('y', height - 2)
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
