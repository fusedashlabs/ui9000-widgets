// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { normalizeStepLineData } from '../lib/index.js';
import { renderStepLineChart } from '../render/draw.js';

const categorical = normalizeStepLineData({
  series: [
    {
      id: 'plan',
      name: 'Plan',
      points: [
        { x: 'Q1', y: 20 },
        { x: 'Q2', y: 20 },
        { x: 'Q3', y: 45 },
      ],
    },
    {
      id: 'actual',
      name: 'Actual',
      points: [
        { x: 'Q1', y: 14 },
        { x: 'Q2', y: 31 },
        { x: 'Q3', y: 31 },
      ],
    },
  ],
});

const timeSeries = normalizeStepLineData({
  points: [
    { x: '2024-01-01', y: 5 },
    { x: '2024-03-01', y: 18 },
    { x: '2024-06-01', y: 27 },
  ],
});

let host: HTMLElement;

function render(series = categorical, options = {}): SVGSVGElement {
  renderStepLineChart(host, {
    series,
    width: 640,
    height: 320,
    theme: DEFAULT_THEME,
    ...options,
  });
  const svg = host.querySelector('svg');
  expect(svg).not.toBeNull();
  return svg as SVGSVGElement;
}

/**
 * curveStepAfter draws only horizontal or vertical segments: each point shares
 * its x or its y with the previous one.
 */
function isStepPath(d: string | null): boolean {
  if (!d) return false;
  const points = d
    .split(/[ML]/)
    .filter(Boolean)
    .map((pair) => pair.split(',').map(Number) as [number, number]);
  if (points.length < 2) return false;
  return points.every(
    (p, i) => i === 0 || p[0] === points[i - 1][0] || p[1] === points[i - 1][1],
  );
}

/** Every path/line/circle coordinate must be a real number. */
function assertNoNaNGeometry(svg: SVGSVGElement): void {
  for (const path of Array.from(svg.querySelectorAll('path'))) {
    expect(path.getAttribute('d') ?? '').not.toMatch(/NaN|Infinity/);
  }
  for (const el of Array.from(svg.querySelectorAll('line, circle, rect, text'))) {
    for (const attr of ['x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'width', 'height']) {
      const value = el.getAttribute(attr);
      if (value != null) expect(value).not.toMatch(/NaN|Infinity/);
    }
  }
}

describe('renderStepLineChart', () => {
  beforeEach(() => {
    host = document.createElement('div');
    document.body.replaceChildren(host);
  });

  it('draws one step path per series with FuseDash stroke width', () => {
    const svg = render();
    const paths = svg.querySelectorAll('g.series path');
    expect(paths).toHaveLength(2);
    for (const p of Array.from(paths)) {
      expect(p.getAttribute('stroke-width')).toBe('1.5');
      expect(p.getAttribute('fill')).toBe('none');
      // curveStepAfter emits axis-aligned segments only
      expect(isStepPath(p.getAttribute('d'))).toBe(true);
    }
    assertNoNaNGeometry(svg);
  });

  it('produces finite geometry on a time axis', () => {
    const svg = render(timeSeries);
    expect(svg.querySelectorAll('g.series path')).toHaveLength(1);
    assertNoNaNGeometry(svg);
  });

  it('renders the dashed grid, right edge and solid zero line', () => {
    const svg = render();
    const dashed = svg.querySelectorAll('g.grid line[stroke-dasharray="1,2"]');
    expect(dashed.length).toBeGreaterThan(3);
    const zero = svg.querySelector('g.grid line.zero-line');
    expect(zero).not.toBeNull();
    expect(zero?.getAttribute('stroke-dasharray')).toBeNull();
  });

  it('adds the KS ideal curve and max-deviation marker for grafType=curve', () => {
    const svg = render(timeSeries, { grafType: 'curve' });
    const overlay = svg.querySelector('path.overlay-curve');
    expect(overlay?.getAttribute('stroke')).toBe('#2ecc71');
    expect(overlay?.getAttribute('stroke-width')).toBe('3');
    expect(svg.querySelector('g.max-deviation')).not.toBeNull();
    assertNoNaNGeometry(svg);
  });

  it('adds the dashed ROC diagonal for grafType=line and no KS marker', () => {
    const svg = render(timeSeries, { grafType: 'line' });
    const overlay = svg.querySelector('path.overlay-line');
    expect(overlay?.getAttribute('stroke-dasharray')).toBe('5,5');
    expect(overlay?.getAttribute('stroke-width')).toBe('2');
    expect(svg.querySelector('g.max-deviation')).toBeNull();
  });

  it('draws no overlay by default', () => {
    const svg = render();
    expect(svg.querySelector('path.overlay')).toBeNull();
    expect(svg.querySelector('g.max-deviation')).toBeNull();
  });

  it('only mounts the hover target when a handler is supplied', () => {
    expect(render().querySelector('rect.hover-target')).toBeNull();
    const svg = render(categorical, { onHover: () => undefined });
    expect(svg.querySelector('rect.hover-target')).not.toBeNull();
  });

  it('reports every series value at the hovered x', () => {
    const seen: { x: string; values: number[] }[] = [];
    const svg = render(categorical, {
      onHover: (payload: { x: string; entries: { value: number }[] }) =>
        seen.push({ x: payload.x, values: payload.entries.map((e) => e.value) }),
    });

    const target = svg.querySelector('rect.hover-target') as SVGRectElement;
    const event = new MouseEvent('mousemove', { clientX: 100, clientY: 100 });
    target.dispatchEvent(event);

    expect(seen).toHaveLength(1);
    expect(categorical[0].points.map((p) => p.x)).toContain(seen[0].x);
    expect(seen[0].values).toHaveLength(2);
    expect(svg.querySelectorAll('g.hover-dots circle')).toHaveLength(2);
  });

  it('clears the container and bails on empty input or zero size', () => {
    render();
    renderStepLineChart(host, {
      series: [],
      width: 640,
      height: 320,
      theme: DEFAULT_THEME,
    });
    expect(host.querySelector('svg')).toBeNull();

    renderStepLineChart(host, {
      series: categorical,
      width: 0,
      height: 0,
      theme: DEFAULT_THEME,
    });
    expect(host.querySelector('svg')).toBeNull();
  });
});
