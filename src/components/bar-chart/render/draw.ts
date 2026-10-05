import { axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select, type Selection } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import {
  applyLeftGutterYAxisLabels,
  decorateManualAxisLabel,
  resolvePlotLeftMargin,
} from '../../../utils/axis-labels.js';
import { resolveSeriesLegendColor } from '../../../utils/chart-legend.js';
import { calculateNumTicks, FD, fdColors } from '../../../utils/fusedash-visual.js';
import {
  BAR_GROUP_INNER_GAP,
  barGroupedBandPadding,
  CATEGORY_LABEL_SLOT_GAP,
  barHorizontalMinSpan,
  collectBarCategories,
  collectBarValueDomain,
  cumulativeValues,
  formatCompact,
  groupedBarOffset,
  labelsFitEverySlot,
  resolveBaseline,
  selectTickIndices,
  valueAt,
  type BarHoverEntry,
  type BarLayout,
  type BarOrientation,
  type BarSeries,
} from '../lib/index.js';

export interface RenderBarChartOptions extends AxisLabelTooltipHandlers {
  series: BarSeries[];
  width: number;
  height: number;
  /** FuseDash Barchart margins when omitted by the host */
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  orientation?: BarOrientation;
  /** Only applies with more than one series */
  layout?: BarLayout;
  showGrid?: boolean;
  /** Hovered-category column highlight + tooltip callback */
  showTooltip?: boolean;
  /** FuseDash `cumulativeLine` — running total overlay, single series only */
  cumulativeLine?: boolean;
  themeMode?: 'light' | 'dark';
  xLabel?: string;
  yLabel?: string;
  /**
   * When set on a horizontal chart, the value axis is drawn here and pinned
   * below the scroll area (client `hasChartYOverflow` + bottom axis SVG).
   */
  xAxisContainer?: HTMLElement | null;
  onHover?: (payload: {
    category: string;
    entries: BarHoverEntry[];
    event: MouseEvent;
  }) => void;
  onLeave?: () => void;
}

/** `getComputedTextLength` is unavailable without a layout engine (jsdom, SSR). */
function resolveBarColor(series: BarSeries, index: number, theme: WidgetTheme): string {
  return resolveSeriesLegendColor(series, index, theme);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface BarCorners {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
}

/** Rect path with per-corner radii, clamped so they can never cross over. */
function roundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  corners: BarCorners,
): string {
  const maxR = Math.min(Math.abs(width), Math.abs(height)) / 2;
  const tl = clamp(corners.topLeft, 0, maxR);
  const tr = clamp(corners.topRight, 0, maxR);
  const br = clamp(corners.bottomRight, 0, maxR);
  const bl = clamp(corners.bottomLeft, 0, maxR);
  const right = x + width;
  const bottom = y + height;

  return [
    `M ${x + tl} ${y}`,
    `H ${right - tr}`,
    tr ? `A ${tr} ${tr} 0 0 1 ${right} ${y + tr}` : '',
    `V ${bottom - br}`,
    br ? `A ${br} ${br} 0 0 1 ${right - br} ${bottom}` : '',
    `H ${x + bl}`,
    bl ? `A ${bl} ${bl} 0 0 1 ${x} ${bottom - bl}` : '',
    `V ${y + tl}`,
    tl ? `A ${tl} ${tl} 0 0 1 ${x + tl} ${y}` : '',
    'Z',
  ]
    .filter(Boolean)
    .join(' ');
}

let gradientSeq = 0;

/**
 * FuseDash bar fill: a linear gradient from the full-strength series color to a
 * faded stop. Vertical bars fade downward, horizontal bars fade back toward the
 * baseline, and negative bars mirror the direction so the solid end always sits
 * at the bar's tip.
 */
