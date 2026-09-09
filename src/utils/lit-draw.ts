import type { PropertyValues } from 'lit';

/**
 * True when a public (non-`_`*) property changed.
 * Internal Lit `@state` like `_tooltip` / `_empty` must not trigger D3 redraw —
 * otherwise hover destroys the SVG and the tooltip never sticks.
 */
export function chartPropsChanged(changed: PropertyValues): boolean {
  for (const key of changed.keys()) {
    if (typeof key === 'string' && key.startsWith('_')) continue;
    return true;
  }
  return false;
}
