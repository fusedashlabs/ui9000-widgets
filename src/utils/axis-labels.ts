import type { Selection } from 'd3-selection';
import { select } from 'd3-selection';

import { FD, fdColors } from './fusedash-visual.js';
import { effectiveLabelLimit, truncateString } from './truncate.js';

export type AxisLabelTooltipHandlers = {
  onAxisLabelHover?: (text: string, event: MouseEvent) => void;
  onAxisLabelLeave?: () => void;
};

export interface DecorateAxisLabelsOptions extends AxisLabelTooltipHandlers {
  themeMode?: 'light' | 'dark';
  /** Client default: 25 */
  maxLength?: number;
  /** Band width for categorical ticks — caps length by available space */
  slotWidth?: number;
  fontSize?: number;
}

/** Left plot gutter shared by every chart Y-axis label row. */
export const LEFT_GUTTER_MARGIN = 56;
export const LEFT_GUTTER_PAD = 4;
export const LEFT_GUTTER_LABEL_INSET = 8;

/** @deprecated Use LEFT_GUTTER_MARGIN */
export const CATEGORY_LEFT_GUTTER_MARGIN = LEFT_GUTTER_MARGIN;

export function resolvePlotLeftMargin(marginLeft: number): number {
  return Math.max(marginLeft, LEFT_GUTTER_MARGIN);
}

export function leftGutterLabelSlotWidth(plotLeft: number): number {
  return plotLeft - LEFT_GUTTER_LABEL_INSET;
}

function attachLabelTooltip(
  el: Selection<SVGTextElement, unknown, null, undefined>,
  full: string,
  truncated: boolean,
  handlers?: AxisLabelTooltipHandlers,
): void {
  if (!truncated || !handlers?.onAxisLabelHover) return;
  el.style('cursor', 'default');
  el.on('mouseenter', (event: MouseEvent) => {
    handlers.onAxisLabelHover?.(full, event);
  });
  el.on('mouseleave', () => {
    handlers.onAxisLabelLeave?.();
  });
}

/** Truncate d3-axis tick labels and show full text on hover. */
export function decorateAxisLabels(
  axisGroup: Selection<SVGGElement, unknown, null, undefined>,
  options: DecorateAxisLabelsOptions = {},
): void {
  const fontSize = options.fontSize ?? FD.axisLabelSize;
  const limit = effectiveLabelLimit(options.slotWidth, options.maxLength ?? 25, fontSize);

  axisGroup.selectAll<SVGTextElement, unknown>('text').each(function () {
    const el = select(this);
    const full = el.text();
    const display = truncateString(full, limit);
    const truncated = display !== full;
    el.text(display);
    attachLabelTooltip(el, full, truncated, options);
  });
}

/** Truncate a single manual tick label (e.g. step-line X ticks). */
export function decorateManualAxisLabel(
  textSelection: Selection<SVGTextElement, unknown, null, undefined>,
  fullText: string,
  options: DecorateAxisLabelsOptions = {},
): string {
  const fontSize = options.fontSize ?? FD.axisLabelSize;
  const limit = effectiveLabelLimit(options.slotWidth, options.maxLength ?? 25, fontSize);
  const display = truncateString(fullText, limit);
  const truncated = display !== fullText;
  textSelection.text(display);
  attachLabelTooltip(textSelection, fullText, truncated, options);
  return display;
}

/** Truncate legend / series name labels in SVG. */
export function decorateLegendLabel(
  textSelection: Selection<SVGTextElement, unknown, null, undefined>,
  fullText: string,
  options: DecorateAxisLabelsOptions = {},
): void {
  const limit = options.maxLength ?? 25;
  const display = truncateString(fullText, limit);
  const truncated = display !== fullText;
  textSelection.text(display);
  attachLabelTooltip(textSelection, fullText, truncated, options);
}

/** FuseDash left-gutter axis labels: start-aligned from plot left edge. */
export function layoutLeftGutterAxisLabels(
  axisGroup: Selection<SVGGElement, unknown, null, undefined>,
  plotLeft: number,
  pad = LEFT_GUTTER_PAD,
): void {
  axisGroup
    .selectAll<SVGTextElement, unknown>('text')
    .attr('text-anchor', 'start')
    .attr('x', 0)
    .attr('dx', -plotLeft + pad)
    .style('dominant-baseline', 'middle');
}

/** Punchcard Y-axis labels in the left gutter (inner coords, axis at x=0). */
export function layoutPunchcardYAxisLabels(
  axisGroup: Selection<SVGGElement, unknown, null, undefined>,
  gutterWidth: number,
  pad = 10,
): void {
  axisGroup
    .selectAll<SVGTextElement, unknown>('text')
    .attr('text-anchor', 'start')
    .attr('x', 0)
    .attr('dx', -gutterWidth + pad)
    .style('dominant-baseline', 'middle');
}

/** Unified Y-axis label styling + optional truncation for all charts. */
export function applyLeftGutterYAxisLabels(
  axisGroup: Selection<SVGGElement, unknown, null, undefined>,
  plotLeft: number,
  options?: DecorateAxisLabelsOptions,
): void {
  const mode = options?.themeMode === 'dark' ? 'dark' : 'light';
  axisGroup
    .selectAll('text')
    .attr('fill', fdColors(mode).axisLabelFill)
    .attr('font-size', FD.axisLabelSize);
  if (options) {
    decorateAxisLabels(axisGroup, {
      ...options,
      slotWidth: options.slotWidth ?? leftGutterLabelSlotWidth(plotLeft),
    });
  }
  layoutLeftGutterAxisLabels(axisGroup, plotLeft);
}
