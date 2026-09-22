import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readCssVar } from '../../../context/widget-context.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import {
  formatStatusNumber,
  normalizeStatusGauge,
  type StatusGaugeModel,
} from '../lib/index.js';
import { drawStatusGauge } from '../render/draw.js';
import { statusGaugeStyles } from './styles.js';

const CHECK = svg`<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.2 8.2 6.3 11.3 12.8 4.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

let nextGradientId = 0;

@customElement('ui9000-status-gauge-widget')
export class Ui9000StatusGaugeWidget extends Ui9000ChartElement {
  static override styles = [chartShellStyles, statusGaugeStyles];

  /** `light` or `dark`. Empty follows `--ui9000-mode` and the host `data-theme`. */
  @property({ type: String, reflect: true })
  theme = '';

  @state()
  private _model: StatusGaugeModel = {
    title: '',
    subtitle: '',
    gauge: null,
    metrics: [],
    empty: true,
  };

  @state()
  private _columns = 2;

  @state()
  private _mode: 'light' | 'dark' = 'light';

  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  private readonly _gradientId = `ui9000-status-gauge-${++nextGradientId}`;

  constructor() {
    super();
    this.showHeader = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver === 'undefined') return;
    this._resizeObserver = new ResizeObserver(() => this.scheduleLayout());
    this._resizeObserver.observe(this);
  }

  override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    super.disconnectedCallback();
  }

  override willUpdate(changed: PropertyValues): void {
    this.syncMode();
    if (changed.has('dataJson')) {
      this._model = normalizeStatusGauge(parseJsonAttr(this.dataJson, null));
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

  override updated(): void {
    this.drawGauge();
  }

  override render() {
    if (this._model.empty) {
      return html`<div class="panel" data-mode=${this._mode}><p class="empty">No status data</p></div>`;
    }

    const { title, subtitle, gauge, metrics } = this._model;
    return html`
      <div class="panel" data-mode=${this._mode}>
        ${title ? html`<h2 class="title">${title}</h2>` : nothing}
        ${subtitle ? html`<p class="subtitle">${subtitle}</p>` : nothing}
        ${title || subtitle ? html`<div class="rule"></div>` : nothing}
        ${gauge
          ? html`
              <div class="health">
                <span class="health-name">
                  <span class="check">${CHECK}</span>
                  ${gauge.label}
                </span>
                ${gauge.status
                  ? html`<span class="badge ${gauge.level}"><span class="dot"></span>${gauge.status}</span>`
                  : nothing}
              </div>
              <div class="gauge"></div>
            `
          : nothing}
        ${metrics.length
          ? html`
              <div class="metrics" data-cols=${this._columns}>
                ${metrics.map(
                  (metric) => html`
                    <article class="card ${metric.level}">
                      <div class="card-top">
                        <span class="card-label">${metric.label}</span>
                        <span class="dot"></span>
                      </div>
                      <div class="value">
                        ${formatStatusNumber(metric.value)}${metric.unit
                          ? html`<span class="unit">${metric.unit}</span>`
                          : nothing}
                      </div>
                      <div class="bar">
                        <span style="width:${Math.round(metric.ratio * 100)}%"></span>
                      </div>
                    </article>
                  `,
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private scheduleLayout(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => {
      const next = this.clientWidth > 0 && this.clientWidth < 280 ? 1 : 2;
      if (next !== this._columns) {
        this._columns = next;
        this.requestUpdate();
        return;
      }
      this.drawGauge();
    });
  }

  private drawGauge(): void {
    const root = this.renderRoot.querySelector('.gauge');
    if (!(root instanceof HTMLElement) || !this._model.gauge) return;
    drawStatusGauge(root, this._model.gauge, this._gradientId);
  }
}

export function registerStatusGaugeWidget(): void {
  if (!customElements.get('ui9000-status-gauge-widget')) {
    customElements.define('ui9000-status-gauge-widget', Ui9000StatusGaugeWidget);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-status-gauge-widget': Ui9000StatusGaugeWidget;
  }
}
