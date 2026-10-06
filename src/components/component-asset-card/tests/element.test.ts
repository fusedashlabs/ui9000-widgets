// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;

import '../index.js';
import '../../chart-renderer/index.js';
import figma from '../../../stories/fixtures/component-asset.figma.json';

async function mount(data: unknown, theme = ''): Promise<HTMLElement> {
  const el = document.createElement('ui9000-component-asset-card');
  if (theme) el.setAttribute('theme', theme);
  el.setAttribute('data', JSON.stringify(data));
  document.body.appendChild(el);
  await el.updateComplete;
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

describe('ui9000-component-asset-card', () => {
  it('renders the Figma sample', async () => {
    const el = await mount(figma, 'dark');
    const root = el.shadowRoot!;

    expect(root.querySelector('.asset img')?.getAttribute('src')).toBe('images/sector-antenna.png');
    expect(root.querySelector('.title')?.textContent).toBe('Sector A1 Antenna');
    expect(root.querySelector('.badge-id')?.textContent).toBe('RTX-3090');
    expect(root.querySelector('.status')?.classList.contains('ok')).toBe(true);
    expect(root.querySelector('.label')?.textContent).toBe('Packet loss');
    expect(root.querySelector('.value')?.textContent).toBe('1.02%');
    const delta = root.querySelector('.delta')!;
    expect(delta.classList.contains('up')).toBe(true);
    expect(delta.querySelector('.delta-value')?.textContent).toBe('0.8');
    expect(delta.querySelector('.delta-label')?.textContent).toBe('vs 30m ago');
    expect(root.querySelector('.trend .trend-line')).toBeTruthy();
    expect(root.querySelectorAll('.trend .pin')).toHaveLength(5);
    expect([...root.querySelectorAll('.trend .seg')].map((s) => s.getAttribute('class'))).toEqual([
      'seg critical',
      'seg ok',
    ]);
    expect(root.querySelector('.trend .cap')?.getAttribute('class')).toBe('cap ok');
    expect(el.getAttribute('data-mode')).toBe('dark');
    el.remove();
  });

  it('keeps the name, id and value without image, delta and trend', async () => {
    const el = await mount({
      name: 'Sector A1 Antenna',
      assetId: 'RTX-3090',
      metric: { label: 'Packet loss', value: 1.02, unit: '%' },
    });
    const root = el.shadowRoot!;
    expect(root.querySelector('.title')?.textContent).toBe('Sector A1 Antenna');
    expect(root.querySelector('.badge-id')?.textContent).toBe('RTX-3090');
    expect(root.querySelector('.value')?.textContent).toBe('1.02%');
    expect(root.querySelector('.surface')?.classList.contains('no-asset')).toBe(true);
    for (const selector of ['.asset', '.delta', '.trend', '.status']) {
      expect(root.querySelector(selector)).toBeNull();
    }
    el.remove();
  });

  it('collapses the image column when the image fails', async () => {
    const el = await mount(figma);
    el.shadowRoot!.querySelector('img')!.dispatchEvent(new Event('error'));
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    expect(el.shadowRoot?.querySelector('.asset')).toBeNull();
    expect(el.shadowRoot?.querySelector('.value')?.textContent).toBe('1.02%');
    el.remove();
  });

  it('draws the trend when history arrives', async () => {
    const el = await mount({ ...figma, trend: null });
    expect(el.shadowRoot?.querySelector('.trend')).toBeNull();
    el.setAttribute('data', JSON.stringify(figma));
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    expect(el.shadowRoot?.querySelector('.trend .trend-line')).toBeTruthy();
    el.remove();
  });

  it('draws a neutral trend without pins when the metric has no thresholds', async () => {
    const el = await mount({ ...figma, metric: { label: 'Uptime', value: 99.2, unit: '%' } });
    const root = el.shadowRoot!;
    expect(root.querySelector('.status')).toBeNull();
    expect([...root.querySelectorAll('.trend .seg')].map((s) => s.getAttribute('class'))).toEqual(['seg neutral']);
    expect(root.querySelector('.trend .pin')).toBeNull();
    el.remove();
  });

  it('shows an empty state for junk', async () => {
    const el = await mount('nope');
    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toBe('No component data');
    el.remove();
  });

  it('mounts through chart-renderer from chartType componentAssetCard', async () => {
    const host = document.createElement('ui9000-chart-renderer');
    host.setAttribute('data', JSON.stringify(figma));
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector('.host ui9000-component-asset-card'));
    const card = host.shadowRoot!.querySelector('ui9000-component-asset-card')!;
    await card.updateComplete;
    expect(card.shadowRoot?.querySelector('.title')?.textContent).toBe('Sector A1 Antenna');
    expect(card.shadowRoot?.querySelector('.value')?.textContent).toBe('1.02%');
    host.remove();
  });
});
