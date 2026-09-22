import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import type { WidgetScale } from '../../../types/index.js';
import { getPolarAreaDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { swatchLegendEntries } from '../../../utils/chart-legend.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  normalizePolarAreaData,
  type PolarAreaChartData,
  type PolarAreaModel,
} from '../lib/index.js';
import { renderPolarAreaChart } from '../render/draw.js';
import { polarAreaChartStyles } from './styles.js';

const EMPTY_MODEL: PolarAreaModel = {
  sectors: [],
  categories: [],
  legend: [],
  maxValue: 0,
};

@customElement('ui9000-polar-area-chart')
export class Ui9000PolarAreaChart extends Ui9000ChartElement {
  static override styles = [polarAreaChartStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: Boolean, attribute: 'show-grid' })
  showGrid = true;

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

  private parseData(): PolarAreaModel {
    return normalizePolarAreaData(parseJsonAttr<PolarAreaChartData>(this.dataJson, null));
  }

  private renderLegend(model: PolarAreaModel) {
    if (!this.showLegend || !model.legend.length) return nothing;
    const theme = readThemeFromElement(this);
    return renderChartLegend(
      swatchLegendEntries(
        model.legend.map((entry) => entry.label),
        theme,
        (_label, index) => model.legend[index].color,
      ),
    );
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._empty = model.sectors.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getPolarAreaDimensions(root, this.scale);

    renderPolarAreaChart(root, {
      model,
      width,
      height,
      margin,
      theme,
      showGrid: this.showGrid,
      showTooltip: this.showTooltip,
      ...this.axisLabelHandlers(),
      onHover: this.showTooltip
        ? ({ sector, event }) => {
            const xField = model.xField ?? 'Category';
            const yField = model.yField ?? 'Value';
            const symbol = model.axisDetails?.[yField]?.measure_unit_symbol ?? '';
            const value = sector.value.toLocaleString();
            const categoryText = sector.group
              ? `${sector.label} · ${sector.group}`
              : sector.label;
            this.openTooltip(event, {
              rows: [
                {
                  label: model.axisDetails?.[xField]?.label ?? xField,
                  value: categoryText,
                },
                {
                  label: model.axisDetails?.[yField]?.label ?? yField,
                  value: symbol ? `${value} ${symbol}` : value,
                },
              ],
            });
          }
        : undefined,
      onLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const model = this._empty ? EMPTY_MODEL : this.parseData();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(this.headerTitle())}
        <div class="widget-body">
          ${this.renderLegend(model)}
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
    'ui9000-polar-area-chart': Ui9000PolarAreaChart;
  }
}

export function registerPolarAreaChart(): void {
  if (!customElements.get('ui9000-polar-area-chart')) {
    customElements.define('ui9000-polar-area-chart', Ui9000PolarAreaChart);
  }
}

registerPolarAreaChart();
