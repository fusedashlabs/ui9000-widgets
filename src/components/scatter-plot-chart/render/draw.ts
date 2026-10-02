import { axisBottom, axisLeft } from 'd3-axis';
import type { NumberValue } from 'd3-scale';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import {
  symbol,
  symbolCircle,
  symbolCross,
  symbolSquare,
  symbolTriangle,
  type SymbolType,
} from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import type { ChartMarkerShape } from '../../../utils/chart-formatting/types.js';
import {
  calculateNumTicks,
  FD,
  fdColors,
  formatCompactNumber,
} from '../../../utils/fusedash-visual.js';
import { paddedLinearDomain } from '../lib/domain.js';
import type { ScatterPoint } from '../lib/types.js';

export interface RenderScatterPlotOptions {
  points: ScatterPoint[];
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  xField: string;
  yField: string;
  showGrid?: boolean;
  showReferenceLine?: boolean;
  axisDetails?: Record<string, { label?: string; measure_unit_type?: string }>;
  showTooltip?: boolean;
  onHover?: (payload: { point: ScatterPoint; event: MouseEvent }) => void;
  onLeave?: () => void;
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

function formatAxisTick(
  value: number,
  field: string,
  axisDetails?: RenderScatterPlotOptions['axisDetails'],
): string {
  const details = axisDetails?.[field];
  if (details?.measure_unit_type === 'percentage' && Math.abs(value) <= 1) {
    return (value * 100).toFixed(0);
  }
  return formatCompactNumber(value);
}

/** FuseDash ScatterPlot — D3 rewrite with grouped markers and optional y=x reference. */
export function renderScatterPlot(
  container: HTMLElement,
  options: RenderScatterPlotOptions,
): void {
  const {
    points,
    width,
    height,
    margin = { ...FD.scatterMargin },
    xField,
    yField,
    themeMode = 'light',
    showGrid = true,
    showReferenceLine = false,
    axisDetails,
    showTooltip = true,
    onHover,
    onLeave,
  } = options;

  container.replaceChildren();
  if (!points.length || width <= 0 || height <= 0) return;

  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);
  if (innerWidth <= 0 || innerHeight <= 0) return;

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const [xMin, xMax] = paddedLinearDomain(xValues);
  const [yMin, yMax] = paddedLinearDomain(yValues);

  const xScale = scaleLinear<number, number>().domain([xMin, xMax]).range([0, innerWidth]).nice();
  const yScale = scaleLinear<number, number>().domain([yMin, yMax]).range([innerHeight, 0]).nice();

  const yTicks = calculateNumTicks(innerHeight);
  const xTicks = calculateNumTicks(innerWidth);
  const gridStroke = fdColors(themeMode).gridStroke;
  const axisStroke = fdColors(themeMode).axisStroke;
  const labelFill = fdColors(themeMode).axisLabelFill;

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const plot = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  if (showGrid) {
    plot
      .append('g')
      .attr('class', 'y-grid')
      .call(
        axisLeft(yScale)
          .ticks(yTicks)
          .tickSize(-innerWidth)
          .tickFormat(() => ''),
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('line')
      .attr('stroke', gridStroke)
      .attr('stroke-dasharray', FD.gridDash)
      .attr('stroke-width', 1);

    plot
      .append('g')
      .attr('class', 'x-grid')
      .call(
        axisBottom(xScale)
          .ticks(xTicks)
          .tickSize(innerHeight)
          .tickFormat(() => ''),
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('line')
      .attr('stroke', gridStroke)
      .attr('stroke-dasharray', FD.gridDash)
      .attr('stroke-width', 1);
  }

  plot
    .append('g')
    .attr('class', 'y-axis')
    .call(
      axisLeft(yScale)
        .ticks(yTicks)
        .tickSize(0)
        .tickPadding(8)
        .tickFormat((d: NumberValue) => {
          const numeric = typeof d === 'number' ? d : d.valueOf();
          return Number.isInteger(numeric) ? formatAxisTick(numeric, yField, axisDetails) : '';
        }),
    )
    .call((g) => g.select('.domain').remove())
    .selectAll('text')
    .attr('dx', `-${margin.left - 10}px`)
    .attr('fill', labelFill)
    .attr('font-size', FD.axisLabelSize)
    .attr('text-anchor', 'start');

  plot
    .selectAll('.y-axis .tick')
    .append('line')
    .attr('x1', -8)
    .attr('x2', 0)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', axisStroke)
    .attr('stroke-width', 1);

  plot
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(
      axisBottom(xScale)
        .ticks(xTicks)
        .tickSizeOuter(0)
        .tickSize(0)
        .tickPadding(8)
        .tickFormat((d: NumberValue) => {
          const numeric = typeof d === 'number' ? d : d.valueOf();
          return Number.isInteger(numeric) ? formatAxisTick(numeric, xField, axisDetails) : '';
        }),
    )
    .call((g) => g.select('.domain').attr('stroke', axisStroke));

  if (showReferenceLine) {
    const vMin = Math.max(xScale.domain()[0] as number, yScale.domain()[0] as number);
    const vMax = Math.min(xScale.domain()[1] as number, yScale.domain()[1] as number);
    plot
      .append('line')
      .attr('x1', xScale(vMin))
      .attr('y1', yScale(vMin))
      .attr('x2', xScale(vMax))
      .attr('y2', yScale(vMax))
      .attr('stroke', FD.scatterReferenceLine)
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-width', 2)
      .attr('pointer-events', 'none');
  }

  const markerLayer = plot.append('g').attr('class', 'scatter-markers');
  const paths = markerLayer
    .selectAll('path')
    .data(points)
    .enter()
    .append('g')
    .attr('class', 'scatterplot-marker-container')
    .attr('opacity', 1)
    .each(function (point) {
      const shape = point.markerShape;
      const pathGen = symbol().type(markerSymbol(shape)).size(FD.scatterMarkerSize);
      const rotation = markerRotation(shape);
      const isDonut = shape === 'donut';
      select(this)
        .append('path')
        .attr('class', 'scatterplot-marker')
        .attr('d', pathGen)
        .attr(
          'transform',
          `translate(${xScale(point.x)},${yScale(point.y)}) rotate(${rotation})`,
        )
        .attr('fill', isDonut ? 'none' : point.color)
        .attr('stroke', point.color)
        .attr('stroke-width', isDonut ? 1.5 : 0);
    });

  if (showTooltip && onHover) {
    paths
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, point) {
        markerLayer.selectAll('.scatterplot-marker-container').attr('opacity', FD.donutArcOpacityDimmed);
        select(this).attr('opacity', 1);
        onHover({ point, event });
      })
      .on('mousemove', (event: MouseEvent, point) => {
        onHover({ point, event });
      })
      .on('mouseleave', () => {
        markerLayer.selectAll('.scatterplot-marker-container').attr('opacity', 1);
        onLeave?.();
      });
  }
}
