import { describe, expect, it } from 'vitest';
import { applyWidgetContext, contextToCssVars, themeToCssVars } from '../context/widget-context.js';
import { DEFAULT_CONTEXT, DEFAULT_THEME } from '../types/index.js';
import { parseJsonAttr } from '../utils/chart-helpers.js';

describe('WidgetContext', () => {
  it('maps theme to CSS custom properties', () => {
    const vars = themeToCssVars(DEFAULT_THEME);
    expect(vars['--ui9000-color-primary']).toBe('#473DD9');
    expect(vars['--ui9000-font-family']).toContain('system-ui');
  });

  it('maps full context including scale and mode', () => {
    const vars = contextToCssVars(DEFAULT_CONTEXT);
    expect(vars['--ui9000-scale']).toBe('default');
    expect(vars['--ui9000-mode']).toBe('light');
  });

  it('applies context to a DOM element', () => {
    const el = document.createElement('div');
    applyWidgetContext(el, { mode: 'dark', theme: { primary: '#ff0000' } });
    expect(el.style.getPropertyValue('--ui9000-mode')).toBe('dark');
    expect(el.style.getPropertyValue('--ui9000-color-primary')).toBe('#ff0000');
  });
});

describe('chart helpers', () => {
  it('parses JSON attributes safely', () => {
    expect(parseJsonAttr('[{"label":"A","value":1}]', [])).toEqual([
      { label: 'A', value: 1 },
    ]);
    expect(parseJsonAttr('not-json', [])).toEqual([]);
    expect(parseJsonAttr(null, [1])).toEqual([1]);
  });
});
