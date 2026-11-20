import { html, nothing } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { LightElement } from '../lib/light-element.js';
import { href, parseHash } from '../lib/router.js';
import type { SiteAccordion } from './accordion.js';
import { reveal } from '../lib/reveal.js';
import { buildSearchIndex, matchRanges, normalizeQuery, search, type SearchEntry, type SearchGroup } from '../lib/search.js';
import { currentTheme } from '../lib/theme.js';
import { icons } from './icons.js';

const LISTBOX_ID = 'search-listbox';
const ANNOUNCE_DELAY_MS = 400;

/** True on macOS and iOS, where the shortcut reads ⌘K. */
export const IS_APPLE = /mac|iphone|ipad|ipod/i.test(
  (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? '',
);
export const SHORTCUT_LABEL = IS_APPLE ? '⌘K' : 'Ctrl K';
export const SHORTCUT_KEYS = IS_APPLE ? 'Meta+K /' : 'Control+K /';

const NOT_TEXT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image']);

/** "/" opens search only when it would not type into a field. */
function isTextField(node: EventTarget | undefined): boolean {
  if (!(node instanceof HTMLElement)) return false;
  if (node.isContentEditable || node.localName === 'textarea' || node.localName === 'select') return true;
  return node instanceof HTMLInputElement && !NOT_TEXT.has(node.type);
}

const optionId = (group: SearchGroup, entry: SearchEntry) => `search-${group.id}-${entry.id}`;

/**
 * Site search: a modal dialog with a combobox and grouped results. Opened from the header triggers,
 * ⌘K / Ctrl+K, or "/" outside text fields. Fires `search-open` (bubbling) before it opens.
 */
@customElement('site-search')
export class SiteSearch extends LightElement {
  @state() private isOpen = false;
  @state() private query = '';
  @state() private activeId: string | null = null;
  @state() private announcement = '';

  @query('dialog') private dialog!: HTMLDialogElement;
  @query('.search-input') private input!: HTMLInputElement;

  private entries: SearchEntry[] = [];
  private groups: SearchGroup[] = [];
  private returnFocus: HTMLElement | null = null;
  private announceTimer = 0;
  /** Set by the arrow keys, so only keyboard moves scroll the list. */
  private scrollToActive = false;

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.onDocumentKeydown);
  }

  override disconnectedCallback(): void {
    document.removeEventListener('keydown', this.onDocumentKeydown);
    clearTimeout(this.announceTimer);
    super.disconnectedCallback();
  }

  private onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey) return;
    const key = event.key.toLowerCase();
    const shortcut = key === 'k' && (event.metaKey || event.ctrlKey) && !event.shiftKey;
    const slash = event.key === '/' && !event.metaKey && !event.ctrlKey && !isTextField(event.composedPath()[0]);
    if (shortcut || (slash && !this.isOpen)) {
      event.preventDefault();
      void this.show();
    }
  };

  /** Opens the dialog with an empty query and the input focused. */
  async show(): Promise<void> {
    if (this.isOpen) {
      this.input?.focus();
      return;
    }
    this.dispatchEvent(new CustomEvent('search-open', { bubbles: true }));
    const active = document.activeElement;
    this.returnFocus = active instanceof HTMLElement && active !== document.body ? active : null;
    this.entries = buildSearchIndex(currentTheme());
    this.query = '';
    this.isOpen = true;
    await this.updateComplete;
    if (!this.dialog.open) this.dialog.showModal();
    this.input.focus();
  }

  /** Closes the dialog. Focus goes back to where it was (the trigger), unless a result is being opened. */
  close(restoreFocus = true): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    clearTimeout(this.announceTimer);
    this.announcement = '';
    if (this.dialog.open) this.dialog.close();
    if (restoreFocus) this.restoreFocus();
  }

  private restoreFocus(): void {
    const usable = (el: HTMLElement | null): el is HTMLElement =>
      !!el && el.isConnected && !el.closest('[inert]') && el.getClientRects().length > 0;
    const trigger = [...document.querySelectorAll<HTMLElement>('[data-search-trigger]')].find(usable);
    const target = usable(this.returnFocus) ? this.returnFocus : trigger;
    target?.focus();
    this.returnFocus = null;
  }

  private get options(): { id: string; entry: SearchEntry }[] {
    return this.groups.flatMap((group) => group.entries.map((entry) => ({ id: optionId(group, entry), entry })));
  }

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('query') || (changed.has('isOpen') && this.isOpen)) {
      this.groups = this.isOpen ? search(this.entries, this.query) : [];
      const options = this.options;
      this.activeId = (options.find((o) => o.entry.path) ?? options[0])?.id ?? null;
      if (this.isOpen) this.scheduleAnnouncement(options.length);
    }
  }

  protected override updated(): void {
    if (this.scrollToActive && this.activeId) {
      this.querySelector(`#${CSS.escape(this.activeId)}`)?.scrollIntoView({ block: 'nearest' });
    }
    this.scrollToActive = false;
  }

  /** The result count, announced once typing pauses. */
  private scheduleAnnouncement(count: number): void {
    clearTimeout(this.announceTimer);
    const query = normalizeQuery(this.query);
    this.announceTimer = window.setTimeout(() => {
      if (!query) this.announcement = `${count} suggestions`;
      else if (!count) this.announcement = `No results for "${this.query.trim()}"`;
      else this.announcement = `${count} ${count === 1 ? 'result' : 'results'}`;
    }, ANNOUNCE_DELAY_MS);
  }

  private move(step: number): void {
    const options = this.options;
    if (!options.length) return;
    const index = options.findIndex((o) => o.id === this.activeId);
    const next = index < 0 ? (step > 0 ? 0 : options.length - 1) : (index + step + options.length) % options.length;
    this.activeId = options[next].id;
    this.scrollToActive = true;
  }

  private onInputKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Enter': {
        event.preventDefault();
        const active = this.options.find((o) => o.id === this.activeId);
        if (active) this.choose(active.entry);
        break;
      }
    }
  }

  /** Keeps Tab inside the dialog. */
  private onDialogKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusables = [...this.dialog.querySelectorAll<HTMLElement>('input, button, a[href]')].filter(
      (el) => el.getClientRects().length > 0,
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Esc: the browser fires `cancel`; close through the same path as the Close button. */
  private onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  /** The dialog fills the viewport; a click on it outside the panel is a click on the backdrop. */
  private onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog) this.close();
  }

  private choose(entry: SearchEntry): void {
    if (!entry.path) return; // "Soon": listed, but there is no page yet
    const current = parseHash();
    this.close(false);
    if (entry.section) {
      // The chart page opens the section from `?section=`; on the page already open, its settings stay in the link.
      const params = current.path === entry.path ? new URLSearchParams(current.params) : new URLSearchParams();
      params.set('section', entry.section);
      const next = href(entry.path, params);
      // The same link fires no hashchange: open the section directly.
      if (location.hash === next) void document.querySelector<SiteAccordion>('site-accordion')?.reveal(entry.section);
      else location.hash = next;
      return;
    }
    if (current.path === entry.path) {
      // Already here: keep the page state (chart settings live in the query).
      if (entry.reveal) void reveal(entry.reveal.selector, entry.reveal.focus, entry.reveal.fallback);
      else {
        window.scrollTo({ top: 0 });
        document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
      }
      return;
    }
    location.hash = `#${entry.path}`;
    if (entry.reveal) void reveal(entry.reveal.selector, entry.reveal.focus, entry.reveal.fallback);
  }

  private label(entry: SearchEntry) {
    const ranges = matchRanges(entry.label, this.query);
    if (!ranges.length) return entry.label;
    const parts: unknown[] = [];
    let at = 0;
    for (const [start, end] of ranges) {
      parts.push(entry.label.slice(at, start), html`<mark>${entry.label.slice(start, end)}</mark>`);
      at = end;
    }
    parts.push(entry.label.slice(at));
    return parts;
  }

  private icon(entry: SearchEntry) {
    if (entry.swatch) return html`<span class="search-swatch" style=${`background: ${entry.swatch}`}></span>`;
    if (entry.group === 'charts') return icons.chart;
    if (entry.group === 'settings') return icons.sliders;
    return icons.page;
  }

  private option(group: SearchGroup, entry: SearchEntry) {
    const id = optionId(group, entry);
    const active = id === this.activeId;
    const soon = !entry.path;
    const name = [entry.context, entry.label].filter(Boolean).join(', ') + (soon ? ', soon' : '') + (entry.hex ? `, ${entry.hex}` : '');
    return html`<div
      id=${id}
      class="search-option ${active ? 'is-active surface-raised' : ''} ${soon ? 'is-soon' : ''}"
      role="option"
      aria-selected=${active ? 'true' : 'false'}
      aria-disabled=${soon ? 'true' : nothing}
      aria-label=${name}
      @click=${() => this.choose(entry)}
      @mousemove=${() => {
        // A Soon result cannot be opened, so the pointer does not highlight it (the keyboard still reaches it).
        if (!soon && this.activeId !== id) this.activeId = id;
      }}
    >
      <span class="search-option-icon" aria-hidden="true">${this.icon(entry)}</span>
      <span class="search-option-text">
        ${entry.context
          ? html`<span class="search-option-context">${entry.context}</span
              ><span class="search-option-sep" aria-hidden="true">›</span>`
          : nothing}<span class="search-option-label">${this.label(entry)}</span>
      </span>
      ${soon ? html`<span class="badge">Soon</span>` : nothing}
      ${entry.hex ? html`<span class="search-option-hex">${entry.hex}</span>` : nothing}
      ${active && !soon ? html`<span class="search-option-enter" aria-hidden="true">${icons.enter}</span>` : nothing}
    </div>`;
  }

  protected override render() {
    const query = this.query.trim();
    const empty = this.isOpen && !!query && !this.groups.length;
    return html`<dialog
      class="search-dialog"
      aria-label="Search the docs"
      @cancel=${this.onCancel}
      @click=${this.onDialogClick}
      @keydown=${this.onDialogKeydown}
    >
      <div class="search-panel surface-raised lit lit-clipped">
        <div class="search-field">
          <span class="search-field-icon" aria-hidden="true">${icons.search}</span>
          <input
            class="search-input"
            type="text"
            role="combobox"
            aria-label="Search docs"
            aria-expanded="true"
            aria-controls=${LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant=${this.activeId ?? nothing}
            placeholder="Search pages, charts, settings and tokens"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="go"
            .value=${this.query}
            @input=${(e: Event) => (this.query = (e.target as HTMLInputElement).value)}
            @keydown=${this.onInputKeydown}
          />
          <button class="btn btn-secondary btn-sm search-close" type="button" @click=${() => this.close()}>Close</button>
        </div>
        <div class="search-results">
          <div id=${LISTBOX_ID} role="listbox" aria-label="Results" class="search-listbox">
            ${this.groups.map(
              (group) => html`<div class="search-group" role="group" aria-labelledby="search-group-${group.id}">
                <div class="search-group-title" id="search-group-${group.id}" role="presentation">${group.title}</div>
                ${group.entries.map((entry) => this.option(group, entry))}
              </div>`,
            )}
          </div>
          ${empty
            ? html`<div class="search-empty">
                <p>No results for “${query}”.</p>
                <p>
                  <a href="#/introduction/categories" @click=${() => this.close(false)}>Browse the chart categories</a>
                </p>
              </div>`
            : nothing}
        </div>
        <div class="search-footer" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> Move</span>
          <span><kbd>Enter</kbd> Open</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
        <div class="visually-hidden" aria-live="polite" aria-atomic="true">${this.announcement}</div>
      </div>
    </dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'site-search': SiteSearch;
  }
}
