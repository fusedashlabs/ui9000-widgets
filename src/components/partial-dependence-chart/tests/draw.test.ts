import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { FD } from '../../../utils/fusedash-visual.js';
import { normalizePartialDependenceData } from '../lib/normalize.js';
import { renderPartialDependenceChart } from '../render/draw.js';

import pdpFixture from '../../../stories/fixtures/partial-dependence.fusedash.json';

const model = normalizePartialDependenceData(pdpFixture as never);

function draw(overrides: Partial<Parameters<typeof renderPartialDependenceChart>[1]> = {}) {
  const container = document.createElement('div');
  renderPartialDependenceChart(container, {
    iceSeries: model.iceSeries,
    averageSeries: model.averageSeries,
    width: 640,
    height: 360,
    theme: DEFAULT_THEME,
    color: model.color,
    onHover: () => undefined,
    ...overrides,
  });
  return container;
}

describe('renderPartialDependenceChart', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = draw();
  });

  it('draws one path per ICE curve plus the dashed average', () => {
    expect(container.querySelectorAll('.ice-lines path').length).toBe(16);
    const avg = container.querySelector('.avg-line') as SVGPathElement;
    expect(avg).toBeTruthy();
    expect(avg.getAttribute('stroke-dasharray')).toBe('4,4');
    expect(avg.getAttribute('stroke')).toBe('#473DD9');
    expect(avg.getAttribute('d')?.length).toBeGreaterThan(0);
  });

  it('renders a single SVG root with both axes', () => {
    expect(container.querySelectorAll('svg').length).toBe(1);
    expect(container.querySelectorAll('.x-axis .tick').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.y-axis .tick').length).toBeGreaterThan(0);
  });

  it('labels fractional x ticks at one uniform tick-step precision', () => {
    const labels = [...container.querySelectorAll('.x-axis .tick text')].map(
      (t) => t.textContent ?? '',
    );
    // humidity runs 0 → 0.8, so d3 picks a single decimal for every tick
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every((l) => Number.isFinite(Number(l)))).toBe(true);
    const decimals = new Set(labels.map((l) => l.split('.')[1]?.length ?? 0));
    expect(decimals.size).toBe(1);
    expect(labels[0]).toBe('0.0');
  });

  it('switches large magnitudes to the FuseDash compact form', () => {
    const big = draw({
      iceSeries: [
        { key: 'a', points: [{ x: 0, y: 0 }, { x: 1, y: 4_000_000 }] },
      ],
      averageSeries: [{ x: 0, y: 0 }, { x: 1, y: 4_000_000 }],
    });
    const labels = [...big.querySelectorAll('.y-axis .tick text')].map(
      (t) => t.textContent ?? '',
    );
    expect(labels.some((l) => l.endsWith('M'))).toBe(true);
  });

  it('toggles the grid and the hover surface', () => {
    expect(container.querySelectorAll('.y-grid line').length).toBeGreaterThan(0);
    expect(draw({ showGrid: false }).querySelectorAll('.y-grid line').length).toBe(0);
    expect(container.querySelector('.hover-surface')).toBeTruthy();
    expect(draw({ showTooltip: false }).querySelector('.hover-surface')).toBeNull();
  });

  it('clears the container and skips drawing on an empty model', () => {
    const empty = document.createElement('div');
    empty.appendChild(document.createElement('span'));
    renderPartialDependenceChart(empty, {
      iceSeries: [],
      averageSeries: [],
      width: 640,
      height: 360,
      theme: DEFAULT_THEME,
      color: '#473DD9',
    });
    expect(empty.childElementCount).toBe(0);
  });

  it('inverts hover x in SVG coordinates, not overlay-local', () => {
    const hovered: number[] = [];
    const el = draw({
      onHover: ({ x }) => {
        hovered.push(x);
      },
    });
    const svg = el.querySelector('svg') as SVGSVGElement;
    const surface = el.querySelector('.hover-surface') as SVGRectElement;
    const plotLeft = Number(surface.getAttribute('x'));
    const plotTop = Number(surface.getAttribute('y'));
    const plotWidth = Number(surface.getAttribute('width'));
    const plotHeight = Number(surface.getAttribute('height'));

    // Happy-dom SVG CTM is identity, so force the getBoundingClientRect branch
    // that production browsers use for HTML-hosted SVG.
    Object.defineProperty(svg, 'createSVGPoint', { value: undefined });
    svg.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 640,
        bottom: 360,
        width: 640,
        height: 360,
        toJSON() {
          return this;
        },
      }) as DOMRect;
    surface.getBoundingClientRect = () =>
      ({
        x: plotLeft,
        y: plotTop,
        left: plotLeft,
        top: plotTop,
        right: plotLeft + plotWidth,
        bottom: plotTop + plotHeight,
        width: plotWidth,
        height: plotHeight,
        toJSON() {
          return this;
        },
      }) as DOMRect;

    surface.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: plotLeft,
        clientY: plotTop + 10,
        bubbles: true,
      }),
    );

    expect(hovered.length).toBe(1);
    expect(hovered[0]).toBeCloseTo(0, 5);
    const guide = el.querySelector('.hover-guide line');
    expect(Number(guide?.getAttribute('x1'))).toBeCloseTo(plotLeft, 5);
  });

  it('uses dark hover chrome when themeMode is dark', () => {
    const el = draw({ themeMode: 'dark' });
    const line = el.querySelector('.hover-guide line');
    expect(line?.getAttribute('stroke')).toBe(FD.hoverGuideDark);
  });

  it('skips drawing when the frame is too small for the margins', () => {
    const tiny = document.createElement('div');
    renderPartialDependenceChart(tiny, {
      iceSeries: model.iceSeries,
      averageSeries: model.averageSeries,
      width: 40,
      height: 40,
      theme: DEFAULT_THEME,
      color: model.color,
    });
    expect(tiny.childElementCount).toBe(0);
  });
});
