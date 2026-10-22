// @vitest-environment jsdom
import { html, render } from 'lit';
import { customElement } from 'lit/decorators.js';
import { describe, expect, it } from 'vitest';

import { chartShellStyles, Ui9000ChartElement } from './ui9000-chart-base.js';
import { renderWidgetHeader } from './chart-shell-render.js';

@customElement('ui9000-header-probe')
class HeaderProbe extends Ui9000ChartElement {
  static override styles = [chartShellStyles];

  override render() {
    return html`<div class="widget-shell">${this.renderShellHeader('Revenue')}</div>`;
  }
}

type DashSlotState = {
  dash: boolean;
  hover: boolean;
  focus: boolean;
  open: boolean;
  persist: boolean;
};

/**
 * jsdom does not apply `::slotted`, so computed opacity stays empty.
 * Cascade the chart sheet instead: the open and persist selectors must beat
 * the dash hide rule when the pointer is not on the chart.
 */
function dashSlotOpacity(css: string, state: DashSlotState): string | null {
  const sheet = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  let winner: { score: number; index: number; opacity: string } | null = null;
  rules.forEach((rule, index) => {
    const opacity = (rule[2] ?? '').match(/(?:^|;)\s*opacity:\s*([^;]+)/)?.[1]?.trim();
    if (!opacity) return;
    for (const selector of (rule[1] ?? '').split(',')) {
      if (!dashSlotSelectorMatches(selector, state)) continue;
      const score = selectorScore(selector);
      if (!winner || score > winner.score || (score === winner.score && index >= winner.index)) {
        winner = { score, index, opacity };
      }
    }
  });
  return winner?.opacity ?? null;
}

function dashSlotSelectorMatches(selector: string, state: DashSlotState): boolean {
  const sel = selector.trim();
  if (!sel.includes('::slotted(')) return false;
  const dash = sel.includes("[header-variant='dash']");
  if (dash !== state.dash) return false;
  if (sel.includes(':hover') && !state.hover) return false;
  if (sel.includes(':focus-within') && !state.focus) return false;
  const inner = sel.match(/::slotted\((.*)\)\s*$/)?.[1]?.trim();
  if (!inner) return false;
  if (inner.includes('[data-open]') && !state.open) return false;
  if (inner.includes('[data-persist]') && !state.persist) return false;
  return inner === '*' || inner.includes('[data-open]') || inner.includes('[data-persist]');
}

