// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;

import '../index.js';
import '../../chart-renderer/index.js';
import figma from '../../../stories/fixtures/incidents-review.figma.json';

async function mount(data: unknown, theme = ''): Promise<HTMLElement> {
  const el = document.createElement('ui9000-incidents-review-card');
  if (theme) el.setAttribute('theme', theme);
  el.setAttribute('data', JSON.stringify(data));
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('Timed out waiting for condition');
}

const texts = (root: Element | ShadowRoot, selector: string) =>
  [...root.querySelectorAll(selector)].map((node) => node.textContent?.trim());

describe('ui9000-incidents-review-card', () => {
  it('renders the Figma sample', async () => {
    const el = await mount(figma, 'dark');
    const root = el.shadowRoot!;

    expect(root.querySelector('.title')?.textContent).toBe('Incidents review');
    const filter = root.querySelector('.filter')!;
    expect(filter.classList.contains('scale')).toBe(true);
    expect(filter.textContent?.replace(/\s+/g, ' ').trim()).toBe('Filter: 5 km');
    expect(texts(root, '.count .value')).toEqual(['89', '46', '102']);
    expect(texts(root, '.count .label-text')).toEqual(['Active', 'In progress', 'Total']);
    expect([...root.querySelectorAll('.count')].map((c) => c.getAttribute('class'))).toEqual([
      'count green',
      'count red',
      'count total',
    ]);
    // One track under the numbers: a segment per state sized by its count, ticks under the total.
    const segs = [...root.querySelectorAll<HTMLElement>('.stages .seg')];
    expect(segs.map((seg) => seg.getAttribute('class'))).toEqual(['seg green', 'seg red']);
    expect(segs.map((seg) => seg.style.flexGrow)).toEqual(['89', '46']);
    expect(root.querySelector<HTMLElement>('.stages')?.style.gridColumn).toBe('1 / span 2');
    expect(root.querySelectorAll('.columns > .ticks')).toHaveLength(1);
    expect(el.getAttribute('data-mode')).toBe('dark');
    el.remove();
  });

  it('keeps the title alone without a filter', async () => {
    const el = await mount({ ...figma, filter: null });
    const root = el.shadowRoot!;
    expect(root.querySelector('.title')?.textContent).toBe('Incidents review');
    expect(root.querySelector('.filter')).toBeNull();
    el.remove();
  });

  it('keeps the numbers with the track off', async () => {
    const el = await mount({ ...figma, track: false });
    const root = el.shadowRoot!;
    expect(texts(root, '.count .value')).toEqual(['89', '46', '102']);
    expect(root.querySelector('.stages, .seg, .ticks')).toBeNull();
    el.remove();
  });

  it('lays four states out on the same grid as two', async () => {
    const el = await mount({
      title: 'Incidents review',
      counts: [
        { label: 'New', value: 14 },
        { label: 'Active', value: 89 },
        { label: 'In progress', value: 46 },
        { label: 'Resolved', value: 31 },
      ],
      total: 180,
    });
    const columns = el.shadowRoot!.querySelector<HTMLElement>('.columns')!;
    expect(columns.dataset.states).toBe('4');
    expect(columns.style.gridTemplateColumns).toBe(
      'minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr) minmax(max-content, 1fr)',
    );
    expect([...columns.querySelectorAll<HTMLElement>('.seg')].map((seg) => seg.style.flexGrow)).toEqual([
      '14',
      '89',
      '46',
      '31',
    ]);
    el.remove();
  });

  it('keeps every digit of a compact count for assistive text', async () => {
    const el = await mount({ counts: [{ label: 'Active', value: 12_412 }] });
    const count = el.shadowRoot!.querySelector('.count')!;
    expect(count.querySelector('.value')?.textContent).toBe('12.4K');
    expect(count.querySelector('.value')?.getAttribute('aria-hidden')).toBe('true');
    expect(count.querySelector('.sr-only')?.textContent).toBe('12,412');
    el.remove();
  });

  it('shows an empty state for junk', async () => {
    const el = await mount('nope');
    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toBe('No incident data');
    el.remove();
  });

  it('mounts through chart-renderer from chartType incidentsReviewCard', async () => {
    const host = document.createElement('ui9000-chart-renderer');
    host.setAttribute('data', JSON.stringify(figma));
    document.body.appendChild(host);

    await waitFor(() => !!host.shadowRoot?.querySelector('.host ui9000-incidents-review-card'));
    const card = host.shadowRoot!.querySelector('ui9000-incidents-review-card')!;
    await card.updateComplete;
    expect(card.shadowRoot?.querySelector('.title')?.textContent).toBe('Incidents review');
    expect(texts(card.shadowRoot!, '.count .value')).toEqual(['89', '46', '102']);
    host.remove();
  });
});
