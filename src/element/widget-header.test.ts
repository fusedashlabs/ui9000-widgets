// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { html, nothing, render as litRender, type PropertyValues } from 'lit';

import { chartPropsChanged } from '../utils/lit-draw.js';
import { renderWidgetHeader } from './chart-shell-render.js';
import { resolveHeaderVariant } from './widget-header.js';

describe('resolveHeaderVariant', () => {
  it('defaults to chat', () => {
    expect(resolveHeaderVariant(null)).toBe('chat');
    expect(resolveHeaderVariant('dashboard')).toBe('chat');
    expect(resolveHeaderVariant('dash')).toBe('dash');
  });
});

describe('chartPropsChanged header chrome', () => {
  it('ignores headerVariant so the plot is not redrawn', () => {
    const onlyHeader = new Map([['headerVariant', 'chat']]) as PropertyValues;
    expect(chartPropsChanged(onlyHeader)).toBe(false);

    const withData = new Map<PropertyKey, unknown>([
      ['dataJson', '[]'],
      ['headerVariant', 'dash'],
    ]) as PropertyValues;
    expect(chartPropsChanged(withData)).toBe(true);
  });
});

describe('renderWidgetHeader heading and aside', () => {
  const base = { menuOpen: false, onMenuToggle: () => {}, onMenuClose: () => {} };

  function mountHeader(opts: Parameters<typeof renderWidgetHeader>[0]): HTMLElement {
    const host = document.createElement('div');
    litRender(renderWidgetHeader(opts) as never, host);
    return host;
  }

  it('leaves a plain header untouched: title direct child, no wrapper or aside', () => {
    const host = mountHeader({ ...base, title: 'Revenue' });

    expect(
      host.querySelector('.widget-header > .widget-title')?.textContent?.trim(),
    ).toBe('Revenue');
    expect(host.querySelector('.widget-heading')).toBeNull();
    expect(host.querySelector('.widget-subtitle')).toBeNull();
    expect(host.querySelector('.widget-aside')).toBeNull();
  });

  it('stacks the title and subtitle once a subtitle is given', () => {
    const host = mountHeader({ ...base, title: 'Revenue', subtitle: 'by region' });

    expect(host.querySelector('.widget-heading > .widget-title')).toBeTruthy();
    expect(
      host.querySelector('.widget-heading > .widget-subtitle')?.textContent?.trim(),
    ).toBe('by region');
  });

  it('renders an aside on the title row, and none for `nothing`', () => {
    const withAside = mountHeader({
      ...base,
      title: 'Revenue',
      aside: html`<span class="probe">cards</span>`,
    });
    expect(
      withAside.querySelector('.widget-header-main > .widget-aside > .probe'),
    ).toBeTruthy();

    // `nothing` is truthy, so it must not produce an empty wrapper.
    const without = mountHeader({ ...base, title: 'Revenue', aside: nothing });
    expect(without.querySelector('.widget-aside')).toBeNull();
    expect(without.querySelector('.widget-header-main')).toBeNull();
  });

  it('keeps the download menu unless a chart opts out or the host supplies actions', () => {
    const withActions = mountHeader({ ...base, title: 'Revenue' });
    expect(withActions.querySelector('.widget-actions slot[name="actions"]')).toBeTruthy();
    expect(withActions.querySelector('.menu-btn')).toBeTruthy();

    const custom = mountHeader({ ...base, title: 'Revenue', customActions: true });
    expect(custom.querySelector('.widget-actions slot[name="actions"]')).toBeTruthy();
    expect(custom.querySelector('.menu-btn')).toBeNull();

    const without = mountHeader({ ...base, title: 'Revenue', showActions: false });
    expect(without.querySelector('.widget-actions slot[name="actions"]')).toBeTruthy();
    expect(without.querySelector('.widget-actions')?.hasAttribute('data-slot-only')).toBe(true);
    expect(without.querySelector('.menu-btn')).toBeNull();
    expect(without.querySelector('.widget-title')?.textContent?.trim()).toBe('Revenue');

    const hosted = mountHeader({
      ...base,
      title: 'Revenue',
      showActions: false,
      customActions: true,
    });
    expect(hosted.querySelector('.menu-btn')).toBeNull();
    expect(hosted.querySelector('.widget-actions')?.hasAttribute('data-slot-only')).toBe(false);
  });

  it('puts the heading and aside in one wrapping row, actions outside it', () => {
    const host = mountHeader({
      ...base,
      title: 'Revenue',
      subtitle: 'by region',
      aside: html`<span class="probe">cards</span>`,
    });
    const main = host.querySelector('.widget-header-main');

    // Both sit in the wrapping row, so the aside drops below the title whole.
    expect(main?.querySelector(':scope > .widget-heading')).toBeTruthy();
    expect(main?.querySelector(':scope > .widget-aside')).toBeTruthy();
    // The menu button stays out of it and keeps its place at the top right.
    expect(main?.querySelector('.widget-actions')).toBeNull();
    expect(host.querySelector('.widget-header > .widget-actions')).toBeTruthy();
  });
});
