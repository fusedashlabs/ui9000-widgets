import { scaleLinear } from 'd3-scale';
import { select, type Selection } from 'd3-selection';
import { arc } from 'd3-shape';

import type { ChartDimensions, WidgetTheme } from '../../../types/index.js';
import {
  decorateManualAxisLabel,
  type AxisLabelTooltipHandlers,
} from '../../../utils/axis-labels.js';
import { FD, fdColors, formatCompactNumber } from '../../../utils/fusedash-visual.js';
import {
  polarGroupedSectorAngles,
  polarLabelAnchor,
  polarLabelGutter,
  polarOuterRadius,
  polarRadialTicks,
  polarSectorAngles,
} from '../lib/domain.js';
import type { PolarAreaModel, PolarAreaSector } from '../lib/types.js';

export interface RenderPolarAreaChartOptions extends AxisLabelTooltipHandlers {
  model: PolarAreaModel;
  width: number;
  height: number;
  margin: ChartDimensions['margin'];
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  showGrid?: boolean;
  showTooltip?: boolean;
  onHover?: (payload: { sector: PolarAreaSector; event: MouseEvent }) => void;
  onLeave?: () => void;
}

const SECTOR_CLASS = 'polar-area-path';
const TICK_CLASS = 'polar-tick-group';

/**
 * getBBox is unavailable on detached / non-rendering hosts — fall back to a
 * character estimate around the anchor (`text-anchor: middle` + central
 * baseline), which is where getBBox would report the box.
 */
function measureText(
  node: SVGTextElement | null,
  text: string,
  fontSize: number,
  cx: number,
  cy: number,
): { x: number; y: number; width: number; height: number } {
  const box = node?.getBBox?.();
  if (box && box.width > 0) return box;
  const width = text.length * fontSize * 0.6;
  return { x: cx - width / 2, y: cy - fontSize / 2, width, height: fontSize };
}

function drawGridRings(
  parent: Selection<SVGGElement, unknown, null, undefined>,
  ticks: number[],
  radial: (value: number) => number,
  themeMode: 'light' | 'dark',
): void {
  parent
    .selectAll('circle')
    .data(ticks)
    .enter()
    .append('circle')
    .attr('r', (d) => radial(d))
    .attr('fill', 'none')
    .attr('stroke', fdColors(themeMode).polarGridStroke)
    .attr('stroke-opacity', (_d, i) => (i + 1) * FD.polarGridStepOpacity);
}

function drawSpokes(
  parent: Selection<SVGGElement, unknown, null, undefined>,
  categories: string[],
  outer: number,
  themeMode: 'light' | 'dark',
): void {
  const slice = (Math.PI * 2) / categories.length;
  for (let i = 0; i < categories.length; i += 1) {
    // Angle 0 is 12 o'clock, matching the sector arcs.
    const angle = slice * i - Math.PI / 2;
    const x = outer * Math.cos(angle);
    const y = outer * Math.sin(angle);

    parent
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', x)
      .attr('y2', y)
      .attr('stroke', fdColors(themeMode).polarGridStroke)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', FD.polarSpokeDash);

    parent
      .append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', FD.polarSpokeCapRadius)
      .attr('fill', fdColors(themeMode).polarGridStroke);
  }
}

function drawCategoryLabels(
  parent: Selection<SVGGElement, unknown, null, undefined>,
  categories: string[],
  outer: number,
  halfWidth: number,
  handlers: AxisLabelTooltipHandlers,
  themeMode: 'light' | 'dark',
): void {
  const slice = (Math.PI * 2) / categories.length;
  const radius = outer + FD.polarCategoryLabelOffset;

  categories.forEach((category, i) => {
    const labelAngle = slice * i - Math.PI / 2 + slice / 2;
    const x = radius * Math.cos(labelAngle);
    const anchor = polarLabelAnchor(labelAngle);
    // Room left between the label anchor and the SVG edge it grows towards.
    const slotWidth =
      anchor === 'start'
        ? halfWidth - x
        : anchor === 'end'
          ? halfWidth + x
          : 2 * Math.min(halfWidth - x, halfWidth + x);

    const text = parent
      .append('text')
      .attr('x', x)
      .attr('y', radius * Math.sin(labelAngle))
      .attr('text-anchor', anchor)
      .attr('font-size', FD.polarCategoryLabelSize)
      .attr('dominant-baseline', 'central')
      .attr('fill', fdColors(themeMode).polarCategoryLabelFill);

    decorateManualAxisLabel(text, category, {
      ...handlers,
      slotWidth,
      fontSize: FD.polarCategoryLabelSize,
    });
  });
}

