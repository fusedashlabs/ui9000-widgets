// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import defaultFixture from '../../../stories/fixtures/goals-insights.default.json';
import type { Ui9000GoalsInsights } from '../index.js';
import type { ColumnFrame, ColumnRenderer } from '../render/index.js';
import * as shaders from '../render/gl/shaders.js';

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
  // jsdom draws no canvas: the column's instruments and labels are what it can test
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  await import('../index.js');
  await import('../../chart-renderer/index.js');
}, 60_000);

const flush = () => new Promise((r) => setTimeout(r, 60));

/** A light that keeps what it is asked to paint. */
function recordingGlow() {
  const made: { goals: number; frames: ColumnFrame[] }[] = [];
  const factory = (_canvas: HTMLCanvasElement, _palette: unknown, goals: number): ColumnRenderer => {
    const record = { goals, frames: [] as ColumnFrame[] };
    made.push(record);
    return { resize() {}, render: (frame) => record.frames.push(frame), dispose() {} };
  };
  return { made, factory, last: () => made[made.length - 1]!.frames.at(-1)! };
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('Timed out waiting for condition');
}

async function mount(data: unknown, glow?: ReturnType<typeof recordingGlow>): Promise<Ui9000GoalsInsights> {
  const el = document.createElement('ui9000-goals-insights');
  if (glow) el.glowFactory = glow.factory;
  el.setAttribute('data', JSON.stringify(data));
  document.body.append(el);
  await el.updateComplete;
  // the column is drawn a frame or two after the element: on a busy runner that can take a while
  await waitFor(() => !!el.shadowRoot!.querySelector('svg.gi-goals .gi-goal, .empty'), 10_000);
  await flush();
  return el;
}