function barGradient(
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  color: string,
  orientation: BarOrientation,
  negative: boolean,
  diagonal: boolean,
): string {
  const id = `ui9000-bar-grad-${(gradientSeq += 1)}`;
  const gradient = defs.append('linearGradient').attr('id', id);

  if (orientation === 'horizontal') {
    gradient
      .attr('x1', negative ? '100%' : '0%')
      .attr('y1', '0%')
      .attr('x2', negative ? '0%' : '100%')
      .attr('y2', '0%');
    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color)
      .attr('stop-opacity', FD.barFadeOpacity);
    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color)
      .attr('stop-opacity', 1);
    return `url(#${id})`;
  }

  // the plain vertical chart uses a diagonal ramp, grouped/stacked a straight one
  gradient
    .attr('x1', diagonal && negative ? '100%' : '0%')
    .attr('y1', negative ? '100%' : '0%')
    .attr('x2', diagonal && !negative ? '100%' : '0%')
    .attr('y2', negative ? '0%' : '100%');
  gradient
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', color)
    .attr('stop-opacity', 1);
  gradient
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', color)
    .attr('stop-opacity', FD.barFadeOpacity);
  return `url(#${id})`;
}

function renderHorizontalValueTicks(
  parent: Selection<SVGGElement, unknown, null, undefined>,
  tickLabels: string[],
  tickPositions: number[],
  y: number,
  themeMode: 'light' | 'dark',
): void {
  for (const i of selectTickIndices(tickLabels, tickPositions)) {
    const isFirst = i === 0;
    const isLast = i === tickLabels.length - 1;
    parent
      .append('text')
      .attr('x', tickPositions[i])
      .attr('y', y)
      .attr('text-anchor', isFirst ? 'start' : isLast ? 'end' : 'middle')
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(tickLabels[i]);
  }
}

/**
 * FuseDash Barchart — D3 rewrite covering all six Visx variants
 * (vertical / horizontal × plain / grouped / stacked).
 *
 * Coordinate system matches Visx: scales carry the margin in their range, so
 * there is no inner plot translate. Horizontal charts grow past the host when
 * the preferred row pitch does not fit — scroll the plot, pin the value axis.
 */
