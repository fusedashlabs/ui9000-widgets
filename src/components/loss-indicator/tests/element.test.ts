// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;

import '../index.js';
import electrical from '../../../stories/fixtures/loss-indicator.mock.json';
import { normalizeLossIndicator } from '../lib/index.js';
import { tickPaint } from '../render/ticks.js';

describe('ui9000-loss-indicator', () => {
  it('renders Electrical Loss, 24.30%, a down arrow, and the 0–30% scale', async () => {
    const el = document.createElement('ui9000-loss-indicator');
    el.setAttribute('data', JSON.stringify(electrical));
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('.label')?.textContent).toBe('Electrical Loss');
    expect(el.shadowRoot?.querySelector('.value')?.textContent).toBe('24.30%');
    expect(el.shadowRoot?.querySelector('.trend')?.getAttribute('data-trend')).toBe('down');
    const labels = [...(el.shadowRoot?.querySelectorAll('.axis-label') ?? [])].map(
      (node) => node.textContent,
    );
    expect(labels).toEqual(['0%', '10%', '20%', '30%']);
    const marker = el.shadowRoot?.querySelector('.marker') as HTMLElement | null;
    expect(Number.parseFloat(marker?.style.left ?? '')).toBeCloseTo(81, 0);
    const ticks = [...(el.shadowRoot?.querySelectorAll('.tick') ?? [])];
    expect(ticks.length).toBeGreaterThan(16);
    expect(ticks[0]?.getAttribute('data-paint')).toBe('ok');
    expect(ticks.at(-1)?.getAttribute('data-paint')).toBe('rest');
    const colored = ticks.filter((tick) => tick.getAttribute('data-paint') !== 'rest');
    expect(colored.at(-1)?.getAttribute('data-paint')).toBe('critical');
    el.remove();
  });

  it('omits the arrow when there is no trend', async () => {
    const withoutTrend = {
      ...electrical,
      data: electrical.data.map((row) => {
        const { trend: _trend, ...rest } = row;
        return rest;
      }),
    };
    const el = document.createElement('ui9000-loss-indicator');
    el.setAttribute('data', JSON.stringify(withoutTrend));
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('.value')?.textContent).toBe('24.30%');
    expect(el.shadowRoot?.querySelector('.trend')).toBeNull();
    el.remove();
  });

  it('moves the marker and the colours when min, max, and bands change', () => {
    const model = normalizeLossIndicator({
      label: 'Signal Degradation',
      value: 4,
      unit: '%',
      min: 0,
      max: 20,
      ticks: [0, 10, 20],
      bands: [
        { from: 0, to: 5, level: 'ok' },
        { from: 5, to: 12, level: 'warning' },
        { from: 12, to: 20, level: 'critical' },
      ],
    });
    expect(model.ratio).toBeCloseTo(0.2, 2);
    expect(model.level).toBe('ok');
    expect(tickPaint(0, 20, model.ratio, model.min, model.max, model.bands)).toBe('ok');
    expect(tickPaint(19, 20, model.ratio, model.min, model.max, model.bands)).toBe('rest');
  });

  it('replaces every reading when the payload changes', async () => {
    const el = document.createElement('ui9000-loss-indicator');
    el.setAttribute('data', JSON.stringify(electrical));
    document.body.appendChild(el);
    await el.updateComplete;

    el.setAttribute(
      'data',
      JSON.stringify({
        label: 'Packet loss',
        value: 1.5,
        unit: '%',
        min: 0,
        max: 5,
        ticks: [0, 1, 5],
        bands: [
          { from: 0, to: 1, level: 'ok' },
          { from: 1, to: 3, level: 'warning', color: '#112233' },
          { from: 3, to: 5, level: 'critical' },
        ],
        trend: 'up',
      }),
    );
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('.label')?.textContent).toBe('Packet loss');
    expect(el.shadowRoot?.querySelector('.value')?.textContent).toBe('1.5%');
    expect(el.shadowRoot?.querySelector('.trend')?.getAttribute('data-trend')).toBe('up');
    const labels = [...(el.shadowRoot?.querySelectorAll('.axis-label') ?? [])].map(
      (node) => node.textContent,
    );
    expect(labels).toEqual(['0%', '1%', '5%']);
    const marker = el.shadowRoot?.querySelector('.marker') as HTMLElement | null;
    expect(Number.parseFloat(marker?.style.left ?? '')).toBeCloseTo(30, 0);
    const painted = el.shadowRoot?.querySelector('.tick[data-paint="warning"]') as HTMLElement | null;
    expect(painted?.getAttribute('style')).toContain('#112233');
    el.remove();
  });

  it('does not draw two metrics on one card', () => {
    expect(
      normalizeLossIndicator([
        electrical,
        { ...electrical, label: 'Efficiency Loss', value: 4 },
      ]).empty,
    ).toBe(true);
  });
});
