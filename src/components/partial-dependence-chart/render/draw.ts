import { axisBottom, axisLeft } from 'd3-axis';
import { scaleLinear, type NumberValue, type ScaleLinear } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import { curveMonotoneX, line as d3Line } from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import {
  calculateNumTicks,
  FD,
  formatCompactNumber,
} from '../../../utils/fusedash-visual.js';
import { pdpLinearDomain } from '../lib/domain.js';
import { nearestAveragePoint } from '../lib/series.js';
import type { IcePoint, IceSeries } from '../lib/types.js';

export interface RenderPartialDependenceOptions {
  iceSeries: IceSeries[];
  averageSeries: IcePoint[];
  width: number;
  height: number;
  /** Client PDP DEFAULT_MARGIN when omitted by the host */
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  color: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  onHover?: (payload: {
    x: number;
    /** Average value nearest the cursor, or null when there is no average curve */
    y: number | null;
    event: PointerEvent;
  }) => void;
  onLeave?: () => void;
}

/**
 * PDP axes carry fractional feature values, so precision comes from d3's own
 * tick formatter (as in the client); only large magnitudes fall back to the
 * FuseDash compact K/M/B form.
 */
function axisTickFormat(
  scale: ScaleLinear<number, number>,
  count: number,
): (value: NumberValue) => string {
  const base = scale.tickFormat(count);
  return (value: NumberValue) => {
    const n = Number(value);
    return Math.abs(n) >= 1000 ? formatCompactNumber(n) : base(n);
  };
}

/**
 * FuseDash PartialDependenceChart — D3 rewrite.
 * Coordinate system matches the client (Visx style): the margins live inside the
 * scale ranges, so axis groups are placed in absolute SVG coordinates.
 */
export function renderPartialDependenceChart(
  container: HTMLElement,
  options: RenderPartialDependenceOptions,
): void {
  const {
    iceSeries,
    averageSeries,
    width,
    height,
    margin = { ...FD.pdpMargin },
    theme,
    themeMode = 'light',
    color,
    showGrid = true,
    showTooltip = true,
    onHover,
    onLeave,
  } = options;

  container.replaceChildren();
  if (!iceSeries.length || width <= 0 || height <= 0) return;

  const plotLeft = margin.left;
  const plotRight = Math.max(margin.left + 1, width - margin.right);
  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;
  if (plotRight - plotLeft < 8 || plotBottom - plotTop < 8) return;

  const xs: number[] = [];
  const ys: number[] = [];
  for (const series of iceSeries) {
    for (const p of series.points) {
      xs.push(p.x);
      ys.push(p.y);
    }
  }
  for (const p of averageSeries) {
    xs.push(p.x);
    ys.push(p.y);
  }

  const xScale = scaleLinear().domain(pdpLinearDomain(xs)).range([plotLeft, plotRight]);
  const yScale = scaleLinear().domain(pdpLinearDomain(ys)).range([plotBottom, plotTop]);

  const numXTicks = calculateNumTicks(plotRight - plotLeft);
  const numYTicks = calculateNumTicks(plotBottom - plotTop);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'Partial dependence chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  if (showGrid) {
    svg
      .append('g')
      .attr('class', 'y-grid')
      .selectAll('line')
      .data(yScale.ticks(numYTicks))
      .join('line')
      .attr('x1', plotLeft)
      .attr('x2', plotRight)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', FD.gridStroke)
      .attr('stroke-dasharray', FD.gridDash)
      .attr('shape-rendering', 'crispEdges');
  }

  const xAxis = svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${plotBottom})`)
    .call(axisBottom(xScale).ticks(numXTicks).tickFormat(axisTickFormat(xScale, numXTicks)));
  xAxis.select('.domain').attr('stroke', FD.axisStroke);
  xAxis.selectAll('line').attr('stroke', FD.axisStroke);
  xAxis
    .selectAll('text')
    .attr('fill', FD.axisLabelFill)
    .attr('font-size', FD.axisLabelSize);

  const yAxis = svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${plotLeft},0)`)
    .call(axisLeft(yScale).ticks(numYTicks).tickFormat(axisTickFormat(yScale, numYTicks)));
  yAxis.select('.domain').attr('stroke', FD.axisStroke);
  yAxis.selectAll('line').attr('stroke', FD.axisStroke);
  yAxis
    .selectAll('text')
    .attr('fill', FD.axisLabelFill)
    .attr('font-size', FD.axisLabelSize);

  const lineGenerator = d3Line<IcePoint>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y))
    .curve(curveMonotoneX);

  svg
    .append('g')
    .attr('class', 'ice-lines')
    .selectAll('path')
    .data(iceSeries)
    .join('path')
    .attr('d', (d) => lineGenerator(d.points) ?? '')
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('opacity', FD.pdpIceOpacity)
    .attr('stroke-width', FD.pdpIceStrokeWidth);

  if (averageSeries.length) {
    svg
      .append('path')
      .attr('class', 'avg-line')
      .attr('d', lineGenerator(averageSeries) ?? '')
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', FD.pdpAverageStrokeWidth)
      .attr('stroke-dasharray', FD.pdpAverageDash);
  }

  if (!showTooltip || !onHover) return;

  // Cursor chrome for the tooltip — the client reads the nearest average value
  // from an invisible overlay, which leaves nothing on screen to read it against.
  const guide = svg
    .append('g')
    .attr('class', 'hover-guide')
    .attr('opacity', 0)
    .attr('pointer-events', 'none');
  const guideLine = guide
    .append('line')
    .attr('y1', plotTop)
    .attr('y2', plotBottom)
    .attr('stroke', themeMode === 'dark' ? FD.hoverGuideDark : FD.hoverGuideLight)
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', FD.stepGuideDash);
  const guideDot = guide
    .append('circle')
    .attr('r', FD.stepHoverDotRadius)
    .attr('fill', color)
    .attr('stroke', themeMode === 'dark' ? '#000' : '#fff')
    .attr('stroke-width', 1);

  svg
    .append('rect')
    .attr('class', 'hover-surface')
    .attr('x', plotLeft)
    .attr('y', plotTop)
    .attr('width', plotRight - plotLeft)
    .attr('height', plotBottom - plotTop)
    .attr('fill', 'transparent')
    .on('pointermove', (event: PointerEvent) => {
      const svgNode = svg.node();
      const [mx] = svgNode ? pointer(event, svgNode) : [plotLeft];
      const x = xScale.invert(mx);
      const nearest = nearestAveragePoint(averageSeries, x);
      guideLine.attr('x1', mx).attr('x2', mx);
      if (nearest) {
        guideDot.attr('cx', xScale(nearest.x)).attr('cy', yScale(nearest.y)).attr('opacity', 1);
      } else {
        guideDot.attr('opacity', 0);
      }
      guide.attr('opacity', 1);
      onHover({ x, y: nearest ? nearest.y : null, event });
    })
    .on('pointerleave', () => {
      guide.attr('opacity', 0);
      onLeave?.();
    });
}
