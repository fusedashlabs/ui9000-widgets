import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { WidgetScale } from '../../../types/index.js';
import { getHistogramDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { swatchLegendEntries } from '../../../utils/chart-legend.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  formatBinRange,
  normalizeHistogramData,
  type HistogramChartData,
  type HistogramModel,
} from '../lib/index.js';
import { renderHistogramChart } from '../render/draw.js';
import { histogramStyles } from './styles.js';

@customElement('ui9000-histogram-chart')
export class Ui9000HistogramChart extends Ui9000ChartElement {
  static override styles = [histogramStyles, chartShellStyles];

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
  private _tooltip: {
    x: number;
    y: number;
    group: string;
    range: string;
    count: number;
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

  private parseData(): HistogramModel {
    const raw = parseJsonAttr<HistogramChartData>(this.dataJson, []);
    return normalizeHistogramData(raw);
  }

  private renderLegend(model: HistogramModel) {
    if (!this.showLegend || model.groups.length <= 1) return nothing;
    const theme = readThemeFromElement(this);
    return renderChartLegend(swatchLegendEntries(model.groups, theme));
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._empty = model.bins.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getHistogramDimensions(root);

    renderHistogramChart(root, {
      model,
      width,
      height,
      margin,
      theme,
      showGrid: this.showGrid,
      xLabel: this.xLabel || undefined,
      yLabel: this.yLabel || undefined,
      ...this.axisLabelHandlers(),
      onStackHover: this.showTooltip
        ? ({ x0, x1, stack, event }) => {
            const rect = this.getBoundingClientRect();
            this._tooltip = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              group: stack.group,
              range: formatBinRange(x0, x1),
              count: stack.count,
            };
          }
        : undefined,
      onStackLeave: this.showTooltip ? () => { this._tooltip = null; } : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const model = this._empty
      ? { bins: [], groups: [], xMin: 0, xMax: 0 }
      : this.parseData();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${this.renderLegend(model)}
          <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
          ${this._empty
            ? html`<div class="empty" part="empty">No data</div>`
            : nothing}
          ${this._tooltip
            ? html`<div
                class="tooltip"
                part="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                <div class="name">${this._tooltip.group}</div>
                <div>Count: ${this._tooltip.count}</div>
                <div>Range: ${this._tooltip.range}</div>
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
    'ui9000-histogram-chart': Ui9000HistogramChart;
  }
}

export function registerHistogramChart(): void {
  if (!customElements.get('ui9000-histogram-chart')) {
    customElements.define('ui9000-histogram-chart', Ui9000HistogramChart);
  }
}

registerHistogramChart();
