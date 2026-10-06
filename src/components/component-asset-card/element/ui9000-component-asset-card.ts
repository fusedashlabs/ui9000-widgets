import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readCssVar } from '../../../context/widget-context.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import {
  normalizeComponentAsset,
  type ComponentAssetDelta,
  type ComponentAssetModel,
} from '../lib/index.js';
import { drawTrend } from '../render/index.js';
import { componentAssetStyles } from './styles.js';

const ARROW = svg`<svg class="arrow" viewBox="0 0 7 9" fill="none" aria-hidden="true">
  <path d="M3.5 8.4V1.2M0.9 3.8 3.5 1.2l2.6 2.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`;

const DIRECTION_TEXT: Record<ComponentAssetDelta['direction'], string> = {
  up: 'Up',
  down: 'Down',
  flat: 'No change',
};

let nextTrendId = 0;

/**
 * Component-asset card (Optivion OPT-4, Figma 34:23967): asset image, name and
 * id, one primary metric, an optional delta and an optional short trend. The
 * status mark shows only when the metric has a level or thresholds.
 */
@customElement('ui9000-component-asset-card')
export class Ui9000ComponentAssetCard extends Ui9000ChartElement {
  static override styles = [chartShellStyles, componentAssetStyles];

  /** `light` or `dark`. Empty follows `--ui9000-mode` and the host `data-theme`. */
  @property({ type: String, reflect: true })
  theme = '';

  @state()
  private _model: ComponentAssetModel = normalizeComponentAsset(null);

  @state()
  private _mode: 'light' | 'dark' = 'light';

  /** Set when the image fails to load, so the column collapses. */
  @state()
  private _imageFailed = false;

  private readonly _trendId = `ui9000-component-asset-${++nextTrendId}`;

  constructor() {
    super();
    this.showHeader = false;
  }

  override willUpdate(changed: PropertyValues): void {
    this.syncMode();
    if (changed.has('dataJson')) {
      this._model = normalizeComponentAsset(parseJsonAttr(this.dataJson, null));
      this._imageFailed = false;
    }
  }

  override updated(changed: PropertyValues): void {
    if (!changed.has('_model')) return;
    const root = this.renderRoot.querySelector('.trend');
    if (root instanceof HTMLElement && this._model.trend) {
      drawTrend(root, this._model.trend, this._trendId);
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

  private readonly onImageError = (): void => {
    this._imageFailed = true;
  };

  override render() {
    const { assetId, metric, delta, trend, empty } = this._model;
    const title = this.chartTitle.trim() || this._model.title;
    const image = this._imageFailed ? null : this._model.image;
    if (empty) {
      return html`<div class="card"><p class="empty">No component data</p></div>`;
    }

    return html`
      <section class="card" aria-label=${title || assetId}>
        <div class="surface ${image ? '' : 'no-asset'}">
          ${image
            ? html`<div class="asset">
                <img src=${image.src} alt=${image.alt} decoding="async" @error=${this.onImageError} />
              </div>`
            : nothing}
          <div class="main">
            ${title || assetId || metric?.status
              ? html`
                  <header class="head">
                    ${title ? html`<h2 class="title" title=${title}>${title}</h2>` : nothing}
                    ${assetId || metric?.status
                      ? html`<span class="badge">
                          ${metric?.status
                            ? html`<span class="status ${metric.status.level}" title=${metric.status.label}></span>
                                <span class="sr-only">Status: ${metric.status.label}</span>`
                            : nothing}
                          ${assetId ? html`<span class="badge-id">${assetId}</span>` : nothing}
                        </span>`
                      : nothing}
                  </header>
                `
              : nothing}
            ${metric
              ? html`
                  <div class="body">
                    <div class="reading">
                      ${metric.label ? html`<p class="label">${metric.label}</p>` : nothing}
                      <p class="value">${metric.display}</p>
                      ${delta ? this.renderDelta(delta) : nothing}
                    </div>
                    ${trend ? html`<span class="trend" aria-hidden="true"></span>` : nothing}
                  </div>
                `
              : nothing}
          </div>
        </div>
      </section>
    `;
  }

  private renderDelta(delta: ComponentAssetDelta) {
    return html`
      <p class="delta ${delta.tone} ${delta.direction}">
        <span class="delta-change">
          ${delta.direction === 'flat' ? nothing : ARROW}
          <span class="sr-only">${DIRECTION_TEXT[delta.direction]}</span>
          <span class="delta-value">${delta.display}</span>
        </span>
        ${delta.label ? html`<span class="delta-label">${delta.label}</span>` : nothing}
      </p>
    `;
  }
}

export function registerComponentAssetCard(): void {
  if (!customElements.get('ui9000-component-asset-card')) {
    customElements.define('ui9000-component-asset-card', Ui9000ComponentAssetCard);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-component-asset-card': Ui9000ComponentAssetCard;
  }
}
