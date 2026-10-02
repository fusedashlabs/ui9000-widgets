/** Fired by `applyWidgetContext` so mounted charts can redraw. */
export const HOST_THEME_EVENT = 'ui9000-theme';

const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;
let media: MediaQueryList | null = null;
let listening = false;

function emit(): void {
  for (const listener of listeners) listener();
}

function ensure(): void {
  if (typeof document === 'undefined') return;
  if (!observer && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => emit());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style'],
    });
  }
  if (!media && typeof matchMedia === 'function') {
    media = matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener?.('change', emit);
  }
  if (!listening) {
    document.addEventListener(HOST_THEME_EVENT, emit);
    listening = true;
  }
}

function teardown(): void {
  observer?.disconnect();
  observer = null;
  media?.removeEventListener?.('change', emit);
  media = null;
  if (listening && typeof document !== 'undefined') {
    document.removeEventListener(HOST_THEME_EVENT, emit);
  }
  listening = false;
}

/** One shared watcher for every mounted chart. Returns an unsubscribe. */
export function subscribeHostTheme(listener: () => void): () => void {
  ensure();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) teardown();
  };
}

export function notifyHostTheme(): void {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new CustomEvent(HOST_THEME_EVENT));
}
