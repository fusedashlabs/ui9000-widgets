import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { area, curveMonotoneX, line } from 'd3-shape';

/** Compact line size from the Figma card (node 34:23675), in CSS px. */
export const HEALTH_LINE_WIDTH = 72;
export const HEALTH_LINE_HEIGHT = 24;

/** Room for the end marker's halo inside the box. */
const INSET = 6;

/**
 * Compact health line: soft area, curve and an end marker, no axes.
 * Colour comes from `--ppc-spark` so the card's status level drives it.
 * Fewer than two points draws nothing.
 */
export function drawHealthLine(root: HTMLElement, points: number[], gradientId: string): void {
  root.replaceChildren();
  if (points.length < 2) return;

  const width = HEALTH_LINE_WIDTH;
  const height = HEALTH_LINE_HEIGHT;
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const x = scaleLinear()
    .domain([0, points.length - 1])
    .range([1, width - INSET]);
  const y = scaleLinear()
    .domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi])
    .range([height - INSET / 2, INSET / 2]);

  const svg = select(root)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', width)
    .attr('height', height)
    .attr('aria-hidden', 'true');

  const gradient = svg
    .append('defs')
    .append('linearGradient')
    .attr('id', gradientId)
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', 0)
    .attr('y2', 1);
  gradient.append('stop').attr('offset', '0%').attr('style', 'stop-color:var(--ppc-spark);stop-opacity:0.55');
  gradient.append('stop').attr('offset', '100%').attr('style', 'stop-color:var(--ppc-spark);stop-opacity:0');

  const fill = area<number>()
    .x((_, i) => x(i))
    .y0(height)
    .y1((d) => y(d))
    .curve(curveMonotoneX);
  const stroke = line<number>()
    .x((_, i) => x(i))
    .y((d) => y(d))
    .curve(curveMonotoneX);

  svg.append('path').attr('class', 'spark-area').attr('d', fill(points) ?? '').attr('fill', `url(#${gradientId})`);
  svg.append('path').attr('class', 'spark-line').attr('d', stroke(points) ?? '');

  const last = points.length - 1;
  const cx = x(last);
  const cy = y(points[last]!);
  svg.append('circle').attr('class', 'spark-halo').attr('cx', cx).attr('cy', cy).attr('r', 5.5);
  svg.append('circle').attr('class', 'spark-dot').attr('cx', cx).attr('cy', cy).attr('r', 3);
}
