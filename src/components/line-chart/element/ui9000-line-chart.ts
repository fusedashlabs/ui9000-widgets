import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import {
  renderChartLegend,
} from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { DataPoint, WidgetScale } from '../../../types/index.js';
import { getLineChartDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import {
  isFuseWidgetPayload,
  xDomainHintFromWidget,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import { lineLegendEntries } from '../../../utils/chart-legend.js';
import type { MarkerShape } from '../../../utils/fusedash-visual.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  normalizeLineData,
  type LineChartData,
  type LineCurve,
  type LineSeries,
} from '../lib/index.js';
import { renderLineChart } from '../render/draw.js';
import { lineChartStyles } from './styles.js';

@customElement('ui9000-line-chart')
export class Ui9000LineChart extends Ui9000ChartElement {
  static override styles = [lineChartStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: String })
  curve: LineCurve = 'linear';

  @property({ type: String })
  marker: MarkerShape = 'donut';

  @property({ type: Boolean, attribute: 'show-points' })
  showPoints = true;

  @property({ type: Boolean, attribute: 'show-area' })
  showArea = false;

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

  private parseData(): LineSeries[] {
    const raw = parseJsonAttr<DataPoint[] | LineChartData | LineSeries[] | FuseWidgetLike>(
      this.dataJson,
      [],
    );
    return normalizeLineData(raw);
  }

  private xDomainHint(): string[] | undefined {
    const raw = parseJsonAttr<unknown>(this.dataJson, null);
    if (isFuseWidgetPayload(raw)) return xDomainHintFromWidget(raw);
    return undefined;
  }

  private renderLegend(series: LineSeries[]) {
    if (!this.showLegend || series.length <= 1) return nothing;
    const theme = readThemeFromElement(this);
    return renderChartLegend(lineLegendEntries(series, theme));
  }

  protected override onThemeChange(): void {
    this.scheduleDraw();
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const series = this.parseData();
    this._empty = series.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getLineChartDimensions(root);

    renderLineChart(root, {
      series,
      width,
      height,
      margin,
      theme,
      themeMode: this.themeMode(),
      curve: this.curve,
      marker: this.marker,
      showPoints: this.showPoints,
      showArea: this.showArea,
      showGrid: this.showGrid,
      xDomainHint: this.xDomainHint(),
      xLabel: this.xLabel || undefined,
      yLabel: this.yLabel || undefined,
      ...this.axisLabelHandlers(),
      onPointHover: this.showTooltip
        ? ({ seriesName, point, event }) => {
            this.openTooltip(event, {
              title: seriesName,
              rows: [{ label: String(point.x), value: String(point.y) }],
            });
          }
        : undefined,
      onPointLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const series = this._empty ? [] : this.parseData();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${this.renderLegend(series)}
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
    'ui9000-line-chart': Ui9000LineChart;
  }
}

export function registerLineChart(): void {
  if (!customElements.get('ui9000-line-chart')) {
    customElements.define('ui9000-line-chart', Ui9000LineChart);
  }
}

registerLineChart();
