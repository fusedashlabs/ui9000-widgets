// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    observe(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;

  // jsdom has no SVG layout, so radar skips the tick pill unless this exists.
  (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
    ({ x: 0, y: -6, width: 24, height: 12 }) as DOMRect;

  await Promise.all([
    import('../polar-area-chart/element/ui9000-polar-area-chart.js'),
    import('../radial-bar-chart/element/ui9000-radial-bar-chart.js'),
    import('../radar-chart/element/ui9000-radar-chart.js'),
    import('../pie-chart/element/ui9000-pie-chart.js'),
    import('../donut-chart/element/ui9000-donut-chart.js'),
  ]);
});

type Shadowed = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 40));

const wedges = [
  { label: 'Jan', value: 10 },
  { label: 'Feb', value: 20 },
  { label: 'Mar', value: 15 },
];

const inkCases = ['ui9000-polar-area-chart', 'ui9000-radial-bar-chart'];
const sliceCases = ['ui9000-pie-chart', 'ui9000-donut-chart'];

async function mount(tag: string): Promise<Shadowed> {
  const el = document.createElement(tag) as Shadowed;
  el.style.width = '360px';
  el.style.height = '280px';
  el.style.setProperty('--ui9000-color-surface', '#13161D');
  el.style.setProperty('--ui9000-mode', 'dark');
  el.setAttribute('data', JSON.stringify(wedges));
  document.body.append(el);
  await el.updateComplete;
  await flush();
  await el.updateComplete;
  return el;
}

describe('family B dark polar ink', () => {
  it.each(inkCases)('%s paints grid and labels from the host theme', async (tag) => {
    const el = await mount(tag);
    const svg = el.shadowRoot.querySelector('svg');
    expect(svg, tag).not.toBeNull();
    const painted = svg!.innerHTML.toLowerCase();
    expect(painted, tag).toMatch(/#444b57|#a4a9b1|#282e37/);
    expect(painted, tag).not.toMatch(/#939ba7|#5f6877|#afb3bb|#f1f4f7/);
    el.remove();
  });

  it('ui9000-radar-chart paints the tick pill and its text from the host theme', async () => {
    const el = await mount('ui9000-radar-chart');
    const svg = el.shadowRoot.querySelector('svg');
    expect(svg).not.toBeNull();
    const pill = svg!.querySelector('.tick-label');
    const tickText = svg!.querySelector('.tick-rect');
    expect(pill?.getAttribute('fill')?.toLowerCase()).toBe('#282e37');
    expect(tickText?.getAttribute('fill')?.toLowerCase()).toBe('#eff0f1');
    expect(svg!.innerHTML.toLowerCase()).not.toMatch(/#939ba7|#5f6877|#afb3bb|#f1f4f7/);
    el.remove();
  });

  it.each(sliceCases)('%s strokes slices with the dark gap', async (tag) => {
    const el = await mount(tag);
    const path = el.shadowRoot.querySelector('path');
    expect(path, tag).not.toBeNull();
    expect(path!.getAttribute('stroke')?.toLowerCase(), tag).toBe('#1a1b1f');
    el.remove();
  });
});
