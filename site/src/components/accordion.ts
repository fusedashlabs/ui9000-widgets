import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../lib/light-element.js';
import { icons } from './icons.js';

/** Fired on `site-accordion` when a section opens or closes, by the person or by a link. */
export interface SectionToggleDetail {
  id: string;
  open: boolean;
}

export interface AccordionSection {
  /** Names the section in `?section=` and in the remembered state, e.g. `attributes`. */
  id: string;
  /** The h2's id. */
  headingId: string;
  title: string;
  /** The pill on the right of the header, e.g. "12 attributes". */
  hint: string;
  /** Open until the person opens or closes it themselves. */
  defaultOpen?: boolean;
  /** Extra class on the row. */
  className?: string;
  content: unknown;
}

/** Open or closed per section id, shared by every chart page. */
const STORAGE_KEY = 'ui9000-docs-sections';

function readStored(): Record<string, boolean> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return value && typeof value === 'object' ? (value as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function store(id: string, open: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readStored(), [id]: open }));
  } catch {
    // Storage blocked or full: the section still opens and closes, it is just not remembered.
  }
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A CSS time token in ms: `--site-duration` → 300. */
function cssMs(name: string): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
}

/**
 * Sections in one panel, one row each, as a disclosure: a button in each h2 opens the section's region. Closed content
 * is `hidden="until-found"`, so the browser's find still reaches it and opens it (`beforematch`). Open and close
 * animate the height with the site's motion tokens, unless the person prefers reduced motion.
 */
@customElement('site-accordion')
export class SiteAccordion extends LightElement {
  @property({ attribute: false }) sections: AccordionSection[] = [];
  /** Prefix for the panel ids, so two accordions never share one. */
  @property() idPrefix = 'accordion';

  @state() private stored = readStored();
  /** Closed, but still shown while the height animates down. */
  private closing = new Set<string>();
  private pending = new Map<string, 'open' | 'close'>();
  private running = new Map<string, Animation>();

  private isOpen(section: AccordionSection): boolean {
    return this.stored[section.id] ?? !!section.defaultOpen;
  }

  private panelId(section: AccordionSection): string {
    return `${this.idPrefix}-${section.id}-panel`;
  }

  private set(section: AccordionSection, open: boolean, animate: boolean): void {
    if (this.isOpen(section) === open) return;
    this.stored = { ...this.stored, [section.id]: open };
    store(section.id, open);
    this.dispatchEvent(new CustomEvent<SectionToggleDetail>('section-toggle', { detail: { id: section.id, open } }));
    this.running.get(section.id)?.cancel();
    if (open) this.closing.delete(section.id);
    if (animate && !reducedMotion()) {
      this.pending.set(section.id, open ? 'open' : 'close');
      if (!open) this.closing.add(section.id);
    }
  }

  private toggle(section: AccordionSection): void {
    this.set(section, !this.isOpen(section), true);
  }

  /**
   * Opens a section (no animation), scrolls its row under the top bar and focuses its button: for `?section=` links.
   * Returns false when the page has no such section.
   */
  async reveal(id: string): Promise<boolean> {
    const section = this.sections.find((s) => s.id === id);
    if (!section) return false;
    this.set(section, true, false);
    await this.updateComplete;
    const heading = this.querySelector<HTMLElement>(`#${CSS.escape(section.headingId)}`);
    if (!heading) return false;
    heading.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    heading.querySelector('button')?.focus({ preventScroll: true });
    return true;
  }

  protected override updated(): void {
    for (const [id, direction] of this.pending) {
      const panel = this.querySelector<HTMLElement>(`#${CSS.escape(`${this.idPrefix}-${id}-panel`)}`);
      if (!panel) continue;
      const height = `${panel.scrollHeight}px`;
      panel.style.overflow = 'hidden';
      const animation = panel.animate(
        { height: direction === 'open' ? ['0px', height] : [height, '0px'] },
        { duration: cssMs('--site-duration'), easing: getComputedStyle(document.documentElement).getPropertyValue('--site-ease').trim() || 'ease' },
      );
      this.running.set(id, animation);
      // A newer animation of the same panel owns it from here.
      const done = () => {
        if (this.running.get(id) !== animation) return;
        this.running.delete(id);
        panel.style.overflow = '';
        if (this.closing.delete(id)) this.requestUpdate();
      };
      animation.addEventListener('finish', done);
      animation.addEventListener('cancel', done);
    }
    this.pending.clear();
  }

  protected override render() {
    return html`<div class="accordion panel surface lit">
      ${this.sections.map((section) => {
        const open = this.isOpen(section);
        const titleId = `${section.headingId}-title`;
        return html`<div class="accordion-item ${section.className ?? ''} ${open ? 'is-open' : ''}" data-section=${section.id}>
          <h2 class="accordion-heading" id=${section.headingId}>
            <button
              type="button"
              class="accordion-trigger"
              aria-expanded=${open ? 'true' : 'false'}
              aria-controls=${this.panelId(section)}
              @click=${() => this.toggle(section)}
            >
              <span class="icon-btn accordion-chevron" aria-hidden="true">${icons.chevronDown}</span>
              <span class="accordion-title" id=${titleId}>${section.title}</span>
              <span class="tag accordion-hint">${section.hint}</span>
            </button>
          </h2>
          <div
            class="accordion-panel"
            id=${this.panelId(section)}
            role="region"
            aria-labelledby=${titleId}
            hidden=${open || this.closing.has(section.id) ? nothing : 'until-found'}
            @beforematch=${() => this.set(section, true, false)}
          >
            <div class="accordion-body">${section.content}</div>
          </div>
        </div>`;
      })}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'site-accordion': SiteAccordion;
  }
}
