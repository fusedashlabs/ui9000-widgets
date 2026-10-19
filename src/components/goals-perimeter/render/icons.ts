import type { Selection } from 'd3-selection';

import type { ResourceIcon } from '../lib/index.js';

type GlyphPart =
  | { tag: 'path'; d: string; fill?: boolean }
  | { tag: 'circle'; cx?: number; cy?: number; r: number; fill?: boolean; dash?: string }
  | { tag: 'rect'; x: number; y: number; width: number; height: number; rx: number };

/**
 * Resource-group glyphs, stroked on a 24-unit box centred on 0,0 and scaled
 * to the diamond. Sensor, model, network and pipeline follow the design's
 * diamonds; the rest extend the same line weight.
 */
const GLYPHS: Record<ResourceIcon, GlyphPart[]> = {
  sensor: [
    { tag: 'circle', r: 7, dash: '2.6 2.2' },
    { tag: 'circle', r: 3 },
    { tag: 'circle', r: 0.9, fill: true },
  ],
  model: [{ tag: 'path', d: 'M0,-8V8M-6.9,-4L6.9,4M-6.9,4L6.9,-4' }],
  network: [
    { tag: 'path', d: 'M0,0L-6,-6M0,0L6,-6M0,0L-6,6M0,0L6,6' },
    { tag: 'rect', x: -2.2, y: -2.2, width: 4.4, height: 4.4, rx: 0.8 },
    { tag: 'circle', cx: -6.6, cy: -6.6, r: 1.5 },
    { tag: 'circle', cx: 6.6, cy: -6.6, r: 1.5 },
    { tag: 'circle', cx: -6.6, cy: 6.6, r: 1.5 },
    { tag: 'circle', cx: 6.6, cy: 6.6, r: 1.5 },
  ],
  pipeline: [
    { tag: 'path', d: 'M-6,-8H6M-6,8H6M-4.5,-8L4.5,8M4.5,-8L-4.5,8' },
    { tag: 'path', d: 'M0,2.4L3.2,6.4H-3.2Z', fill: true },
  ],
  storage: [
    { tag: 'rect', x: -7, y: -7.5, width: 14, height: 15, rx: 2 },
    { tag: 'path', d: 'M-4,-3.5H4M-4,0H4M-4,3.5H4' },
  ],
  alert: [
    { tag: 'path', d: 'M0,-8L8,6.5H-8Z' },
    { tag: 'path', d: 'M0,-2.5V1.8' },
    { tag: 'circle', cy: 4, r: 0.9, fill: true },
  ],
  policy: [
    { tag: 'path', d: 'M0,-7L7,0L0,7L-7,0Z' },
    { tag: 'path', d: 'M0,-3L3,0L0,3L-3,0Z', fill: true },
  ],
  tool: [
    { tag: 'circle', cx: -3, cy: -3, r: 4 },
    { tag: 'path', d: 'M0,0L7,7' },
  ],
  generic: [
    { tag: 'circle', r: 6 },
    { tag: 'circle', r: 1.4, fill: true },
  ],
};

type AnyGroup = Selection<SVGGElement, unknown, null, undefined>;

export function appendResourceGlyph(parent: AnyGroup, icon: ResourceIcon, e: number): void {
  const g = parent
    .append('g')
    .attr('class', 'glyph')
    .attr('transform', `scale(${((e / 24) * 1.3).toFixed(3)})`);
  for (const part of GLYPHS[icon]) {
    if (part.tag === 'path') {
      g.append('path').attr('d', part.d).classed('fill', !!part.fill);
    } else if (part.tag === 'circle') {
      const c = g
        .append('circle')
        .attr('cx', part.cx ?? 0)
        .attr('cy', part.cy ?? 0)
        .attr('r', part.r)
        .classed('fill', !!part.fill);
      if (part.dash) c.attr('stroke-dasharray', part.dash);
    } else {
      g.append('rect')
        .attr('x', part.x)
        .attr('y', part.y)
        .attr('width', part.width)
        .attr('height', part.height)
        .attr('rx', part.rx);
    }
  }
}

/** ⊘: a ring and a slash, bottom-left to top-right. */
export function appendBlockedGlyph(parent: AnyGroup, r: number): void {
  const s = (r * 0.7).toFixed(2);
  parent.append('circle').attr('r', r);
  parent.append('path').attr('d', `M-${s},${s}L${s},-${s}`);
}

/** ✕ for a failed agent. */
export function appendFailedGlyph(parent: AnyGroup, half: number): void {
  const h = half.toFixed(2);
  parent.append('path').attr('d', `M-${h},-${h}L${h},${h}M-${h},${h}L${h},-${h}`);
}

/** △ for a degraded agent. */
export function appendDegradedGlyph(parent: AnyGroup, half: number): void {
  parent.append('path').attr('d', `M0,${-half}L${half},${half * 0.8}H${-half}Z`);
}
