import { applyWidgetContext } from '../../../src/context/widget-context.js';

export type ThemeMode = 'light' | 'dark';

export const THEME_EVENT = 'site-theme';
const STORAGE_KEY = 'ui9000-docs-theme';

/**
 * Same steps as `applyTheme()` in .storybook/preview.ts: `data-theme` on <html> switches the token CSS, and
 * `applyWidgetContext` writes the chart variables (including `--ui9000-color-surface`, without which charts
 * keep painting light) and ends with `notifyHostTheme()`, so mounted charts redraw.
 */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  root.dataset.theme = mode;
  // The page's scrollbar follows the theme; the site's blocks take --site-color-scheme (base.css).
  document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.setAttribute('content', mode);
  applyWidgetContext(root, { mode });
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage can be blocked; the theme still applies for this visit.
  }
  window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_EVENT, { detail: mode }));
}

export function currentTheme(): ThemeMode {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** Dark first, as in the reference; a stored choice wins. */
export function initTheme(): void {
  let mode: ThemeMode = 'dark';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') mode = stored;
  } catch {
    // Ignore: fall back to dark.
  }
  applyTheme(mode);
}
