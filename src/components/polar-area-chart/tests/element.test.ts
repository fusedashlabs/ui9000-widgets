import { beforeAll, describe, expect, it } from 'vitest';
import { html, render } from 'lit';

beforeAll(() => {
  // jsdom has no ResizeObserver; the element only uses it to schedule a redraw.
  globalThis.ResizeObserver = class {
    observe(): void {}
    disconnect(): void {}
    unobserve(): void {}
  } as unknown as typeof ResizeObserver;
});

async function mount(template: unknown) {
  const mod = await import('../index.js');
  mod.registerPolarAreaChart();
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(template as never, host);
  const el = host.querySelector(
    'ui9000-polar-area-chart',
  ) as InstanceType<typeof mod.Ui9000PolarAreaChart>;
  await el.updateComplete;
  return el;
}

/**
 * `show-grid` and friends default to true, so an *absent* attribute cannot
 * express "off" — `?show-grid=${false}` is a no-op on first render. Hosts and
 * stories must bind the property instead; these tests pin that.
 */
describe('ui9000-polar-area-chart boolean flags', () => {
  const data = JSON.stringify([
    { label: 'A', value: 30 },
    { label: 'B', value: 70 },
  ]);

  it('property binding turns the grid off on first render', async () => {
    const el = await mount(
      html`<ui9000-polar-area-chart data=${data} .showGrid=${false}></ui9000-polar-area-chart>`,
    );
    expect(el.showGrid).toBe(false);
  });

  it('an absent attribute keeps the default on', async () => {
    const el = await mount(
      html`<ui9000-polar-area-chart data=${data}></ui9000-polar-area-chart>`,
    );
    expect(el.showGrid).toBe(true);
    expect(el.showLegend).toBe(true);
    expect(el.showTooltip).toBe(true);
  });
});
