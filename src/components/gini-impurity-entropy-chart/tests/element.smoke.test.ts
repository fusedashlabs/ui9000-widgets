import { beforeAll, describe, expect, it } from 'vitest';

import fixture from '../../../stories/fixtures/gini-impurity-entropy.fusedash.json';
import {
  registerGiniImpurityEntropyChart,
  Ui9000GiniImpurityEntropyChart,
} from '../index.js';

const TAG = 'ui9000-gini-impurity-entropy-chart';

beforeAll(() => {
  // jsdom has no layout or ResizeObserver: give the shell a real box.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
  for (const prop of ['clientWidth', 'clientHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      get() {
        return prop === 'clientWidth' ? 760 : 420;
      },
      configurable: true,
    });
  }
  registerGiniImpurityEntropyChart();
});

async function settle(el: Element) {
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => requestAnimationFrame(r));
}

async function mount(data: unknown = fixture, attrs: Record<string, string> = {}) {
  const el = document.createElement(TAG);
  el.setAttribute('data', typeof data === 'string' ? data : JSON.stringify(data));
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.append(el);
  await settle(el);
  return el;
}

describe(TAG, () => {
  it('renders the FuseDash mock into the shell', async () => {
    const root = (await mount()).shadowRoot as ShadowRoot;

    expect(root.querySelector('.widget-title')?.textContent?.trim()).toBe(
      'Gini Impurity and Entropy',
    );
    expect(root.querySelectorAll('.chart-root svg .curve')).toHaveLength(3);
    expect(root.querySelector('.empty')).toBeNull();
  });

  it('lists every curve in the HTML legend with its dash style', async () => {
    const root = (await mount()).shadowRoot as ShadowRoot;
    const items = [...root.querySelectorAll('.chart-legend .legend-item')];

    expect(items.map((i) => i.querySelector('.legend-label')?.textContent)).toEqual(
      ['Entropy', 'Gini Impurity', 'Misclassification Error'],
    );
    expect(items[0].querySelector('.legend-line--dashed')).toBeNull();
    expect(items[1].querySelector('.legend-line--dashed')).not.toBeNull();
  });

  it('falls back to the empty state without throwing', async () => {
    const el = await mount('not json');

    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toBe('No data');
    expect(el.shadowRoot?.querySelector('svg')).toBeNull();
  });

  it('toggles grid, legend and tooltip', async () => {
    const el = (await mount()) as Ui9000GiniImpurityEntropyChart;
    expect(el.shadowRoot?.querySelectorAll('.grid line').length).toBeGreaterThan(0);
    expect(el.shadowRoot?.querySelector('.hover-surface')).not.toBeNull();

    // Boolean attributes are presence-based, so the flags are driven as
    // properties here — `show-grid="false"` would still read as true.
    el.showGrid = false;
    el.showLegend = false;
    el.showTooltip = false;
    await settle(el);

    expect(el.shadowRoot?.querySelectorAll('.grid line')).toHaveLength(0);
    expect(el.shadowRoot?.querySelector('.chart-legend')).toBeNull();
    expect(el.shadowRoot?.querySelector('.hover-surface')).toBeNull();
  });

  it('turns the meta annotations on from host flags', async () => {
    const annotated = {
      ...fixture,
      meta: {
        pHat: 0.6,
        ci: [0.5, 0.7],
        split: { pLeft: 0.1, nLeft: 30, pRight: 0.9, nRight: 70 },
      },
    };
    const el = (await mount(annotated)) as Ui9000GiniImpurityEntropyChart;
    expect(el.shadowRoot?.querySelector('.p-hat-guide')).toBeNull();

    el.showPHat = true;
    el.showCI = true;
    el.showSplit = true;
    await settle(el);

    expect(el.shadowRoot?.querySelector('.p-hat-guide')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('.ci-band')).not.toBeNull();
    expect(el.shadowRoot?.querySelectorAll('.split-anno circle')).toHaveLength(2);
  });

  it('keeps the tooltip alive without rebuilding the plot', async () => {
    const el = await mount();
    const surface = el.shadowRoot?.querySelector(
      '.hover-surface',
    ) as SVGRectElement;
    const svgBefore = el.shadowRoot?.querySelector('svg');

    surface.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 400, clientY: 200, bubbles: true }),
    );
    await settle(el);

    const tooltip = document.querySelector('[data-ui9000-chart-tooltip]');
    expect(tooltip?.classList.contains('is-open')).toBe(true);
    expect(tooltip?.querySelectorAll('.row')).toHaveLength(3);
    expect(el.shadowRoot?.querySelector('svg')).toBe(svgBefore);
  });

  it('defines the element exactly once', () => {
    const first = customElements.get(TAG);
    registerGiniImpurityEntropyChart();
    expect(customElements.get(TAG)).toBe(first);
  });
});
