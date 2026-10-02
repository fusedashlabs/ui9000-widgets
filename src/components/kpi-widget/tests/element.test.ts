// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';

import { Ui9000KpiWidget } from '../element/ui9000-kpi-widget.js';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
});

const SINGLE = {
  chartType: 'KPI',
  type: 'single_value',
  column: 'total_checkins',
  name: 'Total Check-ins',
  aggregations: 'sum',
  data: [{ value: { sum_total_checkins: '11137' } }],
};

function styleText(styles: unknown): string {
  if (Array.isArray(styles)) return styles.map(styleText).join('\n');
  if (styles && typeof styles === 'object' && 'cssText' in styles) {
    return String((styles as { cssText: string }).cssText);
  }
  return '';
}

describe('kpi dark theme', () => {
  it('reads the card and the value from the host color tokens', () => {
    const css = styleText(Ui9000KpiWidget.styles);
    expect(css).toContain('background: var(--ui9000-color-surface, #ffffff)');
    expect(css).toContain('.kpi-value');
    expect(css).toContain('color: var(--ui9000-color-text, #111827)');
    expect(css).toContain('color: var(--ui9000-color-text-muted, #6b7280)');
  });

  it('renders the single value under its title', async () => {
    const el = document.createElement('ui9000-kpi-widget') as Ui9000KpiWidget;
    el.dataJson = JSON.stringify(SINGLE);
    document.body.appendChild(el);
    try {
      await el.updateComplete;
      await el.updateComplete;
      expect(el.shadowRoot?.querySelector('.kpi-section-title')?.textContent).toBe(
        'Total Check-ins',
      );
      expect(el.shadowRoot?.querySelector('.kpi-value')?.textContent).toBe('11.14K');
      expect(el.shadowRoot?.querySelector('.kpi-name')).toBeNull();
    } finally {
      el.remove();
    }
  });
});
