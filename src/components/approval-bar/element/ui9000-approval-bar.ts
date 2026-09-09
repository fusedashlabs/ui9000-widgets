import { html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { dispatchUi9000Action } from '../../../element/dispatch-ui9000.js';
import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizeApproval, type ApprovalModel } from '../lib/normalize.js';

@customElement('ui9000-approval-bar')
export class Ui9000ApprovalBar extends LitElement {
  static override styles = surfaceStyles;

  @property({ type: String, attribute: 'data' })
  dataJson = '{}';

  @state()
  private _model: ApprovalModel | null = null;

  private refresh(): void {
    this._model = normalizeApproval(parseJsonAttr<unknown>(this.dataJson, null));
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
      return html`<p class="blocked" role="status">Proposal required</p>`;
    }
    return html`
      <div class="root" role="region" aria-label="Approval">
        <p>${model.proposal}</p>
        <p class="muted">Displayed only — this host does not execute the action.</p>
        <p class="muted">Status: ${model.status}</p>
        <div class="actions">
          <button
            class="btn"
            data-kind="approve"
            type="button"
            @click=${() => dispatchUi9000Action(this, { type: 'approve' })}
          >
            Approve
          </button>
          <button
            class="btn"
            type="button"
            @click=${() => dispatchUi9000Action(this, { type: 'reject' })}
          >
            Reject
          </button>
        </div>
      </div>
    `;
  }
}

export function registerApprovalBar(): void {
  if (!customElements.get('ui9000-approval-bar')) {
    customElements.define('ui9000-approval-bar', Ui9000ApprovalBar);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-approval-bar': Ui9000ApprovalBar;
  }
}
