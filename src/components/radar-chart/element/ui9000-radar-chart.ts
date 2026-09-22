import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { CSS_VARS, readCssVar, readThemeFromElement } from '../../../context/widget-context.js';
import type { WidgetScale } from '../../../types/index.js';
import { getRadarDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { swatchLegendEntries, resolveSeriesLegendColor } from '../../../utils/chart-legend.js';
import type { FuseWidgetLike } from '../../../utils/fuse-widget.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import { formatRadarValue, axisLabel } from '../lib/format.js';
import {
  normalizeRadarData,
  type RadarChartData,
  type RadarModel,
  type RadarSeries,
} from '../lib/index.js';
import { renderRadarChart } from '../render/draw.js';
import { radarChartStyles } from './styles.js';

@customElement('ui9000-radar-chart')
export class Ui9000RadarChart extends Ui9000ChartElement {
  static override styles = [radarChartStyles, chartShellStyles];

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

  private parseData(): RadarModel {
    const raw = parseJsonAttr<
      RadarChartData | FuseWidgetLike | Array<{ label: string; value: number }>
    >(this.dataJson, []);
    return normalizeRadarData(raw);
  }

  private themeMode(): 'light' | 'dark' {
    const mode = readCssVar(this, CSS_VARS.mode, 'light');
    return mode === 'dark' ? 'dark' : 'light';
  }

  private renderLegend(series: RadarSeries[], groupBy?: string) {
    if (!this.showLegend || !groupBy || series.length <= 1) return nothing;
    const theme = readThemeFromElement(this);
    return renderChartLegend(
      swatchLegendEntries(
        series.map((s) => s.name ?? s.id),
        theme,
        (_group, i) => resolveSeriesLegendColor(series[i], i, theme),
      ),
    );
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._empty = model.series.length === 0 || model.categories.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getRadarDimensions(root);
    const xLabel = axisLabel(model.xField, model.axisDetails);
    const yLabel = axisLabel(model.yField, model.axisDetails);

    renderRadarChart(root, {
      series: model.series,
      categories: model.categories,
      width,
      height,
      margin,
      theme,
      themeMode: this.themeMode(),
      showGrid: this.showGrid,
      showTooltip: this.showTooltip,
      onPointHover: this.showTooltip
        ? ({ category, value, event }) => {
            this.openTooltip(event, {
              rows: [
                { label: xLabel, value: category },
                { label: yLabel, value: formatRadarValue(value) },
              ],
            });
          }
        : undefined,
      onPointLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const model = this._empty ? { series: [], categories: [], xField: '', yField: '' } : this.parseData();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${this.renderLegend(model.series, model.groupBy)}
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
    'ui9000-radar-chart': Ui9000RadarChart;
  }
}

export function registerRadarChart(): void {
  if (!customElements.get('ui9000-radar-chart')) {
    customElements.define('ui9000-radar-chart', Ui9000RadarChart);
  }
}

registerRadarChart();
