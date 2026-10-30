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
  it('paints node types from the group palette in order of appearance', async () => {
    const el = await mount({
      nodes: [
        { id: 'a', label: 'A', type: 'investment_bank', value: 1 },
        { id: 'b', label: 'B', type: 'fund', value: 2 },
      ],
      links: [],
    });
    const fills = [...el.shadowRoot.querySelectorAll('.node-background')].map((node) =>
      node.getAttribute('fill')?.toLowerCase(),
    );
    expect(fills).toEqual(['#a0f1e3', '#6fcf97']);
    el.remove();
  });

  it('switches to the heatmap and back without rebuilding the graph', async () => {
    const el = await mount();
    const root = el.shadowRoot;
    const graph = root.querySelector('.chart-root svg');
    const button = (label: string) =>
      [...root.querySelectorAll<HTMLButtonElement>('.view-button')].find(
        (item) => item.textContent?.trim() === label,
      )!;

    expect(button('Network').getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('.heatmap-root svg')).toBeNull();

    button('Heatmap').click();
    await el.updateComplete;
    await flush();
    expect(button('Heatmap').getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('.heatmap-root g.heatmap-row')).not.toBeNull();
    expect(root.querySelector('.graph-legend')).toBeNull();
    expect(root.querySelector('.heatmap-header')?.textContent).toContain('Link values');

    button('Network').click();
    await el.updateComplete;
    await flush();
    expect(root.querySelector('.heatmap-pane')?.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('.chart-root svg')).toBe(graph);
    el.remove();
  });

  it('keeps the row picked in the heatmap selected', async () => {
    const el = await mount();
    const root = el.shadowRoot;
    root.querySelectorAll<HTMLButtonElement>('.view-button')[1].click();
    await el.updateComplete;
    await flush();

    root.querySelector('.heatmap-root g.heatmap-row')!.dispatchEvent(new MouseEvent('click'));
    await flush();
    expect(root.querySelector('rect.heatmap-selected-row')).not.toBeNull();
    el.remove();
  });

  it('shows the empty state and no plot for an unusable payload', async () => {
    const el = await mount({ nope: true });
    const root = el.shadowRoot;

    expect(root.querySelector('.empty')?.textContent).toMatch(/Network graph requires/);
    expect(root.querySelector('.network-stage')?.hasAttribute('hidden')).toBe(true);
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
    const labelTip = () => document.querySelector('[data-ui9000-label-tooltip]');

    value.dispatchEvent(new MouseEvent('mouseenter'));
    await el.updateComplete;
    expect(labelTip()?.classList.contains('is-open')).toBe(true);

    el.showTooltip = false;
    await el.updateComplete;
    // Clear any tip left from the previous hover before asserting the off path.
    value.dispatchEvent(new MouseEvent('mouseleave'));
    await el.updateComplete;
    value.dispatchEvent(new MouseEvent('mouseenter'));
    await el.updateComplete;

    expect(labelTip()?.classList.contains('is-open')).not.toBe(true);
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
