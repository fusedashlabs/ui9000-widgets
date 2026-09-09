import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseLabelledField } from '../../../lib/labelled-control.js';

@customElement('ui9000-select')
export class Ui9000Select extends LitElement {
  static override styles = surfaceStyles;

  @property({ type: String, attribute: 'data' }) dataJson = '{}';
  @property({ type: String }) label = '';
  @property({ type: String }) name = '';
  @property({ type: String, attribute: false }) value?: string;

  override render() {
    const field = parseLabelledField(this.dataJson, {
      label: this.label,
      name: this.name,
      value: this.value,
    });
    if (!field) return html`<p class="blocked" role="alert">Label required</p>`;
    const options = field.options.length ? field.options : [field.value].filter(Boolean);
    return html`
      <div class="root">
        <label for=${field.name}>${field.label}</label>
        <select
          class="field"
          id=${field.name}
          name=${field.name}
          .value=${field.value}
          @change=${(e: Event) => {
            this.value = (e.target as HTMLSelectElement).value;
          }}
        >
          ${options.map((opt) => html`<option value=${opt} ?selected=${opt === field.value}>${opt}</option>`)}
        </select>
      </div>
    `;
  }
}

export function registerSelect(): void {
  if (!customElements.get('ui9000-select')) {
    customElements.define('ui9000-select', Ui9000Select);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-select': Ui9000Select;
  }
}
