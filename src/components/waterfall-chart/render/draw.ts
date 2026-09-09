import { axisBottom, axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import type { AxisLabelTooltipHandlers } from '../../../utils/axis-labels.js';
import {
  applyLeftGutterYAxisLabels,
  decorateAxisLabels,
  resolvePlotLeftMargin,
} from '../../../utils/axis-labels.js';
import {
  calculateNumTicks,
  FD,
  formatCompactNumber,
} from '../../../utils/fusedash-visual.js';
import {
  formatSignedDiff,
  waterfallLinearDomain,
  type WaterfallModel,
  type WaterfallOrientation,
  type WaterfallStep,
} from '../lib/index.js';

export interface RenderWaterfallOptions extends AxisLabelTooltipHandlers {
  model: WaterfallModel;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  theme: WidgetTheme;
  orientation?: WaterfallOrientation;
  showGrid?: boolean;
  xLabel?: string;
  yLabel?: string;
  onStepHover?: (payload: {
    step: WaterfallStep;
    event: MouseEvent;
  }) => void;
  onStepLeave?: () => void;
}

const MAX_Y_TICKS = 7;
const MAX_Y_LABEL_LEN = 9;

function thinBandTicks<T>(domain: T[], maxTicks: number): T[] {
  if (domain.length <= maxTicks) return domain;
  const step = Math.ceil(domain.length / maxTicks);
  const out: T[] = [];
  for (let i = 0; i < domain.length; i += step) out.push(domain[i]);
  const last = domain[domain.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function verticalBarPath(
  d: WaterfallStep,
  x: number,
  y1: number,
  y2: number,
  barWidth: number,
  radius: number,
  arrow: number,
): string {
  const height = y2 - y1;
  const borderRadius = radius <= barWidth / 2 ? radius : barWidth / 2;
  const arrowJoinRadius = 0;

  if (Math.abs(height) <= borderRadius * 2) {
    return `M ${x} ${y1}
            h ${barWidth}
            v ${height}
            h -${barWidth}
            Z`;
  }

  if (d.index === 0 || Math.abs(height) < arrow + 2 * borderRadius) {
    return `M ${x} ${y1 - 1 - borderRadius}
          a ${borderRadius} ${borderRadius} 0 0 0 ${borderRadius} ${borderRadius}
          h ${barWidth - 2 * borderRadius}
          a ${borderRadius} ${borderRadius} 0 0 0 ${borderRadius} -${borderRadius}
          v ${height + 2 + 2 * borderRadius}
          a ${borderRadius} ${borderRadius} 0 0 0 -${borderRadius} -${borderRadius}
          h -${barWidth - 2 * borderRadius}
          a ${borderRadius} ${borderRadius} 0 0 0 -${borderRadius} ${borderRadius}
          Z`;
  }

  if (d.vector === 'positive') {
    return `M ${x} ${y1 - 1 - borderRadius}
          a ${borderRadius} ${borderRadius} 0 0 0 ${borderRadius} ${borderRadius}
          h ${barWidth - 2 * borderRadius}
          a ${borderRadius} ${borderRadius} 0 0 0 ${borderRadius} -${borderRadius}
          v ${height + 2 + 2 * borderRadius + arrow}
          a ${arrowJoinRadius} ${arrowJoinRadius} 0 0 0 -${borderRadius} -${borderRadius}
          l -${barWidth / 2 - borderRadius} -${arrow}
          l -${barWidth / 2 - borderRadius} ${arrow}
          a ${arrowJoinRadius} ${arrowJoinRadius} 0 0 0 -${borderRadius} ${borderRadius}
          Z`;
  }

  return `M ${x} ${y1 - 1 - borderRadius - arrow}
          a ${arrowJoinRadius} ${arrowJoinRadius} 0 0 0 ${borderRadius} ${borderRadius}
          l ${barWidth / 2 - borderRadius} ${arrow}
          l ${barWidth / 2 - borderRadius} -${arrow}
          a ${arrowJoinRadius} ${arrowJoinRadius} 0 0 0 ${borderRadius} -${borderRadius}
          v ${height + 2 + 2 * borderRadius + arrow}
          a ${borderRadius} ${borderRadius} 0 0 0 -${borderRadius} -${borderRadius}
          h -${barWidth - 2 * borderRadius}
          a ${borderRadius} ${borderRadius} 0 0 0 -${borderRadius} ${borderRadius}
          Z`;
}

function horizontalBarPath(
  d: WaterfallStep,
  y: number,
  x1: number,
  x2: number,
  barHeight: number,
  radius: number,
  arrow: number,
): string {
  const width = x2 - x1;
  const borderRadius = radius <= barHeight / 2 ? radius : barHeight / 2;
  const arrowJoinRadius = 0;

  if (Math.abs(width) <= borderRadius * 2) {
    return `M ${x1} ${y}
          h ${width}
          v ${barHeight}
          h -${width}
          Z`;
  }

  if (d.index === 0 || Math.abs(width) < arrow + 2 * borderRadius + 2) {
    return `M ${x1 + 1 + borderRadius} ${y}
            h ${width - 2 * borderRadius - 2}
            a ${borderRadius} ${borderRadius} 0 0 1 ${borderRadius} ${borderRadius}
            v ${barHeight - 2 * borderRadius}
            a ${borderRadius} ${borderRadius} 0 0 1 -${borderRadius} ${borderRadius}
            h -${width - 2 * borderRadius - 2}
            a ${borderRadius} ${borderRadius} 0 0 1 -${borderRadius} -${borderRadius}
            v -${barHeight - 2 * borderRadius}
            a ${borderRadius} ${borderRadius} 0 0 1 ${borderRadius} -${borderRadius}
            Z`;
  }

  if (d.vector === 'positive') {
    return `M ${x1 + 1 + borderRadius} ${y}
            h ${width - 2 * borderRadius - 2 - arrow}
            a ${arrowJoinRadius} ${arrowJoinRadius} 0 0 1 ${borderRadius} ${borderRadius}
            l ${arrow} ${barHeight / 2 - borderRadius}
            l -${arrow} ${barHeight / 2 - borderRadius}
            a ${arrowJoinRadius} ${arrowJoinRadius} 0 0 1 -${borderRadius} ${borderRadius}
            h -${width - 2 * borderRadius - 2 - arrow}
            a ${borderRadius} ${borderRadius} 0 0 1 -${borderRadius} -${borderRadius}
            v -${barHeight - 2 * borderRadius}
            a ${borderRadius} ${borderRadius} 0 0 1 ${borderRadius} -${borderRadius}
            Z`;
  }

  return `M ${x1 + 1 + borderRadius + arrow} ${y}
            h ${width - 2 * borderRadius - 2 - arrow}
            a ${borderRadius} ${borderRadius} 0 0 1 ${borderRadius} ${borderRadius}
            v ${barHeight - 2 * borderRadius}
            a ${borderRadius} ${borderRadius} 0 0 1 -${borderRadius} ${borderRadius}
            h -${width - 2 * borderRadius - 2 - arrow}
            a ${arrowJoinRadius} ${arrowJoinRadius} 0 0 1 -${borderRadius} -${borderRadius}
            l -${arrow} -${barHeight / 2 - borderRadius}
            l ${arrow} -${barHeight / 2 - borderRadius}
            a ${arrowJoinRadius} ${arrowJoinRadius} 0 0 1 ${borderRadius} -${borderRadius}
            Z`;
}

function connectorValue(step: WaterfallStep, steps: WaterfallStep[]): number {
  // Totals drawn from 0 still connect at the cumulative junction.
  if (step.kind === 'total' && step.index > 0) {
    return steps[step.index - 1]?.level ?? step.level;
  }
  return step.start;
}

/**
 * FuseDash Vertical / Horizontal WaterfallChart — visual parity via D3.
 * Inner group translated by (margin.left, margin.top); plot-local scales.
 */
export function renderWaterfallChart(
  container: HTMLElement,
  options: RenderWaterfallOptions,
): void {
  const {
    model,
    width,
    height,
    theme,
    orientation = model.orientation,
    showGrid = true,
    onStepHover,
    onStepLeave,
    onAxisLabelHover,
    onAxisLabelLeave,
  } = options;

  container.replaceChildren();
  const steps = model.steps;
  if (!steps.length || width <= 0 || height <= 0) return;

  const vertical = orientation === 'vertical';
  const barSize = FD.waterfallBarThickness;
  const radius = FD.waterfallBarRadius;
  const arrow = FD.waterfallArrow;
  const dim = FD.waterfallHoverDim;
  const { positive, negative, total } = model.colors;

  const labels = steps.map((s) => s.label);
  const last = steps[steps.length - 1];

  let margin = options.margin
    ? { ...options.margin }
    : {
        ...(vertical ? FD.waterfallVerticalMargin : FD.waterfallHorizontalMargin),
      };

  if (!vertical) {
    const maxLabelLen = labels.reduce((m, l) => Math.max(m, l.length), 0);
    const maxDiffLen = steps.reduce((m, s) => {
      const t =
        (s.vector === 'positive' && s.index !== 0 ? '+' : '') +
        formatCompactNumber(s.difference);
      return Math.max(m, t.length);
    }, 0);
    const valuePad = 8 + maxDiffLen * 6;
    margin = {
      ...margin,
      left: Math.max(
        40,
        Math.min(70, maxLabelLen * 7 + 10) + valuePad,
      ),
    };
  }

  const plotLeft = vertical
    ? margin.left
    : resolvePlotLeftMargin(margin.left);
  const m = {
    top: margin.top,
    right: margin.right,
    bottom: margin.bottom,
    left: plotLeft,
  };

  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  if (plotW <= 0 || plotH <= 0) return;

  const root = select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('text-anchor', 'middle');

  const gradPosId = uid('wf-pos');
  const gradNegId = uid('wf-neg');
  const defs = root.append('defs');

  if (vertical) {
    defs
      .append('linearGradient')
      .attr('id', gradPosId)
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: positive, opacity: 0.3 },
        { offset: '100%', color: positive, opacity: 1 },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color)
      .attr('stop-opacity', (d) => d.opacity);
    defs
      .append('linearGradient')
      .attr('id', gradNegId)
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: negative, opacity: 1 },
        { offset: '100%', color: negative, opacity: 0.3 },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color)
      .attr('stop-opacity', (d) => d.opacity);
  } else {
    defs
      .append('linearGradient')
      .attr('id', gradPosId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: positive, opacity: 0.3 },
        { offset: '100%', color: positive, opacity: 1 },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color)
      .attr('stop-opacity', (d) => d.opacity);
    defs
      .append('linearGradient')
      .attr('id', gradNegId)
      .attr('x1', '100%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '0%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: negative, opacity: 0.3 },
        { offset: '100%', color: negative, opacity: 1 },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color)
      .attr('stop-opacity', (d) => d.opacity);
  }

  const g = root
    .append('g')
    .attr('transform', `translate(${m.left},${m.top})`);

  const [d0, d1] = waterfallLinearDomain(steps, FD.waterfallDomainPadFactor);
  const numTicks = calculateNumTicks(plotH);

  const fillFor = (d: WaterfallStep): string => {
    if (d.index === 0) return total;
    return d.vector === 'negative' ? `url(#${gradNegId})` : `url(#${gradPosId})`;
  };

  const axisHandlers: AxisLabelTooltipHandlers = {
    onAxisLabelHover,
    onAxisLabelLeave,
  };

  if (vertical) {
    const xScale = scaleBand<string>()
      .domain(labels)
      .rangeRound([0, plotW])
      .padding(0);
    const yScale = scaleLinear()
      .domain([d0, d1])
      .rangeRound([plotH, 0])
      .nice();

    if (showGrid) {
      g.append('g')
        .attr('class', 'y-grid')
        .call(
          axisLeft(yScale)
            .ticks(numTicks)
            .tickSize(-plotW)
            .tickFormat(() => ''),
        )
        .call((sel) => sel.select('.domain').remove())
        .selectAll('line')
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('stroke-width', '1px');

      g.append('g')
        .attr('class', 'x-grid')
        .call(
          axisBottom(xScale)
            .tickSize(plotH)
            .tickFormat(() => ''),
        )
        .call((sel) => sel.select('.domain').remove())
        .selectAll('line')
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash)
        .attr('stroke-width', '1px')
        .attr('transform', `translate(${xScale.bandwidth() / 2}, 0)`);
    }

    const yAxis = g
      .append('g')
      .attr('class', 'y-axis')
      .call(
        axisLeft(yScale)
          .ticks(numTicks)
          .tickSize(0)
          .tickPadding(8)
          .tickFormat((v) => formatCompactNumber(v as number)),
      )
      .call((sel) =>
        sel
          .select('.domain')
          .attr('stroke', FD.gridStroke)
          .attr('stroke-dasharray', FD.gridDash),
      );

    yAxis
      .selectAll('text')
      .attr('fill', FD.axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .attr('text-anchor', 'start')
      .attr('dx', `-${m.left - 12}px`);

    yAxis
      .selectAll('.tick')
      .append('line')
      .attr('class', 'tick-line')
      .attr('x1', -8)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', FD.axisStroke)
      .attr('stroke-width', '1px');

    const xAxis = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${plotH})`)
      .call(
        axisBottom(xScale)
          .tickSizeOuter(0)
          .tickSize(0)
          .tickPadding(12),
      )
      .call((sel) => sel.select('.domain').attr('stroke', FD.axisStroke));

    decorateAxisLabels(xAxis, {
      maxLength: 10,
      ...axisHandlers,
    });
    xAxis
      .selectAll('text')
      .attr('fill', FD.axisLabelFill)
      .attr('font-size', FD.axisLabelSize);

    const bar = g
      .append('g')
      .selectAll('g')
      .data(steps)
      .join('g')
      .attr('class', 'bar-container');

    bar
      .append('path')
      .attr('class', 'bar-path')
      .attr('fill', (d) => fillFor(d))
      .attr('d', (d) => {
        const x =
          (xScale(d.label) ?? 0) + (xScale.bandwidth() - barSize) / 2;
        const y1 = d.start < d.end ? yScale(d.start) : yScale(d.end);
        const y2 = d.start > d.end ? yScale(d.start) : yScale(d.end);
        return verticalBarPath(d, x, y1, y2, barSize, radius, arrow);
      })
      .style('cursor', onStepHover ? 'pointer' : 'default')
      .on('mouseenter', function (event: MouseEvent, d: WaterfallStep) {
        if (!onStepHover) return;
        g.selectAll('.bar-path').attr('opacity', dim);
        select(this).attr('opacity', 1);
        onStepHover({ step: d, event });
      })
      .on('mousemove', (event: MouseEvent, d: WaterfallStep) => {
        onStepHover?.({ step: d, event });
      })
      .on('mouseleave', () => {
        g.selectAll('.bar-path').attr('opacity', 1);
        onStepLeave?.();
      });

    bar
      .filter((d) => d.index !== 0)
      .append('line')
      .attr('class', 'bar-connector-line')
      .attr('stroke', theme.text)
      .attr('stroke-width', '1px')
      .attr(
        'x1',
        (d) =>
          (xScale(d.label) ?? 0) - (xScale.bandwidth() + barSize) / 2 - 2,
      )
      .attr(
        'x2',
        (d) =>
          (xScale(d.label) ?? 0) + (xScale.bandwidth() + barSize) / 2 + 2,
      )
      .attr('y1', (d) => yScale(connectorValue(d, steps)))
      .attr('y2', (d) => yScale(connectorValue(d, steps)));

    if (last) {
      bar
        .filter((d) => d.index === 0)
        .append('line')
        .attr('class', 'bar-connector-line')
        .attr('stroke', theme.text)
        .attr('stroke-width', '1px')
        .attr(
          'x1',
          (xScale(last.label) ?? 0) +
            (xScale.bandwidth() - barSize) / 2 -
            2,
        )
        .attr('x2', (xScale(last.label) ?? 0) + xScale.bandwidth())
        .attr('y1', yScale(last.end))
        .attr('y2', yScale(last.end));
    }

    const minLabelY = 10;
    const maxLabelY = plotH - 10;
    const posPad = 10;
    const negPad = 26;

    bar
      .filter((d) => d.index !== 0)
      .append('text')
      .attr('class', 'bar-difference-text')
      .attr('x', (d) => (xScale(d.label) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', (d) => {
        const natural =
          d.vector === 'positive'
            ? yScale(d.end) - posPad
            : yScale(d.end) + negPad;
        return Math.max(minLabelY, Math.min(maxLabelY, natural));
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', FD.axisLabelFill)
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .text((d) => formatSignedDiff(d.difference, d.vector));

    bar
      .filter((d) => d.index === 0)
      .append('text')
      .attr('class', 'bar-difference-text')
      .attr('x', (d) => (xScale(d.label) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', (d) => {
        const firstBarY =
          yScale(d.start) - (yScale(d.start) - yScale(d.end)) - 10;
        return Math.max(minLabelY, Math.min(maxLabelY, firstBarY));
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', FD.axisLabelFill)
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .text((d) => formatCompactNumber(d.difference));

    return;
  }

  // —— Horizontal ——
  const xScale = scaleLinear()
    .domain([d0, d1])
    .rangeRound([0, plotW])
    .nice();
  const yScale = scaleBand<string>()
    .domain(labels)
    .rangeRound([plotH, 0])
    .padding(0);

  const yTicks = thinBandTicks(labels, MAX_Y_TICKS);

  if (showGrid) {
    const yGrid = axisLeft(yScale)
      .tickSize(-plotW)
      .tickFormat(() => '');
    yGrid.tickValues(yTicks);
    g.append('g')
      .attr('class', 'y-grid')
      .call(yGrid)
      .call((sel) => sel.select('.domain').remove())
      .selectAll('line')
      .attr('stroke', FD.gridStroke)
      .attr('stroke-dasharray', FD.gridDash)
      .attr('stroke-width', '1px')
      .attr('transform', `translate(0, -${yScale.bandwidth() / 2})`);

    g.append('g')
      .attr('class', 'x-grid')
      .call(
        axisBottom(xScale)
          .ticks(numTicks)
          .tickSize(plotH)
          .tickFormat(() => ''),
      )
      .call((sel) => sel.select('.domain').remove())
      .selectAll('line')
      .attr('stroke', FD.gridStroke)
      .attr('stroke-dasharray', FD.gridDash)
      .attr('stroke-width', '1px');
  }

  const yAxisGen = axisLeft(yScale)
    .tickSizeOuter(0)
    .tickSize(0)
    .tickPadding(12);
  yAxisGen.tickValues(yTicks);

  const yAxis = g
    .append('g')
    .attr('class', 'y-axis')
    .call(yAxisGen)
    .call((sel) =>
      sel
        .select('.domain')
        .attr('stroke', FD.gridStroke)
        .attr('stroke-dasharray', FD.gridDash),
    );

  applyLeftGutterYAxisLabels(yAxis, m.left, {
    maxLength: MAX_Y_LABEL_LEN,
    ...axisHandlers,
  });

  const xAxis = g
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${plotH})`)
    .call(
      axisBottom(xScale)
        .ticks(numTicks)
        .tickSize(0)
        .tickPadding(8)
        .tickFormat((v) => formatCompactNumber(v as number)),
    )
    .call((sel) => sel.select('.domain').attr('stroke', FD.axisStroke));

  const xTexts = xAxis.selectAll<SVGTextElement, unknown>('text');
  xTexts.attr('fill', FD.axisLabelFill).attr('font-size', FD.axisLabelSize);
  const lastTick = xTexts.nodes().at(-1);
  if (lastTick) select(lastTick).attr('dx', -5);

  const bar = g
    .append('g')
    .selectAll('g')
    .data(steps)
    .join('g')
    .attr('class', 'bar-container');

  bar
    .append('path')
    .attr('class', 'bar-path')
    .attr('fill', (d) => fillFor(d))
    .attr('d', (d) => {
      const y =
        (yScale(d.label) ?? 0) + (yScale.bandwidth() - barSize) / 2;
      const x1 = (d.start < d.end ? xScale(d.start) : xScale(d.end)) || 0;
      const x2 = (d.start > d.end ? xScale(d.start) : xScale(d.end)) || 0;
      return horizontalBarPath(d, y, x1, x2, barSize, radius, arrow);
    })
    .style('cursor', onStepHover ? 'pointer' : 'default')
    .on('mouseenter', function (event: MouseEvent, d: WaterfallStep) {
      if (!onStepHover) return;
      g.selectAll('.bar-path').attr('opacity', dim);
      select(this).attr('opacity', 1);
      onStepHover({ step: d, event });
    })
    .on('mousemove', (event: MouseEvent, d: WaterfallStep) => {
      onStepHover?.({ step: d, event });
    })
    .on('mouseleave', () => {
      g.selectAll('.bar-path').attr('opacity', 1);
      onStepLeave?.();
    });

  bar
    .filter((d) => d.index !== 0)
    .append('line')
    .attr('class', 'bar-connector-line')
    .attr('stroke', theme.text)
    .attr('stroke-width', '1px')
    .attr('x1', (d) => xScale(connectorValue(d, steps)))
    .attr('x2', (d) => xScale(connectorValue(d, steps)))
    .attr(
      'y1',
      (d) =>
        (yScale(d.label) ?? 0) + (yScale.bandwidth() - barSize) / 2 - 2,
    )
    .attr(
      'y2',
      (d) =>
        (yScale(d.label) ?? 0) +
        yScale.bandwidth() +
        (yScale.bandwidth() + barSize) / 2 +
        2,
    );

  if (last) {
    bar
      .filter((d) => d.index === 0)
      .append('line')
      .attr('class', 'bar-connector-line')
      .attr('stroke', theme.text)
      .attr('stroke-width', '1px')
      .attr('x1', xScale(last.end))
      .attr('x2', xScale(last.end))
      .attr('y1', yScale(last.label) ?? 0)
      .attr(
        'y2',
        (yScale(last.label) ?? 0) +
          (yScale.bandwidth() + barSize) / 2 +
          2,
      );
  }

  const posPad = 8;
  const negPad = 8;

  bar
    .filter((d) => d.index !== 0)
    .append('text')
    .attr('class', 'bar-difference-text')
    .attr('x', (d) =>
      d.vector === 'positive'
        ? xScale(connectorValue(d, steps)) - posPad
        : xScale(connectorValue(d, steps)) + negPad,
    )
    .attr('y', (d) => (yScale(d.label) ?? 0) + yScale.bandwidth() / 2)
    .attr('text-anchor', (d) => (d.vector === 'positive' ? 'end' : 'start'))
    .attr('dominant-baseline', 'middle')
    .attr('fill', FD.axisLabelFill)
    .attr('font-size', '10px')
    .attr('pointer-events', 'none')
    .text((d) => formatSignedDiff(d.difference, d.vector));

  bar
    .filter((d) => d.index === 0)
    .append('text')
    .attr('class', 'bar-difference-text')
    .attr(
      'x',
      (d) => xScale(d.start) - (xScale(d.start) - xScale(d.end)) + 20,
    )
    .attr('y', (d) => (yScale(d.label) ?? 0) + yScale.bandwidth() / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', FD.axisLabelFill)
    .attr('font-size', '10px')
    .attr('pointer-events', 'none')
    .text((d) => formatCompactNumber(d.difference));
}
