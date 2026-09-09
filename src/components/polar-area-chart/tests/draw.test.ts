import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../../../types/index.js';
import { FD } from '../../../utils/fusedash-visual.js';
import polarAreaFixture from '../../../stories/fixtures/polar-area.fusedash.json';
import { polarLabelGutter, polarOuterRadius } from '../lib/domain.js';
import { normalizePolarAreaData } from '../lib/normalize.js';
import { renderPolarAreaChart } from '../render/draw.js';

const MARGIN = { ...FD.polarAreaMargin };
const singleFixture = { ...polarAreaFixture, groupBy: [] };

function draw(
  width = 600,
  height = 520,
  options: { showGrid?: boolean; showTooltip?: boolean } = {},
): HTMLElement {
  const container = document.createElement('div');
  renderPolarAreaChart(container, {
    model: normalizePolarAreaData(singleFixture as never),
    width,
    height,
    margin: MARGIN,
    theme: DEFAULT_THEME,
    onHover: () => undefined,
    ...options,
  });
  return container;
}

describe('renderPolarAreaChart', () => {
  it('draws one wedge per category on a five-ring grid', () => {
    const container = draw();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('.polar-area-path')).toHaveLength(7);
    expect(container.querySelectorAll('.polar-grid circle')).toHaveLength(
      FD.polarRadialSteps + 7,
    );
    expect(container.querySelectorAll('.polar-grid line')).toHaveLength(7);
    expect(container.querySelectorAll('.polar-category-labels text')).toHaveLength(7);
  });

  it('sizes wedges from the value: the largest reaches the outer ring', () => {
    const width = 600;
    const height = 520;
    const container = draw(width, height);
    const plotWidth = width - MARGIN.left - MARGIN.right;
    const plotHeight = height - MARGIN.top - MARGIN.bottom;
    const model = normalizePolarAreaData(singleFixture as never);
    const outerRadius = polarOuterRadius(
      plotWidth,
      plotHeight,
      polarLabelGutter(model.categories, plotWidth),
    );

    const rings = Array.from(container.querySelectorAll('.polar-grid circle[r]')).map(
      (c) => Number(c.getAttribute('r')),
    );
    expect(Math.max(...rings)).toBeLessThanOrEqual(outerRadius);
    expect(Math.max(...rings)).toBeGreaterThan(outerRadius * 0.7);
  });

  it('keeps every category label inside the SVG box', () => {
    const width = 520;
    const container = draw(width, 520);
    const labels = Array.from(
      container.querySelectorAll('.polar-category-labels text'),
    ) as SVGTextElement[];

    for (const label of labels) {
      const x = Number(label.getAttribute('x'));
      const anchor = label.getAttribute('text-anchor');
      const run = label.textContent!.length * FD.polarCategoryLabelSize * 0.6;
      const right = anchor === 'start' ? x + run : anchor === 'end' ? x : x + run / 2;
      const left = anchor === 'end' ? x - run : anchor === 'start' ? x : x - run / 2;
      expect(right).toBeLessThanOrEqual(width / 2);
      expect(left).toBeGreaterThanOrEqual(-width / 2);
    }
  });

  it('show-grid off keeps the wedges and category labels only', () => {
    const container = draw(600, 520, { showGrid: false });
    expect(container.querySelectorAll('.polar-grid')).toHaveLength(0);
    expect(container.querySelectorAll('.polar-tick-group')).toHaveLength(0);
    expect(container.querySelectorAll('.polar-area-path')).toHaveLength(7);
    expect(container.querySelectorAll('.polar-category-labels text')).toHaveLength(7);
  });

  it('drops the radial tick pills when the rings are too close together', () => {
    expect(draw(600, 520).querySelectorAll('.polar-tick-group')).toHaveLength(
      FD.polarRadialSteps,
    );
    expect(draw(600, 180).querySelectorAll('.polar-tick-group')).toHaveLength(0);
  });

  it('drops the label ring when the disc is too small to carry it', () => {
    const container = draw(240, 160);
    expect(container.querySelectorAll('.polar-category-labels text')).toHaveLength(0);
    expect(container.querySelectorAll('.polar-area-path')).toHaveLength(7);
  });

  it('draws one wedge per category × group when groupBy is set', () => {
    const container = document.createElement('div');
    renderPolarAreaChart(container, {
      model: normalizePolarAreaData(polarAreaFixture as never),
      width: 600,
      height: 520,
      margin: MARGIN,
      theme: DEFAULT_THEME,
    });
    expect(container.querySelectorAll('.polar-area-path')).toHaveLength(21);
    expect(container.querySelectorAll('.polar-grid line')).toHaveLength(7);
    expect(container.querySelectorAll('.polar-category-labels text')).toHaveLength(7);
  });

  it('renders nothing for an empty model', () => {
    const container = document.createElement('div');
    renderPolarAreaChart(container, {
      model: { sectors: [], categories: [], legend: [], maxValue: 0 },
      width: 600,
      height: 520,
      margin: MARGIN,
      theme: DEFAULT_THEME,
    });
    expect(container.children).toHaveLength(0);
  });
});
