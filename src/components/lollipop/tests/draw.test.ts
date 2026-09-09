// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { normalizeLollipopData } from '../lib/index.js';
import { renderLollipopChart } from '../render/draw.js';

const multi = normalizeLollipopData({
  series: [
    {
      id: 'a',
      points: [
        { label: 'Q1', value: 5 },
        { label: 'Q2', value: 8 },
      ],
    },
    {
      id: 'b',
      points: [
        { label: 'Q1', value: 3 },
        { label: 'Q2', value: 4 },
      ],
    },
  ],
});

let host: HTMLElement;

function render(
  layout: 'grouped' | 'stacked' = 'grouped',
  options: {
    orientation?: 'vertical' | 'horizontal';
    height?: number;
    xAxisContainer?: HTMLElement | null;
  } = {},
): SVGSVGElement {
  renderLollipopChart(host, {
    series: multi,
    width: 640,
    height: options.height ?? 320,
    theme: DEFAULT_THEME,
    orientation: options.orientation ?? 'vertical',
    layout,
    xAxisContainer: options.xAxisContainer,
  });
  return host.querySelector('svg') as SVGSVGElement;
}

describe('renderLollipopChart layout', () => {
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  it('grouped stems sit at different x offsets in a category', () => {
    const svg = render('grouped');
    const stems = [...svg.querySelectorAll('line.stem')];
    expect(stems.length).toBe(4);
    const xs = new Set(stems.map((el) => el.getAttribute('x1')));
    expect(xs.size).toBeGreaterThan(2);
  });

  it('stacked stems share the category centre', () => {
    const svg = render('stacked');
    const stems = [...svg.querySelectorAll('line.stem')];
    expect(stems.length).toBe(4);
    const xs = new Set(stems.map((el) => el.getAttribute('x1')));
    expect(xs.size).toBe(2);
  });

  it('extends a horizontal chart past the host when rows do not fit', () => {
    const many = normalizeLollipopData(
      Array.from({ length: 12 }, (_, i) => ({ label: `C${i}`, value: i + 1 })),
    );
    renderLollipopChart(host, {
      series: many,
      width: 640,
      height: 80,
      theme: DEFAULT_THEME,
      orientation: 'horizontal',
    });
    const svg = host.querySelector('svg') as SVGSVGElement;
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(80);
  });

  it('pins the horizontal value axis when an overflow container is provided', () => {
    const many = normalizeLollipopData(
      Array.from({ length: 12 }, (_, i) => ({ label: `C${i}`, value: i + 1 })),
    );
    const axisHost = document.createElement('div');
    renderLollipopChart(host, {
      series: many,
      width: 640,
      height: 80,
      theme: DEFAULT_THEME,
      orientation: 'horizontal',
      xAxisContainer: axisHost,
    });
    const svg = host.querySelector('svg') as SVGSVGElement;
    expect(svg.querySelector('.value-axis')).toBeNull();
    expect(axisHost.querySelector('.value-axis')).not.toBeNull();
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(80);
  });
});
