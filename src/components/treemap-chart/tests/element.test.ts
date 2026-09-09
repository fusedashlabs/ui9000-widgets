import { beforeAll, describe, expect, it } from 'vitest';

let observed: (() => void)[] = [];

beforeAll(async () => {
  // jsdom ships neither ResizeObserver nor layout; drive draws by hand and
  // report sizes the test controls.
  class StubResizeObserver {
    constructor(private cb: () => void) {
      observed.push(cb);
    }
    observe(): void {}
    disconnect(): void {
      observed = observed.filter((c) => c !== this.cb);
    }
  }
  globalThis.ResizeObserver =
    StubResizeObserver as unknown as typeof ResizeObserver;
  await import('../element/ui9000-treemap-chart.js');
});

type Shadowed = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

function sizeShadow(el: HTMLElement, width: number, height: number): void {
  const root = (el as Shadowed).shadowRoot.querySelector('.chart-root') as HTMLElement | null;
  if (!root) return;
  Object.defineProperty(root, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(root, 'clientHeight', { value: height, configurable: true });
}

// jsdom runs requestAnimationFrame on a ~16ms timer
const flush = () => new Promise((r) => setTimeout(r, 40));

const SINGLE = {
  groupBy: ['segment'],
  yAxe: ['revenue'],
  data: [
    { segment: 'Fresh Market', revenue: 200 },
    { segment: 'Storage', revenue: 80 },
    { segment: 'Other', revenue: 40 },
  ],
};

const GROUPED = {
  groupBy: ['county'],
  subgroup: 'crop',
  yAxe: ['area'],
  data: [
    { county: 'LA', crop: 'Tomato', area: 100 },
    { county: 'LA', crop: 'Other', area: 40 },
    { county: 'SD', crop: 'Tomato', area: 80 },
  ],
};

/**
 * `show-*` are Lit boolean attributes, so presence means true — hosts turn
 * them off by omitting the attribute or setting the property, never by
 * `show-legend="false"`. Drive them as properties, the way the stories do.
 */
async function mount(
  data: unknown = SINGLE,
  props: Record<string, boolean> = {},
): Promise<Shadowed> {
  const el = document.createElement('ui9000-treemap-chart') as Shadowed;
  el.setAttribute('data', JSON.stringify(data));
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;
  sizeShadow(el, 600, 400);
  for (const cb of observed) cb();
  await flush();
  await el.updateComplete;
  return el;
}

describe('ui9000-treemap-chart', () => {
  it('shows the empty state and no plot for an unusable payload', async () => {
    const el = await mount({ nope: true });
    const root = el.shadowRoot;

    expect(root.querySelector('.empty')?.textContent?.trim()).toBe('No data');
    expect(root.querySelector('.chart-root')?.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('.chart-root svg')).toBeNull();
    expect(root.querySelector('.legend-palette')).toBeNull();

    el.remove();
  });

  it('show-legend toggles the palette strip in single mode', async () => {
    const shown = await mount();
    expect(shown.shadowRoot.querySelector('.legend-palette')).not.toBeNull();
    expect(shown.shadowRoot.querySelectorAll('.legend-palette-swatch').length).toBeGreaterThan(0);
    shown.remove();

    const hidden = await mount(SINGLE, { showLegend: false });
    expect(hidden.shadowRoot.querySelector('.legend-palette')).toBeNull();
    hidden.remove();
  });

  it('keeps the shared palette strip off in grouped mode', async () => {
    const el = await mount(GROUPED);
    expect(el.shadowRoot.querySelector('.treemap-card')).not.toBeNull();
    expect(el.shadowRoot.querySelector('.legend-palette')).toBeNull();
    el.remove();
  });

  it('show-tooltip toggles the hover tooltip', async () => {
    const hover = (el: Shadowed) =>
      el.shadowRoot.querySelector('.treemap-tile')!.dispatchEvent(new MouseEvent('mouseenter'));

    const on = await mount();
    hover(on);
    await on.updateComplete;
    const tooltip = on.shadowRoot.querySelector('.tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toContain('Value:');
    on.remove();

    const off = await mount(SINGLE, { showTooltip: false });
    hover(off);
    await off.updateComplete;
    expect(off.shadowRoot.querySelector('.tooltip')).toBeNull();
    off.remove();
  });

  it('labels the tooltip category with axisDetails', async () => {
    const el = await mount({
      ...SINGLE,
      axisDetails: {
        segment: { label: 'Customer segment', measure_unit: 'ha' },
      },
    });

    el.shadowRoot.querySelector('.treemap-tile')!.dispatchEvent(new MouseEvent('mouseenter'));
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('.tooltip')?.textContent).toContain(
      'Customer segment: Fresh Market ha',
    );

    el.remove();
  });
});
