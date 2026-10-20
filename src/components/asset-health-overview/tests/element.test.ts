// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;

import '../index.js';
import { DARK_PALETTE, LIGHT_PALETTE } from '../lib/palette.js';
import figma from '../../../stories/fixtures/asset-health.figma.json';

async function mount(data: unknown, theme = ''): Promise<HTMLElement> {
  const el = document.createElement('ui9000-asset-health-overview');
  if (theme) el.setAttribute('theme', theme);
  el.setAttribute('data', JSON.stringify(data));
  document.body.appendChild(el);
  await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
  await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
  return el;
}

describe('ui9000-asset-health-overview', () => {
  it('renders the agent core and category headers from the Figma fixture', async () => {
    const el = await mount(figma, 'dark');

    const svg = el.shadowRoot?.querySelector('svg.scene');
    expect(svg).toBeTruthy();
    const texts = [...(el.shadowRoot?.querySelectorAll('text') ?? [])].map((n) => n.textContent);
    expect(texts).toContain('1,204');
    expect(texts).toContain('AGENTS');
    expect(texts).toContain('APPLICATIONS');
    expect(texts).toContain('DATABASES');
    expect(texts.some((t) => t?.includes('1 with problems'))).toBe(true);
    expect(texts.some((t) => t?.includes('all healthy'))).toBe(true);
    expect(texts).toContain('healthy asset');
    el.remove();
  });

  it('follows the theme attribute and reports it as data-mode', async () => {
    const dark = await mount(figma, 'dark');
    expect(dark.getAttribute('data-mode')).toBe('dark');

    const light = await mount(figma, 'light');
    expect(light.getAttribute('data-mode')).toBe('light');

    const bare = await mount(figma);
    expect(bare.getAttribute('data-mode')).toBe('light');

    for (const host of [dark, light, bare]) host.remove();
  });

  it('paints dark and light ink from the stock palettes', async () => {
    const dark = await mount(figma, 'dark');
    const light = await mount(figma, 'light');

    const agentFill = (host: HTMLElement) =>
      [...(host.shadowRoot?.querySelectorAll('text') ?? [])]
        .find((n) => n.textContent === 'AGENTS')
        ?.getAttribute('fill');

    expect(agentFill(dark)).toBe(DARK_PALETTE.muted);
    expect(agentFill(light)).toBe(LIGHT_PALETTE.muted);
    expect(agentFill(dark)).not.toBe(agentFill(light));
    expect(dark.style.getPropertyValue('--aho-stage').trim()).toBe(DARK_PALETTE.stage);
    expect(light.style.getPropertyValue('--aho-stage').trim()).toBe(LIGHT_PALETTE.stage);

    dark.remove();
    light.remove();
  });

  it('hides problem callouts when every category is healthy', async () => {
    const healthy = {
      ...figma,
      goal: { ...figma.goal, blocked: 0, failed: 0, awaiting: 0 },
      categories: figma.categories.map((c) => ({ ...c, problems: [] })),
      wall: [],
    };
    const el = await mount(healthy, 'dark');

    const texts = [...(el.shadowRoot?.querySelectorAll('text') ?? [])].map((n) => n.textContent);
    expect(texts.every((t) => !t?.includes('with problems'))).toBe(true);
    expect(texts.some((t) => t?.includes('crm-prod'))).toBe(false);
    el.remove();
  });

  it('isolates a category when its header is clicked, and restores on a second click', async () => {
    const el = await mount(figma, 'dark');
    const groups = () => [...(el.shadowRoot?.querySelectorAll('svg g') ?? [])];
    const byTitle = (title: string) =>
      groups().find((g) => g.querySelector('title')?.textContent === title);
    const tileOpacity = (titleStart: string) =>
      groups()
        .find((g) => g.querySelector('title')?.textContent?.startsWith(titleStart))
        ?.getAttribute('opacity');

    byTitle('Databases\nClick to show only this category')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(tileOpacity('Salesforce')).toBe('0.16');
    expect(tileOpacity('orders-db')).toBe('1');

    byTitle('Databases\nClick to show only this category')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(tileOpacity('Salesforce')).toBe('1');
    el.remove();
  });

  it('opens the problem card on a beam click and fires show-agents / open-rule', async () => {
    const el = await mount(figma, 'dark');
    const texts = () => [...(el.shadowRoot?.querySelectorAll('text') ?? [])].map((n) => n.textContent);
    const groupWithText = (label: string) =>
      [...(el.shadowRoot?.querySelectorAll('text') ?? [])]
        .find((t) => t.textContent === label)
        ?.closest('g');
    const openPin = () =>
      groupWithText('crm-prod · writes blocked by R-047')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );

    openPin();
    expect(texts()).toContain('Show agents');
    expect(texts()).toContain('Open in Rules');

    let shown: { categoryId?: string; problem?: { name?: string } } | undefined;
    el.addEventListener('show-agents', (event) => {
      shown = (event as CustomEvent).detail;
    });
    groupWithText('Show agents')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(shown?.categoryId).toBe('db');
    expect(shown?.problem?.name).toBe('crm-prod');
    expect(texts()).not.toContain('Open in Rules');

    openPin();
    let ruled: { problem?: { name?: string } } | undefined;
    el.addEventListener('open-rule', (event) => {
      ruled = (event as CustomEvent).detail;
    });
    groupWithText('Open in Rules')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ruled?.problem?.name).toBe('crm-prod');
    el.remove();
  });

  it('repaints with a new orbit after a drag', async () => {
    const el = await mount(figma, 'dark');
    const svg = el.shadowRoot?.querySelector('svg.scene') as SVGSVGElement;
    const before = svg.innerHTML;
    const pointer = (type: string, x: number, y: number) =>
      new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    svg.dispatchEvent(pointer('pointerdown', 100, 100));
    svg.dispatchEvent(pointer('pointermove', 240, 140));
    await new Promise((resolve) => setTimeout(resolve, 60));
    svg.dispatchEvent(pointer('pointerup', 240, 140));
    expect(svg.innerHTML).not.toBe(before);
    el.remove();
  });

  it('shows empty state without data', async () => {
    const el = document.createElement('ui9000-asset-health-overview');
    document.body.appendChild(el);
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toContain('No asset health data');
    el.remove();
  });
});
