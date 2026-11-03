// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import defaultFixture from '../../../stories/fixtures/bipartite.default.json';
import type { Ui9000BipartiteGraph } from '../index.js';
import { FLAT_CAMERA } from '../render/index.js';

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
  // jsdom draws no canvas: the map's instruments and labels are what it can test
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  await import('../index.js');
  await import('../../chart-renderer/index.js');
}, 60_000);

const flush = () => new Promise((r) => setTimeout(r, 60));

async function mount(data: unknown): Promise<Ui9000BipartiteGraph> {
  const el = document.createElement('ui9000-bipartite-graph');
  el.setAttribute('data', JSON.stringify(data));
  document.body.append(el);
  await el.updateComplete;
  await flush();
  return el;
}

/** Gives the plot a size and lets the map refit. */
async function sized(el: Ui9000BipartiteGraph, width: number, height: number): Promise<void> {
  const chart = el.shadowRoot!.querySelector<HTMLElement>('.chart-root')!;
  Object.defineProperty(chart, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(chart, 'clientHeight', { value: height, configurable: true });
  for (const cb of observed) cb();
  await flush();
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
const tipRows = () => texts(document.body, `${OPEN_TIP} .ui9000-chart-tooltip__row`);

const ribbon = (root: ShadowRoot, key: string) => root.querySelector(`g.bp-ribbon[data-dependency="${key}"]`)!;
const opacity = (node: Element) => Number(node.getAttribute('opacity'));

afterEach(() => {
  document.body.replaceChildren();
});

describe('ui9000-bipartite-graph', () => {
  it('lines the goals up against their resource groups, with a ribbon for each pair, over the scene', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    expect(root.querySelector('.gp-scene .gp-floor')).not.toBeNull();
    expect(root.querySelector('.gp-scene .gp-field')).not.toBeNull();
    expect([...root.querySelectorAll('g.gp-goal')].map((g) => g.getAttribute('data-goal'))).toEqual([
      'perimeter-watch',
      'onboarding-velocity',
      'maintain-verified-asset-visibility',
      'pipeline-quality',
      'incident-response',
      'model-drift-watch',
    ]);
    const onboarding = root.querySelector('g.gp-goal[data-goal="onboarding-velocity"]')!;
    for (const part of ['.gp-ticks.on', '.gp-progress', '.gp-needle', '.gp-glass']) {
      expect(onboarding.querySelector(part)?.getAttribute('d') ?? onboarding.querySelector(part)?.getAttribute('r'), part).toBeTruthy();
    }
    // the goal's callout hangs left of its ring, as on the perimeter
    const callout = root.querySelector('.gp-callout[data-goal="onboarding-velocity"]')!;
    expect(callout.classList.contains('is-left')).toBe(true);
    expect(texts(callout, '.gp-callout-head')).toEqual(['G-007 BLOCKED']);
    expect(texts(callout, '.gp-callout-name')).toEqual(['Onboarding Velocity']);
    expect(root.querySelectorAll('.gp-leader')).toHaveLength(6);

    // the groups: a diamond each, filled by what the goals meet there, and a label
    const diamonds = [...root.querySelectorAll('g.bp-resource')];
    expect(diamonds.map((d) => d.getAttribute('data-resource'))).toEqual(['camera', 'app', 'system', 'tool', 'store', 'model', 'human']);
    const core = (key: string) => root.querySelector(`g.bp-resource[data-resource="${key}"] .gp-diamond-core`)!;
    expect(core('tool').getAttribute('fill')).toBe('var(--gp-failed)');
    expect(core('system').getAttribute('fill')).toBe('var(--gp-blocked)');
    expect(core('model').getAttribute('fill')).toBe('var(--gp-awaiting)');
    expect(core('store').getAttribute('display')).toBe('none');
    expect(root.querySelector('g.bp-resource[data-resource="camera"] .gp-diamond-dot')!.getAttribute('display')).toBeNull();
    expect(texts(root, '.bp-resource-callout[data-resource="system"] .gp-callout-head')).toEqual(['System Blocked']);
    expect(texts(root, '.bp-resource-callout[data-resource="system"] .bp-resource-name')).toEqual(['1,284 systems of record']);
    expect(texts(root, '.bp-resource-callout[data-resource="model"] .bp-resource-line')).toEqual(['6 goals · 26.2k calls /min · 56 held']);
    expect(texts(root, '.bp-resource-callout[data-resource="store"] .bp-resource-line')).toEqual(['2 goals · 1.7k calls /min']);

    // nineteen ribbons, in the colour of how each goal fares there
    expect(root.querySelectorAll('g.bp-ribbon')).toHaveLength(19);
    const stroke = (key: string) => ribbon(root, key).querySelector('.bp-ribbon-line')!.getAttribute('stroke');
    expect(stroke('onboarding-velocity→tool')).toBe('var(--gp-failed)');
    expect(stroke('onboarding-velocity→system')).toBe('var(--gp-blocked)');
    expect(stroke('perimeter-watch→model')).toBe('var(--gp-awaiting)');
    expect(stroke('perimeter-watch→camera')).toBe('var(--gp-warn)');
    expect(stroke('pipeline-quality→store')).toBe('var(--gp-line)');
    // the busier, the wider: Perimeter Watch's cameras take the most calls
    const width = (key: string) => Number(ribbon(root, key).querySelector('.bp-ribbon-band')!.getAttribute('stroke-width'));
    expect(width('perimeter-watch→camera')).toBe(14);
    expect(width('onboarding-velocity→human')).toBeLessThan(2);
    // held ribbons are drawn over the rest
    const order = [...root.querySelectorAll('g.bp-ribbon')].map((g) => g.getAttribute('data-dependency'));
    expect(order.indexOf('onboarding-velocity→system')).toBeGreaterThan(order.indexOf('pipeline-quality→store'));
  });

  it('reads the map under the title, with the ribbons’ key beside it, and says in the corner which groups these are', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    expect(texts(root, '.widget-title')).toEqual(['Agent operations']);
    expect(texts(root, '.gp-reading-line')).toEqual(['6 goals on map 3,120 agents 214 held']);
    expect(texts(root, '.bp-key')).toEqual(['Ribbon to a group · wider = more calls Flows Slowed Holding Blocked Failed']);
    expect(texts(root, '.gp-frame .bp-corner')).toEqual(['7 of 21 resource groups — the ones these goals draw on']);
  });

  it('shows the readouts with room, and folds them away on a smaller map', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const compact = () => root.querySelector('.gp-callout-label')!.classList.contains('is-compact');
    await sized(el, 1400, 760);
    await waitFor(() => !compact());
    expect(root.querySelector('.bp-resource-label')!.classList.contains('is-compact')).toBe(false);
    await sized(el, 900, 560);
    await waitFor(() => compact());
    expect(el.hasAttribute('data-compact')).toBe(true);
    expect(root.querySelector('.bp-resource-label')!.classList.contains('is-compact')).toBe(true);
    // too small for labels beside the columns: they fold away, and come back with room
    const stage = root.querySelector('.gp-stage')!;
    await sized(el, 400, 520);
    await waitFor(() => stage.hasAttribute('data-tiny'));
    await sized(el, 900, 560);
    await waitFor(() => !stage.hasAttribute('data-tiny'));
  });

  it('keeps only the legend at the bottom left, and explains the marks in it', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const controls = root.querySelector('.gp-controls')!;
    expect([...controls.children].map((child) => child.getAttribute('aria-label'))).toEqual(['Legend']);
    const button = root.querySelector<HTMLButtonElement>('.gp-legend-button')!;
    button.click();
    await el.updateComplete;
    const legend = root.querySelector<HTMLElement>('.gp-legend')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    // inside the shell, its foot level with the button's
    expect(legend.style.left).toMatch(/px$/);
    expect(legend.style.bottom).toMatch(/px$/);
    expect(texts(legend, 'h2')).toEqual(['Reading the map']);
    expect(texts(legend, 'h3')).toEqual(['Marks', 'A resource group, for all goals']);
    expect(texts(legend, '.gp-legend-row')).toContain('A blocked agent');
    expect(texts(legend, '.gp-legend-row').some((row) => row.startsWith('A ribbon joins a goal to each group it draws on'))).toBe(true);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(root.querySelector('.gp-legend')).toBeNull();
    el.showLegend = false;
    await el.updateComplete;
    expect(root.querySelector('.gp-legend-button')).toBeNull();
  });

  it('lights what a goal or a group is tied to, and explains goals, groups and ribbons', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const mark = root.querySelector('g.gp-goal[data-goal="model-drift-watch"] .gp-goal-mark')!;
    mark.dispatchEvent(new MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    await flush();
    expect(mark.classList.contains('is-lit')).toBe(true);
    // its one ribbon stays in full, the rest step back; so does every group but the one it draws on
    expect(opacity(ribbon(root, 'model-drift-watch→model'))).toBe(1);
    expect(opacity(ribbon(root, 'perimeter-watch→camera'))).toBe(0.5);
    expect(opacity(root.querySelector('g.bp-resource[data-resource="model"]')!)).toBe(1);
    expect(opacity(root.querySelector('g.bp-resource[data-resource="camera"]')!)).toBe(0.5);
    await waitFor(() => !!tooltip());
    expect(tooltip()).toMatch(/^G-061 · Model Drift Watch Each dot is one agent\./);
    mark.dispatchEvent(new MouseEvent('mouseleave'));
    await flush();
    expect(opacity(ribbon(root, 'perimeter-watch→camera'))).toBe(1);

    const tool = root.querySelector('g.bp-resource[data-resource="tool"]')!;
    tool.dispatchEvent(new MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    await flush();
    expect(tool.querySelector('.gp-diamond-trace')!.getAttribute('display')).toBeNull();
    expect(root.querySelector('.bp-resource-callout[data-resource="tool"]')!.classList.contains('is-lit')).toBe(true);
    await waitFor(() => tooltip().startsWith('Tool · 4,612 tools'));
    expect(tooltip()).toContain('38 agents are held here, across 2 of the 3 goals that draw on it.');
    expect(tipRows()).toEqual([
      'Onboarding Velocity 27 failed',
      'Maintain Verified Asset Visibility 11 failed',
      'Pipeline Quality flows',
      'Calls 5.7k a minute',
      'Whole group 4,570 healthy · 38 degraded · 4 impaired',
    ]);
    tool.dispatchEvent(new MouseEvent('mouseleave'));
    await el.updateComplete;

    const held = ribbon(root, 'onboarding-velocity→system');
    held.dispatchEvent(new MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    await waitFor(() => tooltip().startsWith('Onboarding Velocity → System'));
    expect(tooltip()).toContain('94 agents of Onboarding Velocity are blocked here — Credential grant required');
    expect(tipRows()).toContain('Shared with 2 other goals');
    held.dispatchEvent(new MouseEvent('mouseleave'));
    await el.updateComplete;
    expect(tooltip()).toBe('');
  });

  it('pans on a drag, zooms on the wheel, and resets on a double click', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const stage = root.querySelector<HTMLElement>('.gp-stage')!;
    stage.setPointerCapture = () => {};
    const pointer = (type: string, x: number, y: number) =>
      stage.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true, clientX: x, clientY: y, button: 0 }));
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 160, 120);
    pointer('pointerup', 160, 120);
    await el.updateComplete;
    expect(el.camera).toEqual({ ...FLAT_CAMERA, panX: 60, panY: 20 });
    stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -80, bubbles: true, cancelable: true }));
    await waitFor(() => el.camera.zoom > 1.05);
    expect(el.camera.yaw).toBe(0);
    stage.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await flush();
    expect(el.camera).toEqual(FLAT_CAMERA);
  });

  it('with problems only, leaves what is held standing out', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    el.problemsOnly = true;
    await el.updateComplete;
    await flush();
    expect(opacity(ribbon(root, 'onboarding-velocity→tool'))).toBe(1);
    expect(opacity(ribbon(root, 'perimeter-watch→camera'))).toBeCloseTo(0.6);
    expect(opacity(ribbon(root, 'pipeline-quality→store'))).toBeCloseTo(0.22);
    expect(opacity(root.querySelector('g.bp-resource[data-resource="store"]')!)).toBeCloseTo(0.22);
    // a goal none of whose agents is held steps back with its callout
    expect(opacity(root.querySelector('g.gp-goal[data-goal="pipeline-quality"]')!)).toBeCloseTo(0.35);
    expect(opacity(root.querySelector('g.gp-goal[data-goal="onboarding-velocity"]')!)).toBe(1);
  });

  it('shows an empty state without goals, and mounts through chart-renderer by its chart type', async () => {
    const empty = await mount({ goals: [] });
    expect(texts(empty.shadowRoot!, '.empty')).toEqual(['No goal data']);
    expect(empty.shadowRoot!.querySelector('g.bp-ribbon')).toBeNull();

    const renderer = document.createElement('ui9000-chart-renderer');
    renderer.setAttribute('data', JSON.stringify(defaultFixture));
    document.body.append(renderer);
    await waitFor(() => !!renderer.shadowRoot?.querySelector('ui9000-bipartite-graph'));
  });
});
