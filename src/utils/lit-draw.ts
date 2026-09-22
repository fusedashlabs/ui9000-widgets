import type { PropertyValues } from 'lit';

/** Chrome-only props. Changing them re-renders the header and must not redraw D3. */
const NON_DRAW_PROPS = new Set(['headerVariant']);

/**
 * True when a public (non-`_`*) property changed.
 * Internal Lit `@state` like `_tooltip` / `_empty` must not trigger D3 redraw —
 * otherwise hover destroys the SVG and the tooltip never sticks.
 * `headerVariant` is header chrome; `headerHandlers` is a plain field, not a Lit property.
 */
export function chartPropsChanged(changed: PropertyValues): boolean {
  for (const key of changed.keys()) {
    if (typeof key !== 'string') return true;
    if (key.startsWith('_')) continue;
    if (NON_DRAW_PROPS.has(key)) continue;
    return true;
  }
  return false;
}