/** Gives the plot a size and lets the column refit. */
async function sized(el: Ui9000GoalsInsights, width: number, height: number): Promise<void> {
  const chart = el.shadowRoot!.querySelector<HTMLElement>('.chart-root')!;
  Object.defineProperty(chart, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(chart, 'clientHeight', { value: height, configurable: true });
  for (const cb of observed) cb();
  await flush();
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

/** jsdom has no PointerEvent: a mouse event under the pointer event's name stands in. */
const pointer = (target: Element, type: string, x = 10, y = 10, init: ConstructorParameters<typeof MouseEvent>[1] = {}) =>
  target.dispatchEvent(new MouseEvent(type, { button: 0, clientX: x, clientY: y, bubbles: true, composed: true, ...init }));

const claimEl = (root: ShadowRoot, id: string) => root.querySelector(`.gi-claim[data-tip="claim:${id}"]`)!;
const goalEl = (root: ShadowRoot, id: string) => root.querySelector(`.gi-goal[data-goal="${id}"]`)!;

/** Reduced motion, as the reader's system asks for it. */
function preferStill(on: boolean) {
  window.matchMedia = on
    ? ((query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    : (undefined as unknown as typeof window.matchMedia);
}

afterEach(() => {
  document.body.replaceChildren();
  preferStill(false);
});

describe('ui9000-goals-insights', () => {
  it('draws the goal over a column of rings, its claims on them and its connected goals beside it', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    expect(root.querySelector('.ah-scene .ah-grid-floor')).not.toBeNull();
    expect(root.querySelector('.ah-scene .gi-motes')).not.toBeNull();

    // a ring every two hours, every fourth labelled, now at the top
    expect(root.querySelectorAll('svg.gi-column .gi-ring').length).toBe(33);
    expect(texts(root, 'svg.gi-column .gi-time text')).toEqual(['Now', '−8h', '−16h', '−24h', '−32h', '−40h', '−48h', '−56h', '−64h']);
    // every claim, as a diamond
    expect(root.querySelectorAll('svg.gi-column [data-claim]').length).toBe(41);
    // claims with three or more sources run up to their goal
    expect(root.querySelectorAll('svg.gi-column .gi-strand').length).toBeGreaterThan(10);

    // the goal over the apex and the two that share its evidence, each with its agents in a sphere
    expect(texts(root, 'svg.gi-goals .gi-name')).toEqual(['Perimeter Watch', 'Maintain Verified Asset Visibility', 'Incident Response']);
    expect(texts(root, 'svg.gi-goals .gi-goal[data-goal="G-022"] .gi-cap')).toEqual(['Connected · G-022 ● At risk', 'Priority', 'Confidence', 'Claims']);
    expect(texts(root, 'svg.gi-goals .gi-goal[data-goal="G-022"] .gi-value')).toEqual(['HIGH', '58%', '15']);
    expect(root.querySelectorAll('.gi-clouds canvas.gi-cloud').length).toBe(3);
    // the left goal's label hangs to the left, off the column
    expect(root.querySelector('.gi-goal[data-goal="G-022"] .gi-name')!.getAttribute('text-anchor')).toBe('end');
  });

  it('reads the goal under the title, with the claims’ key beside it', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    expect(texts(root, '.widget-title')).toEqual(['Perimeter Watch']);
    expect(texts(root, '.ah-reading-line')).toEqual(['G-014 On track 1,108 agents 19 held 2h a ring · now at the top']);
    expect(texts(root, '.gi-key')).toEqual(['Claim Supports Contradicts Disputed Single source']);

    const left = await mount({ ...defaultFixture, claims: [...defaultFixture.claims, { claim: 'no age' }] });
    expect(texts(left.shadowRoot!, '.ah-reading-line')[0]).toContain('· 1 claim not drawn');
  });

  it('keeps only the legend at the bottom left, and explains the column in it', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const controls = root.querySelector('.ah-controls')!;
    expect([...controls.children].map((child) => child.getAttribute('aria-label'))).toEqual(['Legend']);
    const button = root.querySelector<HTMLButtonElement>('.ah-legend-button')!;
    button.click();
    await el.updateComplete;
    const legend = root.querySelector<HTMLElement>('.ah-legend')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    // inside the shell, beside its button, its foot level with the button's
    expect(legend.parentElement!.classList.contains('widget-shell')).toBe(true);
    expect(legend.style.left).toMatch(/px$/);
    expect(legend.style.bottom).toMatch(/px$/);
    expect(texts(legend, 'h2')).toEqual(['Reading the column']);
    expect(texts(legend, 'h3')).toEqual(['Claims', 'The column']);
    expect(texts(legend, '.ah-legend-row').some((row) => row.startsWith('Each ring is a two-hour cycle'))).toBe(true);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(root.querySelector('.ah-legend')).toBeNull();
    el.showLegend = false;
    await el.updateComplete;
    expect(root.querySelector('.ah-legend-button')).toBeNull();
  });

  it('explains a claim under the pointer and picks it out on click, through a redraw', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const claim = claimEl(root, 'INS-8872');
    pointer(claim.querySelector('path')!, 'pointermove');
    await waitFor(() => tooltip().startsWith('INS-8872 · Contradicting'));
    expect(tooltip()).toContain('Rack row C-07 power fault took 5 PIR sensors offline — 6 sources');
    expect(tipRows()).toContain('Filed under Perimeter Watch');
    expect(tipRows()).toContain('State Pinned');
    expect(tipRows().find((r) => r.startsWith('Sources'))).toMatch(/^Sources 6 · [\d,]+ records$/);

    pointer(claim.querySelector('path')!, 'click');
    await flush();
    expect(el.picks.claim).toBe('INS-8872');
    expect(claimEl(root, 'INS-8872').querySelector('.gi-picked')).not.toBeNull();
    // a new snapshot keeps the pick and the view
    el.draw();
    await flush();
    expect(claimEl(root, 'INS-8872').querySelector('.gi-picked')).not.toBeNull();
    // a click on the empty room lets go
    pointer(root.querySelector('.gi-stage')!, 'click');
    await flush();
    expect(el.picks.claim).toBeNull();
    expect(root.querySelector('.gi-picked')).toBeNull();
  });

  it('names no records for a claim that sent none', async () => {
    const el = await mount({
      goal: { id: 'G-1', name: 'Goal one' },
      claims: [{ id: 'C-1', claim: 'Gateway p95 over threshold', age: 3, sources: 3 }],
    });
    pointer(claimEl(el.shadowRoot!, 'C-1').querySelector('path')!, 'pointermove');
    await waitFor(() => tooltip().startsWith('C-1'));
    expect(tipRows()).toContain('Sources 3');
    expect(tooltip()).not.toContain('record');
  });

  it('picks out a connected goal by click or by key, stepping the other back', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    pointer(goalEl(root, 'G-052'), 'pointermove');
    await waitFor(() => tooltip().startsWith('Connected goal · Incident Response'));
    expect(tipRows()).toContain('Claims 8 filed under it');

    // the strands running to the goal on the left of the column
    const toOther = () => [...root.querySelectorAll('.gi-strand path[data-gx]')].filter((p) => Number(p.getAttribute('data-gx')) < 500).length;
    expect(toOther()).toBeGreaterThan(0);
    pointer(goalEl(root, 'G-052').querySelector('circle')!, 'click');
    await flush();
    expect(el.picks.goal).toBe('G-052');
    expect(goalEl(root, 'G-052').getAttribute('aria-pressed')).toBe('true');
    expect(goalEl(root, 'G-022').getAttribute('opacity')).toBe('0.35');
    // the other goal's own claims no longer run up to it
    expect(toOther()).toBe(0);

    goalEl(root, 'G-052').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush();
    expect(el.picks.goal).toBeNull();
    expect(goalEl(root, 'G-022').getAttribute('opacity')).toBe('1');
  });

  it('sizes the light’s goal arrays from the model and keeps no fixed caps in its shaders', async () => {
    const glow = recordingGlow();
    await mount(defaultFixture, glow);
    await waitFor(() => glow.made.length > 0 && glow.made[0]!.frames.length > 0);
    expect(glow.made[0]!.goals).toBe(3);
    const frame = glow.last();
    expect(frame.goals).toHaveLength(3);
    expect(frame.claims).toHaveLength(41);
    expect(frame.rings).toHaveLength(33);

    const alone = recordingGlow();
    await mount({ goal: defaultFixture.goal, claims: defaultFixture.claims.filter((c) => c.goal === 'G-014').map(({ also: _also, ...c }) => c) }, alone);
    await waitFor(() => alone.made.length > 0);
    expect(alone.made[0]!.goals).toBe(1);

    // per-goal arrays are sized by the renderer's defines; per-claim light comes from attributes, so nothing caps the claims
    const source = Object.values(shaders).join('\n');
    expect(source).not.toMatch(/uniform \w+ \w+\[\d+\]/);
    expect(source).toMatch(/uGoal\[GOALS\]/);
    expect(source).not.toMatch(/uClaim\[/);
  });

  it('with reduced motion, paints the new emphasis as soon as a goal is pointed at', async () => {
    preferStill(true);
    const glow = recordingGlow();
    const el = await mount(defaultFixture, glow);
    await waitFor(() => glow.made.length > 0 && glow.made[0]!.frames.length > 0);
    const root = el.shadowRoot!;
    // the column does not turn, and the light is still
    const painted = glow.made[0]!.frames.length;
    await flush();
    expect(glow.made[0]!.frames.length).toBe(painted);
    expect(glow.last().time).toBeNull();
    expect(glow.last().goals[2]!.strength).toBeCloseTo(0.5);

    pointer(goalEl(root, 'G-052'), 'pointermove');
    await waitFor(() => glow.made[0]!.frames.length > painted);
    expect(glow.last().goals[2]!.strength).toBeCloseTo(0.8);
    // the SVG says the same
    expect(goalEl(root, 'G-052').querySelector('path')!.getAttribute('opacity')).toBe('0.75');

    pointer(goalEl(root, 'G-052').querySelector('circle')!, 'click');
    await flush();
    expect(glow.last().goals[1]!.strength).toBeCloseTo(0.2);
  });

  it('with problems only, leaves the claims against the goal and the disputed standing out', async () => {
    const glow = recordingGlow();
    const el = await mount(defaultFixture, glow);
    const root = el.shadowRoot!;
    const opacity = (id: string) => Number(claimEl(root, id).getAttribute('opacity'));
    const supporting = opacity('INS-8852');
    el.problemsOnly = true;
    await el.updateComplete;
    await flush();
    expect(opacity('INS-8852')).toBeCloseTo(supporting * 0.06);
    expect(opacity('INS-8872')).toBeCloseTo(0.72);
    // the light says the same
    const alpha = (id: string) => glow.last().claims[Number(claimEl(root, id).parentElement!.getAttribute('data-claim'))]!.alpha;
    expect(alpha('INS-8852')).toBeCloseTo(0.06);
    expect(alpha('INS-8872')).toBe(1);
  });

  it('turns on a drag, zooms on the wheel, and double-click sets it back', async () => {
    const el = await mount(defaultFixture);
    const stage = el.shadowRoot!.querySelector<HTMLElement>('.gi-stage')!;
    stage.setPointerCapture = () => {};
    const yaw = el.view.yaw;
    pointer(stage, 'pointerdown', 100, 100);
    pointer(stage, 'pointermove', 200, 150);
    pointer(stage, 'pointerup', 200, 150);
    expect(el.view.yaw).toBeGreaterThanOrEqual(yaw + 100 * 0.006);
    expect(el.view.tilt).toBeCloseTo(0.19 + 50 * 0.0012);
    stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -400, bubbles: true, cancelable: true }));
    expect(el.view.zoom).toBeGreaterThan(1.45);
    // zoomed in, the goal's own claims name the asset they are about
    await waitFor(() => el.shadowRoot!.querySelectorAll('.gi-kind').length > 0);
    stage.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(el.view).toMatchObject({ tilt: 0.19, zoom: 1, cx: 500, cy: 400 });

    // flat: no turning
    el.flat = true;
    await el.updateComplete;
    const at = el.view.tilt;
    pointer(stage, 'pointerdown', 100, 100);
    pointer(stage, 'pointermove', 200, 200);
    pointer(stage, 'pointerup', 200, 200);
    expect(el.view.tilt).toBe(at);
  });

  it('folds a connected goal’s readout away, then its label, as the room beside it runs out — a long name first', async () => {
    const el = await mount(defaultFixture);
    const root = el.shadowRoot!;
    const values = (id: string) => texts(root, `.gi-goal[data-goal="${id}"] .gi-value`).length;
    const names = (id: string) => texts(root, `.gi-goal[data-goal="${id}"] .gi-name`).length;
    await sized(el, 1400, 760);
    await waitFor(() => values('G-022') === 3 && values('G-052') === 3);
    await sized(el, 640, 520);
    await waitFor(() => names('G-022') === 0);
    expect(names('G-052')).toBe(1);
    expect(values('G-052')).toBe(0);
    await sized(el, 420, 520);
    await waitFor(() => names('G-052') === 0);
    // the goals still explain themselves
    expect(goalEl(root, 'G-022').getAttribute('data-tip')).toBe('goal:G-022');
  });

  it('keeps its own glass where there is no WebGL, and shows an empty state without a goal', async () => {
    const el = await mount(defaultFixture);
    expect(el.shadowRoot!.querySelector('svg.gi-column path[fill="url(#gi-wrap-glass)"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.gi-glow')).toBeNull();

    const empty = await mount({ claims: [] });
    expect(texts(empty.shadowRoot!, '.empty')).toEqual(['No goal data']);
    expect(empty.shadowRoot!.querySelector('.gi-stage')).toBeNull();
  });

  it('mounts through chart-renderer by its chart type', async () => {
    const renderer = document.createElement('ui9000-chart-renderer');
    renderer.setAttribute('data', JSON.stringify(defaultFixture));
    document.body.append(renderer);
    await waitFor(() => !!renderer.shadowRoot?.querySelector('ui9000-goals-insights'));
  });
});
