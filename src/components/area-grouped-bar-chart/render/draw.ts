import { axisBottom, axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import { area as d3Area, line as d3Line } from 'd3-shape';

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import {
  applyLeftGutterYAxisLabels,
  decorateAxisLabels,
  resolvePlotLeftMargin,
} from '../../../utils/axis-labels.js';
import {
  appendLineMarker,
  calculateNumTicks,
  FD,
} from '../../../utils/fusedash-visual.js';
import {
  areaGroupedBarYDomain,
  formatAgbAxisTick,
  type AreaGroupedBarModel,
} from '../lib/index.js';

export interface AreaGroupedBarHoverPayload {
  category: string;
  mode: 'category' | 'bar';
  groupKey?: string;
  event: MouseEvent;
}

export interface RenderAreaGroupedBarChartOptions extends AxisLabelTooltipHandlers {
  model: AreaGroupedBarModel;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  showGrid?: boolean;
  showTooltip?: boolean;
  themeMode?: 'light' | 'dark';
  onHover?: (payload: AreaGroupedBarHoverPayload) => void;
  onLeave?: () => void;
}

interface PlotLinePoint {
  x: string;
  y: number;
  px: number;
  py: number;
}

const GRADIENT_ID = 'ui9000-agb-area-gradient';

/**
 * FuseDash AreaGroupedBarChart — D3 rewrite (vertical only).
 * Bars first, then area fill + stroke + white circle markers.
 * Margins live in scale ranges (Visx-style).
 */
export function renderAreaGroupedBarChart(
  container: HTMLElement,
  options: RenderAreaGroupedBarChartOptions,
): void {
  const {
    model,
    width,
    height,
    margin = { ...FD.areaGroupedBarMargin },
    theme,
    showGrid = true,
    showTooltip = true,
    themeMode = 'light',
    onHover,
    onLeave,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  const axisLabels: AxisLabelTooltipHandlers = {
    onAxisLabelHover,
    onAxisLabelLeave,
  };

  container.replaceChildren();
  const { categories, groups, barsByCategory, linePoints, lineColor } = model;
  if ((!categories.length && !linePoints.length) || width <= 0 || height <= 0) return;

  const m = {
    top: margin.top,
    bottom: margin.bottom,
    left: resolvePlotLeftMargin(margin.left),
    right: Math.max(margin.right, 1),
  };
  const plotTop = m.top;
  const plotBottom = height - m.bottom;
  const plotLeft = m.left;
  const plotRight = width - m.right;
  if (plotRight - plotLeft < 8 || plotBottom - plotTop < 8) return;

  const [minY, maxY] = areaGroupedBarYDomain(model);
  const yTickCount = calculateNumTicks(plotBottom - plotTop);
  const xTickCount = calculateNumTicks(plotRight - plotLeft);

  const xScale = scaleBand<string>()
    .domain(categories)
    .range([plotLeft, plotRight])
    .padding(0);

  const innerScale = scaleBand<string>()
    .domain(groups.map((g) => g.key))
    .range([0, xScale.bandwidth()])
    .padding(0);

  const yScale = scaleLinear()
    .domain([minY, maxY])
    .nice()
    .range([plotBottom, plotTop]);

  const yTicks = yScale.ticks(yTickCount);
  const baselineY = yScale(0);
  const dim = FD.areaGroupedBarDimOpacity;
  const barOpacity = FD.areaGroupedBarBarOpacity;

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', 'Area grouped bar chart')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const defs = svg.append('defs');
  const grad = defs
    .append('linearGradient')
    .attr('id', GRADIENT_ID)
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%');
  grad
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', lineColor)
    .attr('stop-opacity', FD.areaGroupedBarGradientTopOpacity);
  grad
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', lineColor)
    .attr('stop-opacity', FD.areaGroupedBarGradientBottomOpacity);

  const root = svg.append('g').attr('class', 'plot');

  if (showGrid) {
    const grid = root.append('g').attr('class', 'grid');
    for (const cat of categories) {
      const bx = xScale(cat);
      if (bx == null) continue;
      const x = bx + xScale.bandwidth() / 2;
      grid
        .append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', plotTop)
        .attr('y2', plotBottom)
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('shape-rendering', 'crispEdges');
    }
    for (const t of yTicks) {
      grid
        .append('line')
        .attr('x1', plotLeft)
        .attr('x2', plotRight)
        .attr('y1', yScale(t))
        .attr('y2', yScale(t))
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('shape-rendering', 'crispEdges');
    }
    if (Number.isFinite(baselineY)) {
      grid
        .append('line')
        .attr('class', 'zero-baseline')
        .attr('x1', plotLeft)
        .attr('x2', plotRight)
        .attr('y1', baselineY)
        .attr('y2', baselineY)
        .attr('stroke', FD.gridStroke)
        .attr('shape-rendering', 'crispEdges');
    }
  }

  // Category hit target under bars (client transparent Bar before bar rects).
  const hit =
    showTooltip && onHover
      ? root
          .append('rect')
          .attr('class', 'hit-area')
          .attr('x', plotLeft)
          .attr('y', plotTop)
          .attr('width', plotRight - plotLeft)
          .attr('height', plotBottom - plotTop)
          .attr('fill', 'transparent')
          .style('cursor', 'default')
      : null;

  const barsG = root.append('g').attr('class', 'bars');
  for (const cat of categories) {
    const x0 = xScale(cat);
    if (x0 == null) continue;
    const gMap = barsByCategory[cat] ?? {};
    const band = barsG.append('g').attr('class', 'bar-category').attr('transform', `translate(${x0},0)`);

    for (const g of groups) {
      const x1 = innerScale(g.key);
      if (x1 == null) continue;
      const v = Number(gMap[g.key] ?? 0);
      const y = yScale(Math.max(0, v));
      const h = Math.abs(baselineY - yScale(v));
      const topY = v >= 0 ? y : baselineY;

      band
        .append('rect')
        .attr('class', 'bar')
        .attr('data-x', cat)
        .attr('data-g', g.key)
        .attr('x', x1)
        .attr('y', topY)
        .attr('width', innerScale.bandwidth())
        .attr('height', Math.max(0, h))
        .attr('fill', g.color)
        .attr('opacity', barOpacity)
        .style('cursor', showTooltip && onHover ? 'pointer' : 'default');
    }
  }

  const plotLine: PlotLinePoint[] = linePoints
    .map((pt) => {
      const bx = xScale(pt.x);
      if (bx == null) return null;
      return {
        x: pt.x,
        y: pt.y,
        px: bx + xScale.bandwidth() / 2,
        py: yScale(pt.y),
      };
    })
    .filter((p): p is PlotLinePoint => p != null);

  const lineLayer = root.append('g').attr('class', 'line-layer');

  if (plotLine.length) {
    const areaGen = d3Area<PlotLinePoint>()
      .x((d) => d.px)
      .y0(baselineY)
      .y1((d) => d.py);

    const lineGen = d3Line<PlotLinePoint>()
      .x((d) => d.px)
      .y((d) => d.py);

    lineLayer
      .append('path')
      .datum(plotLine)
      .attr('class', 'area')
      .attr('fill', `url(#${GRADIENT_ID})`)
      .attr('pointer-events', 'none')
      .attr('d', areaGen);

    lineLayer
      .append('path')
      .datum(plotLine)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', FD.lineStrokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('pointer-events', 'none')
      .attr('d', lineGen);

    const markersG = lineLayer.append('g').attr('class', 'markers');
    for (const pt of plotLine) {
      markersG
        .append('circle')
        .attr('class', 'marker')
        .attr('data-x', pt.x)
        .attr('cx', pt.px)
        .attr('cy', pt.py)
        .attr('r', FD.areaGroupedBarMarkerRadius)
        .attr('fill', '#fff')
        .attr('stroke', lineColor)
        .attr('stroke-width', 1.5)
        .attr('pointer-events', 'none');
    }
  }

  const guide = root
    .append('line')
    .attr('class', 'hover-guide')
    .attr('y1', plotTop)
    .attr('y2', plotBottom)
    .attr('stroke', themeMode === 'dark' ? FD.hoverGuideDark : FD.hoverGuideLight)
    .attr('stroke-width', 2)
    .attr('opacity', 0)
    .attr('pointer-events', 'none');

  const hoverMarkerG = root
    .append('g')
    .attr('class', 'hover-marker')
    .attr('opacity', 0)
    .attr('pointer-events', 'none');

  const clearHover = (): void => {
    barsG.selectAll('.bar').attr('opacity', barOpacity);
    lineLayer.attr('opacity', 1);
    lineLayer.selectAll('.marker').attr('opacity', 1);
    guide.attr('opacity', 0);
    hoverMarkerG.attr('opacity', 0).selectAll('*').remove();
    onLeave?.();
  };

  const applyCategoryHover = (cat: string, event: MouseEvent): void => {
    barsG.selectAll<SVGRectElement, unknown>('.bar').attr('opacity', function () {
      return select(this).attr('data-x') === cat ? barOpacity : dim;
    });
    lineLayer.attr('opacity', 1);
    lineLayer.selectAll<SVGCircleElement, unknown>('.marker').attr('opacity', function () {
      return select(this).attr('data-x') === cat ? 1 : dim;
    });

    const pt = plotLine.find((p) => p.x === cat);
    if (pt) {
      guide.attr('x1', pt.px).attr('x2', pt.px).attr('opacity', 0.35);
      hoverMarkerG.selectAll('*').remove();
      appendLineMarker(hoverMarkerG, {
        shape: 'circle',
        color: lineColor,
        cx: pt.px,
        cy: pt.py,
        r: FD.markerRadius,
        themeMode,
        hovered: true,
      });
      hoverMarkerG.attr('opacity', 1);
    } else {
      guide.attr('opacity', 0);
      hoverMarkerG.attr('opacity', 0).selectAll('*').remove();
    }

    onHover?.({ category: cat, mode: 'category', event });
  };

  const applyBarHover = (cat: string, gKey: string, event: MouseEvent): void => {
    barsG.selectAll<SVGRectElement, unknown>('.bar').attr('opacity', function () {
      const el = select(this);
      return el.attr('data-x') === cat && el.attr('data-g') === gKey ? barOpacity : dim;
    });
    lineLayer.attr('opacity', dim);
    guide.attr('opacity', 0);
    hoverMarkerG.attr('opacity', 0).selectAll('*').remove();
    onHover?.({ category: cat, mode: 'bar', groupKey: gKey, event });
  };

  if (showTooltip && onHover && hit) {
    const svgNode = svg.node();
    hit.on('mousemove', (event: MouseEvent) => {
      const [mx] = svgNode ? pointer(event, svgNode) : [0];
      let closest: string | null = null;
      let minDist = Number.POSITIVE_INFINITY;
      for (const cat of categories) {
        const bx = xScale(cat);
        if (bx == null) continue;
        const center = bx + xScale.bandwidth() / 2;
        const dist = Math.abs(center - mx);
        if (dist < minDist) {
          minDist = dist;
          closest = cat;
        }
      }
      if (!closest || !plotLine.some((p) => p.x === closest)) {
        clearHover();
        return;
      }
      applyCategoryHover(closest, event);
    });
    hit.on('mouseleave', () => clearHover());

    barsG
      .selectAll<SVGRectElement, unknown>('.bar')
      .on('mousemove', function (event: MouseEvent) {
        event.stopPropagation();
        const el = select(this);
        const cat = el.attr('data-x');
        const gKey = el.attr('data-g');
        if (!cat || !gKey) return;
        applyBarHover(cat, gKey, event);
      })
      .on('mouseleave', () => clearHover());
  }

  const xAxis = root
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${plotBottom})`)
    .call(
      axisBottom(xScale)
        .tickSize(0)
        .tickPadding(8)
        .tickValues(
          (() => {
            if (categories.length <= xTickCount) return categories;
            const out: string[] = [];
            const step = (categories.length - 1) / Math.max(1, xTickCount - 1);
            for (let i = 0; i < xTickCount; i++) {
              out.push(categories[Math.round(i * step)]!);
            }
            return [...new Set(out)];
          })(),
        )
        .tickFormat((d) => String(d)),
    );
  xAxis.select('.domain').attr('stroke', 'none');
  xAxis.selectAll('line').attr('stroke', 'none');
  xAxis
    .selectAll('text')
    .attr('fill', FD.axisLabelFill)
    .attr('font-size', FD.axisLabelSize)
    .attr('text-anchor', 'middle');

  decorateAxisLabels(xAxis, { slotWidth: xScale.bandwidth(), ...axisLabels });

  const yAxis = root
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${plotLeft},0)`)
    .call(
      axisLeft(yScale)
        .tickValues(yTicks)
        .tickSize(4)
        .tickPadding(6)
        .tickFormat((d) => formatAgbAxisTick(Number(d))),
    );
  yAxis.select('.domain').attr('stroke', FD.axisStroke).attr('stroke-dasharray', FD.gridDash);
  yAxis.selectAll('line').attr('stroke', FD.axisStroke).attr('stroke-dasharray', FD.gridDash);
  applyLeftGutterYAxisLabels(yAxis, plotLeft);
}
