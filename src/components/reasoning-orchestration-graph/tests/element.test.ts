// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import fixture from '../../../stories/fixtures/reasoning-orchestration.default.json';
import type { PathSelectDetail, Ui9000ReasoningOrchestrationGraph } from '../index.js';

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
  it('renders the sample: header, readouts, graph, model labels, legend and panels', async () => {
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
    expect(root.querySelector('.ro-summary')?.textContent?.replace(/\s+/g, ' ')).toContain(
      'Search topology · Candidates 387 · Refinements 71 · Accuracy 58.8% (+28.4) · PRM Verified',
    );
    expect(root.querySelector('.ro-criterion')?.textContent).toContain('breadth–depth assignment');
    expect(root.querySelector('.chart-root svg.ro-svg')).not.toBeNull();
    expect(root.querySelector('.ro-top-chart svg')).not.toBeNull();
    expect(texts(root, '.ro-models-side:first-child .ro-chip')).toEqual(['GPT-6 Astra · Breadth T=0.8']);
    expect(texts(root, '.ro-models-side--right .ro-chip')).toEqual(['Claude Opus 5.5 · Depth T=0.0']);
    expect(texts(root, '.ro-legend-item')).toEqual([
      'Active path',
      'GPT-6 Astra (Explore)',
      'Claude Opus 5.5 (Repair)',
      '✕Pruned',
    ]);
    expect(root.querySelector('.ro-entropy svg')).not.toBeNull();
    expect(texts(root, '.ro-panel-title')).toEqual([
      'Step entropy · T=0.8 vs T=0.0',
      'Refinement pipeline · 4 stages',
      'Compute scaling · Resample vs Refinement',
    ]);
    expect([...root.querySelectorAll('.ro-step')].map((s) => s.getAttribute('data-status'))).toEqual([
      'done',
      'done',
      'done',
      'active',
    ]);
    expect(texts(root, '.ro-benchmark')).toEqual(['MATH500 58.8% (+28.0)', 'AMC 81.2% (+7.5)', 'Olympiad 35.1%']);
    expect(root.querySelector('.ro-scaling svg')).not.toBeNull();
    expect(root.querySelector('.ro-reset')).toBeNull();
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
    const el = await mount(fixture, { 'show-panels': 'false', 'show-top-chart': 'false', 'show-annotations': 'false' });
    const root = el.shadowRoot!;
    expect(root.querySelector('.ro-panels')).toBeNull();
    expect(root.querySelector('.ro-top')).toBeNull();
    expect(root.querySelector('.ro-note')).toBeNull();
    const svg = root.querySelector('svg.ro-svg');
    el.showLegend = false;
    await el.updateComplete;
    await flush();
    expect(root.querySelector('.ro-legend')).toBeNull();
    expect(root.querySelector('svg.ro-svg')).toBe(svg);
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
