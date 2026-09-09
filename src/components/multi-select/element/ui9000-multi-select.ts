import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseLabelledField } from '../../../lib/labelled-control.js';

@customElement('ui9000-multi-select')
export class Ui9000MultiSelect extends LitElement {
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
    const selected = new Set(field.value.split(',').map((s) => s.trim()).filter(Boolean));
    const options = field.options.length ? field.options : [...selected];
    return html`
      <div class="root">
        <label for=${field.name}>${field.label}</label>
        <select
          class="field"
          id=${field.name}
          name=${field.name}
          multiple
          @change=${(e: Event) => {
            const el = e.target as HTMLSelectElement;
            this.value = [...el.selectedOptions].map((o) => o.value).join(',');
          }}
        >
          ${options.map(
            (opt) => html`<option value=${opt} ?selected=${selected.has(opt)}>${opt}</option>`,
          )}
        </select>
      </div>
    `;
  }
}

export function registerMultiSelect(): void {
  if (!customElements.get('ui9000-multi-select')) {
    customElements.define('ui9000-multi-select', Ui9000MultiSelect);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-multi-select': Ui9000MultiSelect;
  }
}
