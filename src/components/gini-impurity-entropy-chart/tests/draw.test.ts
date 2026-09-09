import { describe, expect, it } from 'vitest';

import fusedashFixture from '../../../stories/fixtures/gini-impurity-entropy.fusedash.json';
import { DEFAULT_THEME } from '../../../types/index.js';
import { FD } from '../../../utils/fusedash-visual.js';
import {
  normalizeGiniImpurityEntropyData,
  type GiniImpurityEntropyFusePayload,
  type GiniImpurityEntropyModel,
} from '../lib/index.js';
import { renderGiniImpurityEntropyChart } from '../render/draw.js';

const FUSEDASH_MOCK =
  fusedashFixture as unknown as GiniImpurityEntropyFusePayload;

function draw(
  overrides: Partial<{
    model: GiniImpurityEntropyModel;
    width: number;
    height: number;
    showGrid: boolean;
    onHover: () => void;
  }> = {},
): HTMLElement {
  const {
    model = normalizeGiniImpurityEntropyData(FUSEDASH_MOCK),
    width = 760,
    height = 420,
    showGrid = true,
    onHover,
  } = overrides;
  const container = document.createElement('div');
  renderGiniImpurityEntropyChart(container, {
    model,
    width,
    height,
    margin: { ...FD.giniMargin },
    theme: DEFAULT_THEME,
    showGrid,
    onHover,
  });
  return container;
}

