import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CATEGORIES, FOUNDATIONS, findChartType } from '../catalog.js';
import { isChartReady } from '../charts/index.js';
import { LightElement } from '../lib/light-element.js';
import type { Route } from '../lib/router.js';
import { icons } from './icons.js';

@customElement('site-sidebar')
export class SiteSidebar extends LightElement {
  @property({ attribute: false }) route!: Route;

  /** Open categories. Comparison starts open because it holds the first working chart page. */
  @state() private open = new Set<string>(['comparison']);

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('route')) {
      const [section, id] = this.route.segments;
      const category = section === 'charts' && id ? findChartType(id)?.category : undefined;
      if (category && !this.open.has(category.id)) this.open = new Set([...this.open, category.id]);
    }
  }

  private toggle(id: string): void {
    const next = new Set(this.open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.open = next;
  }

  private link(label: string, path: string, current: boolean) {
    return html`<li>
      <a class="nav-link ${current ? 'is-current surface-raised' : ''}" href="#${path}" aria-current=${current ? 'page' : nothing}>
        <span class="nav-link-label">${label}</span>
      </a>
    </li>`;
  }

  private soon(label: string) {
    return html`<li>
      <span class="nav-link is-soon" aria-disabled="true">
        <span class="nav-link-label">${label}</span>
        <span class="badge">Soon</span>
      </span>
    </li>`;
  }

  protected override render() {
    const { segments } = this.route;
    const onIntro = segments.length === 0 || segments[0] === 'introduction';
    const currentChart = segments[0] === 'charts' ? segments[1] : undefined;
    const currentFoundation = segments[0] === 'foundations' ? segments[1] : undefined;
    return html`
      <div class="sidebar-section">
        <h2 class="sidebar-heading">Get started</h2>
        <ul class="nav-list">
          ${this.link('Introduction', '/introduction', onIntro)}
        </ul>
      </div>
      <div class="sidebar-section">
        <h2 class="sidebar-heading">Foundations</h2>
        <ul class="nav-list">
          ${FOUNDATIONS.map((f) => this.link(f.label, `/foundations/${f.id}`, currentFoundation === f.id))}
        </ul>
      </div>
      <div class="sidebar-section">
        <h2 class="sidebar-heading">Charts</h2>
        <ul class="nav-list">
          ${CATEGORIES.map((category) => {
            const open = this.open.has(category.id);
            const listId = `nav-${category.id}`;
            return html`<li class="nav-group ${open ? 'is-open' : ''}">
              <button
                class="nav-group-toggle"
                type="button"
                aria-expanded=${open ? 'true' : 'false'}
                aria-controls=${listId}
                @click=${() => this.toggle(category.id)}
              >
                <span class="nav-group-label">${category.label}</span>
                <span class="nav-group-chevron">${icons.chevronRight}</span>
              </button>
              <ul class="nav-sublist" id=${listId} ?hidden=${!open}>
                ${category.types.map((t) =>
                  isChartReady(t.id) ? this.link(t.label, `/charts/${t.id}`, currentChart === t.id) : this.soon(t.label),
                )}
              </ul>
            </li>`;
          })}
        </ul>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'site-sidebar': SiteSidebar;
  }
}
