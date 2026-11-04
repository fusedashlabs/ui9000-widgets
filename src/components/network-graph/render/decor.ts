import type { Selection } from 'd3-selection';

import {
  DECOR_DIAGONAL_FROM,
  DECOR_DIAGONAL_TO,
  DECOR_INNER_SHARE,
  DECOR_TICK_SHARE,
} from '../lib/graph-constants.js';

/**
 * Background of the design behind the graph: an outer and an inner dashed
 * circle, a short cross tick where each meets the axes, and four dashed
 * diagonals fading outwards. Strokes use `currentColor`, so the theme colour
 * is set once on the group.
 */
export function drawGraphDecor(
  group: Selection<SVGGElement, unknown, null, undefined>,
  cx: number,
  cy: number,
  radius: number,
  gradientId: string,
): void {
  group.selectAll('*').remove();
  const tick = radius * DECOR_TICK_SHARE;

  const fade = group
    .append('defs')
    .append('radialGradient')
    .attr('id', gradientId)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', radius * DECOR_DIAGONAL_TO);
  [
    [0, 0],
    [DECOR_DIAGONAL_FROM / DECOR_DIAGONAL_TO, 0],
    [0.55, 1],
    [1, 0],
  ].forEach(([offset, opacity]) =>
    fade
      .append('stop')
      .attr('offset', offset)
      .attr('stop-color', 'currentColor')
      .attr('stop-opacity', opacity),
  );

  [radius, radius * DECOR_INNER_SHARE].forEach((r) => {
    group
      .append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', r)
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '7 9');
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].forEach(([dx, dy]) => {
      const x = cx + dx * r;
      const y = cy + dy * r;
      group
        .append('path')
        .attr(
          'd',
          dx
            ? `M${x - tick} ${y}H${x + tick}M${x} ${y - tick / 2}V${y + tick / 2}`
            : `M${x} ${y - tick}V${y + tick}M${x - tick / 2} ${y}H${x + tick / 2}`,
        )
        .attr('stroke', 'currentColor')
        .attr('stroke-width', 1.5);
    });
  });

  [45, 135, 225, 315].forEach((angle) => {
    const rad = (angle * Math.PI) / 180;
    const from = radius * DECOR_DIAGONAL_FROM;
    const to = radius * DECOR_DIAGONAL_TO;
    group
      .append('line')
      .attr('x1', cx + Math.cos(rad) * from)
      .attr('y1', cy + Math.sin(rad) * from)
      .attr('x2', cx + Math.cos(rad) * to)
      .attr('y2', cy + Math.sin(rad) * to)
      .attr('stroke', `url(#${gradientId})`)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '7 9');
  });
}
