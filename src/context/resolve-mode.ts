import type { WidgetMode } from '../types/index.js';

export type ResolvedMode = 'light' | 'dark';

const MODE_VAR = '--ui9000-mode';

export function prefersDark(): boolean {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

/** `auto` follows the browser; anything else collapses to light or dark. */
export function resolveRequestedMode(mode: WidgetMode): ResolvedMode {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return prefersDark() ? 'dark' : 'light';
}

function inlineMode(el: Element): ResolvedMode | '' {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return '';
  const value = el.style.getPropertyValue(MODE_VAR).trim();
  return value === 'dark' || value === 'light' ? value : '';
}

/**
 * Precedence: `--ui9000-mode` on the element or an ancestor, then
 * `data-theme` on an ancestor, then `prefers-color-scheme`, then light.
 */
export function resolveElementMode(el: Element): ResolvedMode {
  let node: Element | null = el;
  while (node) {
    const inline = inlineMode(node);
    if (inline) return inline;
    node = node.parentElement;
  }

  if (typeof getComputedStyle === 'function') {
    const computed = getComputedStyle(el).getPropertyValue(MODE_VAR).trim();
    if (computed === 'dark' || computed === 'light') return computed;
  }

  const themed = el.closest('[data-theme]');
  const attr = themed?.getAttribute('data-theme')?.trim();
  if (attr === 'dark' || attr === 'light') return attr;

  return prefersDark() ? 'dark' : 'light';
}
