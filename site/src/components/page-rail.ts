import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../lib/light-element.js';
import { parseHash } from '../lib/router.js';

interface RailItem {
  id: string;
  label: string;
  /** The h3 sections under an h2. */
  children: RailItem[];
}

/** How far below the headings' scroll margin (where a link puts them) a section still counts as reached. */
const LINE_SLACK = 16;
/** What the person does to scroll the page themselves (rather than a link scrolling it). */
const SCROLL_INPUTS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;

/**
 * A page with an "On this page" rail beside it: `#<path>/<id>` links to each section. The rail shows from 1280px; under
 * that, the links still open their section.
 */
export function withPageRail(path: string, page: unknown) {
  return html`<div class="doc-layout">${page}<site-page-rail .path=${path}></site-page-rail></div>`;
}

/**
 * "On this page", built from the page's h2 and h3 headings that have an id (h3s nested under their h2), so a new
 * section shows up by itself. The active item is the last section whose heading has passed a fixed line under the top
 * bar; at the very top it is the first, at the very bottom the last. A section opened by a link (the rail, a
 * `#<path>/<id>` link, the Color page's `?palette=`) focuses its heading and stays active until the person scrolls:
 * a short page cannot bring a lower section to the line, and the bottom rule would mark the last one instead.
 */
@customElement('site-page-rail')
export class SitePageRail extends LightElement {
  /** The page's route, e.g. `/foundations/color`. */
  @property() path = '';
  @state() private items: RailItem[] = [];
  @state() private active = '';

  private headings: HTMLElement[] = [];
  private frame = 0;
  /** The section a link opened, active until the person scrolls. */
  private pinned = '';
  /** Set by a scroll input; the scroll that follows ends the pin. */
  private scrolling = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.collect();
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll);
    window.addEventListener('hashchange', this.onHashChange);
    document.addEventListener('focusin', this.onFocusIn);
    for (const type of SCROLL_INPUTS) window.addEventListener(type, this.onScrollInput, { passive: true });
    void this.openSection();
  }

  override disconnectedCallback(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    window.removeEventListener('hashchange', this.onHashChange);
    document.removeEventListener('focusin', this.onFocusIn);
    for (const type of SCROLL_INPUTS) window.removeEventListener(type, this.onScrollInput);
    cancelAnimationFrame(this.frame);
    super.disconnectedCallback();
  }

  private collect(): void {
    const page = this.closest('.doc-layout')?.querySelector('.page');
    this.headings = [...(page?.querySelectorAll<HTMLElement>('h2[id], h3[id]') ?? [])];
    const items: RailItem[] = [];
    for (const h of this.headings) {
      const item = { id: h.id, label: h.textContent?.trim() ?? '', children: [] };
      if (h.localName === 'h3' && items.length) items[items.length - 1].children.push(item);
      else items.push(item);
    }
    this.items = items;
    this.measure();
  }

  private onScrollInput = (): void => {
    this.scrolling = true;
  };

  private onFocusIn = (event: FocusEvent): void => {
    const heading = this.headings.find((h) => h === event.target);
    if (!heading) return;
    this.pinned = heading.id;
    this.scrolling = false;
    this.active = heading.id;
  };

  private onScroll = (): void => {
    if (this.scrolling) this.pinned = '';
    if (!this.frame) this.frame = requestAnimationFrame(() => this.measure());
  };

  private measure(): void {
    this.frame = 0;
    const [first] = this.headings;
    if (!first) return;
    if (this.pinned) {
      this.active = this.pinned;
      return;
    }
    const doc = document.documentElement;
    let current = first.id;
    if (scrollY + innerHeight >= doc.scrollHeight - 2 && scrollY > 0) {
      current = this.headings[this.headings.length - 1].id;
    } else if (scrollY > 0) {
      const line = parseFloat(getComputedStyle(first).scrollMarginTop) + LINE_SLACK;
      for (const h of this.headings) if (h.getBoundingClientRect().top <= line) current = h.id;
    }
    this.active = current;
  }

  /** The section the link names: `#/foundations/color/core-colors` → `core-colors`. */
  private linkedSection(): string {
    const { path } = parseHash();
    return path.startsWith(`${this.path}/`) ? path.slice(this.path.length + 1) : '';
  }

  private onHashChange = (): void => void this.openSection();

  /**
   * Scrolls to the section the link names and focuses its heading. It waits two frames, so it runs after a page change
   * has scrolled to the top and focused the page title, and after the Color page has scrolled to a linked palette.
   */
  private async openSection(): Promise<void> {
    const id = this.linkedSection();
    if (!id) return;
    for (let i = 0; i < 2; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
    this.goTo(id);
  }

  private goTo(id: string): void {
    const heading = this.headings.find((h) => h.id === id);
    if (!heading) return;
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
    heading.focus({ preventScroll: true });
  }

  /** Keeps the rest of the link (the Color page's `?palette=`), and scrolls even when the section is already linked. */
  private onClick(event: MouseEvent, id: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const query = parseHash().params.toString();
    history.pushState(history.state, '', `#${this.path}/${id}${query ? `?${query}` : ''}`);
    this.goTo(id);
  }

  private link(item: RailItem) {
    const active = this.active === item.id;
    return html`<a
      class="rail-link ${active ? 'is-active' : ''}"
      href="#${this.path}/${item.id}"
      @click=${(e: MouseEvent) => this.onClick(e, item.id)}
      aria-current=${active ? 'location' : nothing}
      >${item.label}</a
    >`;
  }

  protected override render() {
    return html`<nav class="on-this-page" aria-label="On this page">
      <h2 class="rail-title">On this page</h2>
      <ul>
        ${this.items.map(
          (item) => html`<li>
            ${this.link(item)}
            ${item.children.length
              ? html`<ul class="rail-sublist">
                  ${item.children.map((child) => html`<li>${this.link(child)}</li>`)}
                </ul>`
              : nothing}
          </li>`,
        )}
      </ul>
    </nav>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'site-page-rail': SitePageRail;
  }
}
