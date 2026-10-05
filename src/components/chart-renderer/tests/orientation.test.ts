// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';

import { Ui9000ChartRenderer } from '../element/ui9000-chart-renderer.js';
import { resolvePayloadOrientation } from '../lib/index.js';
import barFixture from '../../../stories/fixtures/bar.fusedash.json';
import lollipopFixture from '../../../stories/fixtures/lollipop.fusedash.json';

void Ui9000ChartRenderer;

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 25));
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

describe('payload orientation in the chat preview (FUS-4138)', () => {
  const bar = { kind: 'bar-chart' as const };

  it('uses the payload orientation for barChart, which the registry maps to vertical', () => {
    expect(resolvePayloadOrientation('barChart', bar, { orientation: 'horizontal' })).toBe(
      'horizontal',
    );
    expect(resolvePayloadOrientation('barChart', bar, { orientation: 'vertical' })).toBe(
      'vertical',
    );
  });

  it('applies to lollipop charts too', () => {
    expect(
      resolvePayloadOrientation('lollipopChart', { kind: 'lollipop' }, { orientation: 'horizontal' }),
    ).toBe('horizontal');
  });

  it('keeps chart types that name their orientation and ignores other charts or values', () => {
    expect(
      resolvePayloadOrientation('barHorizontalGrouped', bar, { orientation: 'vertical' }),
    ).toBeUndefined();
    expect(
      resolvePayloadOrientation('lineChart', { kind: 'line-chart' }, { orientation: 'horizontal' }),
    ).toBeUndefined();
    expect(resolvePayloadOrientation('barChart', bar, { orientation: 'diagonal' })).toBeUndefined();
    expect(resolvePayloadOrientation('barChart', bar, null)).toBeUndefined();
  });

  it.each([
    ['ui9000-bar-chart', barFixture],
    ['ui9000-lollipop', lollipopFixture],
  ])('mounts %s horizontal for a horizontal payload', async (tag, fixture) => {
    const host = document.createElement('ui9000-chart-renderer');
    host.setAttribute('data', JSON.stringify({ ...fixture, orientation: 'horizontal' }));
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector(`.host ${tag}`));
    expect(host.shadowRoot?.querySelector(tag)?.getAttribute('orientation')).toBe('horizontal');
    host.remove();
  });

  it('still mounts a vertical payload vertical', async () => {
    const host = document.createElement('ui9000-chart-renderer');
    host.setAttribute('data', JSON.stringify({ ...barFixture, orientation: 'vertical' }));
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector('.host ui9000-bar-chart'));
    expect(host.shadowRoot?.querySelector('ui9000-bar-chart')?.getAttribute('orientation')).toBe(
      'vertical',
    );
    host.remove();
  });
});
