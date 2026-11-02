/** Catalog events — no handler props, no javascript: URLs. */

export function dispatchUi9000Select(host: EventTarget, detail: { id: string }): void {
  host.dispatchEvent(
    new CustomEvent('ui9000-select', { detail, bubbles: true, composed: true }),
  );
}

export function dispatchUi9000Action(host: EventTarget, detail: { type: string }): void {
  host.dispatchEvent(
    new CustomEvent('ui9000-action', { detail, bubbles: true, composed: true }),
  );
}

export function dispatchUi9000Submit(
  host: EventTarget,
  detail: { values: Record<string, unknown> },
): void {
  host.dispatchEvent(
    new CustomEvent('ui9000-submit', { detail, bubbles: true, composed: true }),
  );
}
