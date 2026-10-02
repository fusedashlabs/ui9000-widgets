// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    observe(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;

  await Promise.all([
    import('../bias-variance-tradeoff-chart/element/ui9000-bias-variance-tradeoff-chart.js'),
    import('../gini-impurity-entropy-chart/element/ui9000-gini-impurity-entropy-chart.js'),
    import('../partial-dependence-chart/element/ui9000-partial-dependence-chart.js'),
    import('../parallel-coordinates-chart/element/ui9000-parallel-coordinates-chart.js'),
    import('../sankey-chart/element/ui9000-sankey-chart.js'),
    import('../network-graph/element/ui9000-network-graph.js'),
    import('../status-gauge-widget/element/ui9000-status-gauge-widget.js'),
  ]);
});

type Shadowed = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 40));

const LIGHT_GREY = /#d1d5db|#9ca3af|#6b7280|#939ba7|#5f6877|#d3dbe3|#afb3bb|#6c7584/;

async function mount(tag: string, data: unknown): Promise<Shadowed> {
  const el = document.createElement(tag) as Shadowed;
  el.style.width = '360px';
  el.style.height = '280px';
  el.style.setProperty('--ui9000-color-surface', '#13161D');
  el.style.setProperty('--ui9000-mode', 'dark');
  el.setAttribute('data', JSON.stringify(data));
  document.body.append(el);
  await el.updateComplete;
  await flush();
  await el.updateComplete;
  return el;
}

describe('family C dark ink', () => {
  it('bias-variance paints its frame from the host theme', async () => {
    const el = await mount('ui9000-bias-variance-tradeoff-chart', [
      { label: '1', value: 2 },
      { label: '2', value: 4 },
    ]);
    const painted = el.shadowRoot.querySelector('svg')!.innerHTML.toLowerCase();
    expect(painted).toMatch(/#444b57/);
    expect(painted).toMatch(/#a4a9b1/);
    expect(painted).not.toMatch(LIGHT_GREY);
    el.remove();
  });

  it('gini paints axes from the host theme', async () => {
    const el = await mount('ui9000-gini-impurity-entropy-chart', [
      { label: '0.2', value: 0.3 },
      { label: '0.8', value: 0.4 },
    ]);
    const painted = el.shadowRoot.querySelector('svg')!.innerHTML.toLowerCase();
    expect(painted).toMatch(/#444b57/);
    expect(painted).toMatch(/#a4a9b1/);
    expect(painted).not.toMatch(LIGHT_GREY);
    el.remove();
  });

  it('partial dependence paints axes from the host theme', async () => {
    const el = await mount('ui9000-partial-dependence-chart', {
      xAxe: ['x'],
      yAxe: ['y'],
      groupBy: ['g'],
      data: [
        { x: 0, y: 1, g: 'a' },
        { x: 1, y: 2, g: 'a' },
        { x: 0, y: 2, g: 'b' },
        { x: 1, y: 3, g: 'b' },
      ],
    });
    const painted = el.shadowRoot.querySelector('svg')!.innerHTML.toLowerCase();
    expect(painted).toMatch(/#444b57/);
    expect(painted).toMatch(/#a4a9b1/);
    expect(painted).not.toMatch(LIGHT_GREY);
    el.remove();
  });

  it('parallel coordinates paints axes from the host theme', async () => {
    const el = await mount('ui9000-parallel-coordinates-chart', [
      { sepal: 1, petal: 2 },
      { sepal: 3, petal: 4 },
    ]);
    const painted = el.shadowRoot.querySelector('svg')!.innerHTML.toLowerCase();
    expect(painted).toMatch(/#444b57/);
    expect(painted).toMatch(/#a4a9b1/);
    expect(painted).not.toMatch(LIGHT_GREY);
    el.remove();
  });

  it('sankey paints node rules from the host theme', async () => {
    const el = await mount('ui9000-sankey-chart', [
      { source: 'A', target: 'B', value: 10 },
      { source: 'A', target: 'C', value: 4 },
    ]);
    const rule = el.shadowRoot.querySelector('.node-rules line');
    expect(rule?.getAttribute('stroke')?.toLowerCase()).toBe('#444b57');
    el.remove();
  });

  it('network graph paints the hover pill and its text from the host theme', async () => {
    const el = await mount('ui9000-network-graph', {
      nodes: [
        { id: 'a', label: 'Alpha', value: 10 },
        { id: 'b', label: 'Beta', value: 20 },
      ],
      links: [{ source: 'a', target: 'b', value: 5 }],
    });
    const root = el.shadowRoot.querySelector('.chart-root') as HTMLElement;
    Object.defineProperty(root, 'clientWidth', { value: 360, configurable: true });
    Object.defineProperty(root, 'clientHeight', { value: 280, configurable: true });
    el.setAttribute(
      'data',
      JSON.stringify({
        nodes: [
          { id: 'a', label: 'Alpha', value: 10 },
          { id: 'b', label: 'Beta', value: 20 },
        ],
        links: [{ source: 'a', target: 'b', value: 6 }],
      }),
    );
    await el.updateComplete;
    await flush();
    const node = el.shadowRoot.querySelector('.node');
    expect(node).not.toBeNull();
    node!.querySelector('.node-drag-area')!.dispatchEvent(new MouseEvent('mouseenter'));
    const title = node!.querySelector('.node-label-title');
    const pill = node!.querySelector('.node-label-background');
    expect(title?.getAttribute('fill')?.toLowerCase()).toBe('#eff0f1');
    expect(pill?.getAttribute('fill')?.toLowerCase()).toBe('#282e37');
    el.remove();
  });

  it('status gauge follows the host mode without a theme attribute', async () => {
    const el = await mount('ui9000-status-gauge-widget', {
      title: 'Antenna',
      data: [{ name: 'Health', value: 80, status: 'ok' }],
    });
    expect(el.getAttribute('data-mode')).toBe('dark');
    expect(el.shadowRoot.querySelector('.panel')?.getAttribute('data-mode')).toBe('dark');
    el.remove();
  });
});
