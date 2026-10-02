import type { WidgetContextValue, WidgetMode, WidgetTheme } from '../types/index.js';
import { DARK_THEME, DEFAULT_CONTEXT, DEFAULT_THEME } from '../types/index.js';
import { notifyHostTheme } from '../element/theme-watch.js';
import {
  resolveElementMode,
  resolveRequestedMode,
  type ResolvedMode,
} from './resolve-mode.js';

const THEME_KEYS = [
  'primary',
  'secondary',
  'background',
  'grid',
  'text',
  'textMuted',
  'surface',
  'surfaceMuted',
  'border',
  'fontFamily',
] as const satisfies readonly (keyof WidgetTheme)[];

/** CSS custom property names consumed by chart web components */
export const CSS_VARS = {
  primary: '--ui9000-color-primary',
  secondary: '--ui9000-color-secondary',
  background: '--ui9000-color-background',
  grid: '--ui9000-color-grid',
  text: '--ui9000-color-text',
  textMuted: '--ui9000-color-text-muted',
  surface: '--ui9000-color-surface',
  surfaceMuted: '--ui9000-color-surface-muted',
  border: '--ui9000-color-border',
  fontFamily: '--ui9000-font-family',
  scale: '--ui9000-scale',
  styleId: '--ui9000-style-id',
  mode: '--ui9000-mode',
} as const;

export function themeToCssVars(theme: WidgetTheme): Record<string, string> {
  const vars: Record<string, string> = {
    [CSS_VARS.primary]: theme.primary,
    [CSS_VARS.secondary]: theme.secondary,
    [CSS_VARS.background]: theme.background,
    [CSS_VARS.grid]: theme.grid,
    [CSS_VARS.text]: theme.text,
    [CSS_VARS.textMuted]: theme.textMuted,
    [CSS_VARS.fontFamily]: theme.fontFamily,
  };
  if (theme.surface) vars[CSS_VARS.surface] = theme.surface;
  if (theme.surfaceMuted) vars[CSS_VARS.surfaceMuted] = theme.surfaceMuted;
  if (theme.border) vars[CSS_VARS.border] = theme.border;
  return vars;
}

/**
 * Fields the caller set on purpose. Neutrals that still match the other
 * mode's stock palette are dropped, so `mode: 'dark'` plus the light theme
 * object still emits the dark surface and ink.
 */
function overridesForMode(mode: ResolvedMode, theme: WidgetTheme): Partial<WidgetTheme> {
  const stock = mode === 'dark' ? DEFAULT_THEME : DARK_THEME;
  const overrides: Partial<WidgetTheme> = {};
  for (const key of THEME_KEYS) {
    const value = theme[key];
    if (typeof value === 'string' && value !== stock[key]) overrides[key] = value;
  }
  return overrides;
}

export function contextToCssVars(ctx: WidgetContextValue): Record<string, string> {
  const resolved = resolveWidgetContext({
    mode: ctx.mode,
    scale: ctx.scale,
    styleId: ctx.styleId,
    theme: overridesForMode(resolveRequestedMode(ctx.mode), ctx.theme),
  });
  return {
    ...themeToCssVars(resolved.theme),
    [CSS_VARS.scale]: resolved.scale,
    [CSS_VARS.styleId]: resolved.styleId,
    [CSS_VARS.mode]: resolved.mode,
  };
}

export type PartialWidgetContext = Omit<Partial<WidgetContextValue>, 'theme'> & {
  theme?: Partial<WidgetTheme>;
};

/** Resolves `auto` and picks the light or dark token set before overrides. */
export function resolveWidgetContext(ctx: PartialWidgetContext = {}): WidgetContextValue {
  const requested: WidgetMode = ctx.mode ?? DEFAULT_CONTEXT.mode;
  const mode = resolveRequestedMode(requested);
  const base = mode === 'dark' ? DARK_THEME : DEFAULT_THEME;
  return {
    ...DEFAULT_CONTEXT,
    ...ctx,
    mode,
    theme: { ...base, ...ctx.theme },
  };
}

export function applyWidgetContext(el: HTMLElement, ctx: PartialWidgetContext = {}): void {
  const vars = contextToCssVars(resolveWidgetContext(ctx));
  for (const [key, value] of Object.entries(vars)) {
    el.style.setProperty(key, value);
  }
  notifyHostTheme();
}

export function readCssVar(el: Element, name: string, fallback: string): string {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}

function inlineVar(el: Element, name: string): string {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return '';
  return el.style.getPropertyValue(name).trim();
}

/** True when a host actually wrote the surface token, not only `data-theme`. */
export function hasExplicitSurface(el: Element): boolean {
  let node: Element | null = el;
  while (node) {
    if (inlineVar(node, CSS_VARS.surface)) return true;
    node = node.parentElement;
  }
  if (typeof getComputedStyle !== 'function') return false;
  return getComputedStyle(el).getPropertyValue(CSS_VARS.surface).trim() !== '';
}

/**
 * Dark paint is allowed only together with a surface token. `data-theme` or
 * the OS scheme alone must not turn ink light-on-light while the card
 * fallback is still white.
 */
export function paintMode(el: Element): ResolvedMode {
  if (!hasExplicitSurface(el)) return 'light';
  return resolveElementMode(el);
}

export function readThemeFromElement(el: Element): WidgetTheme {
  const base = paintMode(el) === 'dark' ? DARK_THEME : DEFAULT_THEME;
  return {
    primary: readCssVar(el, CSS_VARS.primary, base.primary),
    secondary: readCssVar(el, CSS_VARS.secondary, base.secondary),
    background: readCssVar(el, CSS_VARS.background, base.background),
    grid: readCssVar(el, CSS_VARS.grid, base.grid),
    text: readCssVar(el, CSS_VARS.text, base.text),
    textMuted: readCssVar(el, CSS_VARS.textMuted, base.textMuted),
    surface: readCssVar(el, CSS_VARS.surface, base.surface ?? '#ffffff'),
    surfaceMuted: readCssVar(el, CSS_VARS.surfaceMuted, base.surfaceMuted ?? '#f3f4f6'),
    border: readCssVar(el, CSS_VARS.border, base.border ?? '#e5e7eb'),
    fontFamily: readCssVar(el, CSS_VARS.fontFamily, base.fontFamily),
  };
}

export type { WidgetContextValue, WidgetTheme };
