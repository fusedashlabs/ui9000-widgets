import { select } from 'd3-selection';
import { arc as arcShape } from 'd3-shape';

import { formatStatusNumber, type StatusGaugeItem } from '../lib/index.js';

/** d3 arc: 0 is 12 o'clock, clockwise. Semicircle runs 9 o'clock → 3 o'clock. */
const START = -Math.PI / 2;
const SWEEP = Math.PI;

/** Green at 0% through yellow and orange to red at 100%, across the full semicircle. */
const BAND: Array<[string, string]> = [
  ['0%', '#2cd37b'],
  ['18%', '#7dde80'],
  ['40%', '#e4ee78'],
  ['58%', '#ffd15a'],
  ['74%', '#ff9a3c'],
  ['88%', '#ff6a38'],
  ['100%', '#ff3b5c'],
];

function polar(angle: number, radius: number): [number, number] {
  return [Math.sin(angle) * radius, -Math.cos(angle) * radius];
}

function at(t: number): number {
  return START + t * SWEEP;
}

function radial(angle: number, r0: number, r1: number): string {
  const [x0, y0] = polar(angle, r0);
  const [x1, y1] = polar(angle, r1);
  return `M${x0},${y0} L${x1},${y1}`;
}

/**
 * Semicircular dial.
 * Slightly rounded band, green→red fill to the value, a hairline every 2%
 * across 70% of the thickness, a short tick every 20%, an outer arc with
 * dots at 25/50/75, and a straight value cut that sticks out of the band.
 */
export function drawStatusGauge(
  root: HTMLElement,
  gauge: StatusGaugeItem,
  gradientId: string,
): void {
  const width = Math.max(root.clientWidth, 160);
  const height = Math.max(root.clientHeight, 120);
  const dotR = 4.5;
  const railGap = 16;
  const marginX = dotR + 3;
  const marginTop = dotR + 4;
  const outer = Math.max(
    36,
    Math.min(width / 2 - marginX - railGap, height - marginTop - 8 - railGap),
  );
  const thickness = Math.max(16, Math.min(30, outer * 0.32));
  const inner = Math.max(12, outer - thickness);
  const cx = width / 2;
  const cy = marginTop + railGap + outer;
  const valueAngle = at(gauge.ratio);

  const corner = Math.max(3, Math.min(6, thickness * 0.2));
  const band = arcShape<{ startAngle: number; endAngle: number }>()
    .innerRadius(inner)
    .outerRadius(outer)
    .cornerRadius(corner)
    .startAngle((d) => d.startAngle)
    .endAngle((d) => d.endAngle);
  const sharp = arcShape<{ startAngle: number; endAngle: number }>()
    .innerRadius(inner)
    .outerRadius(outer)
    .cornerRadius(0)
    .startAngle((d) => d.startAngle)
    .endAngle((d) => d.endAngle);

  const rail = arcShape<{ startAngle: number; endAngle: number }>()
    .innerRadius(outer + railGap)
    .outerRadius(outer + railGap)
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
  const fillGrad = defs
    .append('linearGradient')
    .attr('id', `${gradientId}-fill`)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', -outer)
    .attr('x2', outer)
    .attr('y1', 0)
    .attr('y2', 0);
  for (const [offset, color] of BAND) {
    fillGrad.append('stop').attr('offset', offset).attr('stop-color', color);
  }
  const railGrad = defs
    .append('linearGradient')
    .attr('id', `${gradientId}-rail`)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', -(outer + railGap))
    .attr('x2', outer + railGap)
    .attr('y1', 0)
    .attr('y2', 0);
  for (const [offset, color] of BAND) {
    railGrad.append('stop').attr('offset', offset).attr('stop-color', color);
  }
  const full = { startAngle: START, endAngle: START + SWEEP };
  defs
    .append('clipPath')
    .attr('id', `${gradientId}-band`)
    .append('path')
    .attr('d', band(full) ?? '');

  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

  g.append('path')
    .attr('class', 'gauge-track')
    .attr('d', band(full) ?? '')
    .attr('fill', 'var(--sg-gauge-rest, #ffffff)');

  if (gauge.ratio > 0.004) {
    g.append('path')
      .attr('class', 'gauge-value')
      .attr('clip-path', `url(#${gradientId}-band)`)
      .attr('d', sharp({ startAngle: START, endAngle: valueAngle }) ?? '')
      .attr('fill', `url(#${gradientId}-fill)`);
  }

  const hairPad = thickness * 0.15;
  const hairs = g.append('g').attr('clip-path', `url(#${gradientId}-band)`);
  for (let step = 1; step < 50; step += 1) {
    const t = step / 50;
    if (Math.abs(t - gauge.ratio) < 0.01) continue;
    hairs.append('path')
      .attr('class', 'gauge-hair')
      .attr('d', radial(at(t), inner + hairPad, outer - hairPad))
      .attr('fill', 'none')
      .attr('stroke', 'var(--sg-hair, rgba(255,255,255,0.34))')
      .attr('stroke-width', 1.15)
      .attr('stroke-linecap', 'butt');
  }

  const stick = 2;
  g.append('path')
    .attr('class', 'gauge-cut')
    .attr('d', radial(valueAngle, inner - stick, outer + stick))
    .attr('fill', 'none')
    .attr('stroke', 'var(--sg-cut, #b7bdc6)')
    .attr('stroke-width', Math.max(3, thickness * 0.14))
    .attr('stroke-linecap', 'butt');

  for (const t of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    g.append('path')
      .attr('class', 'gauge-major')
      .attr('d', radial(at(t), outer + 3, outer + 9))
      .attr('fill', 'none')
      .attr('stroke', 'var(--sg-scale, #c5cad3)')
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'butt');
  }

  const railR = outer + railGap;
  g.append('path')
    .attr('class', 'gauge-rail')
    .attr('d', rail(full) ?? '')
    .attr('fill', 'none')
    .attr('stroke', `url(#${gradientId}-rail)`)
    .attr('stroke-width', 2)
    .attr('stroke-linecap', 'round');

  for (const t of [0.25, 0.5, 0.75]) {
    const [x, y] = polar(at(t), railR);
    g.append('circle')
      .attr('class', 'gauge-bead')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', dotR)
      .attr('fill', 'var(--sg-bead-ring, #3a342c)');
    g.append('circle')
      .attr('class', 'gauge-bead')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', dotR * 0.62)
      .attr('fill', '#dfa13e');
  }

  const arrowLen = Math.max(8, thickness * 0.42);
  const arrowHalf = Math.max(4, thickness * 0.18);
  const [apexX, apexY] = polar(valueAngle, inner - stick);
  const [baseX, baseY] = polar(valueAngle, inner - stick - arrowLen);
  const px = Math.cos(valueAngle) * arrowHalf;
  const py = Math.sin(valueAngle) * arrowHalf;
  g.append('path')
    .attr('class', 'gauge-needle')
    .attr('d', `M${apexX},${apexY} L${baseX + px},${baseY + py} L${baseX - px},${baseY - py} Z`)
    .attr('fill', 'var(--sg-cut, #b7bdc6)')
    .attr('stroke', 'var(--sg-cut, #b7bdc6)')
    .attr('stroke-width', 0.6)
    .attr('stroke-linejoin', 'round');

  const reading = formatStatusNumber(gauge.value);
  const fontSize = Math.max(22, Math.min(40, outer * 0.34));
  const text = g
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('y', -inner * 0.36)
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