function drawRadialTicks(
  parent: Selection<SVGGElement, unknown, null, undefined>,
  ticks: number[],
  radial: (value: number) => number,
  theme: WidgetTheme,
  themeMode: 'light' | 'dark',
): void {
  const pillFill =
    theme.background && theme.background !== 'transparent'
      ? theme.background
      : fdColors(themeMode).polarTickPill;

  parent
    .selectAll<SVGGElement, number>('g')
    .data(ticks)
    .enter()
    .append('g')
    .attr('class', TICK_CLASS)
    .each(function (value) {
      const group = select(this);
      const label = formatCompactNumber(value, 2);

      const cy = -radial(value);
      const text = group
        .append('text')
        .attr('x', 0)
        .attr('y', cy)
        .attr('font-size', FD.polarCategoryLabelSize)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', theme.text)
        .text(label);

      const box = measureText(text.node(), label, FD.polarCategoryLabelSize, 0, cy);
      group
        .insert('rect', 'text')
        .attr('x', box.x - FD.polarTickPillPadX)
        .attr('y', box.y - FD.polarTickPillPadY)
        .attr('width', box.width + FD.polarTickPillPadX * 2)
        .attr('height', box.height + FD.polarTickPillPadY * 2)
        .attr('rx', FD.polarTickPillRadius)
        .attr('ry', FD.polarTickPillRadius)
        .attr('fill', pillFill);
    });
}

/**
 * FuseDash PolarAreaChart — D3 rewrite.
 * One wedge per category, each reaching the radius of its value; the legend
 * lives in the Lit shell.
 */
export function renderPolarAreaChart(
  container: HTMLElement,
  options: RenderPolarAreaChartOptions,
): void {
  const {
    model,
    width,
    height,
    margin,
    theme,
    themeMode = 'light',
    showGrid = true,
    showTooltip = true,
    onHover,
    onLeave,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  container.replaceChildren();

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const labelGutter = polarLabelGutter(model.categories, plotWidth);
  const outerRadius = polarOuterRadius(plotWidth, plotHeight, labelGutter);
  if (!model.sectors.length || outerRadius <= 0 || !model.maxValue) return;

  const radial = scaleLinear()
    .domain([0, model.maxValue])
    .rangeRound([0, outerRadius])
    .nice();
  const gridOuter = radial(model.maxValue);
  const ticks = polarRadialTicks(model.maxValue, FD.polarRadialSteps);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const root = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

  if (showGrid) {
    const gridGroup = root
      .append('g')
      .attr('class', 'polar-grid')
      .attr('pointer-events', 'none');
    drawGridRings(gridGroup, ticks, radial, themeMode);
    drawSpokes(gridGroup, model.categories, gridOuter, themeMode);
  }
  if (outerRadius >= FD.polarMinLabelRadius) {
    drawCategoryLabels(
      root.append('g').attr('class', 'polar-category-labels'),
      model.categories,
      gridOuter,
      width / 2,
      { onAxisLabelHover, onAxisLabelLeave },
      themeMode,
    );
  }

  const angles = model.grouped
    ? polarGroupedSectorAngles(model.categories, model.sectors)
    : polarSectorAngles(model.sectors.length);
  const arcGen = arc<{ sector: PolarAreaSector; startAngle: number; endAngle: number }>()
    .innerRadius(0)
    .outerRadius((d) => radial(d.sector.value))
    .startAngle((d) => d.startAngle)
    .endAngle((d) => d.endAngle);

  const stroke = fdColors(themeMode).sliceStroke;
  const sectors = root
    .append('g')
    .attr('class', 'polar-sectors')
    .selectAll('path')
    .data(model.sectors.map((sector, i) => ({ sector, ...angles[i] })))
    .enter()
    .append('path')
    .attr('class', SECTOR_CLASS)
    .attr('d', arcGen)
    .attr('fill', (d) => d.sector.color)
    .attr('opacity', FD.polarSectorOpacity)
    .attr('stroke', stroke)
    .attr('stroke-width', FD.donutSliceStrokeWidth);

  // Client hides the radial tick pills when they would stack on top of each
  // other. It tests the box height; here the disc no longer fills the box, so
  // the ring spacing itself is what has to clear a pill row.
  const fitsTicks = outerRadius >= FD.polarRadialSteps * FD.polarTickPillRowHeight;
  if (showGrid && fitsTicks) {
    drawRadialTicks(
      root.append('g').attr('class', 'polar-ticks').attr('pointer-events', 'none'),
      ticks,
      radial,
      theme,
      themeMode,
    );
  }

  if (!showTooltip || !onHover) return;

  const dimmable = root.selectAll(`.${SECTOR_CLASS}, .${TICK_CLASS}`);
  sectors
    .style('cursor', 'pointer')
    .on('mouseenter', function (event: MouseEvent, datum) {
      dimmable.attr('opacity', FD.polarSectorOpacityDimmed);
      select(this).attr('opacity', 1);
      onHover({ sector: datum.sector, event });
    })
    .on('mousemove', (event: MouseEvent, datum) => {
      onHover({ sector: datum.sector, event });
    })
    .on('mouseleave', () => {
      sectors.attr('opacity', FD.polarSectorOpacity);
      root.selectAll(`.${TICK_CLASS}`).attr('opacity', 1);
      onLeave?.();
    });
}
