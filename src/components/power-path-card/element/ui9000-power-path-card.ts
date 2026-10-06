import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readCssVar } from '../../../context/widget-context.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { normalizePowerPath, type PowerPathMetric, type PowerPathModel } from '../lib/index.js';
import { drawHealthLine } from '../render/index.js';
import { ALERT_ICON, ANTENNA_ICON, BOLT_ICON } from './icons.js';
import { powerPathStyles } from './styles.js';

let nextGradientId = 0;

/**
 * Power-path card (Optivion OPT-3, Figma 34:23675): title and asset badge,
 * an existing health score with a compact line, a fault banner only while a
 * fault is active, and one row per monitored parameter.
 */
@customElement('ui9000-power-path-card')
export class Ui9000PowerPathCard extends Ui9000ChartElement {
  static override styles = [chartShellStyles, powerPathStyles];

  /** `light` or `dark`. Empty follows `--ui9000-mode` and the host `data-theme`. */
  @property({ type: String, reflect: true })
  theme = '';

  @state()
  private _model: PowerPathModel = normalizePowerPath(null);

  @state()
  private _mode: 'light' | 'dark' = 'light';

  private readonly _gradientId = `ui9000-power-path-${++nextGradientId}`;

  constructor() {
    super();
    this.showHeader = false;
  }

  override willUpdate(changed: PropertyValues): void {
    this.syncMode();
    if (changed.has('dataJson')) {
      this._model = normalizePowerPath(parseJsonAttr(this.dataJson, null));
    }
  }

  override updated(changed: PropertyValues): void {
    if (!changed.has('_model')) return;
    const root = this.renderRoot.querySelector('.spark');
    if (root instanceof HTMLElement && this._model.health) {
      drawHealthLine(root, this._model.health.points, this._gradientId);
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
    const { badge, health, fault, metrics, empty } = this._model;
    const title = this.chartTitle.trim() || this._model.title;
    if (empty) {
      return html`<div class="card" data-mode=${this._mode}><p class="empty">No power path data</p></div>`;
    }

    return html`
      <section class="card" data-mode=${this._mode} aria-label=${title || nothing}>
        ${title || badge
          ? html`
              <header class="head">
                ${title ? html`<h2 class="title">${title}</h2>` : nothing}
                ${badge ? html`<span class="badge">${ANTENNA_ICON}<span>${badge}</span></span>` : nothing}
              </header>
            `
          : nothing}
        ${health
          ? html`
              <div class="health ${health.level}">
                <span class="health-label">${BOLT_ICON}<span>${health.label}</span></span>
                ${health.points.length >= 2 ? html`<span class="spark"></span>` : nothing}
                <span class="score">${health.display}</span>
              </div>
            `
          : nothing}
        ${fault
          ? html`
              <div class="fault ${fault.level}" role="status" title=${fault.text}>
                ${ALERT_ICON}<span class="fault-text">${fault.text}</span>
              </div>
            `
          : nothing}
        ${metrics.length
          ? html`<ul class="rows">${metrics.map((metric) => this.renderRow(metric))}</ul>`
          : nothing}
      </section>
    `;
  }

  private renderRow(metric: PowerPathMetric) {
    return html`
      <li class="row">
        <span class="label" title=${metric.label}>${metric.label}</span>
        <span class="value">${metric.display}</span>
        ${metric.status
          ? html`<span class="status ${metric.status.level}"><span class="dot"></span>${metric.status.label}</span>`
          : html`<span class="status"></span>`}
      </li>
    `;
  }
}

export function registerPowerPathCard(): void {
  if (!customElements.get('ui9000-power-path-card')) {
    customElements.define('ui9000-power-path-card', Ui9000PowerPathCard);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-power-path-card': Ui9000PowerPathCard;
  }
}
