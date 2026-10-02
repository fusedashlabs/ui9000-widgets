import { html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { surfaceStyles } from '../../../element/surface-styles.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizeTrace } from '../lib/normalize.js';
import type { InspectorModel, NormalizedTrace, TraceChooser } from '../lib/types.js';
import { inspectorStyles } from './styles.js';

const WHO: Record<TraceChooser, string> = {
  jev: 'Chosen by Jev',
  engine: 'Chosen by the engine',
  named: 'You asked for this',
};

const SHOWN_IDS = 8;

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

  @state()
  private open = false;

  private refresh(): void {
    this._result = normalizeTrace(parseJsonAttr<unknown>(this.traceJson, null));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.refresh();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('traceJson')) {
      this.refresh();
      this.open = false;
    }
  }

  private toggleOpen(): void {
    this.open = !this.open;
  }

  override render() {
    const result = this._result;
    if (!result.ok) {
      return html`<p class="blocked" role="status">${result.blocked}</p>`;
    }
    const model = result.model;
    const chosen = model.chosen;
    const others = model.candidates.filter((candidate) => candidate.id !== chosen?.id);
    const topScore = Math.max(1, ...model.candidates.map((candidate) => candidate.score));
    const marks = model.profile.filter((entry) => entry.value === 'yes' || (entry.value !== 'no' && entry.value !== '0'));
    return html`
      <section class="root" role="region" aria-label=${this.panelName(model)}>
        <header class="choice">
          <div class="choice-top">
            ${chosen
              ? html`<span class="who" data-by=${chosen.by}>${WHO[chosen.by]}</span>`
              : nothing}
            <span class="objective">${model.objective}</span>
            ${model.outcome ? html`<span class="outcome">${model.outcome}</span>` : nothing}
            <button
              type="button"
              class="toggle"
              aria-expanded=${this.open ? 'true' : 'false'}
              @click=${this.toggleOpen}
            >
              ${this.open ? 'Hide details' : 'Show details'}
            </button>
          </div>
          <h2>${chosen?.id ?? 'No chart recorded'}</h2>
          ${this.open && chosen?.why ? html`<p class="why">${chosen.why}</p>` : nothing}
        </header>

        ${!this.open || others.length === 0
          ? nothing
          : html`<section class="candidates">
              <h3>Also scored</h3>
              <ul class="scores">
                ${others.map(
                  (candidate) => html`
                    <li>
                      <div class="row-head">
                        <span class="id">${candidate.id}</span>
                        <span class="score">${candidate.score}</span>
                      </div>
                      <div class="bar" aria-hidden="true">
                        <span style=${`--share:${Math.round((candidate.score / topScore) * 100)}%`}></span>
                      </div>
                      ${candidate.reasons[0]
                        ? html`<p class="reason">${candidate.reasons[0]}</p>`
                        : nothing}
                    </li>
                  `,
                )}
              </ul>
            </section>`}

        ${!this.open || model.rejectionGroups.length === 0
          ? nothing
          : html`<section class="rejections">
              <h3>Ruled out <span class="count">${model.rejections.length}</span></h3>
              <ul class="groups">
                ${model.rejectionGroups.map(
                  (group) => html`
                    <li>
                      <p class="reason">${group.reason}</p>
                      <div class="chips">
                        ${group.ids.slice(0, SHOWN_IDS).map((id) => html`<span class="pill">${id}</span>`)}
                        ${group.ids.length > SHOWN_IDS
                          ? html`<span class="pill more">+${group.ids.length - SHOWN_IDS}</span>`
                          : nothing}
                      </div>
                    </li>
                  `,
                )}
              </ul>
            </section>`}

        ${!this.open ||
        (marks.length === 0 &&
          model.actions.length === 0 &&
          model.risks.length === 0 &&
          !model.riskBand &&
          !model.unrecognizedRiskBand)
          ? nothing
          : html`<footer class="facts">
              ${marks.map((entry) => html`<span class="pill">${entry.key} ${entry.value}</span>`)}
              ${model.risks.map(
                (risk) => html`<span class="pill" data-band=${risk.band}>${risk.action} ${risk.band}</span>`,
              )}
              ${model.risks.length === 0 && model.riskBand
                ? html`<span class="pill" data-band=${model.riskBand}>risk ${model.riskBand}</span>`
                : nothing}
              ${model.unrecognizedRiskBand
                ? html`<span class="pill">${model.unrecognizedRiskBand} unrecognized</span>`
                : nothing}
              ${model.actions.map((action) => html`<span class="pill action">${action}</span>`)}
            </footer>`}
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
