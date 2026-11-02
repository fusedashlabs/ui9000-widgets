// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import defaultFixture from '../../../stories/fixtures/goal-burst.default.json';
import type { Ui9000GoalBurst } from '../index.js';

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
  // jsdom draws no canvas: the burst's instruments and labels are what it can test
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  await import('../index.js');
  await import('../../chart-renderer/index.js');
}, 60_000);

const flush = () => new Promise((r) => setTimeout(r, 60));

async function mount(data: unknown): Promise<Ui9000GoalBurst> {
  const el = document.createElement('ui9000-goal-burst');
  el.setAttribute('data', JSON.stringify(data));
  document.body.append(el);
  await el.updateComplete;
  await flush();
  return el;
}

/** Gives the plot a size and lets the burst refit. */
async function sized(el: Ui9000GoalBurst, width: number, height: number): Promise<void> {
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

const opacity = (node: Element) => Number((node as HTMLElement).style.opacity);
const band = (root: ShadowRoot, id: string) => root.querySelector(`g.gb-band[data-band="${id}"]`)!;

/** jsdom has no PointerEvent: a mouse event under the pointer event's name stands in. */
const pointer = (target: Element, type: string, x = 10, y = 10, init: ConstructorParameters<typeof MouseEvent>[1] = {}) =>
  target.dispatchEvent(new MouseEvent(type, { button: 0, clientX: x, clientY: y, bubbles: true, composed: true, ...init }));

afterEach(() => {
  document.body.replaceChildren();
});

describe('ui9000-goal-burst', () => {
  it('throws the goal’s calls out of its cloud, a sector per group, over the scene', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    expect(root.querySelector('.ah-scene .ah-grid-floor')).not.toBeNull();
    expect(root.querySelector('.ah-scene .ah-field')).not.toBeNull();
    expect(root.querySelector('.ah-scene .gb-motes')).not.toBeNull();

    // the cloud's ring, and the clock on the floor, its figures in the aisle facing the viewer
    expect(root.querySelector('svg.ah-overlay [data-tip="goal"]')).not.toBeNull();
    expect(root.querySelector('svg.ah-overlay .ah-draw')).not.toBeNull();
    expect(texts(root, 'svg.ah-overlay .gb-guide')).toEqual(['0.1s', '0.5s', '1s', '2s']);

    // a sector each, the busiest first, with its spikes and its band of assets
    expect([...root.querySelectorAll('g.gb-band')].map((g) => g.getAttribute('data-band'))).toEqual(['RG-MODEL', 'RG-SYS', 'RG-APP', 'RG-TOOL', 'RG-HUMAN']);
    const held = (id: string) => [...root.querySelectorAll(`g.gb-spikes[data-sector="${id}"] .gb-spike-held`)].map((p) => p.getAttribute('stroke'));
    expect(held('RG-SYS').sort()).toEqual(['var(--ah-awaiting)', 'var(--ah-awaiting)', 'var(--ah-blocked)', 'var(--ah-blocked)']);
    expect(held('RG-TOOL')).toEqual(['var(--ah-failed)']);
    expect(root.querySelector('g.gb-spikes[data-sector="RG-APP"] .gb-spike-slowed')!.getAttribute('stroke')).toBe('var(--ah-warn)');
    expect(root.querySelectorAll('g.gb-spikes .gb-p95').length).toBeGreaterThanOrEqual(4);
    // a ringed mark on the band for each asset in trouble
    expect(root.querySelectorAll('g.gb-trouble').length).toBe(6);

    // a label beside the burst reads each group
    expect(texts(root, '.ah-label-title')).toEqual(['MODEL 33 awaiting', 'SYSTEM 94 blocked', 'APP Slowed', 'TOOL 27 failed', 'HUMAN Slowed']);
    expect(texts(root, '.ah-label-count')).toContain('9 systems of record');
  });

  it('reads the goal under the title, with the spikes’ key beside it, and says in the corner what it draws on', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    expect(texts(root, '.widget-title')).toEqual(['Onboarding Velocity']);
    expect(texts(root, '.ah-reading-line')).toEqual(['G-007 Blocked 842 agents 175 held']);
    expect(texts(root, '.gb-key')).toEqual(['Spike = a call · longer = slower answer Flows Slowed Holding Blocked Failed 95% answered']);
    expect(texts(root, '.gb-frame .gb-corner > span')).toEqual(['5 of 21 resource groups', '56 assets · 16.7K calls /min']);
  });

  it('shows the readouts with room, folds them away on a smaller card, and drops the labels on a narrow one', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const stage = root.querySelector('.gb-stage')!;
    await sized(el, 1400, 760);
    await waitFor(() => root.querySelectorAll('.ah-readout').length === 5);
    expect(texts(root, '.ah-label-body[data-section="RG-SYS"] .ah-reading .ah-faint')).toEqual(['Calls /min', '95% within', 'Held up']);
    expect(texts(root, '.ah-label-body[data-section="RG-SYS"] .ah-reading-value')[0]).toBe('5.4K');
    expect(texts(root, '.ah-label-body[data-section="RG-SYS"] .ah-trouble-asset')).toEqual(['crm-prod', 'hr-records']);
    await sized(el, 900, 560);
    await waitFor(() => stage.hasAttribute('data-compact'));
    expect(el.hasAttribute('data-compact')).toBe(true);
    expect(root.querySelectorAll('.ah-readout').length).toBe(0);
    expect(root.querySelectorAll('.ah-label-line').length).toBe(5);
    await sized(el, 420, 520);
    await waitFor(() => stage.hasAttribute('data-tiny'));
    expect(root.querySelectorAll('.ah-label').length).toBe(0);
    // the marks still explain themselves
    expect(root.querySelectorAll('g.gb-band').length).toBe(5);
    await sized(el, 1400, 760);
    await waitFor(() => !stage.hasAttribute('data-tiny') && root.querySelectorAll('.ah-label').length === 5);
  });

  it('keeps only the legend at the bottom left, and explains the burst in it', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const controls = root.querySelector('.ah-controls')!;
    expect([...controls.children].map((child) => child.getAttribute('aria-label'))).toEqual(['Legend']);
    const button = root.querySelector<HTMLButtonElement>('.ah-legend-button')!;
    button.click();
    await el.updateComplete;
    const legend = root.querySelector<HTMLElement>('.ah-legend')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    // inside the shell, its foot level with the button's
    expect(legend.style.left).toMatch(/px$/);
    expect(legend.style.bottom).toMatch(/px$/);
    expect(texts(legend, 'h2')).toEqual(['Reading the goal']);
    expect(texts(legend, 'h3')).toEqual(['Marks', 'A goal and its resource groups']);
    expect(texts(legend, '.ah-legend-row').some((row) => row.startsWith('A spike is one call'))).toBe(true);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(root.querySelector('.ah-legend')).toBeNull();
    el.showLegend = false;
    await el.updateComplete;
    expect(root.querySelector('.ah-legend-button')).toBeNull();
  });

  it('lights a sector under the pointer, explains it and its assets in trouble, and picks it out on click', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const hit = root.querySelector('g.gb-band[data-band="RG-SYS"] [data-tip="section:RG-SYS"]')!;
    pointer(hit, 'pointermove');
    await flush();
    expect(opacity(band(root, 'RG-SYS'))).toBe(1);
    expect(opacity(band(root, 'RG-APP'))).toBe(0.62);
    await waitFor(() => tooltip().startsWith('SYSTEM · 9 systems of record'));
    expect(tooltip()).toContain('94 of Onboarding Velocity’s agents are held here');
    expect(tipRows()).toContain('Calls 5.4K a minute · 32% of the goal’s');
    expect(tipRows().some((row) => /^Answered 95% within 0\.\ds$/.test(row))).toBe(true);
    expect(tipRows()).toContain('Volume 12.8MB a minute');
    expect(tipRows()).toContain('Shared with 2 other goals');

    const crm = [...root.querySelectorAll('g.gb-trouble')].find((g) => g.getAttribute('data-trouble')!.endsWith('crm-prod'))!;
    pointer(crm, 'pointermove');
    await waitFor(() => tooltip().startsWith('crm-prod · Blocked'));
    expect(tipRows()).toContain('Group SYSTEM');
    expect(tipRows()).toContain('Agents held 84');

    pointer(hit, 'click');
    await flush();
    expect(opacity(band(root, 'RG-APP'))).toBe(0.3);
    expect(root.querySelector<HTMLButtonElement>('.ah-label-head[data-pick="RG-SYS"]')!.getAttribute('aria-pressed')).toBe('true');
    // a redraw keeps the pick
    el.draw();
    await flush();
    expect(opacity(band(root, 'RG-APP'))).toBe(0.3);
    pointer(root.querySelector('.gb-stage')!, 'click');
    await flush();
    pointer(root.querySelector('.gb-stage')!, 'pointerleave');
    await flush();
    expect(opacity(band(root, 'RG-APP'))).toBe(1);
  });

  it('turns on a drag, pans on a shift-drag, zooms on the wheel, and double-click sets it back', async () => {
    const el = await mount(defaultFixture);
    const stage = el.shadowRoot!.querySelector<HTMLElement>('.gb-stage')!;
    stage.setPointerCapture = () => {};
    const rest = el.camera;
    pointer(stage, 'pointerdown', 100, 100);
    pointer(stage, 'pointermove', 150, 100);
    pointer(stage, 'pointerup', 150, 100);
    expect(el.camera.yaw).toBeCloseTo(rest.yaw + 50 * 0.006);
    pointer(stage, 'pointerdown', 100, 100, { shiftKey: true });
    pointer(stage, 'pointermove', 140, 120, { shiftKey: true });
    pointer(stage, 'pointerup', 140, 120, { shiftKey: true });
    expect(el.camera).toMatchObject({ panX: 40, panY: 20 });
    stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -80, bubbles: true, cancelable: true }));
    await waitFor(() => el.camera.zoom > 1.05);
    stage.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await flush();
    expect(el.camera).toEqual({ yaw: -0.34, pitch: 0.26, zoom: 1, panX: 0, panY: 0 });
  });

  it('with problems only, leaves what is held standing out', async () => {
    const flowing = (root: ShadowRoot) => opacity(root.querySelector('g.gb-spikes[data-sector="RG-SYS"] path')!);
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const before = flowing(root);
    el.problemsOnly = true;
    await el.updateComplete;
    await flush();
    expect(flowing(root)).toBeCloseTo(before * 0.22);
    // the held spikes keep their light
    expect(opacity(root.querySelector('g.gb-spikes[data-sector="RG-SYS"] .gb-spike-held')!)).toBe(0.72);

    // only the systems of record hold anybody: the goal has no agents awaiting or failed to seat elsewhere
    const calm = await mount({
      ...defaultFixture,
      goal: { ...defaultFixture.goal, awaiting: 0, failed: 0 },
      categories: defaultFixture.categories.map(({ problems: _problems, hold: _hold, ...c }) => (c.id === 'RG-SYS' ? c : { ...c, traffic: { flowing: 1 } })),
    });
    calm.problemsOnly = true;
    await calm.updateComplete;
    await flush();
    expect(opacity(band(calm.shadowRoot!, 'RG-APP'))).toBe(0.3);
    expect(opacity(band(calm.shadowRoot!, 'RG-SYS'))).toBe(1);
  });

  it('shows an empty state without a goal, and mounts through chart-renderer by its chart type', async () => {
    const empty = await mount({ categories: [] });
    expect(texts(empty.shadowRoot!, '.empty')).toEqual(['No goal data']);
    expect(empty.shadowRoot!.querySelector('.gb-stage')).toBeNull();

    const renderer = document.createElement('ui9000-chart-renderer');
    renderer.setAttribute('data', JSON.stringify(defaultFixture));
    document.body.append(renderer);
    await waitFor(() => !!renderer.shadowRoot?.querySelector('ui9000-goal-burst'));
  });
});
