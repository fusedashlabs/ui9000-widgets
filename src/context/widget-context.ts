import type { WidgetContextValue, WidgetTheme } from '../types/index.js';
import { DEFAULT_CONTEXT, DEFAULT_THEME } from '../types/index.js';

/** CSS custom property names consumed by chart web components */
export const CSS_VARS = {
  primary: '--ui9000-color-primary',
  secondary: '--ui9000-color-secondary',
  background: '--ui9000-color-background',
  grid: '--ui9000-color-grid',
  text: '--ui9000-color-text',
  textMuted: '--ui9000-color-text-muted',
  fontFamily: '--ui9000-font-family',
  scale: '--ui9000-scale',
  styleId: '--ui9000-style-id',
  mode: '--ui9000-mode',
} as const;

export function themeToCssVars(theme: WidgetTheme): Record<string, string> {
  return {
    [CSS_VARS.primary]: theme.primary,
    [CSS_VARS.secondary]: theme.secondary,
    [CSS_VARS.background]: theme.background,
    [CSS_VARS.grid]: theme.grid,
    [CSS_VARS.text]: theme.text,
    [CSS_VARS.textMuted]: theme.textMuted,
    [CSS_VARS.fontFamily]: theme.fontFamily,
  };
}

export function contextToCssVars(ctx: WidgetContextValue): Record<string, string> {
  return {
    ...themeToCssVars(ctx.theme),
    [CSS_VARS.scale]: ctx.scale,
    [CSS_VARS.styleId]: ctx.styleId,
    [CSS_VARS.mode]: ctx.mode,
  };
}

export type PartialWidgetContext = Omit<Partial<WidgetContextValue>, 'theme'> & {
  theme?: Partial<WidgetTheme>;
};

export function applyWidgetContext(el: HTMLElement, ctx: PartialWidgetContext = {}): void {
  const merged: WidgetContextValue = {
    ...DEFAULT_CONTEXT,
    ...ctx,
    theme: { ...DEFAULT_THEME, ...ctx.theme },
  };
  const vars = contextToCssVars(merged);
  for (const [key, value] of Object.entries(vars)) {
    el.style.setProperty(key, value);
  }
}

export function readCssVar(el: Element, name: string, fallback: string): string {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}

export function readThemeFromElement(el: Element): WidgetTheme {
  return {
    primary: readCssVar(el, CSS_VARS.primary, DEFAULT_THEME.primary),
    secondary: readCssVar(el, CSS_VARS.secondary, DEFAULT_THEME.secondary),
    background: readCssVar(el, CSS_VARS.background, DEFAULT_THEME.background),
    grid: readCssVar(el, CSS_VARS.grid, DEFAULT_THEME.grid),
    text: readCssVar(el, CSS_VARS.text, DEFAULT_THEME.text),
    textMuted: readCssVar(el, CSS_VARS.textMuted, DEFAULT_THEME.textMuted),
    fontFamily: readCssVar(el, CSS_VARS.fontFamily, DEFAULT_THEME.fontFamily),
  };
}

export type { WidgetContextValue, WidgetTheme };
