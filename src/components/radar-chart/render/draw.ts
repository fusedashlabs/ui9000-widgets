import { select } from 'd3-selection';
import {
  curveLinearClosed,
  lineRadial,
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
  appendGlowFilter,
  FD,
  fdColors,
  formatCompactNumber,
  lightenColor,
  seriesColor as fdSeriesColor,
} from '../../../utils/fusedash-visual.js';
import { formatRadarTick } from '../lib/format.js';
import {
  hasRoomForRadialTicks,
  integerRange,
  radialScale,
} from '../lib/domain.js';
import type { RadarSeries } from '../lib/types.js';

export interface RenderRadarChartOptions {
  series: RadarSeries[];
  categories: string[];
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  showGrid?: boolean;
  showTooltip?: boolean;
  onPointHover?: (payload: {
    seriesId: string;
    seriesName: string;
    category: string;
    value: number;
    event: MouseEvent;
  }) => void;
  onPointLeave?: () => void;
}

type RadarSeriesPoint = [number, number, string];

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

function resolveColor(series: RadarSeries, index: number, theme: WidgetTheme): string {
  if (series.color) return series.color;
  if (index === 0 && theme.primary) return theme.primary;
  if (index === 1 && theme.secondary) return theme.secondary;
  return fdSeriesColor(index);
}

