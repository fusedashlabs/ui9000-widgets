import { html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { dispatchUi9000Action, dispatchUi9000Select } from '../../../element/dispatch-ui9000.js';
import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizeEntity, type EntityModel } from '../lib/normalize.js';

@customElement('ui9000-entity-detail')
export class Ui9000EntityDetail extends LitElement {
  static override styles = surfaceStyles;

  @property({ type: String, attribute: 'data' })
  dataJson = '{}';

  @state()
  private _model: EntityModel | null = null;

  private refresh(): void {
    this._model = normalizeEntity(parseJsonAttr<unknown>(this.dataJson, null));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.refresh();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) this.refresh();
  }

  override render() {
    const model = this._model;
    if (!model) {
      return html`<p class="blocked" role="status">Entity id and title required</p>`;
    }
    return html`
      <article class="root" aria-label=${model.title}>
        <h2>${model.title}</h2>
        <p class="muted">${model.id}</p>
        <dl>
          ${model.fields.map(
            (field) => html`<dt>${field.label}</dt><dd>${field.value}</dd>`,
          )}
        </dl>
        <ul class="list">
          ${model.links.map(
            (link) => html`
              <li>
                <a href=${link.href} target="_blank" rel="noopener noreferrer">${link.label}</a>
              </li>
            `,
          )}
        </ul>
        <div class="actions">
          <button class="btn" type="button" @click=${() => dispatchUi9000Select(this, { id: model.id })}>
            Select
          </button>
          ${model.actions.map(
            (type) => html`
              <button class="btn" type="button" @click=${() => dispatchUi9000Action(this, { type })}>
                ${type}
              </button>
            `,
          )}
        </div>
      </article>
    `;
  }
}

export function registerEntityDetail(): void {
  if (!customElements.get('ui9000-entity-detail')) {
    customElements.define('ui9000-entity-detail', Ui9000EntityDetail);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-entity-detail': Ui9000EntityDetail;
  }
}
