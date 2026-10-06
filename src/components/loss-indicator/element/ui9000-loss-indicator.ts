import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { LOSS_COLORS, normalizeLossIndicator, type LossIndicatorModel } from '../lib/index.js';
import { tickCountForWidth, tickFill, tickPaint } from '../render/ticks.js';
import { lossIndicatorStyles } from './styles.js';

const INFO = svg`<svg viewBox="0 0 24 24" width="25" height="25" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"></circle><circle cx="12" cy="8" r="1.15" fill="currentColor"></circle><path d="M12 11.2v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg>`;

const ARROW_DOWN = svg`<svg viewBox="0 0 24 24" width="31" height="31" fill="none" aria-hidden="true"><path d="M12 4.5v13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path><path d="M6.2 12.8 12 18.6l5.8-5.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

const ARROW_UP = svg`<svg viewBox="0 0 24 24" width="31" height="31" fill="none" aria-hidden="true"><path d="M12 19.5v-13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path><path d="M6.2 11.2 12 5.4l5.8 5.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

@customElement('ui9000-loss-indicator')
export class Ui9000LossIndicator extends Ui9000ChartElement {
  static override styles = [chartShellStyles, lossIndicatorStyles];

  @state()
  private _model: LossIndicatorModel = {
    label: '',
    value: 0,
    valueText: '',
    unit: '',
    min: 0,
    max: 0,
    ticks: [],
    bands: [],
    ratio: 0,
    level: 'critical',
    empty: true,
  };

  @state()
  private _tickCount = 53;

  private _resizeObserver?: ResizeObserver;
  private _raf = 0;

  constructor() {
    super();
    this.showHeader = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver === 'undefined') return;
    this._resizeObserver = new ResizeObserver(() => this.scheduleTicks());
    this._resizeObserver.observe(this);
  }

  override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    super.disconnectedCallback();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) {
      this._model = normalizeLossIndicator(parseJsonAttr(this.dataJson, null));
    }
  }

  override updated(): void {
    this.scheduleTicks();
  }

  override render() {
    if (this._model.empty) {
      return html`<div class="panel"><p class="empty">No loss data</p></div>`;
    }

    const { label, valueText, trend, level, ratio, ticks, bands, value } = this._model;
    const active = bands.find((band) => value >= band.from && value <= band.to);
    const trendColor = active?.color ?? LOSS_COLORS[level];
    const paints = Array.from({ length: this._tickCount }, (_, index) =>
      tickPaint(index, this._tickCount, ratio, this._model.min, this._model.max, this._model.bands),
    );

    return html`
      <article class="panel" aria-label=${label || valueText}>
        <div class="title-row">
          <span class="info">${INFO}</span>
          ${label ? html`<h2 class="label">${label}</h2>` : nothing}
        </div>
        <div class="value-row">
          ${trend
            ? html`
                <span class="trend" data-trend=${trend} style="color:${trendColor}" aria-label=${trend === 'down' ? 'Down' : 'Up'}>
                  ${trend === 'down' ? ARROW_DOWN : ARROW_UP}
                </span>
              `
            : nothing}
          <p class="value">${valueText}</p>
        </div>
        <div class="scale">
          <div class="ticks">
            ${paints.map(
              (paint, index) => html`<span class="tick" data-paint=${paint} style="background:${tickFill(index, this._tickCount, ratio, this._model.min, this._model.max, this._model.bands)}"></span>`,
            )}
          </div>
          <div class="marker" style="left:${ratio * 100}%" aria-hidden="true">
            <span class="marker-stem"></span>
            <span class="marker-head"></span>
          </div>
        </div>
        <div class="axis">
          ${ticks.map((tick, index) => {
            const edge = index === 0 ? 'start' : index === ticks.length - 1 ? 'end' : 'mid';
            const place = edge === 'mid' ? `left:${tick.position * 100}%` : '';
            return html`<span class="axis-label" data-edge=${edge} style=${place}>${tick.label}</span>`;
          })}
        </div>
      </article>
    `;
  }

  private scheduleTicks(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => {
      const track = this.renderRoot.querySelector('.ticks');
      const width = track instanceof HTMLElement ? track.clientWidth : this.clientWidth;
      const next = tickCountForWidth(width);
      if (next !== this._tickCount) this._tickCount = next;
    });
  }
}

export function registerLossIndicator(): void {
  if (!customElements.get('ui9000-loss-indicator')) {
    customElements.define('ui9000-loss-indicator', Ui9000LossIndicator);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-loss-indicator': Ui9000LossIndicator;
  }
}
