import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { FD } from '../../../utils/fusedash-visual.js';
import fusedashFixture from '../../../stories/fixtures/parallel-coordinates.fusedash.json';
import {
  normalizeParallelCoordinatesData,
  type ParallelCoordinatesFusePayload,
  type ParallelCoordinatesOrientation,
} from '../lib/index.js';
import { renderParallelCoordinatesChart } from '../render/draw.js';

const FUSEDASH_MOCK = fusedashFixture as unknown as ParallelCoordinatesFusePayload;

function draw(
  overrides: Partial<{
    orientation: ParallelCoordinatesOrientation;
    width: number;
    height: number;
    showLegend: boolean;
    colorKey: string;
    onColorKeyChange: (key: string) => void;
  }> = {},
): HTMLElement {
  const {
    orientation = 'horizontal',
    width = 760,
    height = 420,
    showLegend = true,
    colorKey,
    onColorKeyChange,
  } = overrides;
  const container = document.createElement('div');
  renderParallelCoordinatesChart(container, {
    model: { ...normalizeParallelCoordinatesData(FUSEDASH_MOCK), orientation },
    width,
    height,
    margin:
      orientation === 'vertical'
        ? { ...FD.parallelVerticalMargin }
        : { ...FD.parallelMargin },
    theme: DEFAULT_THEME,
    orientation,
    showLegend,
    colorKey,
    onColorKeyChange,
  });
  return container;
}

describe('renderParallelCoordinatesChart', () => {
  it('draws one axis per dimension and one polyline per row', () => {
    const svg = draw().querySelector('svg') as SVGSVGElement;

    expect(svg.querySelectorAll('.x-axis')).toHaveLength(4);
    expect(svg.querySelectorAll('.line-path')).toHaveLength(15);
    expect(svg.querySelectorAll('.axis-title')).toHaveLength(4);
  });

  it('sizes the horizontal plot by axis count so it scrolls', () => {
    const svg = draw({ height: 420 }).querySelector('svg') as SVGSVGElement;
    const { top, bottom } = FD.parallelMargin;

    expect(svg.getAttribute('height')).toBe(
      String(FD.parallelAxisSpacing * 4 + top + bottom * 2),
    );
  });

  it('puts the maximum at the top of a vertical axis', () => {
    const svg = draw({ orientation: 'vertical' }).querySelector('svg') as SVGSVGElement;
    // sepalLength spans 4.6–7.1; the rows holding each end must straddle the
    // plot the right way up, and agree with the min-at-bottom colour ramp.
    const ys = [...svg.querySelectorAll('.line-path')].map((p) =>
      Number((p.getAttribute('d') as string).slice(1).split(',')[1].split('L')[0]),
    );
    const rows = normalizeParallelCoordinatesData(FUSEDASH_MOCK).rows;
    const values = rows.map((r) => r.values.sepalLength as number);
    const highest = ys[values.indexOf(Math.max(...values))];
    const lowest = ys[values.indexOf(Math.min(...values))];

    expect(highest).toBeLessThan(lowest);
  });

  it('orders vertical tick labels high to low down the axis', () => {
    const svg = draw({ orientation: 'vertical' }).querySelector('svg') as SVGSVGElement;
    const firstAxis = svg.querySelector('.y-axis') as SVGGElement;
    const ticks = [...firstAxis.querySelectorAll('.tick')].map((t) => ({
      y: Number(/translate\(.*?,(.*?)\)/.exec(t.getAttribute('transform') ?? '')?.[1]),
      value: Number(t.querySelector('text')?.textContent),
    }));

    expect(ticks.length).toBeGreaterThan(1);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].value).toBeGreaterThan(ticks[i - 1].value);
      expect(ticks[i].y).toBeLessThan(ticks[i - 1].y);
    }
  });

  it('fits the vertical plot to the frame and swaps the axis class', () => {
    const container = draw({ orientation: 'vertical', height: 380 });
    const svg = container.querySelector('svg') as SVGSVGElement;

    expect(svg.getAttribute('height')).toBe('380');
    expect(svg.querySelectorAll('.y-axis')).toHaveLength(4);
    expect(svg.querySelectorAll('.x-axis')).toHaveLength(0);
  });

  it('colours lines by the active axis and emphasises its title', () => {
    const svg = draw({ colorKey: 'petalWidth' }).querySelector('svg') as SVGSVGElement;
    const titles = [...svg.querySelectorAll('.axis-title')];
    const active = titles.find((t) => t.textContent === 'petalWidth');

    expect(active?.getAttribute('font-weight')).toBe('600');
    expect(active?.getAttribute('font-size')).toBe(String(FD.parallelTitleSizeActive));
    // Ramp ends land on the rows holding the min and max petalWidth.
    const strokes = [...svg.querySelectorAll('.line-path')].map((p) =>
      p.getAttribute('stroke'),
    );
    expect(new Set(strokes).size).toBeGreaterThan(1);
  });

  it('moves the colour ramp when an axis is clicked', () => {
    const changed: string[] = [];
    const svg = draw({ onColorKeyChange: (key) => changed.push(key) }).querySelector(
      'svg',
    ) as SVGSVGElement;
    const before = svg.querySelector('.line-path')?.getAttribute('stroke');

    const petalLength = [...svg.querySelectorAll('.x-axis')].find((g) =>
      g.querySelector('.axis-title')?.textContent?.startsWith('petalLength'),
    );
    petalLength?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(changed).toEqual(['petalLength']);
    expect(svg.querySelector('.line-path')?.getAttribute('stroke')).not.toBe(before);
    // Recoloured in place — the plot is never rebuilt.
    expect(svg.querySelectorAll('.line-path')).toHaveLength(15);
  });

  it('reclaims the right gutter when the legend is hidden', () => {
    const withLegend = draw().querySelector('.color-legend rect');
    const without = draw({ showLegend: false });

    expect(withLegend).not.toBeNull();
    expect(without.querySelector('.color-legend')).toBeNull();
    const axisWidth = (container: Element | null) =>
      container?.querySelector('.x-axis .domain')?.getAttribute('d') ?? '';
    expect(axisWidth(without.querySelector('svg'))).not.toBe(
      axisWidth(draw().querySelector('svg')),
    );
  });

  it('renders nothing for an empty model or an unusably small frame', () => {
    const empty = document.createElement('div');
    renderParallelCoordinatesChart(empty, {
      model: normalizeParallelCoordinatesData(null),
      width: 600,
      height: 400,
      margin: { ...FD.parallelMargin },
      theme: DEFAULT_THEME,
      orientation: 'horizontal',
      showLegend: true,
    });
    expect(empty.querySelector('svg')).toBeNull();
    expect(draw({ width: 40 }).querySelector('svg')).toBeNull();
    expect(draw({ height: 20 }).querySelector('svg')).toBeNull();
  });
});
