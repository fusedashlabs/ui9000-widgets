import { beforeAll, describe, expect, it } from 'vitest';

import fixture from '../../../stories/fixtures/parallel-coordinates.fusedash.json';
import {
  registerParallelCoordinatesChart,
  Ui9000ParallelCoordinatesChart,
} from '../index.js';

beforeAll(() => {
  // jsdom has no layout or ResizeObserver: give the shell a real box.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
  for (const prop of ['clientWidth', 'clientHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      get() {
        return prop === 'clientWidth' ? 760 : 420;
      },
      configurable: true,
    });
  }
  registerParallelCoordinatesChart();
});

async function mount(attrs: Record<string, string> = {}) {
  const el = document.createElement('ui9000-parallel-coordinates-chart');
  el.setAttribute('data', JSON.stringify(fixture));
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.append(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => requestAnimationFrame(r));
  return el;
}

describe('ui9000-parallel-coordinates-chart', () => {
  it('renders the FuseDash mock into the shell', async () => {
    const el = await mount({ 'chart-title': '' });
    const root = el.shadowRoot as ShadowRoot;

    expect(root.querySelector('.widget-title')?.textContent?.trim()).toBe(
      'Parallel Coordinates Chart',
    );
    expect(root.querySelectorAll('.chart-root svg .line-path')).toHaveLength(15);
    expect(root.querySelector('.empty')).toBeNull();
  });

  it('falls back to the empty state without throwing', async () => {
    const el = document.createElement('ui9000-parallel-coordinates-chart');
    el.setAttribute('data', 'not json');
    document.body.append(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => requestAnimationFrame(r));

    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toBe('No data');
    expect(el.shadowRoot?.querySelector('svg')).toBeNull();
  });

  it('drops the colour ramp when show-legend is off', async () => {
    const withLegend = await mount();
    expect(withLegend.shadowRoot?.querySelector('.color-legend')).not.toBeNull();

    // Boolean attributes are presence-based, so the flag is driven as a
    // property here — `show-legend="false"` would still read as true.
    const without = await mount();
    (without as Ui9000ParallelCoordinatesChart).showLegend = false;
    await (without as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => requestAnimationFrame(r));

    expect(without.shadowRoot?.querySelector('.color-legend')).toBeNull();
  });

  it('defines the element exactly once', () => {
    const first = customElements.get('ui9000-parallel-coordinates-chart');
    registerParallelCoordinatesChart();
    expect(customElements.get('ui9000-parallel-coordinates-chart')).toBe(first);
  });
});
