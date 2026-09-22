// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;

import '../index.js';
import antenna from '../../../stories/fixtures/status-gauge.mock.json';

describe('ui9000-status-gauge-widget', () => {
  it('renders the gauge and one card per remaining data row', async () => {
    const el = document.createElement('ui9000-status-gauge-widget');
    el.setAttribute('data', JSON.stringify(antenna));
    document.body.appendChild(el);
    await el.updateComplete;
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('.title')?.textContent).toBe('Active Antenna Unit');
    expect(el.shadowRoot?.querySelector('.gauge svg')).toBeTruthy();
    expect(el.shadowRoot?.querySelectorAll('.card')).toHaveLength(4);
    expect(el.shadowRoot?.querySelector('.badge')?.textContent).toContain('Degraded');
    expect(el.getAttribute('data-mode')).toBe('light');
    el.remove();
  });

  it('switches the surface when theme is dark', async () => {
    const el = document.createElement('ui9000-status-gauge-widget');
    el.setAttribute('theme', 'dark');
    el.setAttribute('data', JSON.stringify(antenna));
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.getAttribute('data-mode')).toBe('dark');
    expect(el.shadowRoot?.querySelector('.panel')?.getAttribute('data-mode')).toBe('dark');
    el.remove();
  });
});
