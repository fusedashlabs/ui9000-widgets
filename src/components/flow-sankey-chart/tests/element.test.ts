import { beforeAll, describe, expect, it, vi } from 'vitest';

import figmaFixture from '../../../stories/fixtures/flow-sankey.figma.json';
import { DARK_THEME, DEFAULT_THEME } from '../../../types/index.js';

let observed: (() => void)[] = [];
let registerFlowSankeyChart: () => void;

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
  ({ registerFlowSankeyChart } = await import('../index.js'));
  registerFlowSankeyChart();
});

type Shadowed = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
};

function sizeShadow(el: HTMLElement, width: number, height: number): void {
  const root = (el as Shadowed).shadowRoot.querySelector('.chart-root');
  if (!root) return;
  Object.defineProperty(root, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(root, 'clientHeight', { value: height, configurable: true });
}

const frame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

async function mount(
  data: unknown,
  attrs: Record<string, string> = {},
  size: [number, number] = [900, 620],
): Promise<Shadowed> {
  const host = document.createElement('ui9000-flow-sankey-chart') as Shadowed;
  host.setAttribute(
    'data',
    typeof data === 'string' ? data : JSON.stringify(data),
  );
  for (const [key, value] of Object.entries(attrs)) host.setAttribute(key, value);
  document.body.appendChild(host);
  await host.updateComplete;

  // First draw ran against a zero-sized root — size it, then redraw.
  sizeShadow(host, size[0], size[1]);
  for (const cb of observed) cb();
  await frame();
  await host.updateComplete;
  return host;
}

describe('ui9000-flow-sankey-chart', () => {
  it('registers the tag exactly once', () => {
    const first = customElements.get('ui9000-flow-sankey-chart');
    registerFlowSankeyChart();
    expect(customElements.get('ui9000-flow-sankey-chart')).toBe(first);
  });

  it('draws the Figma fixture with the severity legend in shell HTML', async () => {
    const host = await mount(figmaFixture, { 'chart-title': 'Tower Power Flow' });

    expect(host.shadowRoot.querySelector('.chart-root svg')).toBeTruthy();
    // Legend is HTML above the plot, never an SVG overlay.
    const legend = host.shadowRoot.querySelector('.chart-legend');
    expect(legend?.textContent).toContain('High');
    expect(legend?.textContent).toContain('Medium');
    expect(legend?.textContent).toContain('Low');
    // The neutral "normal case" colour is a key entry of its own.
    expect(legend?.textContent).toContain('Info');
    expect(host.shadowRoot.querySelector('svg .chart-legend')).toBeNull();

    host.remove();
  });

  it('renders no overflow menu or download action', async () => {
    const host = await mount(figmaFixture, {
      'chart-title': 'Tower Power Flow Analysis',
    });

    expect(host.shadowRoot.querySelector('.widget-actions')).toBeNull();
    expect(host.shadowRoot.querySelector('.menu-btn')).toBeNull();
    expect(host.shadowRoot.querySelector('[data-action="download-image"]')).toBeNull();
    // The rest of the header is untouched.
    expect(host.shadowRoot.querySelector('.widget-header .widget-title')).toBeTruthy();
    host.remove();
  });

  it('renders the subtitle and the legend key label from the payload', async () => {
    const host = await mount(figmaFixture);

    expect(
      host.shadowRoot.querySelector('.widget-subtitle')?.textContent?.trim(),
    ).toBe('Tracing power loss from root cause to output impact');
    // "Severity  High  Medium  Low" — the key names what the swatches encode.
    expect(
      host.shadowRoot.querySelector('.chart-legend .legend-title')?.textContent,
    ).toBe('Severity');
    host.remove();
  });

  it('lets attributes override the subtitle and the legend key label', async () => {
    const host = await mount(figmaFixture, {
      'chart-subtitle': 'Cause to impact, last 7 days',
      'legend-label': 'Risk band',
    });

    expect(
      host.shadowRoot.querySelector('.widget-subtitle')?.textContent?.trim(),
    ).toBe('Cause to impact, last 7 days');
    expect(
      host.shadowRoot.querySelector('.chart-legend .legend-title')?.textContent,
    ).toBe('Risk band');
    host.remove();
  });

  it('keeps the title, subtitle and summary cards on one header row', async () => {
    const host = await mount(figmaFixture, {
      'chart-title': 'Tower Power Flow Analysis',
    });
    const header = host.shadowRoot.querySelector('.widget-header');

    expect(header?.querySelector('.widget-heading .widget-title')?.textContent)
      .toContain('Tower Power Flow');
    expect(header?.querySelector('.widget-heading .widget-subtitle')).toBeTruthy();
    expect(header?.querySelector('.widget-aside .summary-cards')).toBeTruthy();
    // Nothing chart chrome-ish is left stacked above the plot but the legend.
    const body = host.shadowRoot.querySelector('.widget-body');
    expect(body?.querySelector('.summary-cards')).toBeNull();
    expect([...(body?.children ?? [])].map((c) => c.className)).toEqual([
      'chart-legend',
      'chart-root',
    ]);
    host.remove();
  });

  it('drops the header chrome entirely when show-header is false', async () => {
    const host = await mount(figmaFixture, { 'show-header': 'false' });

    expect(host.shadowRoot.querySelector('.widget-header')).toBeNull();
    expect(host.shadowRoot.querySelector('.widget-subtitle')).toBeNull();
    expect(host.shadowRoot.querySelector('.summary-cards')).toBeNull();
    // The plot itself still draws.
    expect(host.shadowRoot.querySelector('.chart-root svg')).toBeTruthy();
    host.remove();
  });

  it('suppresses the subtitle when the attribute is present but empty', async () => {
    // The fixture carries a subtitle, so this proves an empty attribute is
    // treated as a choice rather than falling back to the payload.
    const host = await mount(figmaFixture, { 'chart-subtitle': '' });

    expect(host.shadowRoot.querySelector('.widget-subtitle')).toBeNull();
    // The rest of the header is unaffected.
    expect(host.shadowRoot.querySelector('.summary-cards')).toBeTruthy();
    host.remove();
  });

  it('falls back to the payload subtitle when the attribute is absent', async () => {
    const host = await mount(figmaFixture);

    expect(
      host.shadowRoot.querySelector('.widget-subtitle')?.textContent?.trim(),
    ).toBe('Tracing power loss from root cause to output impact');
    host.remove();
  });

  it('omits the subtitle line when nothing supplies one', async () => {
    const host = await mount([
      { source: 'a', target: 'b', value: 4 },
      { source: 'b', target: 'c', value: 4 },
    ]);

    expect(host.shadowRoot.querySelector('.widget-subtitle')).toBeNull();
    host.remove();
  });

  it('renders the summary cards from the payload', async () => {
    const host = await mount(figmaFixture);
    const summary = host.shadowRoot.querySelector('.summary-cards');

    expect(summary?.textContent).toContain('Total Events');
    expect(summary?.textContent).toContain('685');
    expect(summary?.textContent).toContain('June 23 - June 29, 2026');
    host.remove();
  });

  it('draws named summary icons as svg, and anything else as text', async () => {
    const host = await mount(figmaFixture);
    const chips = [...host.shadowRoot.querySelectorAll('.summary-icon')];

    expect(chips).toHaveLength(2);
    for (const chip of chips) {
      const icon = chip.querySelector('svg');
      expect(icon).toBeTruthy();
      // currentColor lets one icon serve both appearances.
      expect(icon?.getAttribute('fill')).toBe('currentColor');
      expect(icon?.querySelector('path')?.getAttribute('d')).toBeTruthy();
    }
    host.remove();

    // An unknown name falls back to literal text, so emoji payloads still work.
    const emoji = await mount({
      ...(figmaFixture as object),
      summary: [{ label: 'Total', value: '5', icon: '\u{1F4C4}' }],
    });
    const chip = emoji.shadowRoot.querySelector('.summary-icon');
    expect(chip?.querySelector('svg')).toBeNull();
    expect(chip?.textContent?.trim()).toBe('\u{1F4C4}');
    emoji.remove();
  });

  it('hides the summary cards and the gutter when their flags are off', async () => {
    const host = await mount(figmaFixture, {
      'show-summary': 'false',
      'show-grid': 'false',
    });

    expect(host.shadowRoot.querySelector('.summary-cards')).toBeNull();
    expect(host.shadowRoot.querySelector('.flow-axis')).toBeNull();
    host.remove();
  });

  it('shows the empty state for an empty payload without throwing', async () => {
    const host = await mount([]);

    expect(host.shadowRoot.querySelector('.empty')?.textContent?.trim()).toBe(
      'No data',
    );
    expect(host.shadowRoot.querySelector('.chart-root svg')).toBeNull();
    expect(host.shadowRoot.querySelector('.chart-legend')).toBeNull();
    host.remove();
  });

  it('explains a cyclic payload instead of drawing it', async () => {
    const host = await mount([
      { source: 'a', target: 'b', value: 1 },
      { source: 'b', target: 'a', value: 1 },
    ]);

    expect(host.shadowRoot.querySelector('.empty')?.textContent).toContain(
      'Circular dependency',
    );
    host.remove();
  });

  it('survives malformed JSON in the data attribute', async () => {
    const host = await mount('{not json');

    expect(host.shadowRoot.querySelector('.empty')).toBeTruthy();
    host.remove();
  });

  it('keeps one svg across resizes', async () => {
    const host = await mount(figmaFixture);
    expect(host.shadowRoot.querySelectorAll('.chart-root svg')).toHaveLength(1);

    for (const [w, h] of [
      [560, 360],
      [1200, 780],
    ]) {
      sizeShadow(host, w, h);
      for (const cb of observed) cb();
      await frame();

      const svg = host.shadowRoot.querySelector('.chart-root svg');
      expect(host.shadowRoot.querySelectorAll('.chart-root svg')).toHaveLength(1);
      expect(svg?.getAttribute('width')).toBe(String(w));
    }
    host.remove();
  });

  it('emits flow-select when a node is clicked', async () => {
    const host = await mount(figmaFixture);
    const onSelect = vi.fn();
    host.addEventListener('flow-select', onSelect);

    const bar = host.shadowRoot.querySelector(
      '.flow-nodes path',
    ) as SVGPathElement;
    bar.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const detail = (onSelect.mock.calls[0][0] as CustomEvent<{ nodeId: string }>)
      .detail;
    expect(detail.nodeId).toEqual(expect.any(String));
    host.remove();
  });

  it('seeds the highlight from the selected-node attribute', async () => {
    const host = await mount(figmaFixture, { 'selected-node': 'power-loss' });
    const ringed = [
      ...host.shadowRoot.querySelectorAll('.flow-nodes path'),
    ].filter((bar) => bar.getAttribute('stroke-dasharray'));

    expect(ringed).toHaveLength(1);
    host.remove();
  });

  it('follows the theme attribute, and reports it as data-mode', async () => {
    const dark = await mount(figmaFixture, { theme: 'dark' });
    expect(dark.getAttribute('data-mode')).toBe('dark');

    const light = await mount(figmaFixture, { theme: 'light' });
    expect(light.getAttribute('data-mode')).toBe('light');

    // Default: nothing set anywhere, so it resolves light.
    const bare = await mount(figmaFixture);
    expect(bare.getAttribute('data-mode')).toBe('light');

    for (const host of [dark, light, bare]) host.remove();
  });

  it('paints dark chrome and a dark rail when theme is dark', async () => {
    const light = await mount(figmaFixture, { theme: 'light' });
    const dark = await mount(figmaFixture, { theme: 'dark' });

    const shellInk = (host: Shadowed): string | undefined =>
      (host.shadowRoot.querySelector('.widget-shell') as HTMLElement | null)?.style
        .getPropertyValue('--ui9000-color-text')
        .trim();
    const rail = (host: Shadowed): string | null | undefined =>
      host.shadowRoot.querySelector('.flow-rails path')?.getAttribute('fill');

    // The chrome palette and the plot move together.
    expect(shellInk(light)).not.toBe(shellInk(dark));
    expect(rail(light)).not.toBe(rail(dark));

    light.remove();
    dark.remove();
  });

  it('paints a dark panel in dark mode', async () => {
    const light = await mount(figmaFixture, { theme: 'light' });
    const dark = await mount(figmaFixture, { theme: 'dark' });

    // `chartShellStyles` paints `.widget-shell` from these; jsdom will not
    // resolve the var() itself, so assert the values the shell reads.
    const v = (host: Shadowed, name: string): string =>
      (host.shadowRoot.querySelector('.widget-shell') as HTMLElement).style
        .getPropertyValue(name)
        .trim();

    // Assert against the palettes themselves, not copies of their values.
    expect(v(light, '--ui9000-color-surface')).toBe(DEFAULT_THEME.surface);
    expect(v(dark, '--ui9000-color-surface')).toBe(DARK_THEME.surface);
    expect(v(light, '--ui9000-color-border')).toBe(DEFAULT_THEME.border);
    expect(v(dark, '--ui9000-color-border')).toBe(DARK_THEME.border);
    // Ink inverts with the panel.
    expect(v(light, '--ui9000-color-text')).toBe(DEFAULT_THEME.text);
    expect(v(dark, '--ui9000-color-text')).toBe(DARK_THEME.text);
    expect(DARK_THEME.surface).not.toBe(DEFAULT_THEME.surface);

    light.remove();
    dark.remove();
  });

  it('whitens the ink even when ambient light variables surround it', async () => {
    // Storybook wraps every story in a light `contextToCssVars` set; the chart
    // must not inherit that ink onto its own dark panel.
    // Set on the element itself: jsdom does not inherit custom properties from
    // an ancestor, and `readCssVar` reads the host's own computed style either way.
    const host = document.createElement('ui9000-flow-sankey-chart') as Shadowed;
    host.style.setProperty('--ui9000-color-text', DEFAULT_THEME.text);
    host.style.setProperty('--ui9000-color-text-muted', DEFAULT_THEME.textMuted);
    document.body.appendChild(host);

    host.setAttribute('data', JSON.stringify(figmaFixture));
    host.setAttribute('theme', 'dark');
    await host.updateComplete;
    sizeShadow(host, 900, 620);
    for (const cb of observed) cb();
    await frame();

    const shell = host.shadowRoot.querySelector('.widget-shell') as HTMLElement;
    expect(shell.style.getPropertyValue('--ui9000-color-text').trim()).toBe(
      DARK_THEME.text,
    );
    expect(shell.style.getPropertyValue('--ui9000-color-surface').trim()).toBe(
      DARK_THEME.surface,
    );
    // The SVG ink comes from the same resolved theme. (The first text in a
    // label block is the icon glyph, which carries no fill of its own.)
    const label = host.shadowRoot.querySelector('.flow-labels text[fill]');
    expect(label?.getAttribute('fill')).toBe(DARK_THEME.text);

    host.remove();
  });

  it('defers to the host palette when the mode is inherited, not asked for', async () => {
    const host = document.createElement('ui9000-flow-sankey-chart') as Shadowed;
    // The host drives theming itself: mode plus its own branded ink.
    host.style.setProperty('--ui9000-mode', 'dark');
    host.style.setProperty('--ui9000-color-text', 'rgb(1, 2, 3)');
    document.body.appendChild(host);

    host.setAttribute('data', JSON.stringify(figmaFixture));
    await host.updateComplete;
    sizeShadow(host, 900, 620);
    for (const cb of observed) cb();
    await frame();

    expect(host.getAttribute('data-mode')).toBe('dark');
    expect(
      (host.shadowRoot.querySelector('.widget-shell') as HTMLElement).style
        .getPropertyValue('--ui9000-color-text')
        .trim(),
    ).toBe('rgb(1, 2, 3)');

    host.remove();
  });

  it('does not redraw the plot for a hover-only state change', async () => {
    const host = await mount(figmaFixture, { 'show-tooltip': 'true' });
    const svg = host.shadowRoot.querySelector('.chart-root svg');
    const ribbon = host.shadowRoot.querySelector(
      '.flow-links path',
    ) as SVGPathElement;

    ribbon.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await host.updateComplete;

    // Same SVG node — the tooltip is shell state, not a plot rebuild.
    expect(host.shadowRoot.querySelector('.chart-root svg')).toBe(svg);
    host.remove();
  });
});