function safeColorId(color: string): string {
  return color.replace(/[#]/g, '');
}

/** FuseDash RadarChart (useNewDesign) — polar D3 rewrite. */
export function renderRadarChart(
  container: HTMLElement,
  options: RenderRadarChartOptions,
): void {
  const {
    series,
    categories,
    width,
    height,
    margin = { ...FD.radarMargin },
    theme,
    themeMode = 'light',
    showGrid = true,
    showTooltip = true,
    onPointHover,
    onPointLeave,
  } = options;

  container.replaceChildren();
  if (!series.length || !categories.length || width <= 0 || height <= 0) return;

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  if (innerW < 8 || innerH < 8) return;

  const outerRadius = Math.min(innerW, innerH) / 2;
  const cx = width / 2;
  const cy = height / 2;
  const angleSlice = (Math.PI * 2) / categories.length;
  const steps = FD.radarScaleSteps;
  const { scale: rScale, minValue, maxValue } = radialScale(series, outerRadius);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', 'Radar chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const root = svg
    .append('g')
    .attr('class', 'plot')
    .attr('transform', `translate(${cx}, ${cy})`);

  const defs = root.append('defs');
  appendGlowFilter(svg as unknown as Parameters<typeof appendGlowFilter>[0], 'radar-glow');

  const uniqueColors = new Set<string>();
  series.forEach((s, i) => uniqueColors.add(resolveColor(s, i, theme)));

  uniqueColors.forEach((color) => {
    const id = safeColorId(color);
    defs
      .append('radialGradient')
      .attr('id', `radar-gradient-${id}`)
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%')
      .selectAll('stop')
      .data([
        { offset: '0%', stopColor: color, stopOpacity: '0' },
        {
          offset: '100%',
          stopColor: color,
          stopOpacity: String(FD.radarGradientEdgeOpacity),
        },
      ])
      .join('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.stopColor)
      .attr('stop-opacity', (d) => d.stopOpacity);

    defs
      .append('pattern')
      .attr('id', `dotted-pattern-hover-${id}`)
      .attr('x', '0')
      .attr('y', '0')
      .attr('width', '4')
      .attr('height', '4')
      .attr('patternUnits', 'userSpaceOnUse')
      .append('circle')
      .attr('cx', '2')
      .attr('cy', '2')
      .attr('r', '1.5')
      .attr('fill', themeMode === 'dark' ? lightenColor(color, 0.5) : color)
      .attr('fill-opacity', '0.4');
  });

  if (showGrid) {
    const gridStart = minValue < 0 ? 0 : 1;
    root
      .append('g')
      .attr('class', 'grid')
      .style('pointer-events', 'none')
      .selectAll('.grid-polygon')
      .data(integerRange(gridStart, steps + 1))
      .enter()
      .append('polygon')
      .attr('class', 'grid-polygon')
      .attr('points', (d) => {
        const segmentStep = (maxValue - minValue) / steps;
        const scalePosition = minValue + d * segmentStep;
        const radius = rScale(scalePosition);
        return categories
          .map((_c, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            return `${x},${y}`;
          })
          .join(' ');
      })
      .attr('fill', 'none')
      .attr('stroke', fdColors(themeMode).gridStroke);
  }

  const axisGrid = root.append('g').attr('class', 'axis-grid');
  const labelFill = themeMode === 'dark' ? '#EFF0F1' : '#000000';
  const maxR = rScale(maxValue);

  categories.forEach((category, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x = maxR * Math.cos(angle);
    const y = maxR * Math.sin(angle);
    const textAnchor =
      Math.abs(angle) === Math.PI / 2
        ? 'middle'
        : angle < Math.PI / 2 && angle > -Math.PI / 2
          ? 'start'
          : 'end';

    axisGrid
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', x)
      .attr('y2', y)
      .attr('class', 'axis')
      .attr('stroke', fdColors(themeMode).axisStroke)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', FD.radarSpokeDash);

    axisGrid
      .append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', FD.radarCapRadius)
      .attr('class', 'axis-cap')
      .attr('fill', fdColors(themeMode).axisStroke);

    axisGrid
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', (maxR + FD.radarLabelOffset) * Math.cos(angle))
      .attr('y', (maxR + FD.radarLabelOffset) * Math.sin(angle))
      .attr('text-anchor', textAnchor)
      .attr('font-size', '12')
      .attr('dominant-baseline', 'central')
      .attr('fill', labelFill)
      .text(category);
  });

  if (hasRoomForRadialTicks(innerH, steps, minValue)) {
    root
      .append('g')
      .attr('class', 'ticks-container')
      .selectAll('.tick-group')
      .data(integerRange(1, steps + 1))
      .enter()
      .append('g')
      .attr('class', 'tick-group')
      .each(function (d) {
        const group = select(this);
        const segmentStep = (maxValue - minValue) / steps;
        const scalePosition = minValue + d * segmentStep;
        const yPosition = -rScale(scalePosition);

        const textNode = group
          .append('text')
          .attr('class', 'tick-rect')
          .attr('x', 0)
          .attr('y', yPosition)
          .attr('font-size', '12px')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', fdColors(themeMode).radarTickText)
          .text(formatRadarTick(scalePosition));

        const textEl = textNode.node();
        const textBBox =
          textEl && typeof textEl.getBBox === 'function' ? textEl.getBBox() : null;
        if (!textBBox) return;
        const padding = { x: 7, y: 3 };
        group
          .insert('rect', 'text')
          .attr('class', 'tick-label')
          .attr('x', textBBox.x - padding.x)
          .attr('y', textBBox.y - padding.y)
          .attr('width', textBBox.width + padding.x * 2)
          .attr('height', textBBox.height + padding.y * 2)
          .attr('rx', 4)
          .attr('ry', 4)
          .attr('fill', fdColors(themeMode).radarTickFill);
      });
  }

  const radarLine = lineRadial<RadarSeriesPoint>()
    .angle((_, j) => angleSlice * j)
    .radius((point) => rScale(point[1]))
    .curve(curveLinearClosed);

  const chartData = series.map((s, seriesIndex) => {
    const pts = categories.map((cat) => {
      const match = s.points.find((p) => p.category === cat);
      return [0, match?.value ?? 0, cat] as RadarSeriesPoint;
    });
    return { key: s.id, index: seriesIndex, series: s, pts };
  });

  root
    .append('g')
    .attr('class', 'radar-path-group')
    .style('pointer-events', 'none')
    .selectAll('path')
    .data(chartData)
    .join('path')
    .attr('d', (d) => radarLine(d.pts))
    .attr('stroke', (d) => resolveColor(d.series, d.index, theme))
    .attr('stroke-width', FD.radarStrokeWidth)
    .attr('filter', 'url(#radar-glow)')
    .attr('fill', (d) => {
      const color = resolveColor(d.series, d.index, theme);
      return `url(#radar-gradient-${safeColorId(color)})`;
    });

  const markerBaseSize = FD.radarMarkerSize;
  const markerHoverSize = FD.radarMarkerHoverSize;

  root
    .append('g')
    .attr('class', 'radar-data-point-group')
    .selectAll('g.radarchart-marker-container-group')
    .data(chartData)
    .join('g')
    .attr('class', 'radarchart-marker-container-group')
    .each(function (d) {
      const markerGroupContainer = select(this);
      const color = resolveColor(d.series, d.index, theme);
      const markerType = d.series.marker;

      d.pts.forEach((point, j) => {
        if (markerType === ('disabled' as ChartMarkerShape)) return;
        const angle = angleSlice * j - Math.PI / 2;
        const markerX = rScale(point[1]) * Math.cos(angle);
        const markerY = rScale(point[1]) * Math.sin(angle);
        const markerContainer = markerGroupContainer
          .append('g')
          .attr('class', 'radarchart-marker-container');

        const patternSize = markerBaseSize + 10;
        const hoverEffectGroup = markerContainer
          .append('g')
          .attr('class', 'hover-effect-group')
          .attr('opacity', 0);

        hoverEffectGroup
          .append('circle')
          .attr('cx', markerX)
          .attr('cy', markerY)
          .attr('r', patternSize / 2)
          .attr('fill', `url(#dotted-pattern-hover-${safeColorId(color)})`)
          .style(
            'mask-image',
            'radial-gradient(circle at center, white 0%, white 40%, transparent 70%)',
          )
          .style('pointer-events', 'none');

        const markerPath = symbol()
          .type(markerSymbol(markerType))
          .size(markerBaseSize)();

        const markerEl = markerContainer
          .append('path')
          .attr('class', 'radarchart-marker')
          .attr('d', markerPath)
          .attr(
            'transform',
            `translate(${markerX} ${markerY}) rotate(${markerRotation(markerType)})`,
          )
          .attr('fill', themeMode === 'dark' ? '#000' : '#fff')
          .attr('stroke', color)
          .attr('stroke-width', 2);

        if (!showTooltip) return;

        markerEl
          .style('cursor', 'pointer')
          .on('mouseenter', (event: MouseEvent) => {
            markerEl
              .attr('d', symbol().type(markerSymbol(markerType)).size(markerHoverSize)())
              .attr('stroke-width', 3);
            hoverEffectGroup.attr('opacity', 1);
            onPointHover?.({
              seriesId: d.series.id,
              seriesName: d.series.name,
              category: String(point[2]),
              value: point[1],
              event,
            });
          })
          .on('mouseleave', () => {
            markerEl
              .attr('d', symbol().type(markerSymbol(markerType)).size(markerBaseSize)())
              .attr('stroke-width', 2);
            hoverEffectGroup.attr('opacity', 0);
            onPointLeave?.();
          });
      });
    });
}

export { formatCompactNumber };
