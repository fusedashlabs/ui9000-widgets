import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import { FD, fdColors } from '../../../utils/fusedash-visual.js';
import {
  BAND_LABEL_GAP,
  BAND_MIN_LABEL_PX,
  BAND_PLOT_PAD_Y,
  BAND_RADIUS,
  BAND_ROW_GAP,
  BAND_ROW_HEIGHT,
  bandContentHeight,
  fitRowLabel,
  labelGutter,
  plotWidth,
  type BandModel,
} from '../lib/index.js';

export interface BandHoverPayload {
  row: string;
  series: string;
  value: number;
  text: string;
  event: MouseEvent;
}

export interface RenderBandUtilizationOptions {
  model: BandModel;
  width: number;
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  showTooltip?: boolean;
  onHover?: (payload: BandHoverPayload) => void;
  onLeave?: () => void;
}

let clipSeq = 0;

function inkOn(color: string): string {
  const hex = color.trim().replace('#', '');
  const full =
    hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex.slice(0, 6);
  if (full.length < 6) return '#ffffff';
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return '#ffffff';
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.64 ? '#1a1b1f' : '#ffffff';
}

function rowY(index: number): number {
  return BAND_PLOT_PAD_Y + index * (BAND_ROW_HEIGHT + BAND_ROW_GAP);
}

/** Horizontal bands. Segment width is the share of 100. No numeric axis. */
export function renderBandUtilization(
  root: HTMLElement,
  options: RenderBandUtilizationOptions,
): void {
  const { model, width, theme, showTooltip, onHover, onLeave } = options;
  root.replaceChildren();
  if (model.empty || width < 2) return;

  const height = bandContentHeight(model.rows.length);
  const gutter = labelGutter(model.rows.map((row) => row.label));
  const inner = plotWidth(width, gutter);
  const scale = scaleLinear().domain([0, 1]).range([0, inner]);
  const colors = fdColors(options.themeMode ?? 'light');
  const track = theme.surfaceMuted ?? (options.themeMode === 'dark' ? '#282E37' : '#F3F4F6');
  const plotX = gutter + BAND_LABEL_GAP;
  const clipBase = `band-util-${++clipSeq}`;

  const svg = select(root)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', model.title || 'Band utilization')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const defs = svg.append('defs');
  const labelClip = `${clipBase}-labels`;
  defs
    .append('clipPath')
    .attr('id', labelClip)
    .append('rect')
    .attr('class', 'band-label-clip')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', gutter)
    .attr('height', height);

  model.rows.forEach((row, rowIndex) => {
    const y = rowY(rowIndex);
    const clipId = `${clipBase}-${rowIndex}`;

    defs
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', plotX)
      .attr('y', y)
      .attr('width', inner)
      .attr('height', BAND_ROW_HEIGHT)
      .attr('rx', BAND_RADIUS)
      .attr('ry', BAND_RADIUS);

    svg
      .append('rect')
      .attr('class', 'band-track')
      .attr('data-row', row.label)
      .attr('data-sum', String(row.sum))
      .attr('data-complete', row.complete ? 'true' : 'false')
      .attr('x', plotX)
      .attr('y', y)
      .attr('width', inner)
      .attr('height', BAND_ROW_HEIGHT)
      .attr('rx', BAND_RADIUS)
      .attr('fill', track);

    const rowLabel = svg
      .append('text')
      .attr('class', 'band-row-label')
      .attr('clip-path', `url(#${labelClip})`)
      .attr('x', 0)
      .attr('y', y + BAND_ROW_HEIGHT / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', colors.axisLabelFill)
      .attr('font-size', FD.axisLabelSize)
      .text(fitRowLabel(row.label, gutter));
    rowLabel.append('title').text(row.label);

    const layer = svg.append('g').attr('clip-path', `url(#${clipId})`);

    for (const segment of row.segments) {
      if (segment.span <= 0) continue;
      const start = scale(segment.start) ?? 0;
      const end = scale(segment.start + segment.span) ?? 0;
      const x = plotX + start;
      const w = Math.max(0, end - start);
      const visibleLeft = Math.max(x, plotX);
      const visibleRight = Math.min(x + w, plotX + inner);
      const visibleWidth = visibleRight - visibleLeft;
      const mark = layer
        .append('rect')
        .attr('class', 'band-segment')
        .attr('data-row', row.label)
        .attr('data-series', segment.seriesId)
        .attr('data-value', String(segment.value))
        .attr('x', x)
        .attr('y', y)
        .attr('width', w)
        .attr('height', BAND_ROW_HEIGHT)
        .attr('fill', segment.color)
        .attr('aria-label', `${row.label} ${segment.name} ${segment.text}`);

      if (visibleWidth >= BAND_MIN_LABEL_PX && segment.text) {
        layer
          .append('text')
          .attr('class', 'band-value')
          .attr('data-row', row.label)
          .attr('data-series', segment.seriesId)
          .attr('x', visibleLeft + visibleWidth / 2)
          .attr('y', y + BAND_ROW_HEIGHT / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', inkOn(segment.color))
          .attr('font-size', 12)
          .attr('font-weight', 600)
          .attr('pointer-events', 'none')
          .text(segment.text);
      }

      if (showTooltip) {
        mark
          .style('cursor', 'pointer')
          .on('pointerenter', (event: MouseEvent) => {
            svg.selectAll<SVGRectElement, unknown>('.band-segment').classed('is-dim', true);
            mark.classed('is-dim', false).classed('is-active', true);
            onHover?.({
              row: row.label,
              series: segment.name,
              value: segment.value,
              text: segment.text,
              event,
            });
          })
          .on('pointerleave', () => {
            svg.selectAll('.band-segment').classed('is-dim', false).classed('is-active', false);
            onLeave?.();
          });
      }
    }
  });
}
