import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readCssVar } from '../../../context/widget-context.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizeIncidentsReview, type IncidentsReviewModel } from '../lib/index.js';
import { renderColumns, renderFilter } from '../render/index.js';
import { incidentsReviewStyles } from './styles.js';

/**
 * Incidents review card (Optivion OPT-5, Figma 34:24312): a title, an optional
 * filter, aggregated counts by state, an optional total, and one lifecycle
 * track under the numbers. The counts are headlines and are never summed.
 */
@customElement('ui9000-incidents-review-card')
export class Ui9000IncidentsReviewCard extends Ui9000ChartElement {
  static override styles = [chartShellStyles, incidentsReviewStyles];

  /** `light` or `dark`. Empty follows `--ui9000-mode` and the host `data-theme`. */
  @property({ type: String, reflect: true })
  theme = '';

  @state()
  private _model: IncidentsReviewModel = normalizeIncidentsReview(null);

  @state()
  private _mode: 'light' | 'dark' = 'light';

  constructor() {
    super();
    this.showHeader = false;
  }

  override willUpdate(changed: PropertyValues): void {
    this.syncMode();
    if (changed.has('dataJson')) {
      this._model = normalizeIncidentsReview(parseJsonAttr(this.dataJson, null));
    }
  }

  private syncMode(): void {
    const explicit = this.theme === 'dark' || this.theme === 'light' ? this.theme : '';
    const fromHost = this.closest('[data-theme="dark"]') ? 'dark' : '';
    const fromVar = readCssVar(this, '--ui9000-mode', 'light') === 'dark' ? 'dark' : 'light';
    const next = (explicit || fromHost || fromVar) === 'dark' ? 'dark' : 'light';
    if (this.getAttribute('data-mode') !== next) this.setAttribute('data-mode', next);
    if (this._mode !== next) this._mode = next;
  }

  override render() {
    const { filter, empty } = this._model;
    const title = this.chartTitle.trim() || this._model.title;
    if (empty) {
      return html`<div class="card"><p class="empty">No incident data</p></div>`;
    }

    return html`
      <section class="card" aria-label=${title || 'Incidents'}>
        <div class="surface">
          ${title || filter
            ? html`<header class="head">
                ${title ? html`<h2 class="title" title=${title}>${title}</h2>` : nothing}
                ${filter ? renderFilter(filter) : nothing}
              </header>`
            : nothing}
          ${renderColumns(this._model)}
        </div>
      </section>
    `;
  }
}

export function registerIncidentsReviewCard(): void {
  if (!customElements.get('ui9000-incidents-review-card')) {
    customElements.define('ui9000-incidents-review-card', Ui9000IncidentsReviewCard);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-incidents-review-card': Ui9000IncidentsReviewCard;
  }
}
