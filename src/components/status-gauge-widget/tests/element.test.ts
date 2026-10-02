// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;

import '../index.js';
import { statusGaugeStyles } from '../element/styles.js';
import antenna from '../../../stories/fixtures/status-gauge.mock.json';

/** Body of one CSS rule. The selector must be the rule start, not a prefix of another. */
function ruleBody(css: string, selector: string): string {
  const start = css.indexOf(selector);
  const open = start === -1 ? -1 : css.indexOf('{', start);
  const close = open === -1 ? -1 : css.indexOf('}', open);
  return open === -1 || close === -1 ? '' : css.slice(open + 1, close);
}

describe('ui9000-status-gauge-widget', () => {
  it('renders the gauge and one card per remaining data row', async () => {
    const el = document.createElement('ui9000-status-gauge-widget');
    el.setAttribute('data', JSON.stringify(antenna));
    document.body.appendChild(el);
    await el.updateComplete;
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('.title')?.textContent).toBe('Active Antenna Unit');
    expect(el.shadowRoot?.querySelector('.gauge svg')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('.gauge-rail')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('.gauge-needle')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('.gauge-value')).toBeTruthy();
    expect(el.shadowRoot?.querySelectorAll('.card')).toHaveLength(4);
    expect(el.shadowRoot?.querySelectorAll('.range-track')).toHaveLength(4);
    const fill = el.shadowRoot?.querySelector('.range-fill') as HTMLElement | null;
    expect(Number.parseFloat(fill?.style.width ?? '')).toBeCloseTo(62, 0);
    expect(el.shadowRoot?.querySelector('.badge')?.textContent).toContain('Degraded');
    expect(el.getAttribute('data-mode')).toBe('light');
    expect(el.hasAttribute('theme')).toBe(false);
    expect(el.shadowRoot?.querySelector('.panel')?.hasAttribute('data-mode')).toBe(false);
    el.remove();
  });

  it('follows the host surface token without a theme attribute', async () => {
    const css = statusGaugeStyles.cssText;
    expect(css).toContain('var(--ui9000-color-surface, #ffffff)');
    expect(css).toContain('var(--ui9000-color-text, #111827)');
    expect(css).toContain('--sg-gauge-rest: var(--ui9000-color-border, #e5e7eb)');
    expect(css).not.toContain('repeating-linear-gradient');
    const range = ruleBody(css, '.range {');
    expect(range).toContain('mask-image: var(--sg-ticks)');
    expect(range).toContain('#000 0 calc(30% - var(--sg-gap))');
    expect(range).toContain('transparent calc(35% - var(--sg-gap)) 35%');
    const track = ruleBody(css, '.range-track {');
    expect(track).not.toContain('mask-image');
    expect(track).not.toContain('linear-gradient');
    expect(track).not.toContain('--sg-ticks');
    expect(css).not.toContain("theme='dark'");
    expect(css).not.toContain("data-mode='dark'");

    const el = document.createElement('ui9000-status-gauge-widget');
    el.style.setProperty('--ui9000-color-surface', '#13161D');
    el.style.setProperty('--ui9000-mode', 'dark');
    el.setAttribute('data', JSON.stringify(antenna));
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.hasAttribute('theme')).toBe(false);
    expect(el.getAttribute('data-mode')).toBe('dark');
    expect(el.shadowRoot?.querySelector('.panel')?.hasAttribute('data-mode')).toBe(false);
    el.remove();
  });
});
