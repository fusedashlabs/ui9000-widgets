// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import defaultFixture from '../../../stories/fixtures/goals-dependency-graph.default.json';
import type { Ui9000GoalsDependencyGraph } from '../index.js';

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
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;
  // jsdom draws no canvas: the graph's instruments and labels are what it can test
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  await import('../index.js');
  await import('../../chart-renderer/index.js');
}, 60_000);

const flush = () => new Promise((r) => setTimeout(r, 60));

async function mount(data: unknown, attrs: Record<string, string> = {}): Promise<Ui9000GoalsDependencyGraph> {
  const el = document.createElement('ui9000-goals-dependency-graph');
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

/** Each match's text as it reads: its pieces of text, one space between. */
const texts = (root: Element | ShadowRoot, selector: string) =>
  [...root.querySelectorAll(selector)].map((node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const parts: string[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent?.replace(/\s+/g, ' ').trim();
      if (text) parts.push(text);
    }
    return parts.join(' ');
  });

/** The shared chart tooltip on the page, while it is open. */
const OPEN_TIP = '[data-ui9000-chart-tooltip].is-open';
const tooltip = () => texts(document.body, OPEN_TIP)[0] ?? '';

afterEach(() => {
  document.body.replaceChildren();
});

describe('ui9000-goals-dependency-graph', () => {
  it('roots every goal on the baseline with its tree, ring and label, under the row of groups', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    expect(root.querySelector('.gd-scene .gd-floor')).not.toBeNull();
    expect(root.querySelector('.gd-scene .gd-field')).not.toBeNull();
    // the centre first: the goal holding the most agents
    const roots = [...root.querySelectorAll('g.gd-root')].map((g) => g.getAttribute('data-goal'));
    expect(roots[0]).toBe('onboarding-velocity');
    expect(roots).toHaveLength(6);
    expect(root.querySelectorAll('g.gd-tree .gd-limbs')).toHaveLength(6);
    const centre = root.querySelector('g.gd-root[data-goal="onboarding-velocity"]')!;
    for (const part of ['.gd-ticks.on', '.gd-progress', '.gd-needle', '.gd-rest']) expect(centre.querySelector(part)?.getAttribute('d'), part).toBeTruthy();

    // the groups, named, with what they hold across the goals
    expect(texts(root, '.gd-resource-name')).toEqual(['Camera', 'App', 'System 94', 'Tool 38', 'Store', 'Model 56', 'Human 5']);
    const core = (id: string) => root.querySelector(`[data-resource="${id}"] .gd-diamond-core`)!;
    expect(core('system').getAttribute('fill')).toBe('var(--gd-blocked)');
    expect(core('tool').getAttribute('fill')).toBe('var(--gd-failed)');
    expect(core('store').getAttribute('display')).toBe('none');
    expect(root.querySelector('[data-resource="camera"] .gd-diamond-dot')!.getAttribute('display')).toBeNull();

    // a line per goal and group, coloured by what it holds
    const lines = [...root.querySelectorAll('g.gd-edge .gd-edge-line')];
    expect(lines).toHaveLength(19);
    expect(lines.filter((l) => l.getAttribute('stroke') === 'var(--gd-blocked)')).toHaveLength(1);

    // the centre's label reads in full; the others in a line
    const label = root.querySelector('.gd-label[data-goal="onboarding-velocity"]')!;
    expect(label.classList.contains('is-main')).toBe(true);
    expect(texts(label, '.gd-label-head')).toEqual(['G-007 BLOCKED']);
    expect(texts(label, '.gd-label-name')).toEqual(['Onboarding Velocity']);
    expect(texts(label, '.gd-reading')).toEqual(['Agents 842', 'Progress 41%', 'Burn 4.2×', 'Held 175']);
    expect(texts(root, '.gd-label[data-goal="pipeline-quality"] .gd-readout-line')).toEqual(['318 agents · 0 held']);
  });

  it('traces the centre goal’s worst line, with its cause, how many it holds and who owns it', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const trace = root.querySelector('.gd-trace')!;
    expect(texts(trace, '.gd-label-head')).toEqual(['G-007 → System Blocked']);
    expect(texts(trace, '.gd-trace-title')).toEqual(['Credential grant required']);
    expect(texts(trace, '.gd-reading')).toEqual(['Held 94', 'For 14m', 'Rule R-047', 'Owner Security on-call']);
    expect(root.querySelectorAll('.gd-edge-line.is-bright')).toHaveLength(1);
  });

  it('reads the graph in the line under the title', async () => {
    const el = await mount(defaultFixture);
    expect(texts(el.shadowRoot!, '.gd-reading-line')).toEqual(['6 goals 7 resource groups 3,120 agents 214 held']);
  });

  it('glides a clicked goal to the centre, and traces a clicked group', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    root.querySelector<HTMLButtonElement>('.gd-label[data-goal="incident-response"]')!.click();
    await waitFor(() => root.querySelector('.gd-label.is-main')?.getAttribute('data-goal') === 'incident-response');
    expect(el.center).toBe('incident-response');
    // its own worst line is traced now: the people it waits on
    await waitFor(() => texts(root, '.gd-trace .gd-trace-title')[0] === 'Access approval pending');

    root.querySelector('[data-resource="store"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await waitFor(() => texts(root, '.gd-trace .gd-label-head')[0] === 'Resource group Flowing');
    expect(texts(root, '.gd-trace .gd-reading')).toEqual(['Goals 2', 'Held 0', 'Calls /min 1.7K', 'Degraded 0']);
  });

  it('starts from the goal the payload puts at the centre', async () => {
    const el = await mount({ ...defaultFixture, center: 'G-061' });
    const root = el.shadowRoot!;
    expect(root.querySelector('.gd-label.is-main')?.getAttribute('data-goal')).toBe('model-drift-watch');
    // nothing of it is held: no line is traced
    expect(root.querySelector('.gd-trace')).toBeNull();
  });

  it('explains a group on hover in the shared tooltip', async () => {
    const el = await mount(defaultFixture);
    const group = el.shadowRoot!.querySelector('[data-resource="system"]')!;
    group.dispatchEvent(new MouseEvent('mouseenter', { clientX: 200, clientY: 120 }));
    await waitFor(() => tooltip().length > 0);
    expect(tooltip()).toContain('System · 1,284');
    expect(tooltip()).toContain('94 agents are held here');
  });

  it('opens the legend inside its shell, beside its button', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    root.querySelector<HTMLButtonElement>('.gd-legend-button')!.click();
    await el.updateComplete;
    const legend = root.querySelector<HTMLElement>('.gd-legend')!;
    expect(legend.parentElement?.classList.contains('widget-shell')).toBe(true);
    expect(texts(legend, 'h2')).toEqual(['Reading the graph']);
    // placed by its offset in the shell, not the window
    expect(legend.style.left).toMatch(/px$/);
    expect(legend.style.bottom).toMatch(/px$/);
  });

  it('shows the empty state without goals', async () => {
    const el = await mount({ goals: [] });
    expect(texts(el.shadowRoot!, '.empty')).toEqual(['No goal data']);
  });
});
