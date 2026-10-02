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
import figma from '../../../stories/fixtures/power-path.figma.json';

async function mount(data: unknown, theme = ''): Promise<HTMLElement> {
  const el = document.createElement('ui9000-power-path-card');
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

describe('ui9000-power-path-card', () => {
  it('renders the Figma sample', async () => {
    const el = await mount(figma, 'dark');
    const root = el.shadowRoot!;

    expect(root.querySelector('.title')?.textContent).toBe('Sector 1 Power Path');
    expect(root.querySelector('.badge')?.textContent?.trim()).toBe('5G-TX-303');
    expect(root.querySelector('.health')?.classList.contains('critical')).toBe(true);
    expect(root.querySelector('.score')?.textContent).toBe('69.9%');
    expect(root.querySelector('.spark .spark-line')).toBeTruthy();
    expect(root.querySelector('.fault')?.textContent?.trim()).toBe(
      'Critical fault detected · Circuit L2 · RF Line 3 · Downtime 24 sec',
    );
    const rows = [...root.querySelectorAll('.row')].map((row) =>
      [...row.children].map((cell) => cell.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['Input Voltage', '48.1 V', 'Stable'],
      ['Output Voltage', '36.4 V', 'Critical'],
      ['Current Draw', '18.7 A', 'Critical'],
      ['Power Loss', '24.3%', 'High'],
      ['Connector Temperature', '63°C', 'Critical'],
    ]);
    expect(el.getAttribute('data-mode')).toBe('dark');
    el.remove();
  });

  it('has no banner without a fault', async () => {
    const el = await mount({ ...figma, fault: null });
    expect(el.shadowRoot?.querySelector('.fault')).toBeNull();
    expect(el.shadowRoot?.querySelectorAll('.row')).toHaveLength(5);
    el.remove();
  });

  it('keeps the percent and draws no line without points', async () => {
    const el = await mount({ ...figma, health: { ...figma.health, points: [] } });
    expect(el.shadowRoot?.querySelector('.score')?.textContent).toBe('69.9%');
    expect(el.shadowRoot?.querySelector('.spark')).toBeNull();
    expect(el.shadowRoot?.querySelector('svg .spark-line')).toBeNull();
    el.remove();
  });

  it('has no health summary when the payload has no score', async () => {
    const el = await mount({ ...figma, health: null });
    expect(el.shadowRoot?.querySelector('.health')).toBeNull();
    expect(el.shadowRoot?.querySelectorAll('.row')).toHaveLength(5);
    el.remove();
  });

  it('leaves the status cell empty when a metric has no threshold', async () => {
    const el = await mount({ data: [{ label: 'Module Count', value: 6 }] });
    expect(el.shadowRoot?.querySelector('.status')?.textContent).toBe('');
    expect(el.shadowRoot?.querySelector('.dot')).toBeNull();
    el.remove();
  });

  it('redraws the line when data changes', async () => {
    const el = await mount({ ...figma, health: { ...figma.health, points: [] } });
    el.setAttribute('data', JSON.stringify(figma));
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    expect(el.shadowRoot?.querySelector('.spark .spark-line')).toBeTruthy();
    el.remove();
  });

  it('shows an empty state for junk', async () => {
    const el = await mount('nope');
    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toBe('No power path data');
    el.remove();
  });

  it('mounts through chart-renderer from chartType powerPathCard', async () => {
    const host = document.createElement('ui9000-chart-renderer');
    host.setAttribute('data', JSON.stringify(figma));
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector('.host ui9000-power-path-card'));
    const card = host.shadowRoot!.querySelector('ui9000-power-path-card')!;
    await card.updateComplete;
    expect(card.shadowRoot?.querySelector('.title')?.textContent).toBe('Sector 1 Power Path');
    expect(card.shadowRoot?.querySelectorAll('.row')).toHaveLength(5);
    host.remove();
  });
});
