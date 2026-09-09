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
  await import('../element/ui9000-matrix-chart.js');
});

type Shadowed = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

function sizeShadow(el: HTMLElement, width: number, height: number): void {
  const root = (el as Shadowed).shadowRoot;
  for (const [selector, h] of [
    ['.chart-body', height],
    ['.chart-scroll', height - 40],
  ] as const) {
    const node = root.querySelector(selector) as HTMLElement | null;
    if (!node) continue;
    Object.defineProperty(node, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(node, 'clientHeight', { value: h, configurable: true });
  }
}

// jsdom runs requestAnimationFrame on a ~16ms timer
const flush = () => new Promise((r) => setTimeout(r, 40));

const GRID = Array.from({ length: 10 }, (_, row) => ({
  x: 'Column A',
  y: `Row ${row}`,
  value: row + 1,
}));

/**
 * `show-*` are Lit boolean attributes, so presence means true — hosts turn
 * them off by omitting the attribute or setting the property, never by
 * `show-legend="false"`. Drive them as properties, the way the stories do.
 */
async function mount(
  data: unknown = GRID,
  props: Record<string, boolean> = {},
): Promise<Shadowed> {
  const el = document.createElement('ui9000-matrix-chart') as Shadowed;
  el.setAttribute('data', JSON.stringify(data));
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;
  sizeShadow(el, 900, 500);
  for (const cb of observed) cb();
  await flush();
  await el.updateComplete;
  return el;
}

describe('ui9000-matrix-chart', () => {
  it('redraws on a real resize but skips identical ones', async () => {
    const el = await mount();
    let draws = 0;
    new MutationObserver(() => {
      draws += 1;
    }).observe(el.shadowRoot.querySelector('.chart-root')!, { childList: true });

    const resize = async (w: number, h: number) => {
      sizeShadow(el, w, h);
      for (const cb of observed) cb();
      await flush();
      await flush();
    };

    await resize(900, 520);
    const afterFirst = draws;
    expect(afterFirst).toBeGreaterThan(0);

    // Same box → no work
    await resize(900, 520);
    expect(draws).toBe(afterFirst);

    // Genuinely different box → redraws
    await resize(700, 620);
    expect(draws).toBeGreaterThan(afterFirst);

    el.remove();
  });

  it('shows the empty state and no plot for an unusable payload', async () => {
    const el = await mount({ nope: true });
    const root = el.shadowRoot;

    expect(root.querySelector('.empty')?.textContent?.trim()).toBe('No data');
    expect(root.querySelector('.chart-root')?.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('.chart-root svg')).toBeNull();
    expect(root.querySelector('.palette-legend')).toBeNull();

    el.remove();
  });

  it('show-legend toggles the palette legend', async () => {
    const shown = await mount();
    expect(shown.shadowRoot.querySelector('.palette-legend')).not.toBeNull();
    expect(shown.shadowRoot.querySelectorAll('.palette-swatch').length).toBeGreaterThan(0);
    shown.remove();

    const hidden = await mount(GRID, { showLegend: false });
    expect(hidden.shadowRoot.querySelector('.palette-legend')).toBeNull();
    hidden.remove();
  });

  it('show-tooltip toggles the hover tooltip', async () => {
    const hover = (el: Shadowed) =>
      el.shadowRoot
        .querySelector('rect.matrix-cell')!
        .dispatchEvent(new MouseEvent('mouseenter'));

    const on = await mount();
    expect(on.shadowRoot.querySelector('.chart-root')?.hasAttribute('data-hoverable')).toBe(true);
    hover(on);
    await on.updateComplete;
    expect(on.shadowRoot.querySelector('.tooltip')).not.toBeNull();
    on.remove();

    const off = await mount(GRID, { showTooltip: false });
    expect(off.shadowRoot.querySelector('.chart-root')?.hasAttribute('data-hoverable')).toBe(false);
    hover(off);
    await off.updateComplete;
    expect(off.shadowRoot.querySelector('.tooltip')).toBeNull();
    off.remove();
  });

  it('labels tooltip rows with the units declared in axisDetails', async () => {
    const el = await mount({
      xAxe: ['region'],
      yAxe: ['revenue'],
      groupBy: ['segment'],
      axisDetails: {
        segment: { label: 'Customer segment' },
        revenue: { measure_unit_type: 'currency', measure_unit_symbol: '€' },
      },
      data: Array.from({ length: 8 }, (_, i) => ({
        region: 'EU',
        segment: `Segment ${i}`,
        revenue: 1500 + i,
      })),
    });

    el.shadowRoot
      .querySelector('rect.matrix-cell')!
      .dispatchEvent(new MouseEvent('mouseenter'));
    await el.updateComplete;

    const tooltip = el.shadowRoot.querySelector('.tooltip')!;
    expect(tooltip.querySelector('.name')?.textContent).toContain('Customer segment:');
    expect(tooltip.textContent).toContain('€1,5');

    el.remove();
  });
});