export function renderBarChart(container: HTMLElement, options: RenderBarChartOptions): void {
  const {
    series,
    width,
    height,
    margin = { ...FD.barMargin },
    theme,
    orientation = 'vertical',
    layout = 'grouped',
    showGrid = true,
    showTooltip = true,
    cumulativeLine = false,
    themeMode = 'light',
    xLabel,
    yLabel,
    xAxisContainer = null,
    onHover,
    onLeave,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  container.replaceChildren();
  xAxisContainer?.replaceChildren();
  if (!series.length || width <= 0 || height <= 0) return;

  const categories = collectBarCategories(series);
  if (!categories.length) return;

  const seriesColor = (s: BarSeries, i: number): string => resolveBarColor(s, i, theme);

  const multi = series.length > 1;
  const stacked = multi && layout === 'stacked';
  const grouped = multi && !stacked;
  const vertical = orientation === 'vertical';
  const withCumulative = cumulativeLine && !multi;

  const m = {
    top: margin.top,
    bottom: margin.bottom,
    left: resolvePlotLeftMargin(
      vertical ? Math.max(margin.left, yLabel ? 44 : 40) : margin.left,
    ),
    right: Math.max(margin.right, 12),
  };
  const fixedBottomAxis = !vertical && !!xAxisContainer;
  const plotTop = m.top + (yLabel && vertical ? 12 : 0);
  const xLabelGap = xLabel && !fixedBottomAxis ? 12 : 0;
  const bottomGutter = vertical || !fixedBottomAxis ? m.bottom + xLabelGap : 0;
  const minSpan = vertical
    ? 0
    : barHorizontalMinSpan(categories.length, series.length, layout);
  const plotHAvail = height - plotTop - bottomGutter;
  const plotH = vertical ? plotHAvail : Math.max(plotHAvail, minSpan);
  const plotBottom = plotTop + plotH;
  const plotLeft = m.left;
  const plotRight = width - m.right;
  const svgH = vertical ? height : plotTop + plotH + (fixedBottomAxis ? 0 : bottomGutter);
  const horizontalOverflow = !vertical && plotHAvail < minSpan;
  if (plotRight - plotLeft < 8 || plotH < 8) return;

  // --- Domains / scales -----------------------------------------------------
  const cumulative = withCumulative ? cumulativeValues(series[0], categories) : [];
  const cumulativeMax = cumulative.length ? Math.max(...cumulative) : undefined;

  const rawDomain = collectBarValueDomain(series, {
    orientation,
    layout,
    cumulativeMax,
  });

  // Horizontal groups get a 32px gutter between category bands (client
  // `groupPadding`); every other variant fills them edge to edge.
  const groupPad =
    grouped && !vertical
      ? clamp(barGroupedBandPadding(series.length), 0, 0.4)
      : 0;

  const bandScale = scaleBand<string>()
    .domain(categories)
    .range(vertical ? [plotLeft, plotRight] : [plotTop, plotBottom])
    .padding(groupPad)
    .align(0.5);

  const valueScale = scaleLinear()
    .domain(rawDomain)
    .nice()
    .range(vertical ? [plotBottom, plotTop] : [plotLeft, plotRight]);

  const domain = valueScale.domain() as [number, number];
  const baselineValue = resolveBaseline(domain);
  const baselinePos = valueScale(baselineValue);
  const valueTicks = valueScale.ticks(
    calculateNumTicks(vertical ? height : width),
  );

  const bandwidth = bandScale.bandwidth();
  const centreOf = (category: string): number => {
    const start = bandScale(category);
    return start == null ? NaN : start + bandwidth / 2;
  };

  if (!vertical) {
    container.style.height = `${svgH}px`;
    container.style.minHeight = `${svgH}px`;
  } else {
    container.style.height = '';
    container.style.minHeight = '';
  }

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', svgH)
    .attr('role', 'img')
    .attr('aria-label', `${orientation} bar chart`)
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const defs = svg.append('defs');
  const root = svg.append('g').attr('class', 'plot');

  // --- Grid (FuseDash dashed #afb3bb + solid baseline) ----------------------
  if (showGrid) {
    const grid = root.append('g').attr('class', 'grid');

    const dashed = (x1: number, y1: number, x2: number, y2: number): void => {
      grid
        .append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', fdColors(themeMode).gridStroke)
        .attr('stroke-dasharray', '1 2')
        .attr('shape-rendering', 'crispEdges');
    };

    if (vertical) {
      for (const c of categories) {
        const cx = centreOf(c);
        if (Number.isFinite(cx)) dashed(cx, plotTop, cx, plotBottom);
      }
      dashed(plotRight, plotTop, plotRight, plotBottom);
      // FuseDash omits the first tick's line — the baseline covers it
      for (const t of valueTicks) {
        if (t === valueTicks[0]) continue;
        dashed(plotLeft, valueScale(t), plotRight, valueScale(t));
      }
    } else {
      for (const t of valueTicks) {
        dashed(valueScale(t), plotTop, valueScale(t), plotBottom);
      }
    }

    grid
      .append('line')
      .attr('class', 'baseline')
      .attr('x1', vertical ? plotLeft : baselinePos)
      .attr('y1', vertical ? baselinePos : plotTop)
      .attr('x2', vertical ? plotRight : baselinePos)
      .attr('y2', vertical ? baselinePos : plotBottom)
      .attr('stroke', fdColors(themeMode).gridStroke)
      .attr('shape-rendering', 'crispEdges');
  }

  // --- Hovered category column ---------------------------------------------
  // Drawn under the bars so the dots read as a backdrop, like FuseDash.
  const highlight = root.append('g').attr('class', 'category-highlight');
  if (showTooltip) {
    const pattern = defs
      .append('pattern')
      .attr('id', 'ui9000-bar-hover-dots')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 4)
      .attr('height', 4)
      .attr('patternUnits', 'userSpaceOnUse');
    const dot = pattern
      .append('circle')
      .attr('cx', 2)
      .attr('cy', 2)
      .attr('r', 1.5)
      .attr('fill', FD.barHoverDotFill)
      .attr('fill-opacity', 0.4);
    dot
      .append('animate')
      .attr('attributeName', 'fill-opacity')
      .attr('values', '0.2;0.6;0.2')
      .attr('dur', '1.5s')
      .attr('repeatCount', 'indefinite');
    dot
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', '1.5;1.9;1.5')
      .attr('dur', '1.5s')
      .attr('repeatCount', 'indefinite');

    const fade = defs
      .append('linearGradient')
      .attr('id', 'ui9000-bar-hover-fade')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', vertical ? '0%' : '100%')
      .attr('y2', vertical ? '100%' : '0%');
    fade.append('stop').attr('offset', '0%').attr('stop-color', '#fff').attr('stop-opacity', 0);
    fade.append('stop').attr('offset', '15%').attr('stop-color', '#fff').attr('stop-opacity', 0.3);
    fade.append('stop').attr('offset', '100%').attr('stop-color', '#fff').attr('stop-opacity', 1);
  }

  const guideColor = themeMode === 'dark' ? FD.hoverGuideDark : FD.hoverGuideLight;

  const showCategoryHighlight = (category: string): void => {
    highlight.selectAll('*').remove();
    // masks are per-category — drop the previous one instead of piling them up
    defs.selectAll('.hover-mask').remove();
    const start = bandScale(category);
    if (start == null) return;

    const maskId = `ui9000-bar-hover-mask-${category.replace(/[^\w-]/g, '_')}`;
    const mask = defs.append('mask').attr('id', maskId).attr('class', 'hover-mask');
    mask
      .append('rect')
      .attr('x', vertical ? start : plotLeft)
      .attr('y', vertical ? plotTop : start)
      .attr('width', vertical ? bandwidth : plotRight - plotLeft)
      .attr('height', vertical ? plotBottom - plotTop : bandwidth)
      .attr('fill', 'url(#ui9000-bar-hover-fade)');

    highlight
      .append('rect')
      .attr('x', vertical ? start : plotLeft)
      .attr('y', vertical ? plotTop : start)
      .attr('width', vertical ? bandwidth : plotRight - plotLeft)
      .attr('height', vertical ? plotBottom - plotTop : bandwidth)
      .attr('fill', 'url(#ui9000-bar-hover-dots)')
      .attr('mask', `url(#${maskId})`);

    const centre = start + bandwidth / 2;
    highlight
      .append('line')
      .attr('class', 'hover-guide')
      .attr('x1', vertical ? centre : plotLeft)
      .attr('y1', vertical ? plotTop : centre)
      .attr('x2', vertical ? centre : plotRight)
      .attr('y2', vertical ? plotBottom : centre)
      .attr('stroke', guideColor)
      .attr('stroke-width', FD.barHoverGuideWidth)
      .attr('shape-rendering', 'crispEdges');
  };

  const clearCategoryHighlight = (): void => {
    highlight.selectAll('*').remove();
    defs.selectAll('.hover-mask').remove();
  };

  // --- Bar thickness --------------------------------------------------------
  // Vertical: FuseDash takes a fraction of the band (0.4 plain, 0.85 stacked),
  // and sizes grouped bars from the space each group gets.
  // Horizontal: rows are 24px tall with 16px gutters, scaled with the band.
  const horizontalRowFraction =
    FD.barRowThickness / (FD.barRowThickness + FD.barRowSpacing * 2);

  let thickness: number;
  if (vertical) {
    if (stacked) {
      thickness = clamp(bandwidth * FD.barStackedBandFraction, FD.barGroupMinWidth, FD.barGroupMaxWidth);
    } else if (grouped) {
      thickness = Math.floor(
        clamp(
          (plotRight - plotLeft) / categories.length / series.length,
          FD.barGroupMinWidth,
          FD.barGroupMaxWidth,
        ),
      );
    } else {
      thickness = Math.min(bandwidth * FD.barBandFraction, FD.barMaxWidth);
    }
  } else if (grouped) {
    const gap = BAR_GROUP_INNER_GAP;
    thickness = horizontalOverflow
      ? FD.barRowThickness
      : Math.max(
          Math.min(bandwidth / series.length - gap, FD.barRowThickness),
          1,
        );
  } else {
    thickness = horizontalOverflow
      ? FD.barRowThickness
      : Math.max(bandwidth * horizontalRowFraction, 1);
  }

  // --- Bars -----------------------------------------------------------------
  const barsG = root.append('g').attr('class', 'bars');
  // Stacked segments must sum to the stack total, so they get no floor at all;
  // standalone bars keep FuseDash's "still visible" minimum.
  const minLength = stacked
    ? 0
    : vertical
      ? multi
        ? 1
        : FD.barMinHeight
      : FD.barMinWidth;
  const radius = FD.barCornerRadius;

  const drawBar = (opts: {
    category: string;
    seriesIndex: number;
    color: string;
    value: number;
    /** Along the band axis */
    offset: number;
    size: number;
    /** Along the value axis */
    from: number;
    to: number;
    corners: BarCorners;
    diagonalGradient: boolean;
  }): void => {
    const { category, seriesIndex, color, value, offset, size, from, to, corners } = opts;
    const negative = value < baselineValue;
    const rawLength = Math.abs(to - from);
    const length = Math.max(rawLength, minLength);

    // grow a floored bar away from the baseline, never through the plot edge
    let start = Math.min(from, to);
    if (rawLength < length) {
      if (vertical) {
        start = negative ? Math.min(from, plotBottom - length) : Math.max(plotTop, from - length);
      } else {
        start = negative ? Math.max(plotLeft, from - length) : Math.min(from, plotRight - length);
      }
    }

    const x = vertical ? offset : start;
    const y = vertical ? start : offset;
    const w = vertical ? size : length;
    const h = vertical ? length : size;

    barsG
      .append('path')
      .attr('class', `bar bar-${seriesIndex}`)
      .attr('data-category', category)
      .attr('data-series', series[seriesIndex].id)
      .attr('d', roundedRectPath(x, y, w, h, corners))
      .attr('fill', barGradient(defs, color, orientation, negative, opts.diagonalGradient));
  };

  categories.forEach((category) => {
    const bandStart = bandScale(category);
    if (bandStart == null) return;
    const centre = bandStart + bandwidth / 2;

    if (stacked) {
      // Segments keep the series order; positive and negative halves stack away
      // from the baseline independently.
      const present = series
        .map((s, i) => ({ series: s, index: i, value: valueAt(s, category) }))
        .filter((e) => e.value != null && e.value !== 0) as {
        series: BarSeries;
        index: number;
        value: number;
      }[];
      if (!present.length) return;

      const positives = present.filter((e) => e.value > 0);
      const negatives = present.filter((e) => e.value < 0);
      const offset = centre - thickness / 2;

      const stackHalf = (entries: typeof present, sign: 1 | -1): void => {
        let cumulativeTotal = 0;
        entries.forEach((entry, i) => {
          const from = valueScale(baselineValue + sign * cumulativeTotal);
          cumulativeTotal += Math.abs(entry.value);
          const to = valueScale(baselineValue + sign * cumulativeTotal);
          const outerEnd = i === entries.length - 1;

          // only the segment at the tip of the stack gets rounded
          const corners: BarCorners = {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0,
          };
          if (outerEnd) {
            if (vertical) {
              if (sign === 1) {
                corners.topLeft = radius;
                corners.topRight = radius;
              } else {
                corners.bottomLeft = radius;
                corners.bottomRight = radius;
              }
            } else if (sign === 1) {
              corners.topRight = radius;
              corners.bottomRight = radius;
            } else {
              corners.topLeft = radius;
              corners.bottomLeft = radius;
            }
          }

          drawBar({
            category,
            seriesIndex: entry.index,
            color: seriesColor(entry.series, entry.index),
            value: entry.value,
            offset,
            size: thickness,
            from,
            to,
            corners,
            diagonalGradient: false,
          });
        });
      };

      stackHalf(positives, 1);
      stackHalf(negatives, -1);
      return;
    }

    series.forEach((s, i) => {
      const value = valueAt(s, category);
      if (value == null || value === baselineValue) return;

      let offset: number;
      if (!multi) {
        offset = centre - thickness / 2;
      } else if (vertical) {
        offset = centre - thickness / 2 + groupedBarOffset(thickness, i, series.length);
      } else {
        const gap = BAR_GROUP_INNER_GAP;
        const groupSize = series.length * thickness + (series.length - 1) * gap;
        offset = centre - groupSize / 2 + i * (thickness + gap);
      }

      const negative = value < baselineValue;
      const corners: BarCorners = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0,
      };
      if (vertical) {
        if (negative) {
          corners.bottomLeft = radius;
          corners.bottomRight = radius;
        } else {
          corners.topLeft = radius;
          corners.topRight = radius;
        }
      } else if (negative) {
        corners.topLeft = radius;
        corners.bottomLeft = radius;
      } else {
        corners.topRight = radius;
        corners.bottomRight = radius;
      }

      drawBar({
        category,
        seriesIndex: i,
        color: seriesColor(s, i),
        value,
        offset,
        size: thickness,
        from: baselinePos,
        to: valueScale(value),
        corners,
        diagonalGradient: !multi && vertical,
      });
    });
  });

  // --- Cumulative overlay (FuseDash `cumulativeLine`) -----------------------
  if (withCumulative && vertical && cumulative.length) {
    const points = categories
      .map((c, i) => ({ x: centreOf(c), y: valueScale(cumulative[i]) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

    if (points.length > 1) {
      const overlay = root.append('g').attr('class', 'cumulative');
      overlay
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', FD.barCumulativeColor)
        .attr('stroke-width', FD.barCumulativeWidth)
        .attr(
          'd',
          points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '),
        );
      for (const p of points) {
        overlay
          .append('circle')
          .attr('cx', p.x)
          .attr('cy', p.y)
          .attr('r', FD.barCumulativeDotRadius)
          .attr('fill', FD.barCumulativeColor)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1);
      }
    }
  }

  // --- Axes -----------------------------------------------------------------
  const tickFormat = (d: unknown): string => formatCompact(Number(d));

  if (vertical) {
    // Category labels are drawn by hand (thinned) — the chat host has no room
    // for the rotating FuseDash `useVisxDynamicAxisLabel` component.
    const categoryAxis = root.append('g').attr('class', 'category-axis');
    const positions = categories.map(centreOf);
    // Every bar keeps its label, cut to its own slot with the full text on
    // hover (FUS-4143). Thinning (labels dropped without notice) is only the
    // fallback when a slot cannot hold three characters.
    // The character estimate behind the cut is a little narrow for the UI
    // font, so cut against 90% of the slot to keep neighbours apart.
    const slotWidth = ((bandScale.step() || 0) - CATEGORY_LABEL_SLOT_GAP) * 0.9;
    const labelEvery = labelsFitEverySlot(slotWidth, FD.axisLabelSize);
    const indices = labelEvery
      ? categories.map((_, i) => i)
      : selectTickIndices(categories, positions);
    for (const i of indices) {
      const isFirst = i === 0;
      const isLast = i === categories.length - 1;
      const label = categoryAxis
        .append('text')
        .attr('x', positions[i])
        .attr('y', plotBottom + 16)
        .attr(
          'text-anchor',
          labelEvery ? 'middle' : isFirst ? 'start' : isLast ? 'end' : 'middle',
        )
        .attr('fill', fdColors(themeMode).axisLabelFill)
        .attr('font-size', FD.axisLabelSize);
      if (labelEvery) {
        decorateManualAxisLabel(label, categories[i], {
          slotWidth,
          fontSize: FD.axisLabelSize,
          themeMode,
          onAxisLabelHover,
          onAxisLabelLeave,
        });
      } else {
        label.text(categories[i]);
      }
    }

    const valueAxis = root
      .append('g')
      .attr('class', 'value-axis')
      .attr('transform', `translate(${plotLeft},0)`)
      .call(
        axisLeft(valueScale)
          .tickValues(valueTicks)
          .tickSize(4)
          .tickPadding(6)
          .tickFormat(tickFormat),
      );
    valueAxis.select('.domain').attr('stroke', fdColors(themeMode).axisStroke).attr('stroke-dasharray', '1 2');
    valueAxis.selectAll('.tick line').attr('stroke', fdColors(themeMode).axisStroke);
    applyLeftGutterYAxisLabels(valueAxis, plotLeft, {
      themeMode,
      onAxisLabelHover,
      onAxisLabelLeave,
    });
  } else {
    // Horizontal: categories in the shared 56px left gutter (line-chart /
    // applyLeftGutterYAxisLabels), values along the bottom.
    const categoryAxis = root
      .append('g')
      .attr('class', 'category-axis')
      .attr('transform', `translate(${plotLeft},0)`)
      .call(axisLeft(bandScale).tickSize(0).tickPadding(8));
    categoryAxis.select('.domain').attr('stroke', 'none');
    applyLeftGutterYAxisLabels(categoryAxis, plotLeft, {
      themeMode,
      onAxisLabelHover,
      onAxisLabelLeave,
    });

    const tickLabels = valueTicks.map(tickFormat);
    const tickPositions = valueTicks.map((t) => valueScale(t));

    if (fixedBottomAxis && xAxisContainer) {
      const axisSvg = select(xAxisContainer)
        .append('svg')
        .attr('width', width)
        .attr('height', m.bottom + (xLabel ? 12 : 0))
        .attr('role', 'presentation')
        .style('display', 'block')
        .style('font-family', theme.fontFamily);
      renderHorizontalValueTicks(
        axisSvg.append('g').attr('class', 'value-axis'),
        tickLabels,
        tickPositions,
        16,
        themeMode,
      );
      if (xLabel) {
        axisSvg
          .append('text')
          .attr('x', (plotLeft + plotRight) / 2)
          .attr('y', m.bottom + 10)
          .attr('text-anchor', 'middle')
          .attr('fill', fdColors(themeMode).axisLabelFill)
          .attr('font-size', FD.axisLabelSize)
          .text(xLabel);
      }
    } else {
      renderHorizontalValueTicks(
        root.append('g').attr('class', 'value-axis'),
        tickLabels,
        tickPositions,
        plotBottom + 16,
        themeMode,
      );
    }
  }

  if (xLabel && !fixedBottomAxis) {
    root
      .append('text')
      .attr('x', (plotLeft + plotRight) / 2)
      .attr('y', svgH - 2)
      .attr('text-anchor', 'middle')
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(xLabel);
  }

  // Unit stays horizontal top-left — never rotated through the tick column
  if (yLabel) {
    root
      .append('text')
      .attr('x', 4)
      .attr('y', 11)
      .attr('text-anchor', 'start')
      .attr('fill', fdColors(themeMode).axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(yLabel);
  }

  // --- Hover ----------------------------------------------------------------
  if (!showTooltip || !onHover) return;

  const nearestCategory = (position: number): string | undefined => {
    const step = bandScale.step() || 1;
    const origin = vertical ? plotLeft : plotTop;
    const idx = Math.floor((position - origin) / step);
    return categories[clamp(idx, 0, categories.length - 1)];
  };

  root
    .append('rect')
    .attr('class', 'hover-target')
    .attr('x', plotLeft)
    .attr('y', plotTop)
    .attr('width', plotRight - plotLeft)
    .attr('height', plotBottom - plotTop)
    .attr('fill', 'transparent')
    .on('mousemove', function (event: MouseEvent) {
      const rect = (this as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
      const local = vertical
        ? event.clientX - (rect?.left ?? 0)
        : event.clientY - (rect?.top ?? 0);
      const category = nearestCategory(local);
      if (category == null) return;

      showCategoryHighlight(category);

      const entries: BarHoverEntry[] = [];
      series.forEach((s, i) => {
        const value = valueAt(s, category);
        if (value == null) return;
        entries.push({
          seriesId: s.id,
          seriesName: s.name ?? s.id,
          color: seriesColor(s, i),
          value,
        });
      });
      if (withCumulative) {
        const index = categories.indexOf(category);
        if (index >= 0) {
          entries.push({
            seriesId: 'cumulative',
            seriesName: 'Cumulative',
            color: FD.barCumulativeColor,
            value: cumulative[index],
          });
        }
      }

      onHover({ category, entries, event });
    })
    .on('mouseleave', () => {
      clearCategoryHighlight();
      onLeave?.();
    });
}