/** Attribute / pseudo-class / type counts. `:host` and `::slotted` add no extra weight beyond their arguments. */
function selectorScore(selector: string): number {
  const flat = selector
    .replace(/:host\(/g, '')
    .replace(/::slotted\(/g, '')
    .replace(/[()]/g, '');
  const attributes = flat.match(/\[[^\]]+\]/g)?.length ?? 0;
  const pseudos = flat.match(/:(?:hover|focus-within)/g)?.length ?? 0;
  const rest = flat.replace(/\[[^\]]+\]/g, '').replace(/:(?:hover|focus-within)/g, '');
  const types = rest.match(/[a-zA-Z][\w-]*/g)?.length ?? 0;
  return attributes * 10 + pseudos * 10 + types;
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
  it('renders the download menu when the host supplies no actions', async () => {
    const el = mount();
    await el.updateComplete;

    const header = el.shadowRoot?.querySelector('.widget-header');
    expect(header?.getAttribute('data-variant')).toBe('chat');
    expect(el.shadowRoot?.querySelector('[part="menu-button"]')).not.toBeNull();

    el.shadowRoot?.querySelector<HTMLButtonElement>('[part="menu-button"]')?.click();
    await el.updateComplete;

    const items = [...(el.shadowRoot?.querySelectorAll('.menu-item') ?? [])].map(
      (node) => node.textContent?.trim(),
    );
    expect(items).toEqual(['Download image']);
    el.remove();
  });

  it('emits ui9000-download from the download menu', async () => {
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

  it('replaces the download menu with the actions slot', async () => {
    const el = mount();
    el.headerVariant = 'dash';
    const actions = document.createElement('button');
    actions.slot = 'actions';
    actions.textContent = 'Settings';
    el.append(actions);
    await el.updateComplete;
    await el.updateComplete;

    const header = el.shadowRoot?.querySelector('.widget-header');
    expect(header?.getAttribute('data-variant')).toBe('dash');
    expect(el.shadowRoot?.querySelector('[part="menu-button"]')).toBeNull();
    const slot = el.shadowRoot?.querySelector('slot[name="actions"]');
    expect(slot instanceof HTMLSlotElement ? slot.assignedElements() : []).toEqual([actions]);
    el.remove();
  });

  it('restores the download menu when the host removes its actions', async () => {
    const el = mount();
    const actions = document.createElement('button');
    actions.slot = 'actions';
    el.append(actions);
    await el.updateComplete;
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('[part="menu-button"]')).toBeNull();

    actions.remove();
    await el.updateComplete;
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[part="menu-button"]')).not.toBeNull();
    el.remove();
  });

  it('keeps the title when the actions slot is empty', async () => {
    const el = mount();
    el.setAttribute('header-variant', 'dash');
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[part="menu-button"]')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('.widget-title')?.textContent?.trim()).toBe('Revenue');
    const titleType = el.shadowRoot?.querySelector('.widget-title ui9000-typography');
    expect(titleType?.getAttribute('size')).toBe('sm');
    const label = titleType?.querySelector('p');
    expect(label?.textContent).toBe('Revenue');
    expect(getComputedStyle(label!).fontSize).toBe('12px');
    el.remove();
  });

  it('keeps dash actions visible when the pointer leaves but the menu stays open', async () => {
    const el = mount();
    el.setAttribute('header-variant', 'dash');
    const actions = document.createElement('div');
    actions.slot = 'actions';
    actions.textContent = 'Settings';
    el.append(actions);
    await el.updateComplete;
    await el.updateComplete;

    const slot = el.shadowRoot?.querySelector('slot[name="actions"]');
    expect(slot instanceof HTMLSlotElement ? slot.assignedElements() : []).toEqual([actions]);

    const css = chartShellStyles.cssText;
    const opacity = (extra?: { hover?: boolean; focus?: boolean }) =>
      dashSlotOpacity(css, {
        dash: el.getAttribute('header-variant') === 'dash',
        hover: extra?.hover ?? false,
        focus: extra?.focus ?? false,
        open: actions.hasAttribute('data-open'),
        persist: actions.hasAttribute('data-persist'),
      });

    expect(opacity()).toBe('0');
    actions.setAttribute('data-open', '');
    expect(opacity()).toBe('1');
    actions.removeAttribute('data-open');
    expect(opacity()).toBe('0');
    expect(opacity({ hover: true })).toBe('1');
    actions.setAttribute('data-persist', '');
    expect(opacity()).toBe('1');
    el.remove();
  });

  it('paints the download menu from the host surface', () => {
    const css = chartShellStyles.cssText;
    const button = ruleBody(css, '.menu-btn {');
    expect(button).toContain('var(--ui9000-color-surface, #ffffff)');
    expect(button).toContain('var(--ui9000-color-text, #111827)');
    expect(button).not.toContain('rgba(255, 255, 255');

    const darkStart = css.indexOf(":host([data-mode='dark']) .menu-btn {");
    const darkOpen = css.indexOf('{', darkStart);
    const darkSelector = css.slice(darkStart, darkOpen);
    expect(darkSelector).not.toContain(':hover');
    expect(css).not.toContain('.menu-divider');

    const darkButtons = ruleBody(css, ":host([data-mode='dark']) .menu-btn {");
    const darkItems = ruleBody(css, ":host([data-mode='dark']) .menu-item {");
    expect(darkButtons).toContain('var(--ui9000-color-text, #eff0f1)');
    expect(darkItems).toContain('var(--ui9000-color-text, #eff0f1)');
  });
});

describe('widget header title', () => {
  const long = 'Test-time compute orchestrator / Opus 5.5 × GPT-6 Astra';
  const header = (truncateTitle?: boolean) => {
    const host = document.createElement('div');
    render(
      renderWidgetHeader({ title: long, menuOpen: false, onMenuToggle: () => {}, onMenuClose: () => {}, truncateTitle }),
      host,
    );
    return host.querySelector('.widget-title')!;
  };

  it('cuts a long title by default and keeps the whole of it in the tooltip', () => {
    const title = header();
    expect(title.textContent!.trim().length).toBeLessThan(long.length);
    expect(title.getAttribute('title')).toBe(long);
  });

  it('prints the whole title when the chart asks for it', () => {
    expect(header(false).textContent!.trim()).toBe(long);
  });
});