describe('renderGiniImpurityEntropyChart', () => {
  it('draws one curve per metric with the client dash pattern', () => {
    const svg = draw().querySelector('svg') as SVGSVGElement;
    const curves = svg.querySelectorAll('.curves .curve');

    expect(curves).toHaveLength(3);
    expect(curves[0].getAttribute('stroke')).toBe('#36C4A5');
    expect(curves[0].getAttribute('stroke-dasharray')).toBeNull();
    expect(curves[1].getAttribute('stroke-dasharray')).toBe('5,5');
    expect(curves[0].getAttribute('stroke-width')).toBe(
      String(FD.lineStrokeWidth),
    );
    expect(curves[0].getAttribute('d')).toMatch(/^M/);
  });

  it('draws horizontal grid lines only, and drops them on showGrid=false', () => {
    const withGrid = draw().querySelectorAll('.grid line');
    expect(withGrid.length).toBeGreaterThan(0);
    for (const node of withGrid) {
      expect(node.getAttribute('y1')).toBe(node.getAttribute('y2'));
      expect(node.getAttribute('stroke')).toBe(FD.gridStroke);
    }

    expect(draw({ showGrid: false }).querySelectorAll('.grid line')).toHaveLength(
      0,
    );
  });

  it('labels both axes from the widget axisDetails', () => {
    const svg = draw().querySelector('svg') as SVGSVGElement;

    expect(svg.querySelector('.x-axis-label')?.textContent).toBe('P');
    expect(svg.querySelector('.y-axis-label')?.textContent).toBe(
      'Impurity Index',
    );
    expect(svg.querySelectorAll('.y-axis .tick text').length).toBeGreaterThan(0);
  });

  it('renders nothing for an empty model or a collapsed box', () => {
    const empty = draw({ model: normalizeGiniImpurityEntropyData(null) });
    expect(empty.querySelector('svg')).toBeNull();

    expect(draw({ width: 0 }).querySelector('svg')).toBeNull();
    expect(draw({ height: 4 }).querySelector('svg')).toBeNull();
  });

  it('omits the overlays until meta turns them on', () => {
    const svg = draw().querySelector('svg') as SVGSVGElement;

    expect(svg.querySelector('.ci-band')).toBeNull();
    expect(svg.querySelector('.p-hat-guide')).toBeNull();
    expect(svg.querySelector('.split-anno')).toBeNull();
  });

  it('draws the p-hat guide, CI band and split annotation when asked', () => {
    const model = normalizeGiniImpurityEntropyData({
      ...FUSEDASH_MOCK,
      meta: {
        pHat: 0.5,
        ci: [0.4, 0.6],
        split: { pLeft: 0, nLeft: 50, pRight: 1, nRight: 50 },
      },
    });
    model.overlays.showPHat = true;
    model.overlays.showCI = true;
    model.overlays.showSplit = true;
    const svg = draw({ model }).querySelector('svg') as SVGSVGElement;

    const band = svg.querySelector('.ci-band') as SVGRectElement;
    expect(Number(band.getAttribute('width'))).toBeGreaterThan(0);
    expect(band.getAttribute('fill')).toBe(FD.giniOverlayColor);

    const guide = svg.querySelector('.p-hat-guide') as SVGLineElement;
    expect(guide.getAttribute('x1')).toBe(guide.getAttribute('x2'));
    expect(guide.getAttribute('stroke-dasharray')).toBe(FD.giniOverlayDash);

    expect(svg.querySelectorAll('.split-anno circle')).toHaveLength(2);
    expect(svg.querySelector('.split-label')?.textContent).toBe(
      'ΔGini = 0.500',
    );
  });

  it('only wires the hover surface when a handler is supplied', () => {
    expect(draw().querySelector('.hover-surface')).toBeNull();
    expect(
      draw({ onHover: () => undefined }).querySelector('.hover-surface'),
    ).not.toBeNull();
  });

  it('reads every series at the hovered probability without redrawing', () => {
    const seen: Array<{ p: number; count: number }> = [];
    const container = draw({
      onHover: ((payload: { p: number; entries: unknown[] }) => {
        seen.push({ p: payload.p, count: payload.entries.length });
      }) as never,
    });
    const svg = container.querySelector('svg') as SVGSVGElement;
    const surface = svg.querySelector('.hover-surface') as SVGRectElement;
    const before = svg.querySelectorAll('.curves .curve').length;

    // jsdom has no layout, so pointer() falls back to clientX/clientY.
    surface.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 400, clientY: 200, bubbles: true }),
    );

    expect(seen).toHaveLength(1);
    expect(seen[0].count).toBe(3);
    expect(seen[0].p).toBeGreaterThanOrEqual(0);
    expect(seen[0].p).toBeLessThanOrEqual(1);
    expect(svg.querySelector('.hover')?.getAttribute('opacity')).toBe('1');
    expect(svg.querySelectorAll('.hover-dot')).toHaveLength(3);
    // The plot is untouched — the crosshair only moves existing nodes.
    expect(svg.querySelectorAll('.curves .curve')).toHaveLength(before);

    surface.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(svg.querySelector('.hover')?.getAttribute('opacity')).toBe('0');
  });

  it('dims the sibling curves and names the one under the cursor', () => {
    let active: string | null = null;
    const container = draw({
      onHover: ((payload: { activeSeriesId: string | null }) => {
        active = payload.activeSeriesId;
      }) as never,
    });
    const svg = container.querySelector('svg') as SVGSVGElement;
    const surface = svg.querySelector('.hover-surface') as SVGRectElement;

    surface.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 400, clientY: 200, bubbles: true }),
    );

    const curves = Array.from(svg.querySelectorAll('.curves .curve'));
    const opacities = curves.map((c) => c.getAttribute('opacity'));
    expect(active).not.toBeNull();
    expect(opacities.filter((o) => o === '1')).toHaveLength(1);
    expect(
      opacities.filter((o) => o === String(FD.giniCurveDimOpacity)),
    ).toHaveLength(curves.length - 1);
    // The lit curve is the one the payload names.
    const lit = curves[opacities.indexOf('1')];
    expect(lit.getAttribute('class')).toContain(`curve-${active}`);

    surface.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(
      Array.from(svg.querySelectorAll('.curves .curve')).every(
        (c) => c.getAttribute('opacity') === '1',
      ),
    ).toBe(true);
  });
});
