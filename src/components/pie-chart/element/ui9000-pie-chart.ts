import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { WidgetScale } from '../../../types/index.js';
import { getPieDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { swatchLegendEntries } from '../../../utils/chart-legend.js';
import { formatPiePercent } from '../lib/format.js';
import {
  legendSlicesFromPieOrder,
  normalizePieData,
  type PieChartData,
  type PieModel,
  type PieSlice,
} from '../lib/index.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import { renderPieChart } from '../render/draw.js';
import { pieChartStyles } from './styles.js';

@customElement('ui9000-pie-chart')
export class Ui9000PieChart extends Ui9000ChartElement {
  static override styles = [pieChartStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _empty = false;

  @state()
  private _legendSlices: PieSlice[] = [];

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

  private parseData(): PieModel {
    const raw = parseJsonAttr<PieChartData>(this.dataJson, null);
    return this.withSeriesMode(() => normalizePieData(raw));
  }

  private renderLegend() {
    if (!this.showLegend || !this._legendSlices.length) return nothing;
    const theme = readThemeFromElement(this);
    return renderChartLegend(
      swatchLegendEntries(
        this._legendSlices.map((slice) => `${formatPiePercent(slice.percentage)}% - ${slice.label}`),
        theme,
        (_label, index) => this._legendSlices[index]?.color ?? theme.primary,
      ),
    );
  }

  protected override onThemeChange(): void {
    this.scheduleDraw();
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._empty = model.slices.length === 0;
    if (this._empty) {
      root.replaceChildren();
      this._legendSlices = [];
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height } = getPieDimensions(root);

    renderPieChart(root, {
      slices: model.slices,
      width,
      height,
      theme,
      themeMode: this.themeMode(),
      innerRadius: 0,
      showTooltip: this.showTooltip,
      onLayout: (orderedKeys) => {
        this._legendSlices = legendSlicesFromPieOrder(model, orderedKeys);
      },
      onHover: this.showTooltip
        ? ({ slice, event }) => {
            const xField = model.xField ?? 'Category';
            const yField = model.yField ?? 'Value';
            const xAxeLabel = model.axisDetails?.[xField]?.label ?? xField;
            const yAxeLabel = model.axisDetails?.[yField]?.label ?? yField;
            const symbol = model.axisDetails?.[yField]?.measure_unit_symbol ?? '';
            const valueText = symbol
              ? `${slice.value.toLocaleString()} ${symbol}`.trim()
              : slice.value.toLocaleString();
            this.openTooltip(event, {
              rows: [
                { label: xAxeLabel, value: slice.label },
                {
                  label: yAxeLabel,
                  value: `${valueText} (${formatPiePercent(slice.percentage)}%)`,
                },
              ],
            });
          }
        : undefined,
      onLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
          ${this.renderLegend()}
          ${this._empty
            ? html`<div class="empty" part="empty">No data</div>`
            : nothing}
          ${this.renderShellLabelTooltip()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-pie-chart': Ui9000PieChart;
  }
}

export function registerPieChart(): void {
  if (!customElements.get('ui9000-pie-chart')) {
    customElements.define('ui9000-pie-chart', Ui9000PieChart);
  }
}

registerPieChart();
