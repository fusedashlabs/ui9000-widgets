import { select } from 'd3-selection';
import { arc, pie, type PieArcDatum } from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import { FD, fdColors } from '../../../utils/fusedash-visual.js';
import type { PieSlice } from '../lib/types.js';

export interface RenderPieChartOptions {
  slices: PieSlice[];
  width: number;
  height: number;
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  innerRadius?: number;
  showTooltip?: boolean;
  onHover?: (payload: { slice: PieSlice; event: MouseEvent }) => void;
  onLeave?: () => void;
  /** Called once per draw with pie segment key order (for legend). */
  onLayout?: (orderedKeys: string[]) => void;
}

function minArcValue(total: number, outerRadius: number): number {
  if (!outerRadius || !total) return 0;
  const pieCircleLength = 2 * Math.PI * outerRadius;
  const arcLengthRatio = total / pieCircleLength;
  return Number.isFinite(arcLengthRatio)
    ? FD.pieMinArcLengthPx * arcLengthRatio
    : 0;
}

/**
 * FuseDash PieChart — D3 rewrite of the Visx pie.
 * Square plot inscribed in the container; legend lives in the Lit shell.
 */
export function renderPieChart(container: HTMLElement, options: RenderPieChartOptions): void {
  const {
    slices,
    width,
    height,
    themeMode = 'light',
    innerRadius = 0,
    showTooltip = true,
    onHover,
    onLeave,
    onLayout,
  } = options;

  container.replaceChildren();
  if (!slices.length || width <= 0 || height <= 0) {
    onLayout?.([]);
    return;
  }

  const plotSize = Math.min(width, height);
  const outerRadius = plotSize / 2;
  const safeInner = Math.max(0, Math.min(outerRadius, innerRadius));

  const minimum = minArcValue(
    slices.reduce((acc, slice) => acc + slice.value, 0),
    outerRadius,
  );

  const pieGen = pie<PieSlice>().value((d) =>
    d.value < minimum ? minimum : d.value,
  );
  const arcs = pieGen(slices);
  onLayout?.(arcs.map((entry) => entry.data.key));

  const svg = select(container)
    .append('svg')
    .attr('width', plotSize)
    .attr('height', plotSize)
    .attr('viewBox', `0 0 ${plotSize} ${plotSize}`);

  const stroke = fdColors(themeMode).sliceStroke;
  const arcGen = arc<PieArcDatum<PieSlice>>()
    .innerRadius(safeInner)
    .outerRadius(outerRadius);

  const g = svg
    .append('g')
    .attr('transform', `translate(${plotSize / 2}, ${plotSize / 2})`);

  const paths = g
    .selectAll('path')
    .data(arcs)
    .enter()
    .append('path')
    .attr('class', 'pie-path')
    .attr('d', arcGen)
    .attr('opacity', FD.donutArcOpacity)
    .attr('fill', (d) => d.data.color)
    .attr('stroke', stroke)
    .attr('stroke-width', FD.donutSliceStrokeWidth);

  if (showTooltip && onHover) {
    paths
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, datum) {
        g.selectAll('.pie-path').attr('opacity', FD.donutArcOpacityDimmed);
        select(this).attr('opacity', 1);
        onHover({ slice: datum.data, event });
      })
      .on('mousemove', (event: MouseEvent, datum) => {
        onHover({ slice: datum.data, event });
      })
      .on('mouseleave', () => {
        g.selectAll('.pie-path').attr('opacity', FD.donutArcOpacity);
        onLeave?.();
      });
  }
}
