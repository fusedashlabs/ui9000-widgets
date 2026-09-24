// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';

import { Ui9000ChartRenderer } from '../element/ui9000-chart-renderer.js';
import lineFixture from '../../../stories/fixtures/line.fusedash.json';
import barGroupedFixture from '../../../stories/fixtures/bar-grouped.fusedash.json';
import mapFixture from '../../../stories/fixtures/map.fusedash.json';
import { resolveChartTarget } from '../lib/registry.js';

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

beforeAll(() => {
  class ResizeObserverStub {
    observe(): void {}
    disconnect(): void {}
    unobserve(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;
});

describe('Ui9000ChartRenderer', () => {
  it('mounts ui9000-line-chart for lineChart payload', async () => {
    const host = document.createElement('ui9000-chart-renderer');
    host.setAttribute('data', JSON.stringify(lineFixture));
    host.style.width = '640px';
    host.style.height = '320px';
    document.body.appendChild(host);

    await waitFor(
      () => !!host.shadowRoot?.querySelector('.host ui9000-line-chart'),
    );

    const empty = host.shadowRoot?.querySelector('.empty');
    expect(empty instanceof HTMLElement && empty.hidden).toBe(true);
    expect(empty?.textContent ?? '').toBe('');

    host.remove();
  });

  it('shows empty state for unsupported chart types', async () => {
    const host = document.createElement('ui9000-chart-renderer');
    host.setAttribute('data', JSON.stringify({ chartType: 'customWidget', data: [] }));
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector('.empty'));

    const empty = host.shadowRoot?.querySelector('.empty');
    expect(empty?.textContent).toContain('Unsupported chart type');
    host.remove();
  });

  it('suppresses the mounted chart header when show-header is false', async () => {
    const host = document.createElement('ui9000-chart-renderer');
    host.setAttribute('data', JSON.stringify(lineFixture));
    host.setAttribute('show-header', 'false');
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector('.host ui9000-line-chart'));

    const chart = host.shadowRoot?.querySelector('ui9000-line-chart');
    expect(chart?.getAttribute('show-header')).toBe('false');
    expect(chart?.hasAttribute('chart-title')).toBe(false);
    host.remove();
  });

  it('keeps pasted widget JSON off the data attribute', () => {
    const host = document.createElement('ui9000-chart-renderer');
    const payload = JSON.stringify({ chartType: 'lineChart', name: 'Top', data: [] });
    host.widgetJson = payload;
    expect(host.getAttribute('data')).toBeNull();
    expect(host.widgetJson).toBe(payload);
    const serialized = document.createElement('div');
    serialized.appendChild(host);
    expect(serialized.innerHTML).not.toContain('chartType');
    host.remove();
  });

  it('titles the mounted chart from the widget name by default', async () => {
    const host = document.createElement('ui9000-chart-renderer');
    host.setAttribute('data', JSON.stringify(lineFixture));
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector('.host ui9000-line-chart'));

    const chart = host.shadowRoot?.querySelector('ui9000-line-chart');
    expect(chart?.getAttribute('chart-title')).toBe(lineFixture.name);
    expect(chart?.hasAttribute('show-header')).toBe(false);
    host.remove();
  });

  it('applies bar variant attrs from chart-type override', async () => {
    const target = resolveChartTarget('barGrouped');
    expect(target?.attrs?.layout).toBe('grouped');

    const host = document.createElement('ui9000-chart-renderer');
    host.setAttribute('data', JSON.stringify(barGroupedFixture));
    host.setAttribute('chart-type', 'barGrouped');
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector('ui9000-bar-chart'));

    const bar = host.shadowRoot?.querySelector('ui9000-bar-chart');
    expect(bar?.getAttribute('layout')).toBe('grouped');
    host.remove();
  });

  it('forwards Mapbox host attrs onto ui9000-map-chart', async () => {
    const host = document.createElement('ui9000-chart-renderer');
    host.setAttribute('data', JSON.stringify(mapFixture));
    host.setAttribute('mapbox-token', 'pk.test');
    host.setAttribute('geojson-base-url', '/geojson');
    host.setAttribute('pmtiles-base-url', '/pmtiles');
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector('ui9000-map-chart'));

    const map = host.shadowRoot?.querySelector('ui9000-map-chart');
    expect(map?.getAttribute('mapbox-token')).toBe('pk.test');
    expect(map?.getAttribute('geojson-base-url')).toBe('/geojson');
    expect(map?.getAttribute('pmtiles-base-url')).toBe('/pmtiles');
    host.remove();
  });

  it('forwards header-variant and headerHandlers onto the mounted chart', async () => {
    const host = document.createElement('ui9000-chart-renderer') as Ui9000ChartRenderer;
    const onOpenChat = () => {};
    host.setAttribute('data', JSON.stringify(lineFixture));
    host.setAttribute('header-variant', 'dash');
    host.headerHandlers = { onOpenChat };
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector('ui9000-line-chart'));

    const chart = host.shadowRoot?.querySelector('ui9000-line-chart') as HTMLElement & {
      headerHandlers?: { onOpenChat?: () => void };
    };
    expect(chart?.getAttribute('header-variant')).toBe('dash');
    expect(chart?.headerHandlers?.onOpenChat).toBe(onOpenChat);
    host.remove();
  });
});
