import { beforeAll, describe, expect, it } from 'vitest';

import networkFixture from '../../../stories/fixtures/network-graph.fusedash.json';

let observed: (() => void)[] = [];

beforeAll(async () => {
  class StubResizeObserver {
    constructor(private cb: () => void) {
      observed.push(cb);
    }
    observe(): void {}
    disconnect(): void {
      observed = observed.filter((c) => c !== this.cb);
    }
  }
  globalThis.ResizeObserver =
    StubResizeObserver as unknown as typeof ResizeObserver;
  await import('../element/ui9000-network-graph.js');
});

type Shadowed = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  showLegend: boolean;
  showTooltip: boolean;
};

const flush = () => new Promise((r) => setTimeout(r, 40));

function sizeRoot(el: Shadowed, width = 800, height = 480): void {
  const root = el.shadowRoot.querySelector('.chart-root') as HTMLElement | null;
  if (!root) return;
  Object.defineProperty(root, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(root, 'clientHeight', { value: height, configurable: true });
}

/**
 * `show-*` are Lit boolean attributes — hosts turn them off by omitting the
 * attribute or setting the property, never by `show-legend="false"`.
 */
async function mount(
  data: unknown = networkFixture,
  props: Partial<{ showLegend: boolean; showTooltip: boolean }> = {},
): Promise<Shadowed> {
  const el = document.createElement('ui9000-network-graph') as Shadowed;
  el.setAttribute('data', JSON.stringify(data));
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;
  sizeRoot(el);
  for (const cb of observed) cb();
  await flush();
  await el.updateComplete;
  return el;
}

describe('ui9000-network-graph', () => {
  it('shows the empty state and no plot for an unusable payload', async () => {
    const el = await mount({ nope: true });
    const root = el.shadowRoot;

    expect(root.querySelector('.empty')?.textContent).toMatch(/Network graph requires/);
    expect(root.querySelector('.chart-root')?.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('.chart-root svg')).toBeNull();
    expect(root.querySelector('.graph-legend')).toBeNull();

    el.remove();
  });

  it('show-legend toggles the size legend without rebuilding the SVG', async () => {
    const el = await mount();
    const svg = el.shadowRoot.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(el.shadowRoot.querySelector('.graph-legend')).not.toBeNull();
    expect(el.shadowRoot.querySelectorAll('.legend-thumb')).toHaveLength(2);
    expect(el.shadowRoot.querySelector('.legend-kicker')?.textContent).toBe('Legend');

    el.showLegend = false;
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('.graph-legend')).toBeNull();
    expect(el.shadowRoot.querySelector('svg')).toBe(svg);

    el.remove();
  });

  it('show-tooltip toggles legend-value hover tips without rebuilding', async () => {
    const el = await mount();
    const svg = el.shadowRoot.querySelector('svg');
    const value = el.shadowRoot.querySelector('.legend-value')!;

    value.dispatchEvent(new MouseEvent('mouseenter'));
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.label-tooltip')).not.toBeNull();

    el.showTooltip = false;
    await el.updateComplete;
    // Clear any tip left from the previous hover before asserting the off path.
    value.dispatchEvent(new MouseEvent('mouseleave'));
    await el.updateComplete;
    value.dispatchEvent(new MouseEvent('mouseenter'));
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('.label-tooltip')).toBeNull();
    expect(el.shadowRoot.querySelector('svg')).toBe(svg);

    el.remove();
  });

  it('collapses the size scale without rebuilding the SVG', async () => {
    const el = await mount();
    const svg = el.shadowRoot.querySelector('svg');
    const chevron = el.shadowRoot.querySelector('.legend-chevron') as HTMLButtonElement;
    expect(el.shadowRoot.querySelector('.legend-details')).not.toBeNull();

    chevron.click();
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('.legend-details')).toBeNull();
    expect(el.shadowRoot.querySelector('.graph-legend')).not.toBeNull();
    expect(el.shadowRoot.querySelector('svg')).toBe(svg);

    el.remove();
  });
});
