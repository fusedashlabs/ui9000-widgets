// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import fixture from '../../../stories/fixtures/reasoning-orchestration.default.json';
import type { PathSelectDetail, Ui9000ReasoningOrchestrationGraph } from '../index.js';
import { normalizeReasoningOrchestration } from '../lib/index.js';

beforeAll(async () => {
  class StubResizeObserver {
    observe(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;
  await import('../index.js');
  await import('../../chart-renderer/index.js');
});

const flush = () => new Promise((r) => setTimeout(r, 40));

async function mount(data: unknown, attrs: Record<string, string> = {}): Promise<Ui9000ReasoningOrchestrationGraph> {
  const el = document.createElement('ui9000-reasoning-orchestration-graph');
  el.setAttribute('data', JSON.stringify(data));
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  document.body.append(el);
  await el.updateComplete;
  await flush();
  return el;
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('Timed out waiting for condition');
}

const texts = (root: Element | ShadowRoot, selector: string) =>
  [...root.querySelectorAll(selector)].map((node) => node.textContent?.replace(/\s+/g, ' ').trim());

afterEach(() => {
  document.body.replaceChildren();
});

describe('ui9000-reasoning-orchestration-graph', () => {
  it('repaints model chips when the page style id changes', async () => {
    const el = await mount(fixture);
    const dot = () => el.shadowRoot?.querySelector('.ro-dot');
    expect(dot()?.getAttribute('style')?.toLowerCase()).toContain('#473dd9');

    el.style.setProperty('--ui9000-style-id', 'palette1');
    document.dispatchEvent(new Event('ui9000-theme'));
    await el.updateComplete;
    await flush();

    expect(dot()?.getAttribute('style')?.toLowerCase()).toContain('#2039b4');
    el.remove();
  });

  it('renders the sample: header, graph, model labels, legend and the entropy panel', async () => {
    const el = await mount(fixture);
    const root = el.shadowRoot!;
    // The whole title on its own line, not cut at the header's length limit; the metadata under it.
    expect(root.querySelector('.widget-title')?.textContent?.trim()).toBe(
      'Test-time compute orchestrator / Opus 5.5 × GPT-6 Astra',
    );
    expect(root.querySelector('.widget-heading > .widget-subtitle')?.textContent?.trim()).toBe(
      'Stanford refining over resampling · arXiv:2608.05643 · Run 0214',
    );
    expect(root.querySelector('.widget-aside')).toBeNull();
    expect(root.querySelector('.chart-root svg.ro-svg')).not.toBeNull();
    expect(texts(root, '.ro-models-side:first-child .ro-chip')).toEqual(['GPT-6 Astra · Breadth T=0.8']);
    expect(texts(root, '.ro-models-side--right .ro-chip')).toEqual(['Claude Opus 5.5 · Depth T=0.0']);
    expect(texts(root, '.ro-legend-item')).toEqual([
      'Active path',
      'GPT-6 Astra (Explore)',
      'Claude Opus 5.5 (Repair)',
      '✕Pruned',
    ]);
    expect(root.querySelector('.ro-entropy svg')).not.toBeNull();
    // Step entropy is the only panel: no pipeline, no compute scaling.
    expect(texts(root, '.ro-panel-title')).toEqual(['Step entropy · T=0.8 vs T=0.0']);
    expect(root.querySelector('[data-panel="pipeline"], [data-panel="scaling"], .ro-step, .ro-scaling')).toBeNull();
    expect(texts(root, '.ro-benchmark')).toEqual(['MATH500 58.8% (+28.0)', 'AMC 81.2% (+7.5)', 'Olympiad 35.1%']);
    expect(root.querySelector('.ro-reset')).toBeNull();
  });

  it('explains a stage when its name on the right edge is hovered', async () => {
    const el = await mount(fixture);
    const open = vi.spyOn(el as unknown as { openTooltip: (event: MouseEvent, content: unknown) => void }, 'openTooltip');
    el.shadowRoot!.querySelector('.ro-stage-hit[data-stage="verify"]')!.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(open).toHaveBeenCalledTimes(1);
    const nodes = normalizeReasoningOrchestration(fixture).nodes.filter((node) => {
      const depth = Math.round(node.depth);
      return depth >= 9 && depth <= 11;
    }).length;
    expect(nodes).toBeGreaterThan(0);
    expect(open.mock.calls[0]![1]).toEqual({
      title: 'Verify',
      rows: [
        { label: 'Depth', value: '9–11' },
        { label: 'Nodes', value: String(nodes) },
        { label: 'Status', value: 'Done' },
        { label: 'Model', value: 'Claude Opus 5.5' },
        { label: 'Accuracy', value: '52.6%' },
        { label: 'Compute', value: '3.4' },
      ],
    });
  });

  it('fades the legend while the pointer is over it, without redrawing the plot', async () => {
    const el = await mount(fixture);
    const root = el.shadowRoot!;
    const plot = root.querySelector<HTMLElement>('.chart-root')!;
    const legend = root.querySelector<HTMLElement>('.ro-legend')!;
    legend.getBoundingClientRect = () => ({ left: 700, right: 880, top: 600, bottom: 680, width: 180, height: 80 }) as DOMRect;
    const svg = root.querySelector('svg.ro-svg');
    const move = async (clientX: number, clientY: number) => {
      plot.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY, bubbles: true }));
      await el.updateComplete;
    };

    await move(760, 640);
    expect(root.querySelector('.ro-legend')!.classList.contains('is-faded')).toBe(true);
    await move(760, 640);
    await move(400, 300);
    expect(root.querySelector('.ro-legend')!.classList.contains('is-faded')).toBe(false);
    await move(870, 610);
    expect(root.querySelector('.ro-legend')!.classList.contains('is-faded')).toBe(true);
    plot.dispatchEvent(new MouseEvent('pointerleave'));
    await el.updateComplete;
    expect(root.querySelector('.ro-legend')!.classList.contains('is-faded')).toBe(false);
    await flush();
    expect(root.querySelector('svg.ro-svg')).toBe(svg);
  });

  it('fades the stage names on a click until the pointer leaves the plot, through a redraw', async () => {
    const el = await mount(fixture);
    const root = el.shadowRoot!;
    const plot = root.querySelector<HTMLElement>('.chart-root')!;
    const close = vi.spyOn(el as unknown as { closeTooltip: () => void }, 'closeTooltip');
    const open = vi.spyOn(el as unknown as { openTooltip: (event: MouseEvent, content: unknown) => void }, 'openTooltip');
    const events: PathSelectDetail[] = [];
    el.addEventListener('path-select', (event) => events.push(event.detail));

    root.querySelector('.ro-stage-hit[data-stage="verify"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;
    expect(plot.classList.contains('is-stages-faded')).toBe(true);
    expect(close).toHaveBeenCalled();
    expect(events).toEqual([]);
    // No stage card while the names are faded.
    root.querySelector('.ro-stage-hit[data-stage="verify"]')!.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(open).not.toHaveBeenCalled();
    // Moving within the plot, and a redraw, keep them faded.
    plot.dispatchEvent(new MouseEvent('pointermove', { clientX: 400, clientY: 300, bubbles: true }));
    el.draw();
    await el.updateComplete;
    expect(plot.classList.contains('is-stages-faded')).toBe(true);
    expect(root.querySelectorAll('.ro-readout').length).toBeGreaterThan(0);

    plot.dispatchEvent(new MouseEvent('pointerleave'));
    await el.updateComplete;
    expect(plot.classList.contains('is-stages-faded')).toBe(false);
    root.querySelector('.ro-stage-hit[data-stage="verify"]')!.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('brings the stage names back on a click that selects no path, and keeps them hidden on one that does', async () => {
    const el = await mount(fixture);
    const root = el.shadowRoot!;
    const plot = root.querySelector<HTMLElement>('.chart-root')!;
    const fadeStages = async () => {
      root.querySelector('.ro-stage-hit[data-stage="verify"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await el.updateComplete;
      expect(plot.classList.contains('is-stages-faded')).toBe(true);
    };
    // jsdom lays nothing out, so the overlay maps every click to (0, 0): far from any node.
    const clickEmptyPlot = async () => {
      root.querySelector('.ro-hit')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await el.updateComplete;
    };

    // Empty plot, nothing selected.
    await fadeStages();
    await clickEmptyPlot();
    expect(plot.classList.contains('is-stages-faded')).toBe(false);

    // A path click selects a path: the names stay hidden.
    await fadeStages();
    root.querySelector('.ro-path[data-path="critic-b"] .ro-path-hit')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;
    expect(el.selection?.pathId).toBe('critic-b');
    expect(plot.classList.contains('is-stages-faded')).toBe(true);

    // Empty plot with a path selected: the selection clears and the names come back.
    await clickEmptyPlot();
    expect(el.selection).toBeNull();
    expect(plot.classList.contains('is-stages-faded')).toBe(false);
  });

  it('brings the stage names back when the selected path is clicked again, and keeps the selection', async () => {
    const el = await mount(fixture);
    const root = el.shadowRoot!;
    const plot = root.querySelector<HTMLElement>('.chart-root')!;
    const events: PathSelectDetail[] = [];
    el.addEventListener('path-select', (event) => events.push(event.detail));
    root.querySelector('.ro-path[data-path="critic-b"] .ro-path-hit')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;
    root.querySelector('.ro-stage-hit[data-stage="verify"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;
    expect(plot.classList.contains('is-stages-faded')).toBe(true);

    // The second click lands on the highlighted path, which the overlay picks again.
    const layout = (el as unknown as { _controller: { layout: { nodes: Map<string, { x: number; y: number }> } } })._controller
      .layout;
    const node = layout.nodes.get('alt-a10')!;
    root.querySelector('.ro-hit')!.dispatchEvent(new MouseEvent('click', { clientX: node.x, clientY: node.y, bubbles: true }));
    await el.updateComplete;
    expect(plot.classList.contains('is-stages-faded')).toBe(false);
    expect(el.selection?.pathId).toBe('critic-b');
    // Selecting the same path again fires nothing.
    expect(events).toHaveLength(1);
  });

  it('fades the note while another path is selected, and brings it back with the active path', async () => {
    const el = await mount(fixture);
    const note = () => el.shadowRoot!.querySelector<SVGGElement>('.ro-note[data-node="r14"]')!;
    expect(note().classList.contains('is-faded')).toBe(false);
    el.selectPath('critic-b');
    await el.updateComplete;
    expect(note().classList.contains('is-faded')).toBe(true);
    el.selectPath('refine');
    await el.updateComplete;
    expect(note().classList.contains('is-faded')).toBe(false);
    el.selectNode('s9b-f1');
    await el.updateComplete;
    expect(note().classList.contains('is-faded')).toBe(true);
    el.clearSelection();
    await el.updateComplete;
    expect(note().classList.contains('is-faded')).toBe(false);
  });

  it('highlights a clicked path, says so in the legend, and Escape returns to the active path', async () => {
    const el = await mount(fixture);
    const root = el.shadowRoot!;
    const events: PathSelectDetail[] = [];
    el.addEventListener('path-select', (event) => events.push(event.detail));

    root.querySelector('.ro-path[data-path="critic-b"] .ro-path-hit')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;
    expect(events[0]).toEqual({
      pathId: 'critic-b',
      nodeId: null,
      nodes: ['prompt', 's4', 's4a', 's4a-f1', 'alt-a9', 'alt-a10', 'alt-a12'],
    });
    expect(el.selection?.pathId).toBe('critic-b');
    expect(texts(root, '.ro-legend-item')[0]).toBe('Selected path');
    expect(root.querySelector('.ro-reset')?.textContent).toContain('Active path');

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await el.updateComplete;
    expect(events[1]).toEqual({ pathId: null, nodeId: null, nodes: [] });
    expect(el.selection).toBeNull();
    expect(root.querySelector('.ro-reset')).toBeNull();
    expect(texts(root, '.ro-legend-item')[0]).toBe('Active path');
  });

  it('selects the path to a node, and takes selected-path from the host', async () => {
    const el = await mount(fixture, { 'selected-path': 'vote' });
    expect(el.selection).toMatchObject({ pathId: 'vote', nodeId: null });
    el.selectNode('s9b-f1');
    await el.updateComplete;
    expect(el.selection).toEqual({ pathId: null, nodeId: 's9b-f1', nodes: ['prompt', 's9', 's9b', 's9b-f1'] });
    el.clearSelection();
    await el.updateComplete;
    expect(el.selection).toBeNull();
  });

  it('turns the chrome off with show-* "false" from a host, and the legend without a redraw', async () => {
    const el = await mount(fixture, { 'show-panels': 'false', 'show-annotations': 'false' });
    const root = el.shadowRoot!;
    expect(root.querySelector('.ro-panels')).toBeNull();
    expect(root.querySelector('.ro-note')).toBeNull();
    const svg = root.querySelector('svg.ro-svg');
    el.showLegend = false;
    await el.updateComplete;
    await flush();
    expect(root.querySelector('.ro-legend')).toBeNull();
    expect(root.querySelector('svg.ro-svg')).toBe(svg);
  });

  it('notes links left out by the cap even when every node is kept', async () => {
    const nodes = Array.from({ length: 80 }, (_, i) => ({ id: `n${i}` }));
    const links: Array<{ source: string; target: string }> = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) links.push({ source: `n${i}`, target: `n${j}` });
    }
    const el = await mount({ nodes, links });
    const note = el.shadowRoot!.querySelector('.cap-note')?.textContent?.replace(/\s+/g, ' ').trim();
    expect(note).toContain('links left out');
    expect(note).not.toContain('Showing');
  });

  it('shows the empty state for a payload with no graph', async () => {
    const el = await mount({ title: 'Nothing' });
    const root = el.shadowRoot!;
    expect(root.querySelector('.empty')?.textContent).toBe('No reasoning graph');
    expect(root.querySelector('.chart-root')?.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('.chart-root svg')).toBeNull();
  });

  it('mounts through chart-renderer by chartType', async () => {
    const renderer = document.createElement('ui9000-chart-renderer');
    renderer.setAttribute('data', JSON.stringify(fixture));
    document.body.appendChild(renderer);
    await waitFor(() => !!renderer.shadowRoot?.querySelector('ui9000-reasoning-orchestration-graph'));
    const chart = renderer.shadowRoot!.querySelector('ui9000-reasoning-orchestration-graph')!;
    await chart.updateComplete;
    await waitFor(() => !!chart.shadowRoot!.querySelector('.ro-active-line'));
    expect(chart.shadowRoot!.querySelectorAll('.ro-path')).toHaveLength(3);
  });
});
