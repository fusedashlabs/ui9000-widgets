import { select } from 'd3-selection';
import { arc as arcShape } from 'd3-shape';

import { formatStatusNumber, type StatusGaugeItem } from '../lib/index.js';

const START = -Math.PI / 2;
const SWEEP = Math.PI;

function polar(angle: number, radius: number): [number, number] {
  return [Math.sin(angle) * radius, -Math.cos(angle) * radius];
}

/** Semicircular gauge: gradient fill to the value, gray remainder, needle, center reading. */
export function drawStatusGauge(
  root: HTMLElement,
  gauge: StatusGaugeItem,
  gradientId: string,
): void {
  const width = Math.max(root.clientWidth, 160);
  const height = Math.max(root.clientHeight, 120);
  const cx = width / 2;
  const cy = height * 0.78;
  const outer = Math.max(36, Math.min(width * 0.42, height * 0.7));
  const inner = Math.max(18, outer - Math.max(14, outer * 0.22));
  const valueAngle = START + gauge.ratio * SWEEP;

  const track = arcShape<{ startAngle: number; endAngle: number }>()
    .innerRadius(inner)
    .outerRadius(outer)
    .cornerRadius((outer - inner) / 2)
    .startAngle((d) => d.startAngle)
    .endAngle((d) => d.endAngle);

  const host = select(root);
  host.selectAll('*').remove();

  const svg = host
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', `${gauge.label} ${formatStatusNumber(gauge.value)}${gauge.unit}`);

  const defs = svg.append('defs');
  const gradient = defs
    .append('linearGradient')
    .attr('id', gradientId)
    .attr('x1', cx - outer)
    .attr('x2', cx + outer)
    .attr('y1', cy)
    .attr('y2', cy)
    .attr('gradientUnits', 'userSpaceOnUse');
  gradient.append('stop').attr('offset', '0%').attr('stop-color', 'var(--sg-gauge-0, #36c4a5)');
  gradient.append('stop').attr('offset', '38%').attr('stop-color', 'var(--sg-gauge-1, #473dd9)');
  gradient.append('stop').attr('offset', '68%').attr('stop-color', 'var(--sg-gauge-2, #ff8c47)');
  gradient.append('stop').attr('offset', '100%').attr('stop-color', 'var(--sg-gauge-3, #ff4781)');

  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

  g.append('path')
    .attr('d', track({ startAngle: START, endAngle: START + SWEEP }) ?? '')
    .attr('fill', 'var(--sg-track, #cfd2d6)');

  if (gauge.ratio > 0.001) {
    g.append('path')
      .attr('d', track({ startAngle: START, endAngle: valueAngle }) ?? '')
      .attr('fill', `url(#${gradientId})`);
  }

  const mid = (inner + outer) / 2;
  const stroke = outer - inner;
  // Rounded caps eat the ends of the band. Keep ticks on the straight span.
  const cap = stroke / 2 / mid + 0.06;
  const tickCount = 4;
  for (let i = 0; i < tickCount; i += 1) {
    const t = cap + ((1 - cap * 2) * i) / (tickCount - 1);
    const tickAngle = START + t * SWEEP;
    if (Math.abs(tickAngle - valueAngle) < 0.12) continue;
    const [x, y] = polar(tickAngle, mid);
    g.append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 2.25)
      .attr('fill', 'var(--sg-thumb, #ffffff)')
      .attr('stroke', 'var(--sg-thumb-ink, #21262e)')
      .attr('stroke-width', 1);
  }

  // Thumb on the band. A stem from the center would cut through the value.
  const [mx, my] = polar(valueAngle, mid);
  const thumb = Math.max(5, stroke * 0.28);
  g.append('circle')
    .attr('cx', mx)
    .attr('cy', my)
    .attr('r', thumb)
    .attr('fill', 'var(--sg-thumb, #ffffff)')
    .attr('stroke', 'var(--sg-thumb-ink, #21262e)')
    .attr('stroke-width', 1.5);
  g.append('circle')
    .attr('cx', mx)
    .attr('cy', my)
    .attr('r', thumb * 0.34)
    .attr('fill', 'var(--sg-thumb-ink, #21262e)');

  const reading = formatStatusNumber(gauge.value);
  const fontSize = Math.max(22, Math.min(36, outer * 0.32));
  const text = g
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', -outer * 0.16)
    .attr('fill', 'var(--sg-text, #21262e)')
    .attr('font-size', fontSize);
  if (!gauge.unit || gauge.unit === '%') {
    text.text(gauge.unit === '%' ? `${reading}%` : reading);
  } else {
    text.append('tspan').text(reading);
    text
      .append('tspan')
      .text(` ${gauge.unit}`)
      .attr('font-size', Math.max(14, fontSize * 0.42))
      .attr('font-weight', 500)
      .attr('fill', 'var(--sg-muted, #6c7584)');
  }
}
