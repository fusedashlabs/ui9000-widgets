import { select, type Selection } from 'd3-selection';
import { arc } from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import {
  decorateManualAxisLabel,
  type AxisLabelTooltipHandlers,
} from '../../../utils/axis-labels.js';
import { FD, formatCompactNumber } from '../../../utils/fusedash-visual.js';
import {
  RADIAL_BAR_SWEEP,
  radialBarAngleScale,
  radialBarArcWidth,
  radialBarLabelLimit,
  radialBarOuterRadius,
  radialBarRadiusScale,
  radialBarTickAnchor,
} from '../lib/domain.js';
import type { RadialBarDatum } from '../lib/types.js';

export interface RenderRadialBarChartOptions extends AxisLabelTooltipHandlers {
  /** Rings from the inside out. */
  bars: RadialBarDatum[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  showGrid?: boolean;
  showTooltip?: boolean;
  onHover?: (payload: { bar: RadialBarDatum; event: MouseEvent }) => void;
  onLeave?: () => void;
}

function drawRings(
  parent: Selection<SVGGElement, unknown, null, undefined>,
  radii: number[],
  endAngle: number,
): void {
  const ring = arc<{ radius: number }>()
    .innerRadius((d) => d.radius)
    .outerRadius((d) => d.radius)
    .startAngle(0)
    .endAngle(endAngle);

  parent
    .selectAll('path')
    .data(radii.map((radius) => ({ radius })))
    .enter()
    .append('path')
    .attr('class', 'radial-grid-arc')
    .attr('d', ring)
    .attr('fill', 'none')
    .attr('stroke', FD.radialBarGridStroke);
}

/**
 * FuseDash RadialBarChart — D3 rewrite of the client widget.
 * Rings sweep 270° clockwise from 12 o'clock; the legend lives in the Lit shell.
 */
export function renderRadialBarChart(
  container: HTMLElement,
  options: RenderRadialBarChartOptions,
): void {
  const {
    bars,
    width,
    height,
    margin,
    showGrid = true,
    showTooltip = true,
    onHover,
    onLeave,
  } = options;

  container.replaceChildren();
  if (!bars.length || width <= 0 || height <= 0) return;

  const angleScale = radialBarAngleScale(bars.map((bar) => bar.value));
  const ticks = angleScale.ticks(FD.radialBarTicks);

  const outerRadius = radialBarOuterRadius(width, height, margin);
  if (outerRadius <= 0) return;

  const innerRadius = outerRadius * FD.radialBarInnerRadiusRatio;
  const radiusScale = radialBarRadiusScale(innerRadius, outerRadius);
  const ringCount = bars.length;
  const ringInterval = (outerRadius - innerRadius) / ringCount;
  const arcWidth = radialBarArcWidth(innerRadius, outerRadius, ringCount);
  const rimRadius = radiusScale(outerRadius);
  const holeRadius = radiusScale(innerRadius);
  const endAngle = angleScale(angleScale.domain()[1]);
  const zeroAngle = angleScale(0);

  /** Mid-radius of ring `index`, matching the client `arcCenter`. */
  const ringRadius = (index: number): number =>
    radiusScale(innerRadius + ringInterval * index) + ringInterval / 2;

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const root = svg
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  if (showGrid) {
    drawRings(
      root.append('g').attr('class', 'radial-grid'),
      Array.from({ length: ringCount + 1 }, (_, i) =>
        radiusScale(innerRadius + ringInterval * i),
      ),
      endAngle,
    );
  }

  const axisGroup = root.append('g').attr('class', 'radial-axis');
  const labelLimit = radialBarLabelLimit(innerRadius, outerRadius);

  ticks.forEach((value) => {
    const angle = angleScale(value) - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    if (showGrid) {
      axisGroup
        .append('line')
        .attr('x1', holeRadius * cos)
        .attr('y1', holeRadius * sin)
        .attr('x2', rimRadius * cos)
        .attr('y2', rimRadius * sin)
        .attr('stroke', FD.radialBarGridStroke)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-dasharray', value === 0 ? null : FD.radialBarTickDash);
    }

    const labelRadius = rimRadius + FD.radialBarTickLabelOffset;
    axisGroup
      .append('text')
      .attr('class', 'radial-tick-label')
      .attr('x', labelRadius * cos)
      .attr('y', labelRadius * sin)
      .attr('text-anchor', radialBarTickAnchor(angle))
      .attr('dominant-baseline', 'central')
      .attr('font-size', FD.radialBarTickLabelSize)
      .attr('fill', FD.radialBarLabelFill)
      .text(formatCompactNumber(value));
  });

  // Ring labels sit in the empty quarter, above and left of the hole.
  const ringLabels = root.append('g').attr('class', 'radial-ring-labels');
  bars.forEach((bar, i) => {
    const text = ringLabels
      .append('text')
      .attr('class', 'radial-ring-label')
      .attr('x', -rimRadius)
      .attr('y', -ringRadius(i))
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'central')
      .attr('font-size', FD.radialBarRingLabelSize)
      .attr('fill', FD.radialBarLabelFill);
    decorateManualAxisLabel(text, bar.label, {
      maxLength: labelLimit,
      onAxisLabelHover: options.onAxisLabelHover,
      onAxisLabelLeave: options.onAxisLabelLeave,
    });
  });

  const barArc = arc<RadialBarDatum & { index: number }>()
    .cornerRadius(FD.radialBarArcCornerRadius)
    .innerRadius((d) => ringRadius(d.index) - arcWidth / 2)
    .outerRadius((d) => ringRadius(d.index) + arcWidth / 2)
    .startAngle((d) =>
      d.value >= 0 ? zeroAngle : Math.min(angleScale(d.value), RADIAL_BAR_SWEEP),
    )
    .endAngle((d) =>
      d.value >= 0 ? Math.min(angleScale(d.value), RADIAL_BAR_SWEEP) : zeroAngle,
    );

  const paths = root
    .append('g')
    .attr('class', 'radial-bars')
    .selectAll('path')
    .data(bars.map((bar, index) => ({ ...bar, index })))
    .enter()
    .append('path')
    .attr('class', 'radial-bar')
    .attr('d', barArc)
    .attr('fill', (d) => d.color)
    .attr('opacity', FD.radialBarArcOpacity);

  if (showTooltip && onHover) {
    paths
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, datum) {
        root.selectAll('.radial-bar').attr('opacity', FD.radialBarArcOpacityDimmed);
        select(this).attr('opacity', 1);
        onHover({ bar: datum, event });
      })
      .on('mousemove', (event: MouseEvent, datum) => {
        onHover({ bar: datum, event });
      })
      .on('mouseleave', () => {
        root.selectAll('.radial-bar').attr('opacity', FD.radialBarArcOpacity);
        onLeave?.();
      });
  }
}
