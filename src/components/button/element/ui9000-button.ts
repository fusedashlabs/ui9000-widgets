import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { dispatchUi9000Action } from '../../../element/dispatch-ui9000.js';
import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseLabelledField } from '../../../lib/labelled-control.js';

@customElement('ui9000-button')
export class Ui9000Button extends LitElement {
  static override styles = surfaceStyles;

  @property({ type: String, attribute: 'data' }) dataJson = '{}';
  @property({ type: String }) label = '';
  @property({ type: String, attribute: 'action-type' }) actionType = 'submit';

  override render() {
    const field = parseLabelledField(this.dataJson, { label: this.label, name: 'button', value: '' });
    if (!field) return html`<p class="blocked" role="alert">Label required</p>`;
    const type = this.actionType.trim() || 'submit';
    return html`
      <button class="btn" type="button" @click=${() => dispatchUi9000Action(this, { type })}>
        ${field.label}
      </button>
    `;
  }
}

export function registerButton(): void {
  if (!customElements.get('ui9000-button')) {
    customElements.define('ui9000-button', Ui9000Button);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-button': Ui9000Button;
  }
}
