import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { DataPoint, WidgetScale } from '../../../types/index.js';
import { getSparkLineDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { lineLegendEntries } from '../../../utils/chart-legend.js';
import {
  isFuseWidgetPayload,
  xDomainHintFromWidget,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  formatCompact,
  normalizeSparkLineData,
  type SparkLineChartData,
  type SparkLineSeries,
} from '../lib/index.js';
import { renderSparkLineChart } from '../render/draw.js';
import { sparkLineChartStyles } from './styles.js';

@customElement('ui9000-spark-line-chart')
export class Ui9000SparkLineChart extends Ui9000ChartElement {
  static override styles = [sparkLineChartStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: Boolean, attribute: 'show-grid' })
  showGrid = true;

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @property({ type: String, attribute: 'x-label' })
  xLabel = '';

  @property({ type: String, attribute: 'y-label' })
  yLabel = '';

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

  private parseData(): SparkLineSeries[] {
    const raw = parseJsonAttr<DataPoint[] | SparkLineChartData | SparkLineSeries[] | FuseWidgetLike>(
      this.dataJson,
      [],
    );
    return normalizeSparkLineData(raw);
  }

  private xDomainHint(): string[] | undefined {
    const raw = parseJsonAttr<unknown>(this.dataJson, null);
    if (isFuseWidgetPayload(raw)) return xDomainHintFromWidget(raw);
    return undefined;
  }

  private renderLegend(series: SparkLineSeries[]) {
    if (!this.showLegend || series.length <= 1) return nothing;
    const theme = readThemeFromElement(this);
    const entries = lineLegendEntries(series, theme);
    return renderChartLegend(entries);
  }

  protected override onThemeChange(): void {
    this.scheduleDraw();
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const series = this.parseData();
    this._empty = series.length === 0 || series.every((s) => !s.points.length);
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getSparkLineDimensions(root);

    renderSparkLineChart(root, {
      series,
      width,
      height,
      margin,
      theme,
      themeMode: this.themeMode(),
      showGrid: this.showGrid,
      xDomainHint: this.xDomainHint(),
      showTooltip: this.showTooltip,
      xLabel: this.xLabel || undefined,
      yLabel: this.yLabel || undefined,
      ...this.axisLabelHandlers(),
      onHover: this.showTooltip
        ? ({ xLabel, entries, event }) => {
            this.openTooltip(event, {
              title: xLabel,
              rows: entries.map((entry) => ({
                label: entry.seriesName,
                value: formatCompact(entry.value),
              })),
            });
          }
        : undefined,
      onLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const series =
      this._empty ? [] : this.parseData().filter((s) => s.points.length > 0);
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${this.renderLegend(series)}
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
    'ui9000-spark-line-chart': Ui9000SparkLineChart;
  }
}

export function registerSparkLineChart(): void {
  if (!customElements.get('ui9000-spark-line-chart')) {
    customElements.define('ui9000-spark-line-chart', Ui9000SparkLineChart);
  }
}

registerSparkLineChart();
