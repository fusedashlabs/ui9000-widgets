import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { WidgetScale } from '../../../types/index.js';
import { getAreaChartDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { lineLegendEntries } from '../../../utils/chart-legend.js';
import {
  isFuseWidgetPayload,
  xDomainHintFromWidget,
} from '../../../utils/fuse-widget.js';
import type { MarkerShape } from '../../../utils/fusedash-visual.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  normalizeAreaData,
  type AreaChartInput,
  type AreaModel,
} from '../lib/index.js';
import { renderAreaChart } from '../render/draw.js';
import { areaChartStyles } from './styles.js';

@customElement('ui9000-area-chart')
export class Ui9000AreaChart extends Ui9000ChartElement {
  static override styles = [areaChartStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: String })
  marker: MarkerShape = 'donut';

  @property({ type: Boolean, attribute: 'show-points' })
  showPoints = true;

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

  private parseData(): AreaModel {
    const raw = parseJsonAttr<AreaChartInput>(this.dataJson, null);
    return this.withSeriesMode(() => normalizeAreaData(raw));
  }

  private xDomainHint(): string[] | undefined {
    const raw = parseJsonAttr<unknown>(this.dataJson, null);
    if (isFuseWidgetPayload(raw)) return xDomainHintFromWidget(raw);
    return this.parseData().uniqueValuesHint;
  }

  private renderLegend(model: AreaModel) {
    if (!this.showLegend || model.series.length <= 1) return nothing;
    const theme = readThemeFromElement(this);
    const legendSeries = model.series.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      points: s.points.map((p) => ({ x: p.x, y: p.y1 })),
    }));
    return renderChartLegend(lineLegendEntries(legendSeries, theme));
  }

  protected override onThemeChange(): void {
    this.scheduleDraw();
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

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getAreaChartDimensions(root);

    renderAreaChart(root, {
      model,
      width,
      height,
      margin,
      theme,
      themeMode: this.themeMode(),
      marker: this.marker,
      showPoints: this.showPoints,
      showGrid: this.showGrid,
      xDomainHint: this.xDomainHint(),
      ...this.axisLabelHandlers(),
      onPointHover: this.showTooltip
        ? ({ seriesName, category, value, event }) => {
            const yField = model.yField;
            const symbol = yField
              ? model.axisDetails?.[yField]?.measure_unit_symbol
              : undefined;
            const valueLabel = symbol
              ? `${value.toLocaleString()} ${symbol}`
              : value.toLocaleString();
            this.openTooltip(event, {
              title: seriesName,
              rows: [{ label: category, value: valueLabel }],
            });
          }
        : undefined,
      onPointLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const model = this._empty ? { layout: 'grouped' as const, series: [] } : this.parseData();

    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${this.renderLegend(model)}
          <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
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
    'ui9000-area-chart': Ui9000AreaChart;
  }
}

export function registerAreaChart(): void {
  if (!customElements.get('ui9000-area-chart')) {
    customElements.define('ui9000-area-chart', Ui9000AreaChart);
  }
}

registerAreaChart();
