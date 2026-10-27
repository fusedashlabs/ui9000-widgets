// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';

import goalRings from '../../../stories/fixtures/asset-health.goal-rings.json';
import type { Ui9000AssetHealthOverview } from '../index.js';

beforeAll(async () => {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  // jsdom draws no canvas: the arena's instruments and labels are what it can test
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  await import('../index.js');
}, 60_000);

async function mount(data: unknown, attrs: Record<string, string> = {}): Promise<Ui9000AssetHealthOverview> {
  const el = document.createElement('ui9000-asset-health-overview');
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  el.setAttribute('data', JSON.stringify(data));
  document.body.appendChild(el);
  await el.updateComplete;
  // the element draws on the next frame
  await new Promise((r) => setTimeout(r, 50));
  return el;
}

const textOf = (root: Element | ShadowRoot, selector: string) => [...root.querySelectorAll(selector)].map((n) => n.textContent?.replace(/\s+/g, ' ').trim() ?? '');

describe('ui9000-asset-health-overview', () => {
  it('titles the goal and reads it in the line under the title', async () => {
    const el = await mount(goalRings, { theme: 'dark' });
    const root = el.shadowRoot!;

    expect(root.querySelector('.widget-header')?.textContent).toContain('Onboarding Velocity');
    const reading = textOf(root, '.ah-reading-line')[0];
    expect(reading).toContain('G-007');
    expect(reading).toContain('Blocked');
    expect(reading).toContain('842 agents');
    expect(reading).toContain('175 held');
    el.remove();
  });

  it('draws the hub, a section for each category and a label beside each', async () => {
    const el = await mount(goalRings, { theme: 'dark' });
    const root = el.shadowRoot!;

    expect(root.querySelector('svg.ah-overlay [data-tip="hub"]')).toBeTruthy();
    expect(textOf(root, 'svg.ah-overlay .ah-figure')).toEqual(['41%']);
    const sections = new Set([...root.querySelectorAll('svg.ah-overlay [data-section]')].map((n) => n.getAttribute('data-section')));
    expect([...sections].sort()).toEqual(['RG-APP', 'RG-HUMAN', 'RG-MODEL', 'RG-SYS', 'RG-TOOL']);

    const heads = textOf(root, '.ah-label-title');
    expect(heads).toContain('SYSTEM 94 blocked');
    expect(heads).toContain('APP Slowed');
    expect(heads).toContain('TOOL 27 failed');
    expect(textOf(root, '.ah-label-count')).toContain('9 systems of record');
    // one beam a trouble, in the arena
    expect(root.querySelectorAll('svg.ah-overlay [data-trouble]').length).toBe(6);
    el.remove();
  });

  it('keeps its labels to their heads on a card-sized stage', async () => {
    const el = await mount(goalRings, { theme: 'dark' });
    // jsdom lays nothing out: the stage is the default card, too narrow for whole labels
    expect(el.shadowRoot!.querySelectorAll('.ah-label-line').length).toBeGreaterThan(0);
    expect(el.shadowRoot!.querySelectorAll('.ah-readout').length).toBe(0);
    el.remove();
  });

  it('follows the theme attribute and reports it as data-mode', async () => {
    const dark = await mount(goalRings, { theme: 'dark' });
    const light = await mount(goalRings, { theme: 'light' });
    expect(dark.getAttribute('data-mode')).toBe('dark');
    expect(light.getAttribute('data-mode')).toBe('light');
    dark.remove();
    light.remove();
  });

  it('picks a section out on click, and lets it go on a second', async () => {
    const el = await mount(goalRings, { theme: 'dark' });
    const root = el.shadowRoot!;
    const head = () => root.querySelector<HTMLButtonElement>('.ah-label-head[data-pick="RG-SYS"]')!;

    head().click();
    await new Promise((r) => setTimeout(r, 60));
    expect(head().getAttribute('aria-pressed')).toBe('true');
    head().click();
    await new Promise((r) => setTimeout(r, 60));
    expect(head().getAttribute('aria-pressed')).toBe('false');
    el.remove();
  });

  it('zooms on the wheel, pans on a shift-drag, and double-click sets it back', async () => {
    const el = await mount(goalRings, { theme: 'dark' });
    const stage = el.shadowRoot!.querySelector<HTMLElement>('.ah-stage')!;
    const settle = () => new Promise((r) => setTimeout(r, 400));

    stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -80, bubbles: true, cancelable: true }));
    await settle();
    expect(el.camera.zoom).toBeGreaterThan(1);
    for (let i = 0; i < 40; i++) stage.dispatchEvent(new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }));
    await settle();
    // never further out than half size
    expect(el.camera.zoom).toBeCloseTo(0.5, 2);

    // jsdom has no PointerEvent: a mouse event under the pointer event's name stands in
    const pointer = (type: string, x: number, y: number) =>
      stage.dispatchEvent(new MouseEvent(type, { button: 0, clientX: x, clientY: y, shiftKey: true, bubbles: true }));
    const turned = el.camera;
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 140, 120);
    pointer('pointerup', 140, 120);
    expect(el.camera.panX - turned.panX).toBe(40);
    expect(el.camera.panY - turned.panY).toBe(20);
    expect(el.camera.yaw).toBe(turned.yaw);

    stage.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(el.camera).toEqual({ yaw: -0.34, pitch: 0.26, zoom: 1, panX: 0, panY: 0 });
    el.remove();
  });

  it('opens the legend from its button', async () => {
    const el = await mount(goalRings, { theme: 'dark' });
    const root = el.shadowRoot!;
    root.querySelector<HTMLButtonElement>('.ah-legend-button')!.click();
    await el.updateComplete;
    expect(root.querySelector('.ah-legend h2')?.textContent).toBe('Reading the goal');
    expect(root.querySelectorAll('.ah-legend-row').length).toBe(13);
    el.remove();
  });

  it('says so when there is nothing to draw', async () => {
    const el = await mount({ categories: [] });
    expect(el.shadowRoot!.querySelector('.empty')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.ah-stage')).toBeNull();
    el.remove();
  });
});
