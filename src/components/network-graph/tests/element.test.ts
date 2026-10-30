import { beforeAll, describe, expect, it } from 'vitest';

import networkFixture from '../../../stories/fixtures/network-graph.fusedash.json';
import panelsFixture from '../../../stories/fixtures/network-graph.panels.json';

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
  wheelZoom: boolean;
  message: string;
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

async function openLegend(el: Shadowed): Promise<void> {
  (el.shadowRoot.querySelector('.legend-chevron') as HTMLButtonElement).click();
  await el.updateComplete;
}

const click = async (el: Shadowed, selector: string): Promise<void> => {
  (el.shadowRoot.querySelector(selector) as HTMLElement).dispatchEvent(
    new MouseEvent('click', { bubbles: true, composed: true }),
  );
  await el.updateComplete;
};

const text = (el: Shadowed, selector: string): string =>
  el.shadowRoot.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

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
      node.getAttribute('stroke')?.toLowerCase(),
    );
    expect(fills.map((color) => color?.length)).toEqual([7, 7]);
    expect(new Set(fills).size).toBe(2);
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
    expect(root.querySelector('.network-layout')?.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('.chart-root svg')).toBeNull();
    expect(root.querySelector('.graph-legend')).toBeNull();

    el.remove();
  });

  it('show-legend toggles the size legend without rebuilding the SVG', async () => {
    const el = await mount();
    const svg = el.shadowRoot.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(el.shadowRoot.querySelector('.graph-legend')).not.toBeNull();
    await openLegend(el);
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
    await openLegend(el);
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
    expect(el.shadowRoot.querySelector('.legend-details')).toBeNull();

    await openLegend(el);
    expect(el.shadowRoot.querySelector('.legend-details')).not.toBeNull();

    (el.shadowRoot.querySelector('.legend-chevron') as HTMLButtonElement).click();
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('.legend-details')).toBeNull();
    expect(el.shadowRoot.querySelector('.graph-legend')).not.toBeNull();
    expect(el.shadowRoot.querySelector('svg')).toBe(svg);

    el.remove();
  });

  describe('panels', () => {
    it('opens on the latest date and the selected topic of the data', async () => {
      const el = await mount(panelsFixture);

      expect(text(el, '.timeline-bubble')).toBe('Aug, 3');
      expect(el.shadowRoot.querySelector('.topic-card[data-selected]')?.textContent).toMatch(
        /Payments/,
      );
      expect(text(el, '.sidebar-title')).toBe('Payments');
      expect(el.shadowRoot.querySelectorAll('.ranking-table tbody tr')).toHaveLength(3);

      el.remove();
    });

    it('leaves out the timeline and the sidebar for data without them', async () => {
      const el = await mount();

      expect(el.shadowRoot.querySelector('.timeline-bar')).toBeNull();
      expect(el.shadowRoot.querySelector('.sidebar')).toBeNull();
      expect(el.shadowRoot.querySelector('.topic-card')).not.toBeNull();

      el.remove();
    });

    it('walks the dates without rebuilding the graph', async () => {
      const el = await mount(panelsFixture);
      const svg = el.shadowRoot.querySelector('.chart-root svg');
      const shown = (): number =>
        [...el.shadowRoot.querySelectorAll<SVGGElement>('g.node')].filter(
          (node) => node.style.opacity !== '0',
        ).length;
      expect(shown()).toBe(12);

      await click(el, '[aria-label="Previous date"]');

      expect(text(el, '.timeline-bubble')).toBe('Jul, 6');
      expect(shown()).toBe(11);
      expect(el.shadowRoot.querySelector('.chart-root svg')).toBe(svg);

      el.remove();
    });

    it('sorts the ranking both ways', async () => {
      const el = await mount(panelsFixture);
      const first = (): string => text(el, '.ranking-table tbody tr td:nth-child(2)');
      expect(first()).toBe('North Office');

      await click(el, '.sidebar-title .icon-button');

      expect(first()).toBe('East Office');

      el.remove();
    });

    it('clears the sidebar metrics when the selected topic is picked again', async () => {
      const el = await mount(panelsFixture);
      expect(el.shadowRoot.querySelector('.metric-tabs')).not.toBeNull();

      await click(el, '.topic-card[data-selected]');

      expect(el.shadowRoot.querySelector('.metric-tabs')).toBeNull();
      expect(text(el, '.sidebar-title')).toMatch(/^Top offices/);

      el.remove();
    });

    it('opens a focus view from the node, with a card for its links', async () => {
      const el = await mount(panelsFixture);
      const plus = el.shadowRoot.querySelector('g.node .node-plus') as SVGElement;

      plus.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await el.updateComplete;

      const overlay = el.shadowRoot.querySelector('.focus-overlay') as HTMLElement;
      expect(overlay).not.toBeNull();
      expect(el.shadowRoot.querySelector('.view-toggle')?.hasAttribute('hidden')).toBe(true);
      expect(el.shadowRoot.querySelector('.graph-legend')).toBeNull();
      expect(el.shadowRoot.querySelector('.node-card')).not.toBeNull();
      expect(el.shadowRoot.querySelector('.sidebar')).toBeNull();

      overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;

      expect(el.shadowRoot.querySelector('.focus-overlay')).toBeNull();
      expect(el.shadowRoot.querySelector('.sidebar')).not.toBeNull();

      el.remove();
    });

    it('keeps keyboard focus on the picked item, so Escape still closes', async () => {
      const el = await mount(panelsFixture);
      (el.shadowRoot.querySelector('g.node .node-plus') as SVGElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await el.updateComplete;
      const canvas = el.shadowRoot.querySelector('.focus-canvas') as HTMLElement;
      Object.defineProperty(canvas, 'clientWidth', { value: 700, configurable: true });
      Object.defineProperty(canvas, 'clientHeight', { value: 480, configurable: true });
      for (const cb of observed) cb();
      await flush();
      const item = el.shadowRoot.querySelector('.focus-item') as SVGGElement;
      item.focus();

      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await el.updateComplete;

      const active = el.shadowRoot.activeElement as SVGGElement;
      expect(active).not.toBe(item);
      expect(active.getAttribute('aria-pressed')).toBe('true');
      active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(el.shadowRoot.querySelector('.focus-overlay')).toBeNull();

      el.remove();
    });

    it('closes the focus view of a node the timeline hides', async () => {
      const el = await mount(panelsFixture);
      const node = [...el.shadowRoot.querySelectorAll('g.node')].at(-1) as SVGGElement;
      (node.querySelector('.node-plus') as SVGElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await el.updateComplete;
      expect(el.shadowRoot.querySelector('.focus-overlay')).not.toBeNull();

      await click(el, '[aria-label="Previous date"]');

      expect(el.shadowRoot.querySelector('.focus-overlay')).toBeNull();

      el.remove();
    });

    it('says the words of the data in the legend', async () => {
      const el = await mount(panelsFixture);
      await openLegend(el);

      const captions = [...el.shadowRoot.querySelectorAll('.legend-caption')].map(
        (node) => node.textContent,
      );
      expect(captions).toEqual(['Node size: staff', 'Colour: node type']);
      expect(el.shadowRoot.querySelectorAll('.legend-type')).toHaveLength(3);

      el.remove();
    });

    it('shows the message of the host in place of the empty text', async () => {
      const el = document.createElement('ui9000-network-graph') as Shadowed;
      el.message = 'Pick a dataset';
      el.setAttribute('data', JSON.stringify({ nodes: [], links: [] }));
      document.body.append(el);
      await el.updateComplete;
      await flush();
      await el.updateComplete;

      expect(text(el, '.stage-message')).toBe('Pick a dataset');
      expect(el.shadowRoot.querySelector('.empty')).toBeNull();

      el.remove();
    });
  });
});
