import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { area, curveMonotoneX, line } from 'd3-shape';

import type { ComponentAssetLevel, ComponentAssetTrendPoint } from '../lib/index.js';

/** Trend size from the Figma card (node 34:23967), in CSS px. */
export const TREND_WIDTH = 74;
export const TREND_HEIGHT = 30;

const LINE_HEIGHT = 18;
const TRACK_HEIGHT = 8;
const TRACK_Y = TREND_HEIGHT - TRACK_HEIGHT;
/** Latest reading: the bright cap right of the divider. */
const CAP_WIDTH = 8;
const PIN_RADIUS = 3.1;
const PIN_MIN_RADIUS = 1.6;

const isBreach = (level: ComponentAssetLevel) => level === 'warning' || level === 'critical';

/** Consecutive points with one level, as [from, to) index ranges. */
function runs(points: ComponentAssetTrendPoint[]): Array<{ level: ComponentAssetLevel; from: number; to: number }> {
  const out: Array<{ level: ComponentAssetLevel; from: number; to: number }> = [];
  points.forEach((point, i) => {
    const last = out[out.length - 1];
    if (last && last.level === point.level) last.to = i + 1;
    else out.push({ level: point.level, from: i, to: i + 1 });
  });
  return out;
}

/**
 * Compact trend, no axes: a line over the readings with dashed guides at
 * out-of-threshold points, and below it a track coloured by level with a pin
 * per breach and a cap for the latest reading. Colours come from the card's
 * `--cac-*` level tokens. Fewer than two points draws nothing.
 */
export function drawTrend(root: HTMLElement, points: ComponentAssetTrendPoint[], idPrefix: string): void {
  root.replaceChildren();
  if (points.length < 2) return;

  const width = TREND_WIDTH;
  const end = width - CAP_WIDTH;
  const lo = Math.min(...points.map((p) => p.value));
  const hi = Math.max(...points.map((p) => p.value));
  const x = scaleLinear()
    .domain([0, points.length - 1])
    .range([TRACK_HEIGHT / 2, end]);
  const y = scaleLinear()
    .domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi])
    .range([LINE_HEIGHT - 1, 1.5]);

  const svg = select(root)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${TREND_HEIGHT}`)
    .attr('width', width)
    .attr('height', TREND_HEIGHT)
    .attr('aria-hidden', 'true');
  const defs = svg.append('defs');

  const strokeId = `${idPrefix}-stroke`;
  const stroke = defs
    .append('linearGradient')
    .attr('id', strokeId)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', 0)
    .attr('y2', 0);
  points.forEach((point, i) => {
    stroke
      .append('stop')
      .attr('offset', `${(x(i) / width) * 100}%`)
      .attr('style', `stop-color:var(--cac-line-${point.level})`);
  });

  const fadeId = `${idPrefix}-fade`;
  const fade = defs.append('linearGradient').attr('id', fadeId).attr('x1', 0).attr('x2', 1);
  fade.append('stop').attr('offset', '0%').attr('style', 'stop-color:var(--cac-track-fade);stop-opacity:0.7');
  fade.append('stop').attr('offset', '50%').attr('style', 'stop-color:var(--cac-track-fade);stop-opacity:0');

  const clipId = `${idPrefix}-clip`;
  defs
    .append('clipPath')
    .attr('id', clipId)
    .append('rect')
    .attr('y', TRACK_Y)
    .attr('width', width)
    .attr('height', TRACK_HEIGHT)
    .attr('rx', TRACK_HEIGHT / 2);

  points.forEach((point, i) => {
    if (!isBreach(point.level)) return;
    svg
      .append('line')
      .attr('class', `guide ${point.level}`)
      .attr('x1', x(i))
      .attr('x2', x(i))
      .attr('y1', 0)
      .attr('y2', LINE_HEIGHT);
  });

  const fill = area<ComponentAssetTrendPoint>()
    .x((_, i) => x(i))
    .y0(LINE_HEIGHT)
    .y1((d) => y(d.value))
    .curve(curveMonotoneX);
  const path = line<ComponentAssetTrendPoint>()
    .x((_, i) => x(i))
    .y((d) => y(d.value))
    .curve(curveMonotoneX);
  svg.append('path').attr('class', 'trend-area').attr('d', fill(points) ?? '').attr('fill', `url(#${strokeId})`);
  svg.append('path').attr('class', 'trend-line').attr('d', path(points) ?? '').attr('stroke', `url(#${strokeId})`);

  // Each point owns the track up to the midpoints with its neighbours.
  const edge = (i: number) => (i <= 0 ? 0 : i >= points.length ? end : (x(i - 1) + x(i)) / 2);
  const track = svg.append('g').attr('class', 'track').attr('clip-path', `url(#${clipId})`);
  for (const run of runs(points)) {
    track
      .append('rect')
      .attr('class', `seg ${run.level}`)
      .attr('x', edge(run.from))
      .attr('y', TRACK_Y)
      .attr('width', edge(run.to) - edge(run.from))
      .attr('height', TRACK_HEIGHT);
  }
  track
    .append('rect')
    .attr('class', `cap ${points[points.length - 1]!.level}`)
    .attr('x', end)
    .attr('y', TRACK_Y)
    .attr('width', CAP_WIDTH)
    .attr('height', TRACK_HEIGHT);
  track
    .append('rect')
    .attr('x', 0)
    .attr('y', TRACK_Y)
    .attr('width', width)
    .attr('height', TRACK_HEIGHT)
    .attr('fill', `url(#${fadeId})`);
  track
    .append('line')
    .attr('class', 'divider')
    .attr('x1', end)
    .attr('x2', end)
    .attr('y1', TRACK_Y)
    .attr('y2', TREND_HEIGHT);

  // Pins shrink with the spacing and drop out once they would only smear.
  const radius = Math.min(PIN_RADIUS, (x(1) - x(0)) / 2 - 0.4);
  if (radius < PIN_MIN_RADIUS) return;
  points.forEach((point, i) => {
    if (!isBreach(point.level)) return;
    svg
      .append('circle')
      .attr('class', 'pin')
      .attr('cx', x(i))
      .attr('cy', TRACK_Y + TRACK_HEIGHT / 2)
      .attr('r', radius);
  });
}
