import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseLabelledField } from '../../../lib/labelled-control.js';

@customElement('ui9000-text-input')
export class Ui9000TextInput extends LitElement {
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
    return html`
      <div class="root">
        <label for=${field.name}>${field.label}</label>
        <input
          class="field"
          id=${field.name}
          name=${field.name}
          .value=${field.value}
          @input=${(e: Event) => {
            this.value = (e.target as HTMLInputElement).value;
          }}
        />
      </div>
    `;
  }
}

export function registerTextInput(): void {
  if (!customElements.get('ui9000-text-input')) {
    customElements.define('ui9000-text-input', Ui9000TextInput);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-text-input': Ui9000TextInput;
  }
}
