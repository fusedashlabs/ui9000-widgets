import { axisBottom, axisLeft, axisRight } from 'd3-axis';
import { scaleLinear, scalePoint, type ScaleLinear } from 'd3-scale';
import { select, type Selection } from 'd3-selection';
import { line } from 'd3-shape';

import type { ChartDimensions, WidgetTheme } from '../../../types/index.js';
import { decorateManualAxisLabel, type AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import { FD } from '../../../utils/fusedash-visual.js';
import {
  AXIS_TITLE_MAX,
  axisExtents,
  formatAxisTick,
  tickCountForSpan,
  type ParallelCoordinatesModel,
  type ParallelCoordinatesOrientation,
  type ParallelCoordinatesRow,
} from '../lib/index.js';

/** Below this the axes have no room for ticks — the element shows empty state. */
const MIN_WIDTH = 120;
const MIN_HEIGHT = 60;

let gradientSeq = 0;

export interface ParallelCoordinatesHover {
  row: ParallelCoordinatesRow;
  event: MouseEvent;
}

export interface RenderParallelCoordinatesOptions extends AxisLabelTooltipHandlers {
  model: ParallelCoordinatesModel;
  width: number;
  height: number;
  margin: ChartDimensions['margin'];
  theme: WidgetTheme;
  orientation: ParallelCoordinatesOrientation;
  /** Draws the colour ramp for the active axis in the right gutter. */
  showLegend: boolean;
  /** Axis driving line colour; falls back to `model.colorKey`. */
  colorKey?: string;
  onRowHover?: (payload: ParallelCoordinatesHover) => void;
  onRowLeave?: () => void;
  /** Fired when a click on an axis promotes it to the colour axis. */
  onColorKeyChange?: (key: string) => void;
}

/**
 * Scoped to the SVG so hover stays a class flip rather than an attribute pass
 * over every polyline. Mirrors the client `SVGStyled` rules.
 */
const PLOT_CSS = `
.line-path { pointer-events: visibleStroke; transition: stroke-opacity .2s, stroke-width .2s; }
.plot.is-hovering .line-path { stroke-opacity: ${FD.parallelLineOpacityDimmed}; }
.plot.is-hovering .line-path.is-hovered { stroke-opacity: 1; stroke-width: ${FD.parallelLineWidthHovered}px; }
.x-axis .tick:first-of-type text { text-anchor: start; }
.x-axis .tick:last-of-type text { text-anchor: end; }
/* Ticks render in ascending domain order: first is now the bottom edge. */
.y-axis .tick:first-of-type text { dominant-baseline: ideographic; }
.y-axis .tick:last-of-type text { dominant-baseline: central; }
`;

type AxisScale = ScaleLinear<number, number>;
/** One polyline vertex: the axis it crosses and the row's value there. */
type Vertex = [string, number | null];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySelection = Selection<any, any, any, any>;

function styleAxis(group: AnySelection): void {
  group.select('.domain').attr('stroke', FD.parallelAxisStroke);
  group.selectAll('.tick line').attr('stroke', FD.parallelAxisStroke);
  group
    .selectAll('text')
    .attr('fill', FD.parallelAxisLabelFill)
    .attr('font-size', FD.axisLabelSize);
}

/**
 * FuseDash ParallelCoordinatesChart plot — one linear axis per dimension with a
 * polyline per record, coloured by the value on the active axis. Click any axis
 * to move the colour ramp onto it.
 */
export function renderParallelCoordinatesChart(
  container: HTMLElement,
  options: RenderParallelCoordinatesOptions,
): void {
  const {
    model,
    width,
    height,
    margin,
    theme,
    orientation,
    showLegend,
    onRowHover,
    onRowLeave,
    onColorKeyChange,
  } = options;

  container.replaceChildren();
  const { axes, rows } = model;
  if (!axes.length || !rows.length || width < MIN_WIDTH || height < MIN_HEIGHT) return;

  const requested = options.colorKey ?? model.colorKey;
  let colorKey = axes.includes(requested) ? requested : axes[0];

  const gutter = showLegend
    ? FD.parallelLegendOffsetRight + FD.parallelLegendWidth + FD.parallelLegendTickLabelWidth
    : 0;
  const innerWidth = width - margin.left - margin.right;
  const plotWidth = innerWidth - gutter;
  const plotRight = Math.max(margin.left, plotWidth - margin.right);

  const vertical = orientation === 'vertical';
  // Horizontal grows one band per axis and scrolls; vertical fits the frame.
  const coordinateHeight = FD.parallelAxisSpacing * axes.length;
  const innerHeight = height - margin.top - margin.bottom;
  const plotBottom = vertical
    ? innerHeight - margin.bottom - FD.parallelColorScaleHeight
    : coordinateHeight - margin.bottom;
  const svgHeight = vertical ? height : coordinateHeight + margin.top + margin.bottom * 2;
  if (plotBottom <= margin.top) return;

  const extents = axisExtents(rows, axes);
  const valueScales = new Map<string, AxisScale>();
  for (const axis of axes) {
    valueScales.set(
      axis,
      scaleLinear()
        .domain(extents.get(axis) as [number, number])
        // SVG y grows downward, so a vertical axis has to run bottom → top for
        // the maximum to sit at the top. The client's VerticalParallelCoordinates
        // transposed the horizontal variant without that flip, leaving its axes
        // mirrored and contradicting its own colour ramp; this is the one place
        // the port deliberately diverges from it.
        .range(vertical ? [plotBottom, margin.top] : [margin.left, plotRight]),
    );
  }
  const bandScale = scalePoint<string>()
    .domain(axes)
    .range(vertical ? [margin.left, plotRight] : [margin.top, plotBottom]);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', svgHeight)
    .attr('viewBox', `0 0 ${width} ${svgHeight}`)
    .attr('role', 'img')
    .attr('aria-label', 'Parallel coordinates chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);
  svg.append('style').text(PLOT_CSS);

  const root = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // --- axes -----------------------------------------------------------------
  const lastIndex = axes.length - 1;
  const axisSpan = vertical ? plotBottom - margin.top : plotRight - margin.left;
  const tickCount = tickCountForSpan(axisSpan);
  // Vertical titles must fit the gap to the neighbouring axis.
  const bandStep = axes.length > 1 ? Math.abs(Number(bandScale.step())) : plotRight;
  const titleSlot = vertical ? Math.max(0, bandStep - 8) : plotWidth;

  const axisGroups = root
    .append('g')
    .selectAll<SVGGElement, string>('g')
    .data(axes)
    .join('g')
    .attr('class', vertical ? 'y-axis' : 'x-axis')
    .attr('transform', (key) =>
      vertical ? `translate(${bandScale(key)}, 0)` : `translate(0, ${bandScale(key)})`,
    )
    .style('cursor', 'pointer')
    .on('click', (_event: MouseEvent, key) => setColorKey(key));

  axisGroups.each(function (key, index) {
    const group = select(this);
    const scale = valueScales.get(key) as AxisScale;
    // Vertical hangs ticks to the right, except the last axis which would
    // otherwise push its labels outside the plot.
    const axisFn = vertical
      ? (index === lastIndex ? axisLeft(scale) : axisRight(scale))
      : axisBottom(scale);
    group.call(
      axisFn.ticks(tickCount).tickSize(4).tickPadding(8).tickFormat((d) =>
        formatAxisTick(Number(d)),
      ),
    );
    styleAxis(group);
  });

  const axisTitles = axisGroups
    .append('text')
    .attr('class', 'axis-title')
    .attr('x', margin.left)
    .attr('y', vertical ? 0 : -10)
    .attr('text-anchor', (_key, index) =>
      vertical && index === lastIndex ? 'end' : 'start',
    )
    .attr('fill', FD.parallelAxisLabelFill);

  axisTitles.each(function (key) {
    decorateManualAxisLabel(select(this), key, {
      maxLength: AXIS_TITLE_MAX,
      slotWidth: titleSlot,
      onAxisLabelHover: options.onAxisLabelHover,
      onAxisLabelLeave: options.onAxisLabelLeave,
    });
  });

  // --- polylines ------------------------------------------------------------
  const plot = root.append('g').attr('class', 'plot').attr('fill', 'none');

  const valueAt = ([key, value]: Vertex): number =>
    (valueScales.get(key) as AxisScale)(value ?? 0);
  const bandAt = ([key]: Vertex): number => Number(bandScale(key));

  const lineFn = line<Vertex>()
    .defined(([, value]) => value != null)
    .x(vertical ? bandAt : valueAt)
    .y(vertical ? valueAt : bandAt);

  const paths = plot
    .selectAll<SVGPathElement, ParallelCoordinatesRow>('path')
    .data(rows)
    .join('path')
    .attr('class', 'line-path')
    .attr('stroke-width', FD.parallelLineWidth)
    .attr('stroke-opacity', FD.parallelLineOpacity)
    .attr('stroke-linejoin', 'round')
    .attr('stroke-linecap', 'round')
    .attr('d', (row) =>
      lineFn(axes.map((key) => [key, row.values[key]] as Vertex)),
    );

  paths
    .on('mouseenter', function (event: MouseEvent, row) {
      plot.classed('is-hovering', true);
      select(this).classed('is-hovered', true);
      onRowHover?.({ row, event });
    })
    .on('mousemove', (event: MouseEvent, row) => onRowHover?.({ row, event }))
    .on('mouseleave', function () {
      plot.classed('is-hovering', false);
      select(this).classed('is-hovered', false);
      onRowLeave?.();
    });

  // --- colour ramp ----------------------------------------------------------
  const gradientId = `ui9000-parallel-ramp-${(gradientSeq += 1)}`;
  const legendGroup = showLegend ? root.append('g').attr('class', 'color-legend') : null;

  if (legendGroup) {
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('x2', '0%')
      .attr('y1', '100%')
      .attr('y2', '0%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', model.minColor);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', model.maxColor);
  }

  function applyColorKey(): void {
    const scale = valueScales.get(colorKey) as AxisScale;
    const domain = scale.domain() as [number, number];
    const ramp = scaleLinear<string>()
      .domain(domain)
      .range([model.minColor, model.maxColor])
      .clamp(true);

    paths.attr('stroke', (row) => {
      const value = row.values[colorKey];
      return value == null ? model.lineColor : ramp(value);
    });
    axisTitles
      .attr('font-size', (key) =>
        key === colorKey ? FD.parallelTitleSizeActive : FD.parallelTitleSize,
      )
      .attr('font-weight', (key) => (key === colorKey ? 600 : 400));

    if (!legendGroup) return;
    legendGroup.selectAll('*').remove();
    const legendX = Math.max(0, plotWidth - margin.right + FD.parallelLegendOffsetRight);
    const legendHeight = Math.max(0, plotBottom - margin.top);
    legendGroup
      .append('rect')
      .attr('x', legendX)
      .attr('y', margin.top)
      .attr('width', FD.parallelLegendWidth)
      .attr('height', legendHeight)
      .attr('rx', FD.parallelLegendRadius)
      .attr('fill', `url(#${gradientId})`);

    const legendScale = scaleLinear().domain(domain).range([legendHeight, 0]);
    const ticks = legendGroup
      .append('g')
      .attr('transform', `translate(${legendX + FD.parallelLegendWidth}, ${margin.top})`)
      .call(
        axisRight(legendScale)
          .ticks(tickCountForSpan(legendHeight))
          .tickSize(0)
          .tickPadding(6)
          .tickFormat((d) => formatAxisTick(Number(d))),
      );
    ticks.select('.domain').remove();
    ticks.selectAll('.tick line').remove();
    ticks
      .selectAll('text')
      .attr('fill', FD.parallelAxisLabelFill)
      .attr('font-size', FD.axisLabelSize);
  }

  function setColorKey(key: string): void {
    if (key === colorKey) return;
    colorKey = key;
    applyColorKey();
    onColorKeyChange?.(key);
  }

  applyColorKey();
}
