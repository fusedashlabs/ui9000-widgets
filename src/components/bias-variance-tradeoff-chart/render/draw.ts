import { scaleLinear } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import { curveMonotoneX, line as d3Line } from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import { FD, seriesColor as fdSeriesColor } from '../../../utils/fusedash-visual.js';
import {
  biasVarianceXDomain,
  biasVarianceXValues,
  biasVarianceYDomain,
  formatTradeoffValue,
  type BiasVarianceDomainLimit,
  type BiasVarianceHoverEntry,
  type BiasVarianceModel,
  type BiasVariancePoint,
  type BiasVarianceSeries,
} from '../lib/index.js';

export interface RenderBiasVarianceChartOptions {
  model: BiasVarianceModel;
  width: number;
  height: number;
  /** FuseDash BiasVarianceTradeoffChart margins when omitted by the host */
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  showGrid?: boolean;
  showTooltip?: boolean;
  onHover?: (payload: {
    x: number;
    entries: BiasVarianceHoverEntry[];
    event: MouseEvent;
  }) => void;
  onLeave?: () => void;
}

type LinearScale = ReturnType<typeof scaleLinear<number, number>>;

function resolveColor(
  series: BiasVarianceSeries,
  index: number,
  theme: WidgetTheme,
): string {
  if (series.color) return series.color;
  if (index === 0 && theme.primary) return theme.primary;
  if (index === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(index);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Pill label of the client `DomainsLimits` foreignObject, drawn as plain SVG. */
function appendLimitLabel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parent: ReturnType<typeof select<any, unknown>>,
  opts: { x: number; y: number; text: string; align: 'center' | 'right' },
): void {
  const { x, y, text, align } = opts;
  const width = text.length * 6 + 8;
  const height = 16;
  const left = align === 'center' ? x - width / 2 : x + 8;

  parent
    .append('rect')
    .attr('x', left)
    .attr('y', y)
    .attr('width', width)
    .attr('height', height)
    .attr('rx', 6)
    .attr('ry', 6)
    .attr('fill', FD.domainLimitLabelFill);
  parent
    .append('text')
    .attr('x', left + width / 2)
    .attr('y', y + 11)
    .attr('text-anchor', 'middle')
    .attr('fill', FD.domainLimitLabelText)
    .attr('font-size', FD.domainLimitLabelSize)
    .text(text);
}

/**
 * Client `DomainsLimits`: a dashed reference line per value, a translucent band
 * when an entry carries two, arrow caps, and a value pill. Positions are clamped
 * to the plot frame so an out-of-range limit cannot paint over the axes.
 */
function renderDomainLimits(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root: ReturnType<typeof select<any, unknown>>,
  limits: BiasVarianceDomainLimit[],
  xScale: LinearScale,
  yScale: LinearScale,
  bounds: { left: number; right: number; top: number; bottom: number },
): void {
  const arrow = FD.domainLimitArrow;
  const layer = root
    .append('g')
    .attr('class', 'domain-limits')
    .attr('pointer-events', 'none');

  for (const limit of limits) {
    const color = limit.color || FD.domainLimitColor;
    const group = layer.append('g').attr('class', `domain-limit domain-limit--${limit.orientation}`);
    const hasBand = limit.values.length === 2;

    if (limit.orientation === 'vertical') {
      const positions = limit.values.map((v) =>
        clamp(xScale(v), bounds.left, bounds.right),
      );
      if (hasBand) {
        group
          .append('rect')
          .attr('x', Math.min(positions[0], positions[1]))
          .attr('y', bounds.top)
          .attr('width', Math.abs(positions[1] - positions[0]))
          .attr('height', bounds.bottom - bounds.top)
          .attr('fill', color)
          .attr('fill-opacity', FD.domainLimitFillOpacity);
      }
      positions.forEach((x, i) => {
        group
          .append('line')
          .attr('x1', x)
          .attr('x2', x)
          .attr('y1', bounds.top)
          .attr('y2', bounds.bottom)
          .attr('stroke', color)
          .attr('stroke-dasharray', FD.domainLimitDash);
        group
          .append('path')
          .attr('d', `M ${x},${bounds.top + arrow} L ${x - 6},${bounds.top} L ${x + 6},${bounds.top} Z`)
          .attr('fill', color);
        group
          .append('path')
          .attr(
            'd',
            `M ${x},${bounds.bottom - arrow} L ${x - 6},${bounds.bottom} L ${x + 6},${bounds.bottom} Z`,
          )
          .attr('fill', color);
        appendLimitLabel(group, {
          x,
          y: bounds.top + arrow,
          text: formatTradeoffValue(limit.values[i]),
          align: 'center',
        });
      });
      continue;
    }

    const positions = limit.values.map((v) => clamp(yScale(v), bounds.top, bounds.bottom));
    if (hasBand) {
      group
        .append('rect')
        .attr('x', bounds.left)
        .attr('y', Math.min(positions[0], positions[1]))
        .attr('width', bounds.right - bounds.left)
        .attr('height', Math.abs(positions[1] - positions[0]))
        .attr('fill', color)
        .attr('fill-opacity', FD.domainLimitFillOpacity);
    }
    positions.forEach((y, i) => {
      group
        .append('line')
        .attr('x1', bounds.left)
        .attr('x2', bounds.right)
        .attr('y1', y)
        .attr('y2', y)
        .attr('stroke', color)
        .attr('stroke-dasharray', FD.domainLimitDash);
      group
        .append('path')
        .attr(
          'd',
          `M ${bounds.right - arrow},${y} L ${bounds.right},${y - 6} L ${bounds.right},${y + 6} Z`,
        )
        .attr('fill', color);
      group
        .append('path')
        .attr(
          'd',
          `M ${bounds.left + arrow},${y} L ${bounds.left},${y - 6} L ${bounds.left},${y + 6} Z`,
        )
        .attr('fill', color);
      appendLimitLabel(group, {
        x: bounds.left,
        y: y - 17,
        text: formatTradeoffValue(limit.values[i]),
        align: 'right',
      });
    });
  }
}

/**
 * FuseDash BiasVarianceTradeoffChart — D3 rewrite.
 *
 * Coordinate system matches the client Visx build: both scales carry the margin
 * in their range, so there is no inner plot translate.
 */
export function renderBiasVarianceChart(
  container: HTMLElement,
  options: RenderBiasVarianceChartOptions,
): void {
  const {
    model,
    width,
    height,
    margin = { ...FD.biasVarianceMargin },
    theme,
    showGrid = true,
    showTooltip = true,
    onHover,
    onLeave,
  } = options;

  container.replaceChildren();
  const { series } = model;
  if (!series.length || width <= 0 || height <= 0) return;

  const plotLeft = margin.left;
  const plotRight = width - margin.right;
  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;
  if (plotRight - plotLeft < 8 || plotBottom - plotTop < 8) return;

  const xScale = scaleLinear<number, number>()
    .domain(biasVarianceXDomain(series))
    .range([plotLeft, plotRight]);

  const yScale = scaleLinear<number, number>()
    .domain(biasVarianceYDomain(series))
    .range([plotBottom, plotTop])
    .nice();

  const xTicks = xScale.ticks(FD.biasVarianceXTicks);
  const yTicks = yScale.ticks(FD.biasVarianceYTicks);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('role', 'img')
    .attr('aria-label', 'Bias-variance tradeoff chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const root = svg.append('g').attr('class', 'plot');

  if (showGrid) {
    const grid = root.append('g').attr('class', 'grid').attr('pointer-events', 'none');
    for (const tick of yTicks) {
      grid
        .append('line')
        .attr('x1', plotLeft)
        .attr('x2', plotRight)
        .attr('y1', yScale(tick))
        .attr('y2', yScale(tick))
        .attr('stroke', FD.biasVarianceGridStroke)
        .attr('stroke-dasharray', FD.biasVarianceGridDash)
        .attr('shape-rendering', 'crispEdges');
    }
  }

  const lineGen = d3Line<BiasVariancePoint>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y))
    .curve(curveMonotoneX);

  const curves = root.append('g').attr('class', 'series-layer');
  series.forEach((s, i) => {
    curves
      .append('path')
      .attr('class', `series series-${i}`)
      .datum(s.points)
      .attr('fill', 'none')
      .attr('stroke', resolveColor(s, i, theme))
      .attr('stroke-width', FD.biasVarianceLineWidth)
      .attr('opacity', FD.biasVarianceLineOpacity)
      .attr('pointer-events', 'none')
      .attr('d', lineGen);
  });

  /**
   * Hover focus: fade every other curve (FuseDash line-hover convention). Both
   * helpers only touch the `opacity` attribute, so the plot is never rebuilt.
   */
  const allSeriesPaths = () => curves.selectAll<SVGPathElement, unknown>('path.series');
  const focusSeries = (focused: number): void => {
    allSeriesPaths().attr('opacity', (_d, i) =>
      i === focused ? 1 : FD.biasVarianceLineOpacityDimmed,
    );
  };
  const restoreSeries = (): void => {
    allSeriesPaths().attr('opacity', FD.biasVarianceLineOpacity);
  };

  const axes = root.append('g').attr('class', 'axes').attr('pointer-events', 'none');

  for (const tick of yTicks) {
    axes
      .append('text')
      .attr('x', plotLeft - 8)
      .attr('y', yScale(tick) + 4)
      .attr('text-anchor', 'end')
      .attr('fill', FD.biasVarianceLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(formatTradeoffValue(tick));
  }

  for (const tick of xTicks) {
    axes
      .append('text')
      .attr('x', xScale(tick))
      .attr('y', plotBottom + 18)
      .attr('text-anchor', 'middle')
      .attr('fill', FD.biasVarianceLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(formatTradeoffValue(tick));
  }

  axes
    .append('line')
    .attr('x1', plotLeft)
    .attr('x2', plotLeft)
    .attr('y1', plotTop)
    .attr('y2', plotBottom)
    .attr('stroke', FD.biasVarianceAxisStroke);
  axes
    .append('line')
    .attr('x1', plotLeft)
    .attr('x2', plotRight)
    .attr('y1', plotBottom)
    .attr('y2', plotBottom)
    .attr('stroke', FD.biasVarianceAxisStroke);

  if (model.domainsLimits.length) {
    renderDomainLimits(root, model.domainsLimits, xScale, yScale, {
      left: plotLeft,
      right: plotRight,
      top: plotTop,
      bottom: plotBottom,
    });
  }

  if (!showTooltip || !onHover) return;

  const hoverLayer = root.append('g').attr('class', 'hover').attr('pointer-events', 'none');
  const guide = hoverLayer
    .append('line')
    .attr('stroke', FD.biasVarianceAxisStroke)
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', FD.domainLimitDash)
    .attr('opacity', 0);
  const dots = hoverLayer.append('g').attr('class', 'hover-dots');

  const xValues = biasVarianceXValues(series);

  const nearestX = (px: number): number => {
    let best = xValues[0];
    let bestDist = Infinity;
    for (const value of xValues) {
      const dist = Math.abs(xScale(value) - px);
      if (dist < bestDist) {
        bestDist = dist;
        best = value;
      }
    }
    return best;
  };

  root
    .append('rect')
    .attr('class', 'hover-target')
    .attr('x', plotLeft)
    .attr('y', plotTop)
    .attr('width', plotRight - plotLeft)
    .attr('height', plotBottom - plotTop)
    .attr('fill', 'transparent')
    .on('mousemove', (event: MouseEvent) => {
      const [px, py] = pointer(event, svg.node());
      const x = nearestX(px);
      if (x == null) return;
      const gx = xScale(x);

      guide
        .attr('x1', gx)
        .attr('x2', gx)
        .attr('y1', plotTop)
        .attr('y2', plotBottom)
        .attr('opacity', 1);

      // The curve closest to the cursor is the focused one; siblings fade.
      let focused = -1;
      let focusedDist = Infinity;
      series.forEach((s, i) => {
        const point = s.points.find((p) => p.x === x);
        if (!point) return;
        const dist = Math.abs(yScale(point.y) - py);
        if (dist < focusedDist) {
          focusedDist = dist;
          focused = i;
        }
      });
      focusSeries(focused);

      dots.selectAll('*').remove();
      const entries: BiasVarianceHoverEntry[] = [];
      series.forEach((s, i) => {
        const point = s.points.find((p) => p.x === x);
        if (!point) return;
        const color = resolveColor(s, i, theme);
        const isFocused = i === focused;
        entries.push({
          seriesId: s.id,
          seriesName: s.name ?? s.id,
          color,
          value: point.y,
          focused: isFocused,
        });
        dots
          .append('circle')
          .attr('class', isFocused ? 'hover-dot hover-dot--focused' : 'hover-dot')
          .attr('cx', gx)
          .attr('cy', yScale(point.y))
          .attr('r', FD.stepHoverDotRadius)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .attr('opacity', isFocused ? 1 : FD.biasVarianceLineOpacityDimmed);
      });

      onHover({ x, entries, event });
    })
    .on('mouseleave', () => {
      guide.attr('opacity', 0);
      dots.selectAll('*').remove();
      restoreSeries();
      onLeave?.();
    });
}
