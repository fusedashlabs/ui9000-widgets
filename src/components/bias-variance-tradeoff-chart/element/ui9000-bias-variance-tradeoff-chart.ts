import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { getBiasVarianceDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { lineLegendEntries } from '../../../utils/chart-legend.js';
import { formatCapitalizedWords } from '../../../utils/format-text.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  formatTradeoffValue,
  normalizeBiasVarianceData,
  type BiasVarianceChartInput,
  type BiasVarianceHoverEntry,
  type BiasVarianceModel,
} from '../lib/index.js';
import { renderBiasVarianceChart } from '../render/draw.js';
import { biasVarianceHoverStyles, biasVarianceTradeoffChartStyles } from './styles.js';

const EMPTY_MODEL: BiasVarianceModel = { series: [], domainsLimits: [] };

@customElement('ui9000-bias-variance-tradeoff-chart')
export class Ui9000BiasVarianceTradeoffChart extends Ui9000ChartElement {
  static override styles = [
    biasVarianceTradeoffChartStyles,
    biasVarianceHoverStyles,
    chartShellStyles,
  ];

  @property({ type: Boolean, attribute: 'show-grid' })
  showGrid = true;

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _tooltip: {
    x: number;
    y: number;
    xLabel: string;
    entries: BiasVarianceHoverEntry[];
  } | null = null;

  @state()
  private _empty = false;

  private _resizeObserver?: ResizeObserver;
  private _raf = 0;

  override connectedCallback(): void {
    super.connectedCallback();
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

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  private parseData(): BiasVarianceModel {
    const raw = parseJsonAttr<BiasVarianceChartInput>(this.dataJson, null);
    return normalizeBiasVarianceData(raw);
  }

  private renderLegend(model: BiasVarianceModel) {
    if (!this.showLegend || model.series.length <= 1) return nothing;
    const theme = readThemeFromElement(this);
    const labelled = model.series.map((s) => ({
      id: s.id,
      name: formatCapitalizedWords(s.name ?? s.id),
      color: s.color,
    }));
    return renderChartLegend(lineLegendEntries(labelled, theme));
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._empty = model.series.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const { width, height, margin } = getBiasVarianceDimensions(root);

    renderBiasVarianceChart(root, {
      model,
      width,
      height,
      margin,
      theme: readThemeFromElement(this),
      showGrid: this.showGrid,
      showTooltip: this.showTooltip,
      onHover: this.showTooltip
        ? ({ x, entries, event }) => {
            const rect = this.getBoundingClientRect();
            this._tooltip = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              xLabel: formatTradeoffValue(x),
              entries,
            };
          }
        : undefined,
      onLeave: this.showTooltip
        ? () => {
            this._tooltip = null;
          }
        : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const model = this._empty ? EMPTY_MODEL : this.parseData();
    const yField = model.yField;
    const unit = yField ? model.axisDetails?.[yField]?.measure_unit_symbol : undefined;

    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${this.renderLegend(model)}
          <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
          ${this._empty ? html`<div class="empty" part="empty">No data</div>` : nothing}
          ${this._tooltip
            ? html`<div
                class="tooltip"
                part="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                <div class="x">${this._tooltip.xLabel}</div>
                ${this._tooltip.entries.map(
                  (entry) => html`<div class="row ${entry.focused ? 'focused' : 'dimmed'}">
                    <span class="swatch" style="background:${entry.color}"></span>
                    <span>${formatCapitalizedWords(entry.seriesName)}</span>
                    <span class="value"
                      >${formatTradeoffValue(entry.value)}${unit ? ` ${unit}` : ''}</span
                    >
                  </div>`,
                )}
              </div>`
            : nothing}
          ${this.renderShellLabelTooltip()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-bias-variance-tradeoff-chart': Ui9000BiasVarianceTradeoffChart;
  }
}

export function registerBiasVarianceTradeoffChart(): void {
  if (!customElements.get('ui9000-bias-variance-tradeoff-chart')) {
    customElements.define(
      'ui9000-bias-variance-tradeoff-chart',
      Ui9000BiasVarianceTradeoffChart,
    );
  }
}

registerBiasVarianceTradeoffChart();
