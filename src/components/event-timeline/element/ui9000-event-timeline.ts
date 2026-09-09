import { html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { dispatchUi9000Select } from '../../../element/dispatch-ui9000.js';
import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizeTimeline, type TimelineEvent } from '../lib/normalize.js';

@customElement('ui9000-event-timeline')
export class Ui9000EventTimeline extends LitElement {
  static override styles = surfaceStyles;

  @property({ type: String, attribute: 'data' })
  dataJson = '{}';

  @state()
  private _events: TimelineEvent[] = [];

  private refresh(): void {
    this._events = normalizeTimeline(parseJsonAttr<unknown>(this.dataJson, null));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.refresh();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) this.refresh();
  }

  override render() {
    if (!this._events.length) {
      return html`<p class="blocked" role="status">No events</p>`;
    }
    return html`
      <ol class="root list" aria-label="Event timeline">
        ${this._events.map(
          (event) => html`
            <li>
              <button
                class="btn"
                type="button"
                @click=${() => dispatchUi9000Select(this, { id: event.id })}
              >
                <time datetime=${event.ts}>${event.ts}</time>
                <strong> ${event.actor}</strong>
                <span> ${event.action}</span>
                ${event.severity
                  ? html`<span class="sev">${event.severity}</span>`
                  : ''}
              </button>
            </li>
          `,
        )}
      </ol>
    `;
  }
}

export function registerEventTimeline(): void {
  if (!customElements.get('ui9000-event-timeline')) {
    customElements.define('ui9000-event-timeline', Ui9000EventTimeline);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-event-timeline': Ui9000EventTimeline;
  }
}
