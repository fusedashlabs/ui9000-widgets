import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import { normalizeBandUtilization, type BandModel } from '../lib/index.js';
import { renderBandUtilization } from '../render/draw.js';
import { bandUtilizationStyles } from './styles.js';

const EMPTY_MODEL: BandModel = {
  title: '',
  unit: '',
  legend: true,
  tooltip: true,
  series: [],
  rows: [],
  empty: true,
};

@customElement('ui9000-band-utilization-chart')
export class Ui9000BandUtilizationChart extends Ui9000ChartElement {
  static override styles = [bandUtilizationStyles, chartShellStyles];

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _empty = false;

  private _resizeObserver?: ResizeObserver;
  private _raf = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver === 'undefined') return;
    this._resizeObserver = new ResizeObserver(() => this.scheduleDraw());
    this._resizeObserver.observe(this);
  }

  override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    super.disconnectedCallback();
  }

  override updated(changed: PropertyValues): void {
    if (chartPropsChanged(changed)) this.scheduleDraw();
  }

  override firstUpdated(): void {
    const root = this.shadowRoot?.querySelector('.chart-root');
    if (root instanceof HTMLElement) this._resizeObserver?.observe(root);
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  private model(): BandModel {
    const raw = parseJsonAttr<unknown>(this.dataJson, null);
    return this.withSeriesMode(() => normalizeBandUtilization(raw));
  }

  protected override onThemeChange(): void {
    this.scheduleDraw();
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.model();
    this._empty = model.empty;
    if (model.empty) {
      root.replaceChildren();
      return;
    }

    const width = root.clientWidth || 0;
    if (width < 2) return;

    renderBandUtilization(root, {
      model,
      width,
      theme: readThemeFromElement(this),
      themeMode: this.themeMode(),
      showTooltip: this.showTooltip && model.tooltip,
      onHover:
        this.showTooltip && model.tooltip
          ? ({ row, series, text, event }) => {
              this.openTooltip(event, {
                title: row,
                rows: [{ label: series, value: text }],
              });
            }
          : undefined,
      onLeave:
        this.showTooltip && model.tooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const model = this._empty ? EMPTY_MODEL : this.model();
    const title = this.headerTitle();
    const unit = model.unit;
    const legend =
      this.showLegend && model.legend && model.series.length
        ? renderChartLegend(
            model.series.map((item) => ({
              label: item.name,
              swatch: { kind: 'swatch' as const, color: item.color },
            })),
          )
        : nothing;

    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${legend !== nothing || unit
            ? html`<div class="band-head">
                ${legend}
                ${unit ? html`<span class="band-unit">${unit}</span>` : nothing}
              </div>`
            : nothing}
          <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
          ${this._empty ? html`<div class="empty" part="empty">No data</div>` : nothing}
          ${this.renderShellLabelTooltip()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-band-utilization-chart': Ui9000BandUtilizationChart;
  }
}

export function registerBandUtilizationChart(): void {
  if (!customElements.get('ui9000-band-utilization-chart')) {
    customElements.define('ui9000-band-utilization-chart', Ui9000BandUtilizationChart);
  }
}

registerBandUtilizationChart();
