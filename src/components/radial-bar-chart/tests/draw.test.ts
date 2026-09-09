import { describe, expect, it } from 'vitest';

import radialBarFixture from '../../../stories/fixtures/radial-bar.fusedash.json';
import { DEFAULT_THEME } from '../../../types/index.js';
import { FD } from '../../../utils/fusedash-visual.js';
import { normalizeRadialBarData } from '../lib/index.js';
import { renderRadialBarChart } from '../render/draw.js';

function draw(
  overrides: Partial<Parameters<typeof renderRadialBarChart>[1]> = {},
  width = 640,
  height = 520,
): HTMLElement {
  const container = document.createElement('div');
  const model = normalizeRadialBarData(radialBarFixture as never);
  renderRadialBarChart(container, {
    bars: model.bars,
    width,
    height,
    margin: { ...FD.radialBarMargin },
    theme: DEFAULT_THEME,
    ...overrides,
  });
  return container;
}

describe('renderRadialBarChart', () => {
  it('draws one arc per ring, one grid ring per boundary, and the tick axes', () => {
    const container = draw();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('.radial-bar')).toHaveLength(8);
    expect(container.querySelectorAll('.radial-grid-arc')).toHaveLength(9);
    expect(container.querySelectorAll('.radial-ring-label')).toHaveLength(8);
    expect(container.querySelectorAll('.radial-tick-label').length).toBeGreaterThan(1);
  });

  it('show-grid strips the rings and radial axis lines but keeps the value labels', () => {
    const container = draw({ showGrid: false });
    expect(container.querySelectorAll('.radial-grid-arc')).toHaveLength(0);
    expect(container.querySelectorAll('.radial-axis line')).toHaveLength(0);
    expect(container.querySelectorAll('.radial-tick-label').length).toBeGreaterThan(1);
  });

  it('rests arcs at 0.8 opacity and attaches hover handlers only with a tooltip', () => {
    const withTooltip = draw({ onHover: () => undefined });
    const first = withTooltip.querySelector('.radial-bar') as SVGPathElement;
    expect(first.getAttribute('opacity')).toBe(String(FD.radialBarArcOpacity));
    expect(first.style.cursor).toBe('pointer');

    const withoutTooltip = draw({ showTooltip: false, onHover: () => undefined });
    const plain = withoutTooltip.querySelector('.radial-bar') as SVGPathElement;
    expect(plain.style.cursor).toBe('');
  });

  it('replaces the previous drawing instead of stacking SVGs', () => {
    const container = draw();
    renderRadialBarChart(container, {
      bars: normalizeRadialBarData(radialBarFixture as never).bars,
      width: 400,
      height: 400,
      margin: { ...FD.radialBarMargin },
      theme: DEFAULT_THEME,
    });
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('renders nothing for an empty model or a container with no room', () => {
    expect(draw({ bars: [] }).querySelectorAll('svg')).toHaveLength(0);
    expect(draw({}, 40, 40).querySelectorAll('svg')).toHaveLength(0);
  });
});
