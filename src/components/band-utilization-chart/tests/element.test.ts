import { beforeAll, describe, expect, it } from 'vitest';

import fixture from '../../../stories/fixtures/band-utilization.json';

let resize: (() => void) | undefined;

beforeAll(async () => {
  class StubResizeObserver {
    constructor(cb: () => void) {
      resize = cb;
    }
    observe(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;
  await import('../element/ui9000-band-utilization-chart.js');
});

type Shadowed = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

function sizeRoot(el: HTMLElement, width: number, height: number): void {
  const root = (el as Shadowed).shadowRoot.querySelector('.chart-root') as HTMLElement | null;
  if (!root) return;
  Object.defineProperty(root, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(root, 'clientHeight', { configurable: true, value: height });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 40));

describe('ui9000-band-utilization-chart', () => {
  it('puts the legend in the shell and the percents in the plot', async () => {
    const el = document.createElement('ui9000-band-utilization-chart') as Shadowed;
    el.setAttribute('data', JSON.stringify(fixture));
    document.body.append(el);
    await el.updateComplete;
    sizeRoot(el, 640, 320);
    resize?.();
    await flush();

    const legend = [...el.shadowRoot.querySelectorAll('.legend-label')].map(
      (node) => node.textContent,
    );
    expect(legend).toEqual(['Low', 'Medium', 'High']);
    expect(el.shadowRoot.querySelector('.band-unit')?.textContent).toBe('Percent (%)');
    expect(el.shadowRoot.querySelector('.widget-title')?.textContent).toContain(
      'Band Utilization by Sector',
    );

    const svg = el.shadowRoot.querySelector('.chart-root svg');
    expect(svg?.querySelector('.legend-label')).toBeNull();
    expect(svg?.querySelectorAll('.band-segment')).toHaveLength(12);
    expect(svg?.querySelector('.tick')).toBeNull();

    el.remove();
  });

  it('hides the header when show-header is false', async () => {
    const el = document.createElement('ui9000-band-utilization-chart') as Shadowed;
    el.setAttribute('show-header', 'false');
    el.setAttribute('data', JSON.stringify(fixture));
    document.body.append(el);
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('.widget-header')).toBeNull();
    expect(el.shadowRoot.querySelector('.widget-title')).toBeNull();
    el.remove();
  });
});
