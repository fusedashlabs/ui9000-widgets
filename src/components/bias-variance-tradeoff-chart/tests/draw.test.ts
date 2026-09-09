// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { FD } from '../../../utils/fusedash-visual.js';
import { normalizeBiasVarianceData, type BiasVarianceHoverEntry } from '../lib/index.js';
import { renderBiasVarianceChart } from '../render/draw.js';

import fixture from '../../../stories/fixtures/bias-variance-tradeoff.fusedash.json';
import limitsFixture from '../../../stories/fixtures/bias-variance-tradeoff-limits.fusedash.json';

const model = normalizeBiasVarianceData(fixture as never);
const WIDTH = 640;
const HEIGHT = 320;

let host: HTMLElement;

function render(options = {}): SVGSVGElement {
  renderBiasVarianceChart(host, {
    model,
    width: WIDTH,
    height: HEIGHT,
    theme: DEFAULT_THEME,
    ...options,
  });
  const svg = host.querySelector('svg');
  expect(svg).not.toBeNull();
  return svg as SVGSVGElement;
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.replaceChildren(host);
});

describe('renderBiasVarianceChart', () => {
  it('draws one curve per series inside the client frame', () => {
    const svg = render();
    const curves = svg.querySelectorAll('.series-layer .series');
    expect(curves.length).toBe(3);
    for (const curve of curves) {
      expect(curve.getAttribute('fill')).toBe('none');
      expect(curve.getAttribute('stroke-width')).toBe(String(FD.biasVarianceLineWidth));
      expect(curve.getAttribute('d')).toContain('C');
    }
    expect(svg.querySelector('.series-0')?.getAttribute('stroke')).toBe('#6366f1');
  });

  it('keeps every drawn point inside the plot frame', () => {
    const svg = render();
    const m = FD.biasVarianceMargin;
    const coords = (svg.querySelector('.series-0')?.getAttribute('d') ?? '')
      .replace(/[MCL]/g, ' ')
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    for (let i = 0; i < coords.length; i += 2) {
      expect(coords[i]).toBeGreaterThanOrEqual(m.left - 0.01);
      expect(coords[i]).toBeLessThanOrEqual(WIDTH - m.right + 0.01);
      expect(coords[i + 1]).toBeGreaterThanOrEqual(m.top - 0.01);
      expect(coords[i + 1]).toBeLessThanOrEqual(HEIGHT - m.bottom + 0.01);
    }
  });

  it('renders both axis lines and dashed horizontal grid only', () => {
    const svg = render();
    const grid = svg.querySelectorAll('.grid line');
    expect(grid.length).toBeGreaterThan(0);
    for (const line of grid) {
      expect(line.getAttribute('y1')).toBe(line.getAttribute('y2'));
      expect(line.getAttribute('stroke')).toBe(FD.biasVarianceGridStroke);
      expect(line.getAttribute('stroke-dasharray')).toBe(FD.biasVarianceGridDash);
    }
    expect(svg.querySelectorAll('.axes line').length).toBe(2);
    expect(svg.querySelectorAll('.axes text').length).toBeGreaterThan(0);
  });

  it('drops the grid when show-grid is off', () => {
    const svg = render({ showGrid: false });
    expect(svg.querySelector('.grid')).toBeNull();
  });

  it('paints the domainsLimits bands and reference lines of the client mock', () => {
    const withLimits = normalizeBiasVarianceData(limitsFixture as never);
    expect(withLimits.domainsLimits.length).toBe(3);
    renderBiasVarianceChart(host, {
      model: withLimits,
      width: WIDTH,
      height: HEIGHT,
      theme: DEFAULT_THEME,
    });
    const limits = host.querySelectorAll('.domain-limit');
    expect(limits.length).toBe(3);
    expect(limits[0].querySelectorAll('rect').length).toBe(3); // band + a pill per edge
    expect(limits[0].querySelector('rect')?.getAttribute('fill')).toBe('#FCA5A5');
    expect(limits[1].querySelectorAll('rect').length).toBe(1); // single line → one pill
    expect(limits[1].querySelector('line')?.getAttribute('stroke')).toBe('#EF4444');
    expect(limits[2].querySelectorAll('rect').length).toBe(3);
  });

  it('snaps the crosshair to the nearest x and reports every series', () => {
    const hovers: Array<{ x: number; entries: unknown[] }> = [];
    const svg = render({
      onHover: ({ x, entries }: { x: number; entries: unknown[] }) =>
        hovers.push({ x, entries }),
    });
    const target = svg.querySelector('.hover-target') as SVGRectElement;
    target.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0 }));

    expect(hovers.length).toBe(1);
    expect(hovers[0].entries.length).toBe(3);
    expect(svg.querySelectorAll('.hover-dots circle').length).toBe(3);
    expect(svg.querySelector('.hover line')?.getAttribute('opacity')).toBe('1');

    target.dispatchEvent(new MouseEvent('mouseleave'));
    expect(svg.querySelectorAll('.hover-dots circle').length).toBe(0);
    expect(svg.querySelector('.hover line')?.getAttribute('opacity')).toBe('0');
  });

  it('dims sibling curves around the hovered one and restores them on leave', () => {
    // jsdom has no `createSVGPoint`, so d3 reads the pointer off an all-zero
    // bounding rect: clientX/clientY land straight in plot coordinates.
    const hovers: Array<{ entries: BiasVarianceHoverEntry[] }> = [];
    const svg = render({
      onHover: ({ entries }: { entries: BiasVarianceHoverEntry[] }) => hovers.push({ entries }),
    });
    const target = svg.querySelector('.hover-target') as SVGRectElement;
    const opacity = (index: number) =>
      svg.querySelector(`.series-${index}`)?.getAttribute('opacity');

    // Bottom of the frame at x = 0: `Variance` (0.08) is the nearest curve.
    target.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: 0,
        clientY: HEIGHT - FD.biasVarianceMargin.bottom,
      }),
    );

    const focused = hovers[0].entries.filter((entry) => entry.focused);
    expect(focused.length).toBe(1);
    expect(focused[0].seriesId).toBe('Variance');
    expect(opacity(1)).toBe('1');
    expect(opacity(0)).toBe(String(FD.biasVarianceLineOpacityDimmed));
    expect(opacity(2)).toBe(String(FD.biasVarianceLineOpacityDimmed));
    expect(
      svg.querySelectorAll('.hover-dots circle.hover-dot--focused').length,
    ).toBe(1);

    target.dispatchEvent(new MouseEvent('mouseleave'));
    expect(opacity(0)).toBe(String(FD.biasVarianceLineOpacity));
    expect(opacity(1)).toBe(String(FD.biasVarianceLineOpacity));
    expect(opacity(2)).toBe(String(FD.biasVarianceLineOpacity));
  });

  it('skips the hover layer when tooltips are disabled', () => {
    const svg = render({ showTooltip: false });
    expect(svg.querySelector('.hover-target')).toBeNull();
  });

  it('renders nothing for an empty model or a collapsed frame', () => {
    renderBiasVarianceChart(host, {
      model: { series: [], domainsLimits: [] },
      width: WIDTH,
      height: HEIGHT,
      theme: DEFAULT_THEME,
    });
    expect(host.querySelector('svg')).toBeNull();

    renderBiasVarianceChart(host, { model, width: 40, height: 20, theme: DEFAULT_THEME });
    expect(host.querySelector('svg')).toBeNull();
  });
});
