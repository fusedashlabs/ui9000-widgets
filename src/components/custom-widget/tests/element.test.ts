// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';

import '../element/ui9000-custom-widget.js';
import fixture from '../../../stories/fixtures/custom-widget.fusedash.json';

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 3000,
  intervalMs = 25,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Timed out waiting for condition');
}

function mount(data: unknown, attrs: Record<string, string> = {}): HTMLElement {
  const host = document.createElement('ui9000-custom-widget');
  host.setAttribute('data', JSON.stringify(data));
  for (const [key, value] of Object.entries(attrs)) host.setAttribute(key, value);
  host.style.width = '640px';
  host.style.height = '420px';
  document.body.appendChild(host);
  return host;
}

beforeAll(() => {
  class ResizeObserverStub {
    observe(): void {}
    disconnect(): void {}
    unobserve(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;
});

describe('Ui9000CustomWidget', () => {
  it('mounts the KPI band and a chart pane for the fixture', async () => {
    const host = mount(fixture);

    await waitFor(
      () =>
        !!host.shadowRoot?.querySelector('.kpi-band ui9000-kpi-widget') &&
        !!host.shadowRoot?.querySelector('.pane ui9000-chart-renderer'),
    );

    const content = host.shadowRoot?.querySelector('.custom-content') as HTMLElement | null;
    expect(content?.getAttribute('data-direction')).toBe('vertical');
    expect(content?.getAttribute('data-panes')).toBe('1');
    expect(content?.style.flexDirection).toBe('row');
    expect(host.shadowRoot?.querySelector('.widget-shell.custom-root')).toBeTruthy();

    // isCustom payloads must still dispatch the inner chartType, not customWidget
    const renderer = host.shadowRoot?.querySelector('ui9000-chart-renderer');
    expect(fixture.isCustom).toBe(true);
    expect(renderer?.getAttribute('chart-type')).toBe('lineChart');
    expect(renderer?.hasAttribute('embedded')).toBe(true);
    await waitFor(
      () => !!renderer?.shadowRoot?.querySelector('.host ui9000-line-chart'),
    );
    expect(renderer?.shadowRoot?.querySelector('.host > *')?.hasAttribute('embedded')).toBe(true);

    // The band reads widget.kpis, so cards must actually render
    const kpi = host.shadowRoot?.querySelector('ui9000-kpi-widget');
    await waitFor(() => (kpi?.shadowRoot?.querySelectorAll('.kpi-card').length ?? 0) > 0);
    expect(kpi?.shadowRoot?.querySelectorAll('.kpi-card')).toHaveLength(3);
    expect(kpi?.shadowRoot?.querySelector('.kpi-name')?.textContent).toBe('Total Check-ins');
    expect(kpi?.shadowRoot?.querySelector('.kpi-section-title')).toBeNull();

    host.remove();
  });

  it('renders the title once — panes must not repeat the shell header', async () => {
    const host = mount(fixture);

    await waitFor(
      () =>
        !!host.shadowRoot?.querySelector('.widget-header') &&
        !!host.shadowRoot?.querySelector('.pane ui9000-chart-renderer'),
    );

    // Shell owns the title, mirroring the client's hideName pane prop
    expect(host.shadowRoot?.querySelectorAll('.widget-header')).toHaveLength(1);
    expect(host.shadowRoot?.querySelector('.widget-title')?.textContent?.trim()).toBe(
      'Check-ins Overview',
    );

    const kpi = host.shadowRoot?.querySelector('ui9000-kpi-widget');
    await waitFor(() => (kpi?.shadowRoot?.querySelectorAll('.kpi-card').length ?? 0) > 0);
    expect(kpi?.getAttribute('show-header')).toBe('false');
    expect(kpi?.shadowRoot?.querySelector('.widget-header')).toBeNull();
    expect(kpi?.shadowRoot?.querySelector('.kpi-section-title')).toBeNull();

    const renderer = host.shadowRoot?.querySelector('ui9000-chart-renderer');
    expect(renderer?.getAttribute('show-header')).toBe('false');
    expect(renderer?.getAttribute('chart-type')).toBe('lineChart');
    await waitFor(() => !!renderer?.shadowRoot?.querySelector('.host ui9000-line-chart'));
    const chart = renderer?.shadowRoot?.querySelector('.host > *');
    expect(chart?.tagName.toLowerCase()).toBe('ui9000-line-chart');
    expect(chart?.getAttribute('show-header')).toBe('false');
    expect(chart?.hasAttribute('chart-title')).toBe(false);
    expect(chart?.shadowRoot?.querySelector('.widget-header')).toBeNull();

    host.remove();
  });

  it('forwards flags and scale to the chart pane', async () => {
    const host = mount(fixture, { scale: 'compact', 'show-legend': 'false' });

    await waitFor(() => !!host.shadowRoot?.querySelector('ui9000-chart-renderer'));

    const renderer = host.shadowRoot?.querySelector('ui9000-chart-renderer');
    expect(renderer?.getAttribute('scale')).toBe('compact');
    expect(renderer?.getAttribute('show-legend')).toBe('false');
    expect(renderer?.getAttribute('show-grid')).toBe('');
    host.remove();
  });

  it('lets the direction attribute override arranging.direction', async () => {
    const host = mount(fixture, { direction: 'horizontal' });

    await waitFor(
      () =>
        host.shadowRoot?.querySelector('.custom-content')?.getAttribute('data-direction') ===
        'horizontal',
    );

    const content = host.shadowRoot?.querySelector('.custom-content') as HTMLElement | null;
    expect(content?.style.flexDirection).toBe('column');

    host.remove();
  });

  it('renders two panes side by side for a vertical two-pane arrangement', async () => {
    const host = mount({
      ...fixture,
      arranging: { widgets: ['chartWidget', 'tableWidget'], hasKpi: false, direction: 'vertical' },
      headers: [
        {
          label: 'Month',
          contains: [{ key: 'timestamp__m__chart', source: { type: 'chart', field: 'timestamp__m' } }],
        },
        {
          label: 'Check-ins',
          contains: [{ key: 'count__chart', source: { type: 'chart', field: 'count' } }],
        },
      ],
    });

    await waitFor(() => (host.shadowRoot?.querySelectorAll('.pane').length ?? 0) === 2);

    const content = host.shadowRoot?.querySelector('.custom-content');
    expect(content?.getAttribute('data-panes')).toBe('2');
    const tableHost = host.shadowRoot?.querySelector('.pane[data-kind="tableWidget"] ui9000-table');
    await waitFor(() => !!tableHost?.shadowRoot?.querySelector('[data-header]'));
    expect(tableHost?.shadowRoot?.querySelector('[data-header]')?.textContent).toBe('Month');
    host.remove();
  });

  it('clips stacked panes and keeps a sticky table header inside a scroll area', async () => {
    const host = mount({
      ...fixture,
      arranging: {
        widgets: ['chartWidget', 'tableWidget'],
        hasKpi: false,
        direction: 'horizontal',
      },
      headers: [
        {
          label: 'Month',
          contains: [{ key: 'timestamp__m__chart', source: { type: 'chart', field: 'timestamp__m' } }],
        },
        {
          label: 'Check-ins',
          contains: [{ key: 'count__chart', source: { type: 'chart', field: 'count' } }],
        },
      ],
    });

    await waitFor(() => (host.shadowRoot?.querySelectorAll('.pane').length ?? 0) === 2);

    const content = host.shadowRoot?.querySelector('.custom-content') as HTMLElement | null;
    expect(content?.getAttribute('data-direction')).toBe('horizontal');
    expect(content?.style.flexDirection).toBe('column');

    const tablePane = host.shadowRoot?.querySelector('.pane[data-kind="tableWidget"]') as HTMLElement;
    const tableHost = tablePane.querySelector('ui9000-table');
    await waitFor(() => !!tableHost?.shadowRoot?.querySelector('[data-header]'));
    const scroll = tableHost?.shadowRoot?.querySelector('.table-scroll');
    const header = tableHost?.shadowRoot?.querySelector('thead [data-header]');
    expect(host.shadowRoot?.querySelectorAll('.pane')).toHaveLength(2);
    expect(scroll).toBeTruthy();
    expect(header?.textContent).toBe('Month');
    expect(tableHost?.shadowRoot?.querySelectorAll('tbody tr').length).toBeGreaterThan(1);
    host.remove();
  });

  it('does not mount the chart renderer for a table-only widget', async () => {
    const host = mount({
      name: 'Check-ins table',
      data: [
        { timestamp__m: '01', count: 430 },
        { timestamp__m: '02', count: 675 },
      ],
      arranging: { widgets: ['tableWidget'], hasKpi: false, direction: 'vertical' },
      headers: [
        {
          label: 'Month',
          contains: [{ key: 'timestamp__m__chart', source: { type: 'chart', field: 'timestamp__m' } }],
        },
        {
          label: 'Check-ins',
          contains: [{ key: 'count__chart', source: { type: 'chart', field: 'count' } }],
        },
      ],
    });

    await waitFor(() => !!host.shadowRoot?.querySelector('.pane[data-kind="tableWidget"] ui9000-table'));
    const tableHost = host.shadowRoot?.querySelector('ui9000-table');
    await waitFor(() => !!tableHost?.shadowRoot?.querySelector('.table'));
    await new Promise((r) => setTimeout(r, 50));
    expect(host.shadowRoot?.querySelector('ui9000-chart-renderer')).toBeNull();
    expect(host.shadowRoot?.querySelector('ui9000-kpi-widget')).toBeNull();
    host.remove();
  });

  it('renders a text pane from widget.text', async () => {
    const host = mount({
      name: 'Notes',
      text: '## Hello\n\n**team**',
      arranging: { widgets: ['textWidget'], hasKpi: false, direction: 'vertical' },
    });

    await waitFor(() => !!host.shadowRoot?.querySelector('ui9000-text'));
    const text = host.shadowRoot?.querySelector('ui9000-text');
    await waitFor(() => !!text?.shadowRoot?.querySelector('h2'));
    expect(text?.shadowRoot?.querySelector('h2')?.textContent).toBe('Hello');
    expect(text?.shadowRoot?.querySelector('strong')?.textContent).toBe('team');
    expect(host.shadowRoot?.querySelector('ui9000-chart-renderer')).toBeNull();
    host.remove();
  });

  it('renders an image pane from an http(s) imageUrl', async () => {
    const host = mount({
      name: 'Photo',
      imageUrl: 'https://example.com/store.png',
      alt: 'Store front',
      arranging: { widgets: ['imageWidget'], hasKpi: false, direction: 'vertical' },
    });

    await waitFor(() => !!host.shadowRoot?.querySelector('ui9000-image'));
    const image = host.shadowRoot?.querySelector('ui9000-image');
    await waitFor(() => !!image?.shadowRoot?.querySelector('img'));
    const img = image?.shadowRoot?.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/store.png');
    expect(img?.getAttribute('alt')).toBe('Store front');
    expect(host.shadowRoot?.querySelector('ui9000-chart-renderer')).toBeNull();
    host.remove();
  });

  it('renders the default state when there are no panes and no KPI', async () => {
    const host = mount({ name: 'Empty widget' });

    await waitFor(() => !!host.shadowRoot?.querySelector('.default-state'));

    expect(host.shadowRoot?.querySelector('.default-state strong')?.textContent).toBe(
      'Choose an Option',
    );
    expect(host.shadowRoot?.querySelector('ui9000-chart-renderer')).toBeNull();
    host.remove();
  });

  it('does not throw on an invalid payload', async () => {
    const host = document.createElement('ui9000-custom-widget');
    host.setAttribute('data', '{not json');
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector('.default-state'));

    host.remove();
  });
});
