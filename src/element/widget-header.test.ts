import { describe, expect, it } from 'vitest';

import type { PropertyValues } from 'lit';

import { chartPropsChanged } from '../utils/lit-draw.js';
import { resolveHeaderChrome, resolveHeaderVariant } from './widget-header.js';

describe('resolveHeaderVariant', () => {
  it('defaults to chat', () => {
    expect(resolveHeaderVariant(null)).toBe('chat');
    expect(resolveHeaderVariant('dashboard')).toBe('chat');
    expect(resolveHeaderVariant('dash')).toBe('dash');
  });
});

describe('resolveHeaderChrome', () => {
  it('keeps chat to a download action even when dash handlers are set', () => {
    const chrome = resolveHeaderChrome('chat', {
      onOpenChat: () => {},
      onOpenSettings: () => {},
      onRemove: () => {},
      onViewAsTable: () => {},
    });

    expect(chrome.showChat).toBe(false);
    expect(chrome.showSettings).toBe(false);
    expect(chrome.showRemove).toBe(false);
    expect(chrome.showMenu).toBe(true);
    expect(chrome.items.map((item) => item.id)).toEqual(['download-image']);
    expect(chrome.items[0]?.fallbackDownload).toBe(true);
  });

  it('uses the host download handler in chat instead of the fallback event', () => {
    const chrome = resolveHeaderChrome('chat', { onDownloadImage: () => {} });
    expect(chrome.items[0]?.fallbackDownload).toBe(false);
  });

  it('shows a dash control only when its handler is set', () => {
    const chrome = resolveHeaderChrome('dash', {
      onOpenChat: () => {},
      onViewAsTable: () => {},
      onRemove: () => {},
    });

    expect(chrome.showChat).toBe(true);
    expect(chrome.showSettings).toBe(false);
    expect(chrome.showMenu).toBe(true);
    expect(chrome.showRemove).toBe(true);
    expect(chrome.items.map((item) => item.label)).toEqual(['View as table']);
  });

  it('hides the dash menu when no menu handler is set', () => {
    const chrome = resolveHeaderChrome('dash', { onOpenSettings: () => {} });
    expect(chrome.showMenu).toBe(false);
    expect(chrome.showSettings).toBe(true);
    expect(chrome.items).toEqual([]);
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
