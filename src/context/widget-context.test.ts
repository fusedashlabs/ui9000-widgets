import { describe, expect, it, vi } from 'vitest';
import {
  applyWidgetContext,
  contextToCssVars,
  readThemeFromElement,
  themeToCssVars,
} from '../context/widget-context.js';
import { DARK_THEME, DEFAULT_CONTEXT, DEFAULT_THEME } from '../types/index.js';
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
    expect(el.style.getPropertyValue('--ui9000-color-surface')).toBe(DARK_THEME.surface);
    expect(el.style.getPropertyValue('--ui9000-color-text')).toBe(DARK_THEME.text);
    expect(el.style.getPropertyValue('--ui9000-color-grid')).toBe(DARK_THEME.grid);
  });

  it('resolves auto from the browser color scheme', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const el = document.createElement('div');
    applyWidgetContext(el, { mode: 'auto' });
    expect(el.style.getPropertyValue('--ui9000-mode')).toBe('dark');
    expect(el.style.getPropertyValue('--ui9000-color-text')).toBe(DARK_THEME.text);
    vi.unstubAllGlobals();
  });

  it('keeps a partial theme override on top of the dark tokens', () => {
    const el = document.createElement('div');
    applyWidgetContext(el, { mode: 'dark', theme: { text: '#abcdef' } });
    expect(el.style.getPropertyValue('--ui9000-color-text')).toBe('#abcdef');
    expect(el.style.getPropertyValue('--ui9000-color-surface')).toBe(DARK_THEME.surface);
  });

  it('writes light tokens when mode is omitted', () => {
    const vars = contextToCssVars(DEFAULT_CONTEXT);
    expect(vars['--ui9000-color-surface']).toBe(DEFAULT_THEME.surface);
    expect(vars['--ui9000-mode']).toBe('light');
  });

  it('pairs a dark mode with the dark palette even if the theme object is still light', () => {
    const vars = contextToCssVars({ ...DEFAULT_CONTEXT, mode: 'dark', theme: DEFAULT_THEME });
    expect(vars['--ui9000-mode']).toBe('dark');
    expect(vars['--ui9000-color-surface']).toBe(DARK_THEME.surface);
    expect(vars['--ui9000-color-text']).toBe(DARK_THEME.text);
  });

  it('keeps light ink when data-theme is dark but no surface token is set', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const el = document.createElement('div');
    document.body.appendChild(el);
    const theme = readThemeFromElement(el);
    expect(theme.text).toBe(DEFAULT_THEME.text);
    expect(theme.surface).toBe(DEFAULT_THEME.surface);
    document.documentElement.removeAttribute('data-theme');
    el.remove();
  });

  it('uses dark ink once the host has written the surface token', () => {
    const host = document.createElement('div');
    const el = document.createElement('div');
    host.appendChild(el);
    document.body.appendChild(host);
    applyWidgetContext(host, { mode: 'dark' });
    const theme = readThemeFromElement(el);
    expect(theme.text).toBe(DARK_THEME.text);
    expect(theme.surface).toBe(DARK_THEME.surface);
    host.remove();
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
