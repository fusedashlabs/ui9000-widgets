import { html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { loadChart } from '../../../lazy/index.js';
import { normalizeEvidence, type EvidenceModel } from '../lib/normalize.js';

@customElement('ui9000-evidence-panel')
export class Ui9000EvidencePanel extends LitElement {
  static override styles = surfaceStyles;

  @property({ type: String, attribute: 'data' })
  dataJson = '{}';

  @state()
  private _model: EvidenceModel | null = null;

  private async refresh(): Promise<void> {
    this._model = normalizeEvidence(parseJsonAttr<unknown>(this.dataJson, null));
    const pending: Promise<unknown>[] = [];
    if (this._model?.table) pending.push(loadChart('table'));
    if (this._model?.text) pending.push(loadChart('text'));
    if (this._model?.image) pending.push(loadChart('image'));
    await Promise.all(pending);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this.refresh();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) void this.refresh();
  }

  override render() {
    const model = this._model;
    if (!model) {
      return html`<p class="blocked" role="status">Claim required</p>`;
    }
    return html`
      <article class="root" aria-label=${model.claim}>
        <p>
          <strong>${model.claim}</strong>
          ${model.severity ? html`<span class="sev">${model.severity}</span>` : nothing}
        </p>
        <ul class="list">
          ${model.sources.map((source) =>
            source.href
              ? html`<li>
                  <a href=${source.href} target="_blank" rel="noopener noreferrer">${source.label}</a>
                  ${source.excerpt ? html`<span class="muted"> — ${source.excerpt}</span>` : nothing}
                </li>`
              : html`<li>${source.label}${source.excerpt ? html`<span class="muted"> — ${source.excerpt}</span>` : nothing}</li>`,
          )}
        </ul>
        ${model.text
          ? html`<ui9000-text data=${JSON.stringify({ text: model.text })}></ui9000-text>`
          : nothing}
        ${model.table ? html`<ui9000-table data=${JSON.stringify(model.table)}></ui9000-table>` : nothing}
        ${model.image ? html`<ui9000-image data=${JSON.stringify(model.image)}></ui9000-image>` : nothing}
      </article>
    `;
  }
}

export function registerEvidencePanel(): void {
  if (!customElements.get('ui9000-evidence-panel')) {
    customElements.define('ui9000-evidence-panel', Ui9000EvidencePanel);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-evidence-panel': Ui9000EvidencePanel;
  }
}
