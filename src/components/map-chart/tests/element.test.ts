import { beforeAll, describe, expect, it, vi } from 'vitest';

import fixture from '../../../stories/fixtures/map.fusedash.json';
import { registerMapChart, Ui9000MapChart } from '../index.js';
import * as draw from '../render/draw.js';

const TAG = 'ui9000-map-chart';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
  registerMapChart();
});

async function settle(el: Element) {
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 40));
}

async function mount(data: unknown = fixture, attrs: Record<string, string> = {}) {
  const el = document.createElement(TAG) as Ui9000MapChart;
  el.setAttribute('data', typeof data === 'string' ? data : JSON.stringify(data));
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.append(el);
  await settle(el);
  return el;
}

describe(TAG, () => {
  it('falls back to the empty state without throwing', async () => {
    const el = await mount('not json');
    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toBe('No data');
    el.remove();
  });

  it('fails closed without GeoJSON even when a Mapbox token is present', async () => {
    const el = await mount(fixture, { 'mapbox-token': 'pk.test' });
    expect(el.shadowRoot?.querySelector('.widget-title')?.textContent?.trim()).toBe(
      'Average Temperature by Country',
    );
    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toMatch(/Map boundaries required/);
    el.remove();
  });

  it('reports when the GeoJSON host URL fails to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('missing', { status: 404 })),
    );
    const el = await mount(fixture, {
      'mapbox-token': 'pk.test',
      'geojson-base-url': 'https://example.test/geojson',
    });
    await new Promise((r) => setTimeout(r, 80));
    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toMatch(
      /Could not load map boundaries/,
    );
    el.remove();
    vi.unstubAllGlobals();
  });

  it('fails closed when Mapbox GL does not load', async () => {
    const spy = vi.spyOn(draw, 'renderMapChart').mockResolvedValue(null);
    const el = await mount(
      {
        ...fixture,
        geoJson: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: 'France', iso_a3: 'FRA' },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [0, 0],
                    [1, 0],
                    [1, 1],
                    [0, 0],
                  ],
                ],
              },
            },
          ],
        },
      },
      { 'mapbox-token': 'pk.test' },
    );
    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toMatch(/Mapbox GL failed to load/);
    spy.mockRestore();
    el.remove();
  });

  it('asks the map for the dark style when the host sets the surface', async () => {
    const spy = vi.spyOn(draw, 'renderMapChart').mockResolvedValue(null);
    const el = document.createElement(TAG) as Ui9000MapChart;
    el.style.setProperty('--ui9000-color-surface', '#13161D');
    el.style.setProperty('--ui9000-mode', 'dark');
    el.setAttribute('mapbox-token', 'pk.test');
    el.setAttribute(
      'data',
      JSON.stringify({
        ...fixture,
        geoJson: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: 'France', iso_a3: 'FRA' },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [0, 0],
                    [1, 0],
                    [1, 1],
                    [0, 0],
                  ],
                ],
              },
            },
          ],
        },
      }),
    );
    document.body.append(el);
    await settle(el);
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mode: 'dark' }),
    );
    spy.mockRestore();
    el.remove();
  });

  it('defines the element exactly once', () => {
    const first = customElements.get(TAG);
    registerMapChart();
    expect(customElements.get(TAG)).toBe(first);
  });
});
