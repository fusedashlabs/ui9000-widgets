/**
 * Brings an element into view after a navigation, moves focus to it and highlights it for a moment.
 * Used when a search result points inside a page: a chart setting, a colour swatch.
 */
const HIGHLIGHT_MS = 2000;
const WAIT_MS = 3000;

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

async function waitFor(selector: string): Promise<HTMLElement | null> {
  const start = performance.now();
  while (performance.now() - start < WAIT_MS) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
    await frame();
  }
  return null;
}

/**
 * `focus` picks what inside the element takes focus (for a setting: its input); the element itself otherwise.
 * `fallback` is revealed instead when the page has no `selector` (a setting hidden in the current state: the
 * preset tiles, with focus on the selected one). Both render together, so once either is there the page is.
 * Waits two frames once the element exists, so it runs after the page has moved focus to its heading.
 */
export async function reveal(selector: string, focus?: string, fallback?: string): Promise<void> {
  const found = await waitFor(fallback ? `${selector}, ${fallback}` : selector);
  const el = (fallback && document.querySelector<HTMLElement>(selector)) || found;
  if (!el) return;
  // Inside a closed section: open it, as the browser's find does (see components/accordion.ts).
  el.closest('[hidden="until-found"]')?.dispatchEvent(new Event('beforematch', { bubbles: true }));
  await frame();
  await frame();
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  const target = (focus && el.querySelector<HTMLElement>(focus)) || el;
  target.focus({ preventScroll: true });
  // A disabled control cannot take focus; the element itself does, so focus still lands on what was asked for.
  if (document.activeElement !== target) {
    if (!el.hasAttribute('tabindex')) el.tabIndex = -1;
    el.focus({ preventScroll: true });
  }
  el.classList.remove('is-revealed');
  void el.offsetWidth; // restart the highlight if it is still running
  el.classList.add('is-revealed');
  window.setTimeout(() => el.classList.remove('is-revealed'), HIGHLIGHT_MS);
}
