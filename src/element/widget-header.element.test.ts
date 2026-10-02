// @vitest-environment jsdom
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { describe, expect, it } from 'vitest';

import { chartShellStyles, Ui9000ChartElement } from './ui9000-chart-base.js';

@customElement('ui9000-header-probe')
class HeaderProbe extends Ui9000ChartElement {
  static override styles = [chartShellStyles];

  override render() {
    return html`<div class="widget-shell">${this.renderShellHeader('Revenue')}</div>`;
  }
}

/** Body of one CSS rule. The selector must be the rule start, not a prefix of another. */
function ruleBody(css: string, selector: string): string {
  const start = css.indexOf(selector);
  const open = start === -1 ? -1 : css.indexOf('{', start);
  const close = open === -1 ? -1 : css.indexOf('}', open);
  return open === -1 || close === -1 ? '' : css.slice(open + 1, close);
}

function mount(): HeaderProbe {
  const el = document.createElement('ui9000-header-probe') as HeaderProbe;
  document.body.appendChild(el);
  return el;
}

describe('widget header variants', () => {
  it('renders the chat menu as download only', async () => {
    const el = mount();
    await el.updateComplete;

    const header = el.shadowRoot?.querySelector('.widget-header');
    expect(header?.getAttribute('data-variant')).toBe('chat');
    expect(el.shadowRoot?.querySelector('[part="chat-button"]')).toBeNull();
    expect(el.shadowRoot?.querySelector('[part="settings-button"]')).toBeNull();

    el.shadowRoot?.querySelector<HTMLButtonElement>('[part="menu-button"]')?.click();
    await el.updateComplete;

    const items = [...(el.shadowRoot?.querySelectorAll('.menu-item') ?? [])].map(
      (node) => node.textContent?.trim(),
    );
    expect(items).toEqual(['Download image']);
    el.remove();
  });

  it('calls onDownloadImage in chat and skips the download event', async () => {
    const el = mount();
    let downloaded = 0;
    let events = 0;
    el.headerHandlers = { onDownloadImage: () => downloaded++ };
    el.addEventListener('ui9000-download', () => events++);
    await el.updateComplete;

    el.shadowRoot?.querySelector<HTMLButtonElement>('[part="menu-button"]')?.click();
    await el.updateComplete;
    el.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="download-image"]')?.click();
    await el.updateComplete;

    expect(downloaded).toBe(1);
    expect(events).toBe(0);
    el.remove();
  });

  it('emits ui9000-download in chat when no download handler is set', async () => {
    const el = mount();
    let events = 0;
    el.addEventListener('ui9000-download', () => events++);
    await el.updateComplete;

    el.shadowRoot?.querySelector<HTMLButtonElement>('[part="menu-button"]')?.click();
    await el.updateComplete;
    el.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="download-image"]')?.click();

    expect(events).toBe(1);
    el.remove();
  });

  it('renders dash actions only for the handlers the host passed', async () => {
    const el = mount();
    const calls: string[] = [];
    el.headerVariant = 'dash';
    el.headerHandlers = {
      onOpenChat: () => calls.push('chat'),
      onViewAsTable: () => calls.push('table'),
      onProvideFeedback: () => calls.push('feedback'),
      onSaveToReport: () => calls.push('page'),
      onDownloadImage: () => calls.push('download'),
      onRemove: () => calls.push('remove'),
      onOpenSettings: () => calls.push('settings'),
    };
    await el.updateComplete;

    const header = el.shadowRoot?.querySelector('.widget-header');
    expect(header?.getAttribute('data-variant')).toBe('dash');
    expect(el.shadowRoot?.querySelector('.hover-actions')).not.toBeNull();

    el.shadowRoot?.querySelector<HTMLButtonElement>('[part="chat-button"]')?.click();
    el.shadowRoot?.querySelector<HTMLButtonElement>('[part="settings-button"]')?.click();
    el.shadowRoot?.querySelector<HTMLButtonElement>('[part="menu-button"]')?.click();
    await el.updateComplete;

    const labels = [...(el.shadowRoot?.querySelectorAll('.menu-item') ?? [])].map((node) =>
      node.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(labels).toEqual([
      'View as table',
      'Provide feedback',
      'Add to page',
      'Download image',
      'Remove',
    ]);

    el.shadowRoot?.querySelector<HTMLButtonElement>('[part="menu-button"]')?.click();
    await el.updateComplete;

    for (const action of ['view-table', 'provide-feedback', 'save-report', 'download-image', 'remove']) {
      el.shadowRoot?.querySelector<HTMLButtonElement>('[part="menu-button"]')?.click();
      await el.updateComplete;
      el.shadowRoot?.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.click();
      await el.updateComplete;
    }

    expect(calls).toEqual(['chat', 'settings', 'table', 'feedback', 'page', 'download', 'remove']);
    el.remove();
  });

  it('does not show dash controls that have no handler', async () => {
    const el = mount();
    el.setAttribute('header-variant', 'dash');
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[part="menu-button"]')).toBeNull();
    expect(el.shadowRoot?.querySelector('[part="chat-button"]')).toBeNull();
    expect(el.shadowRoot?.querySelector('[part="settings-button"]')).toBeNull();
    expect(el.shadowRoot?.querySelector('.widget-title')?.textContent?.trim()).toBe('Revenue');
    el.remove();
  });

  it('paints the menu and the chat button from the host surface', () => {
    const css = chartShellStyles.cssText;
    const icon = ruleBody(css, '.icon-btn,');
    expect(icon).toContain('var(--ui9000-color-surface, #ffffff)');
    expect(icon).toContain('var(--ui9000-color-text, #111827)');
    expect(icon).not.toContain('rgba(255, 255, 255');

    const button = ruleBody(css, '.menu-btn {');
    expect(button).toContain('var(--ui9000-color-surface, #ffffff)');
    expect(button).toContain('var(--ui9000-color-text, #111827)');

    const darkStart = css.indexOf(":host([data-mode='dark']) .menu-btn,");
    const darkOpen = css.indexOf('{', darkStart);
    const darkSelector = css.slice(darkStart, darkOpen);
    expect(darkSelector).toContain('.icon-btn');
    expect(darkSelector).toContain('.settings-btn');
    expect(darkSelector).not.toContain(':hover');
    const darkButtons = ruleBody(css, ":host([data-mode='dark']) .menu-btn,");
    const darkItems = ruleBody(css, ":host([data-mode='dark']) .menu-item {");
    expect(darkButtons).toContain('var(--ui9000-color-text, #eff0f1)');
    expect(darkItems).toContain('var(--ui9000-color-text, #eff0f1)');
  });
});
