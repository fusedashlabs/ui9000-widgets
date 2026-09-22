import { html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizeTrace } from '../lib/normalize.js';
import type { InspectorModel, NormalizedTrace } from '../lib/types.js';
import { inspectorStyles } from './styles.js';

const NOT_RECORDED = 'not recorded';

/**
 * Renders one frozen decision trace (`trace.v2.json`). Props only: the trace
 * arrives as JSON on the `trace` attribute, nothing is fetched, and every value
 * is bound as a Lit text node — no `innerHTML`. Traces carrying dataset rows are
 * refused rather than rendered.
 */
@customElement('ui9000-inspector')
export class Ui9000Inspector extends LitElement {
  static override styles = [surfaceStyles, inspectorStyles];

  @property({ type: String, attribute: 'trace' })
  traceJson = '{}';

  /** Overrides the panel's accessible name. */
  @property({ type: String, attribute: 'panel-label' })
  panelLabel = '';

  @state()
  private _result: NormalizedTrace = { ok: false, blocked: 'Trace required' };

  private refresh(): void {
    this._result = normalizeTrace(parseJsonAttr<unknown>(this.traceJson, null));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.refresh();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('traceJson')) this.refresh();
  }

  override render() {
    const result = this._result;
    if (!result.ok) {
      return html`<p class="blocked" role="status">${result.blocked}</p>`;
    }
    const model = result.model;
    return html`
      <section class="root" role="region" aria-label=${this.panelName(model)}>
        <div class="head">
          <h2>Decision trace</h2>
          <dl>
            <dt>Objective</dt>
            <dd>${model.objective}</dd>
            <dt>Winner</dt>
            <dd>
              ${model.winner
                ? html`<span class="badge" data-kind="winner">${model.winner}</span>`
                : html`<span class="muted">${NOT_RECORDED}</span>`}
            </dd>
            <dt>Risk band</dt>
            <dd>
              ${model.riskBand
                ? html`<span class="badge" data-band=${model.riskBand}>${model.riskBand}</span>`
                : model.unrecognizedRiskBand
                  ? html`<span class="muted">${model.unrecognizedRiskBand} (unrecognized)</span>`
                  : html`<span class="muted">${NOT_RECORDED}</span>`}
            </dd>
            <dt>Outcome</dt>
            <dd>${model.outcome ?? html`<span class="muted">${NOT_RECORDED}</span>`}</dd>
          </dl>
        </div>

        <section class="profile">
          <h3>Profile</h3>
          ${model.profile.length === 0
            ? html`<p class="muted">No profile keys recorded</p>`
            : html`<dl>
                ${model.profile.map(
                  (entry) => html`<dt>${entry.key}</dt><dd>${entry.value}</dd>`,
                )}
              </dl>`}
        </section>

        <section class="candidates">
          <h3>Candidates</h3>
          ${model.candidates.length === 0
            ? html`<p class="muted">No candidates recorded</p>`
            : html`<ul class="list">
                ${model.candidates.map(
                  (candidate) => html`
                    <li>
                      <div class="row-head">
                        <span class="id">${candidate.id}</span>
                        <span class="score">score ${candidate.score}</span>
                      </div>
                      ${candidate.reasons.length === 0
                        ? nothing
                        : html`<ul class="reasons">
                            ${candidate.reasons.map((reason) => html`<li>${reason}</li>`)}
                          </ul>`}
                    </li>
                  `,
                )}
              </ul>`}
          ${model.tieBreak ? html`<p class="muted">Tie-break: ${model.tieBreak}</p>` : nothing}
        </section>

        <section class="rejections">
          <h3>Rejections</h3>
          ${model.rejections.length === 0
            ? html`<p class="muted">No rejections recorded</p>`
            : html`<ul class="list">
                ${model.rejections.map(
                  (rejection) => html`
                    <li>
                      <div class="row-head">
                        <span class="id">${rejection.id}</span>
                      </div>
                      <span class="muted">${rejection.reason}</span>
                    </li>
                  `,
                )}
              </ul>`}
        </section>

        <section class="actions-section">
          <h3>Actions</h3>
          ${model.actions.length === 0
            ? html`<p class="muted">No actions recorded</p>`
            : html`<div class="chips">
                ${model.actions.map((action) => html`<span class="badge">${action}</span>`)}
              </div>`}
        </section>
      </section>
    `;
  }

  private panelName(model: InspectorModel): string {
    const label = this.panelLabel.trim();
    return label || `Decision trace — ${model.objective}`;
  }
}

export function registerInspector(): void {
  if (!customElements.get('ui9000-inspector')) {
    customElements.define('ui9000-inspector', Ui9000Inspector);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-inspector': Ui9000Inspector;
  }
}
