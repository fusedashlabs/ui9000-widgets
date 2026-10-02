import { afterEach, describe, expect, it } from 'vitest';

import { presentChartTooltip } from './chart-tooltip-portal.js';

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-theme');
  document.getElementById('ui9000-chart-tooltip-style')?.remove();
  document.querySelector('[data-ui9000-chart-tooltip]')?.remove();
});

describe('chart tooltip portal', () => {
  it('stays light when the host only sets data-theme', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const owner = document.createElement('div');
    document.body.appendChild(owner);

    presentChartTooltip(
      owner,
      { pageX: 40, pageY: 40, clientX: 40, clientY: 80 },
      { title: 'Q1', rows: [{ label: 'Sales', value: '12' }] },
    );

    const tip = document.querySelector('[data-ui9000-chart-tooltip]');
    expect(tip?.getAttribute('data-mode')).toBe('light');
  });

  it('copies the owner surface onto the body tooltip', () => {
    const owner = document.createElement('div');
    owner.style.setProperty('--ui9000-mode', 'dark');
    owner.style.setProperty('--ui9000-color-surface', '#13161d');
    owner.style.setProperty('--ui9000-color-text', '#eff0f1');
    document.body.appendChild(owner);

    presentChartTooltip(
      owner,
      { pageX: 40, pageY: 40, clientX: 40, clientY: 80 },
      { rows: [{ label: 'Sales', value: '12' }] },
    );

    const tip = document.querySelector('[data-ui9000-chart-tooltip]') as HTMLElement | null;
    expect(tip?.getAttribute('data-mode')).toBe('dark');
    expect(tip?.style.getPropertyValue('--ui9000-color-surface')).toBe('#13161d');
    expect(document.getElementById('ui9000-chart-tooltip-style')?.textContent).toContain(
      ".ui9000-chart-tooltip[data-mode='dark']",
    );
  });
});
