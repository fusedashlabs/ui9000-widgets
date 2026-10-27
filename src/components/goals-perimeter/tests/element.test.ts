// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import defaultFixture from '../../../stories/fixtures/goals-perimeter.default.json';
import type { Ui9000GoalsPerimeterChart } from '../index.js';
import { DEFAULT_CAMERA } from '../lib/index.js';
import { applyWidgetContext } from '../../../context/widget-context.js';

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
  // jsdom draws no canvas: the board's instruments and labels are what it can test
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  await import('../index.js');
  await import('../../chart-renderer/index.js');
}, 60_000);

const flush = () => new Promise((r) => setTimeout(r, 60));
/** Lets the zoom into or out of a goal finish. */
const settle = () => new Promise((r) => setTimeout(r, 520));

async function mount(data: unknown): Promise<Ui9000GoalsPerimeterChart> {
  const el = document.createElement('ui9000-goals-perimeter');
  el.setAttribute('data', JSON.stringify(data));
  document.body.append(el);
  await el.updateComplete;
  await flush();
  return el;
}

/** Gives the plot a size and lets the board refit. */
async function sized(el: Ui9000GoalsPerimeterChart, width: number, height: number): Promise<void> {
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
const card = () => document.querySelector<HTMLElement>('[data-ui9000-chart-tooltip]');

/** The chart's tip, as it reads. */
const tooltip = () => texts(document.body, OPEN_TIP)[0] ?? '';
const tipRows = () => texts(document.body, `${OPEN_TIP} .ui9000-chart-tooltip__row`);

afterEach(() => {
  document.body.replaceChildren();
});

describe('ui9000-goals-perimeter', () => {
  it('draws each goal with its ring, orbit and diamonds, and a callout, over the scene', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    // the scene behind the board, and the agents' picture in it
    expect(root.querySelector('.gp-scene .gp-floor')).not.toBeNull();
    expect(root.querySelector('.gp-scene .gp-field')).not.toBeNull();
    const goals = [...root.querySelectorAll('g.gp-goal')];
    expect(goals.map((g) => g.getAttribute('data-goal'))).toEqual([
      'perimeter-watch',
      'onboarding-velocity',
      'maintain-verified-asset-visibility',
      'pipeline-quality',
      'incident-response',
      'model-drift-watch',
    ]);
    const onboarding = root.querySelector('g.gp-goal[data-goal="onboarding-velocity"]')!;
    for (const part of ['.gp-orbit.far', '.gp-orbit.near', '.gp-ticks.on', '.gp-progress', '.gp-glint', '.gp-needle', '.gp-glass']) {
      expect(onboarding.querySelector(part)?.getAttribute('d') ?? onboarding.querySelector(part)?.getAttribute('r'), part).toBeTruthy();
    }
    // its diamonds, named, the held ones with their count
    expect(texts(onboarding, '.gp-satellite-name')).toEqual(['APP', 'SYSTEM 94', 'TOOL 27', 'MODEL 33', 'HUMAN']);
    const core = (key: string) => onboarding.querySelector(`[data-slot="rg:${key}"] .gp-diamond-core`)!;
    expect(core('tool').getAttribute('fill')).toBe('var(--gp-failed)');
    expect(core('system').getAttribute('fill')).toBe('var(--gp-blocked)');
    expect(core('model').getAttribute('fill')).toBe('var(--gp-awaiting)');
    expect(core('app').getAttribute('display')).toBe('none');
    expect(onboarding.querySelector('[data-slot="rg:app"] .gp-diamond-dot')!.getAttribute('display')).toBeNull();
    // seven links, the crashing tool's in failed red
    const links = [...root.querySelectorAll('g.gp-link')];
    expect(links).toHaveLength(7);
    const red = links.filter((l) => l.querySelector('.gp-link-line')!.getAttribute('stroke') === 'var(--gp-failed)');
    expect(red.map((l) => l.getAttribute('data-link'))).toEqual(['tool:onboarding-velocity|maintain-verified-asset-visibility']);
    // a callout per goal: code, status, name and the readout
    const callout = root.querySelector('.gp-callout[data-goal="onboarding-velocity"]')!;
    expect(texts(callout, '.gp-callout-head')).toEqual(['G-007 BLOCKED']);
    expect(texts(callout, '.gp-callout-name')).toEqual(['Onboarding Velocity']);
    expect(texts(callout, '.gp-reading')).toEqual(['Agents 842', 'Progress 41%', 'Burn 4.2×', 'Held 175']);
    expect(root.querySelectorAll('.gp-leader')).toHaveLength(6);
  });

  it('reads the board under the title', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    expect(texts(root, '.widget-title')).toEqual(['Agent operations']);
    expect(texts(root, '.gp-reading-line')).toEqual(['6 goals on map 3,120 agents 214 held']);
    expect(root.querySelector('.gp-reading-line .gp-held')?.textContent).toBe('214 held');
  });

  it('shows the readout with room, and folds it away on a smaller board', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const compact = () => root.querySelector('.gp-callout-label')!.classList.contains('is-compact');
    await sized(el, 1400, 760);
    await waitFor(() => !compact());
    expect(el.hasAttribute('data-compact')).toBe(false);
    await sized(el, 900, 560);
    await waitFor(() => compact());
    expect(el.hasAttribute('data-compact')).toBe(true);
    // compact, the readout is one line under the pointer
    expect(texts(root, '.gp-callout[data-goal="perimeter-watch"] .gp-readout-line')).toEqual(['1,108 agents · 88% · 19 held']);
    // zoomed in, there is room again
    el.zoomBy(1.6);
    await waitFor(() => !compact());
  });

  it('keeps only the legend at the bottom left, with no angle readout; the camera still flattens and zooms through the element', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const controls = root.querySelector('.gp-controls')!;
    expect([...controls.children].map((child) => child.getAttribute('aria-label'))).toEqual(['Legend']);
    expect(root.querySelector('.gp-dim, .gp-zoom-reading, [aria-label="Zoom in"]')).toBeNull();
    expect(root.querySelector('.gp-angle')).toBeNull();
    el.zoomBy(1.25);
    await flush();
    expect(el.camera.zoom).toBeCloseTo(1.25);
    el.resetCamera();
    await flush();
    expect(el.camera).toEqual(DEFAULT_CAMERA);

    // 2D: a plan view
    el.dims = '2D';
    await flush();
    expect(el.dims).toBe('2D');
    el.dims = '3D';
    await flush();
    expect(el.dims).toBe('3D');
  });

  it('turns the board on a drag, swallowing the click that ends it, and zooms on the wheel', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const stage = root.querySelector<HTMLElement>('.gp-stage')!;
    stage.setPointerCapture = () => {};
    const mark = root.querySelector('g.gp-goal[data-goal="perimeter-watch"] .gp-goal-mark')!;
    const pointer = (type: string, x: number, y: number) =>
      mark.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true, clientX: x, clientY: y, button: 0 }));
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 160, 120);
    pointer('pointerup', 160, 120);
    mark.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.camera.yaw).toBeCloseTo(DEFAULT_CAMERA.yaw + 60 * 0.006);
    expect(el.camera.pitch).toBeCloseTo(DEFAULT_CAMERA.pitch + 20 * 0.005);
    expect(el.camera.zoom).toBe(1);
    stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -80, bubbles: true, cancelable: true }));
    await waitFor(() => el.camera.zoom > 1.05);
    // a double click puts the camera back
    stage.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await flush();
    expect(el.camera).toEqual(DEFAULT_CAMERA);
  });

  it('tells what the legend button does, under the pointer or under the focused button', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const tip = () => texts(document.body, OPEN_TIP)[0];
    const point = (target: Element, type: string, x = 40, y = 500) =>
      target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: type !== 'mouseenter' && type !== 'mouseleave' }));
    const legend = root.querySelector('.gp-legend-button')!;

    // pointing settles before the tip shows
    point(legend, 'mouseenter');
    await el.updateComplete;
    expect(tip()).toBeUndefined();
    await waitFor(() => !!tip());
    expect(tip()).toBe('Legend What the shapes, colours and marks on the map mean.');
    // the shared chart tooltip, above the pointer
    expect(card()!.classList.contains('is-open')).toBe(true);
    expect([card()!.style.left, card()!.style.top]).toEqual(['15px', '492px']);
    point(legend, 'mousemove', 60, 510);
    expect([card()!.style.left, card()!.style.top]).toEqual(['35px', '502px']);

    point(legend, 'mouseleave');
    await el.updateComplete;
    expect(tip()).toBeUndefined();
    // the controls no longer carry native titles as well
    expect(root.querySelectorAll('.gp-controls [title]')).toHaveLength(0);

    // a press answers the question: the tip goes, and stays quiet until the pointer leaves
    point(legend, 'mouseenter');
    await waitFor(() => !!tip());
    legend.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await el.updateComplete;
    expect(tip()).toBeUndefined();
    point(legend, 'mouseenter');
    await new Promise((r) => setTimeout(r, 200));
    expect(tip()).toBeUndefined();
    point(legend, 'mouseleave');

    // keyboard focus hangs the tip from the button's top centre
    const button = legend as HTMLElement;
    button.matches = ((selector: string) => selector === ':focus-visible') as typeof button.matches;
    button.getBoundingClientRect = () => ({ left: 10, top: 300, right: 46, bottom: 324, width: 36, height: 24, x: 10, y: 300, toJSON() {} });
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await el.updateComplete;
    expect(tip()).toBe('Legend What the shapes, colours and marks on the map mean.');
    expect([card()!.style.left, card()!.style.top]).toEqual(['5px', '292px']);
    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await el.updateComplete;
    expect(tip()).toBeUndefined();
  });

  it('explains the marks in a legend beside its button, and closes it on Escape', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const button = root.querySelector<HTMLButtonElement>('.gp-legend-button')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    await el.updateComplete;
    const legend = root.querySelector('.gp-legend')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(texts(legend, 'h2')).toEqual(['Reading the map']);
    expect(texts(legend, 'h3')).toEqual(['Marks', 'A goal and its resource groups']);
    expect(texts(legend, '.gp-legend-row')).toContain('A blocked agent');
    expect(texts(legend, '.gp-legend-row').at(-1)).toBe('Agents held there, with their count — orange blocked, red failed, purple awaiting');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(root.querySelector('.gp-legend')).toBeNull();
    // and hides on request
    el.showLegend = false;
    await el.updateComplete;
    expect(root.querySelector('.gp-legend-button')).toBeNull();
  });

  it('lights a goal under the pointer, traces a group across the board, and explains both', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const mark = root.querySelector('g.gp-goal[data-goal="onboarding-velocity"] .gp-goal-mark')!;
    mark.dispatchEvent(new MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    await flush();
    expect(mark.classList.contains('is-lit')).toBe(true);
    expect(root.querySelector('.gp-callout[data-goal="onboarding-velocity"]')!.classList.contains('is-lit')).toBe(true);
    await waitFor(() => !!tooltip());
    expect(tooltip()).toMatch(/^G-007 · Onboarding Velocity Each dot is one agent\./);
    expect(tipRows()).toContain('Blocked 94');
    mark.dispatchEvent(new MouseEvent('mouseleave'));
    await flush();
    expect(mark.classList.contains('is-lit')).toBe(false);

    const tool = root.querySelector('g.gp-goal[data-goal="onboarding-velocity"] [data-slot="rg:tool"]')!;
    tool.dispatchEvent(new MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    await flush();
    await waitFor(() => tooltip().startsWith('Tool '));
    expect(tooltip()).toContain('27 agents of Onboarding Velocity are failed here — Browser tool sandbox crash-loops');
    expect(tipRows()).toContain('Shared with 2 other goals');
    // every goal that draws on the tool lights its diamond
    const traced = [...root.querySelectorAll('[data-slot="rg:tool"] .gp-diamond-trace')].filter((d) => d.getAttribute('display') !== 'none');
    expect(traced).toHaveLength(3);

    const link = root.querySelector('g.gp-link[data-link^="tool:onboarding-velocity|maintain"]')!;
    link.dispatchEvent(new MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    await waitFor(() => tooltip().startsWith('Onboarding Velocity ↔'));
    expect(tooltip()).toContain('Both draw on Tool, and the same trouble holds agents of both there.');
    expect(tipRows()).toContain('At both ends Agents failed');
    link.dispatchEvent(new MouseEvent('mouseleave'));
    await el.updateComplete;
    expect(tooltip()).toBe('');
  });

  it('moves every hover detail along with the pointer, at the right edge too', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const at = () => [Number.parseFloat(card()!.style.left), Number.parseFloat(card()!.style.top)];
    const move = (target: Element, x: number, y: number) =>
      target.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y, bubbles: true, composed: true }));
    const targets = [
      root.querySelector('g.gp-goal[data-goal="perimeter-watch"] .gp-goal-mark')!,
      root.querySelector('g.gp-link')!,
      root.querySelector('[data-slot="rg:tool"]')!,
      root.querySelector('.gp-callout-label')!,
    ];
    for (const target of targets) {
      target.dispatchEvent(new MouseEvent('mouseenter', { clientX: 300, clientY: 300 }));
      await waitFor(() => !!tooltip());
      expect(at()).toEqual([275, 292]);
      // every move takes it along, the same way from the pointer
      move(target, 340, 320);
      expect(at()).toEqual([315, 312]);
      move(target, 352, 290);
      expect(at()).toEqual([327, 282]);
      target.dispatchEvent(new MouseEvent('mouseleave'));
      await el.updateComplete;
      expect(tooltip()).toBe('');
    }
    // near the window's right edge it holds inside the window, and still follows up and down
    const goal = targets[0]!;
    const card0 = { w: 240, h: 120 };
    goal.dispatchEvent(new MouseEvent('mouseenter', { clientX: window.innerWidth - 40, clientY: 300 }));
    await waitFor(() => !!tooltip());
    Object.defineProperty(card()!, 'offsetWidth', { value: card0.w, configurable: true });
    Object.defineProperty(card()!, 'offsetHeight', { value: card0.h, configurable: true });
    move(goal, window.innerWidth - 40, 300);
    expect(at()).toEqual([window.innerWidth - card0.w - 30, 300 - card0.h - 8]);
    move(goal, window.innerWidth - 60, 310);
    expect(at()).toEqual([window.innerWidth - card0.w - 30, 310 - card0.h - 8]);
  });

  it('paints the scene from the page style and theme, and repaints when either changes', async () => {
    const el = await mount(defaultFixture);
    // a light page: the room by day, hairlines in the ramp's deep ink
    expect(el.getAttribute('data-mode')).toBe('light');
    expect(el.style.getPropertyValue('--gp-line')).toBe('rgb(54,60,119)');
    el.style.setProperty('--ui9000-style-id', 'palette4');
    document.dispatchEvent(new CustomEvent('ui9000-theme'));
    await waitFor(() => el.style.getPropertyValue('--gp-grid') === 'rgb(24,122,76)');
    // a dark page: the same style, lit
    applyWidgetContext(el, { mode: 'dark', styleId: 'palette4' });
    document.dispatchEvent(new CustomEvent('ui9000-theme'));
    await waitFor(() => el.getAttribute('data-mode') === 'dark');
    await waitFor(() => el.style.getPropertyValue('--gp-grid') === 'rgb(61,158,110)');
    expect(el.style.getPropertyValue('--gp-glint-stroke')).toBe('#ffffff');
  });

  it('lets only what is held stand out with problems-only, and shows everything again without it', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const opacity = (selector: string) => Number(root.querySelector(selector)!.getAttribute('opacity'));
    const quiet = 'g.gp-goal[data-goal="model-drift-watch"]';
    const held = 'g.gp-goal[data-goal="onboarding-velocity"]';
    const failedLink = 'g.gp-link[data-link="tool:onboarding-velocity|maintain-verified-asset-visibility"]';
    expect(opacity(quiet)).toBeGreaterThanOrEqual(0.74);

    el.problemsOnly = true;
    await el.updateComplete;
    await flush();
    expect(el.hasAttribute('problems-only')).toBe(true);
    // a goal none of whose agents is held steps back, with its callout; one with held agents keeps its light
    expect(opacity(quiet)).toBeLessThanOrEqual(0.35);
    expect(Number(root.querySelector<HTMLElement>('.gp-callout[data-goal="model-drift-watch"]')!.style.opacity)).toBeLessThanOrEqual(0.35);
    expect(opacity(held)).toBeGreaterThanOrEqual(0.74);
    // the line the same trouble holds keeps its light; a line where traffic flows steps back
    expect(opacity(failedLink)).toBe(1);
    const clean = [...root.querySelectorAll('g.gp-link')].filter((l) => l.querySelector('.gp-link-line')!.getAttribute('stroke') === 'var(--gp-line)');
    expect(clean.length).toBeGreaterThan(0);
    for (const link of clean) expect(Number(link.getAttribute('opacity'))).toBeLessThanOrEqual(0.22);

    el.problemsOnly = false;
    await el.updateComplete;
    await flush();
    expect(opacity(quiet)).toBeGreaterThanOrEqual(0.74);
    expect(opacity(failedLink)).toBe(1);
  });

  it('is a standalone chart: a click on a goal, a diamond, a link or a callout opens nothing', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const fired: string[] = [];
    for (const type of ['goal-open', 'goal-close', 'ui9000-select', 'ui9000-action'])
      el.addEventListener(type, () => fired.push(type));
    const before = root.querySelector('.chart-root')!.innerHTML.length;
    for (const target of [
      root.querySelector('g.gp-goal[data-goal="perimeter-watch"] .gp-goal-mark')!,
      root.querySelector('g.gp-goal[data-goal="maintain-verified-asset-visibility"] [data-slot="rg:tool"]')!,
      root.querySelector('g.gp-link')!,
      root.querySelector('.gp-callout[data-goal="incident-response"] .gp-callout-label')!,
    ])
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await settle();
    expect(fired).toEqual([]);
    // no view replaces the board, and nothing offers a way back
    expect(root.querySelector('.gp-detail-svg, .gp-crumbs, .gp-back')).toBeNull();
    expect(root.querySelector<HTMLElement>('.gp-stage')!.style.visibility).toBe('');
    expect(root.querySelector('.gp-controls')).not.toBeNull();
    expect(root.querySelector('.chart-root')!.innerHTML.length).toBeGreaterThan(before * 0.9);
    // the callouts are labels, not buttons
    expect(root.querySelectorAll('.gp-callout button')).toHaveLength(0);
  });

  it('shows an empty state without goals', async () => {
    const el = await mount({ goals: [] });
    expect(el.shadowRoot!.querySelector('.empty')?.textContent).toContain('No goal data');
    expect(el.shadowRoot!.querySelector('.gp-controls')).toBeNull();
  });

  it('mounts through chart-renderer by chartType', async () => {
    const renderer = document.createElement('ui9000-chart-renderer');
    renderer.setAttribute('data', JSON.stringify(defaultFixture));
    document.body.appendChild(renderer);
    await waitFor(() => !!renderer.shadowRoot?.querySelector('ui9000-goals-perimeter'));
    const chart = renderer.shadowRoot!.querySelector('ui9000-goals-perimeter')!;
    await chart.updateComplete;
    await waitFor(() => chart.shadowRoot!.querySelectorAll('g.gp-goal').length === 6);
    expect(chart.shadowRoot!.querySelector('.gp-reading-line .gp-held')?.textContent).toBe('214 held');
  });
});
