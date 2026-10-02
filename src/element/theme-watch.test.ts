import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { afterEach, describe, expect, it } from 'vitest';

import { applyWidgetContext } from '../context/widget-context.js';
import { Ui9000ChartElement } from './ui9000-chart-base.js';

@customElement('ui9000-theme-probe')
class ThemeProbe extends Ui9000ChartElement {
  changes = 0;

  protected override onThemeChange(): void {
    this.changes += 1;
  }

  override render() {
    return html``;
  }
}

function mount(): ThemeProbe {
  const el = document.createElement('ui9000-theme-probe') as ThemeProbe;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--ui9000-mode');
  document.documentElement.style.removeProperty('--ui9000-color-surface');
});

describe('host theme watch', () => {
  it('does not repaint when only data-theme flips and no surface token is set', async () => {
    const el = mount();
    await el.updateComplete;
    expect(el.getAttribute('data-mode')).toBe('light');

    document.documentElement.setAttribute('data-theme', 'dark');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(el.getAttribute('data-mode')).toBe('light');
    expect(el.changes).toBe(0);
  });

  it('redraws when applyWidgetContext changes the host mode', async () => {
    const el = mount();
    await el.updateComplete;

    applyWidgetContext(document.documentElement, { mode: 'dark' });
    expect(el.getAttribute('data-mode')).toBe('dark');
    expect(el.changes).toBe(1);

    applyWidgetContext(document.documentElement, { mode: 'dark' });
    expect(el.changes).toBe(1);

    el.remove();
    applyWidgetContext(document.documentElement, { mode: 'light' });
    expect(el.changes).toBe(1);
  });
});
