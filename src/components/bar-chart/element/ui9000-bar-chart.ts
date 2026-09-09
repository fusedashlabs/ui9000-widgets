import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import type { ChartLegendEntry } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { DataPoint, WidgetScale } from '../../../types/index.js';
import { getBarChartDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { lineLegendEntries, resolveSeriesLegendColor } from '../../../utils/chart-legend.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import { FD } from '../../../utils/fusedash-visual.js';
import type { FuseWidgetLike } from '../../../utils/fuse-widget.js';
import {
  barHorizontalMinSpan,
  collectBarCategories,
  formatCompact,
  normalizeBarData,
  type BarChartData,
  type BarHoverEntry,
  type BarLayout,
  type BarOrientation,
  type BarSeries,
} from '../lib/index.js';
import { renderBarChart } from '../render/draw.js';
import { barChartStyles } from './styles.js';

@customElement('ui9000-bar-chart')
export class Ui9000BarChart extends Ui9000ChartElement {
  static override styles = [barChartStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: String, attribute: 'orientation' })
  orientation: BarOrientation = 'vertical';

  /** Multi-series only — a single series always renders as a plain bar chart */
  @property({ type: String, attribute: 'layout' })
  layout: BarLayout = 'grouped';

  @property({ type: Boolean, attribute: 'show-grid' })
  showGrid = true;

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  /** Running-total overlay (FuseDash `cumulativeLine`), single series only */
  @property({ type: Boolean, attribute: 'cumulative-line' })
  cumulativeLine = false;

  @property({ type: String, attribute: 'x-label' })
  xLabel = '';

  @property({ type: String, attribute: 'y-label' })
  yLabel = '';

  @state()
  private _tooltip: {
    x: number;
    y: number;
    category: string;
    entries: BarHoverEntry[];
  } | null = null;

  @state()
  private _empty = false;

  @state()
  private _fixedXAxis = false;

  private _resizeObserver?: ResizeObserver;
  private _raf = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this.scheduleDraw());
      this._resizeObserver.observe(this);
    }
  }

  override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    super.disconnectedCallback();
  }

  override updated(changed: PropertyValues): void {
    if (chartPropsChanged(changed)) this.scheduleDraw();
    if (changed.has('_fixedXAxis')) {
      const body = this.shadowRoot?.querySelector('.chart-body');
      const scroll = this.shadowRoot?.querySelector('.chart-scroll');
      if (body instanceof HTMLElement) this._resizeObserver?.observe(body);
      if (scroll instanceof HTMLElement) this._resizeObserver?.observe(scroll);
    }
  }

  override firstUpdated(): void {
    const body = this.shadowRoot?.querySelector('.widget-body');
    const chartBody = this.shadowRoot?.querySelector('.chart-body');
    const scroll = this.shadowRoot?.querySelector('.chart-scroll');
    if (body instanceof HTMLElement) this._resizeObserver?.observe(body);
    if (chartBody instanceof HTMLElement) this._resizeObserver?.observe(chartBody);
    if (scroll instanceof HTMLElement) this._resizeObserver?.observe(scroll);
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  private parseData(): BarSeries[] {
    const raw = parseJsonAttr<DataPoint[] | BarChartData | BarSeries[] | FuseWidgetLike>(
      this.dataJson,
      [],
    );
    return normalizeBarData(raw);
  }

  private renderLegend(series: BarSeries[]): typeof nothing | ReturnType<typeof renderChartLegend> {
    if (!this.showLegend) return nothing;
    const theme = readThemeFromElement(this);
    const multi = series.length > 1;
    const withCumulative = this.cumulativeLine && !multi;

    if (!multi && !withCumulative) return nothing;

    const entries: ChartLegendEntry[] = multi
      ? lineLegendEntries(series, theme).map((entry) => ({
          ...entry,
          swatch: { kind: 'swatch', color: entry.swatch.color, opacity: 0.8 },
        }))
      : [
          {
            label: series[0]?.name ?? 'Series',
            swatch: {
              kind: 'swatch',
              color: resolveSeriesLegendColor(series[0], 0, theme),
              opacity: 0.8,
            },
          },
          {
            label: 'Cumulative',
            swatch: { kind: 'line', color: FD.barCumulativeColor },
          },
        ];

    return renderChartLegend(entries);
  }

  private draw(): void {
    const chartBody = this.shadowRoot?.querySelector('.chart-body') as
      | HTMLElement
      | null;
    const scroll = this.shadowRoot?.querySelector('.chart-scroll') as
      | HTMLElement
      | null;
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    const xAxisRoot = this.shadowRoot?.querySelector('.chart-x-axis') as
      | HTMLElement
      | null;
    if (!chartBody || !scroll || !root) return;

    const series = this.parseData();
    this._empty = series.length === 0 || series.every((s) => !s.points.length);
    if (this._empty) {
      root.replaceChildren();
      xAxisRoot?.replaceChildren();
      this._fixedXAxis = false;
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, margin } = getBarChartDimensions(chartBody, this.scale);
    const scrollViewportH = scroll.clientHeight || 300;
    const categories = collectBarCategories(series);
    const minPlotSpan = barHorizontalMinSpan(
      categories.length,
      series.length,
      this.layout,
    );
    const availPlotH = scrollViewportH - margin.top;
    const needsFixedXAxis =
      this.orientation === 'horizontal' && minPlotSpan > availPlotH + 1;
    this._fixedXAxis = needsFixedXAxis;

    renderBarChart(root, {
      series,
      width,
      height: scrollViewportH,
      margin,
      theme,
      orientation: this.orientation,
      layout: this.layout,
      showGrid: this.showGrid,
      showTooltip: this.showTooltip,
      cumulativeLine: this.cumulativeLine,
      xLabel: this.xLabel || undefined,
      yLabel: this.yLabel || undefined,
      xAxisContainer: needsFixedXAxis ? xAxisRoot : null,
      ...this.axisLabelHandlers(),
      onHover: this.showTooltip
        ? ({ category, entries, event }) => {
            const rect = this.getBoundingClientRect();
            this._tooltip = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              category,
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

    if (xAxisRoot && !needsFixedXAxis) {
      xAxisRoot.replaceChildren();
    }
  }

  override render() {
    const title = this.headerTitle();
    const series = this._empty ? [] : this.parseData();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          <div class="chart-body" part="chart-body">
            ${this.renderLegend(series)}
            <div class="chart-scroll" part="scroll">
              <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
            </div>
            <div
              class="chart-x-axis"
              part="x-axis"
              ?hidden=${!this._fixedXAxis}
            ></div>
          </div>
          ${this._empty ? html`<div class="empty" part="empty">No data</div>` : nothing}
          ${this._tooltip
            ? html`<div
                class="tooltip"
                part="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                <div class="category">${this._tooltip.category}</div>
                ${this._tooltip.entries.map(
                  (entry) => html`<div class="row">
                    <span class="swatch" style="background:${entry.color}"></span>
                    <span>${entry.seriesName}</span>
                    <span class="value">${formatCompact(entry.value)}</span>
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
    'ui9000-bar-chart': Ui9000BarChart;
  }
}

export function registerBarChart(): void {
  if (!customElements.get('ui9000-bar-chart')) {
    customElements.define('ui9000-bar-chart', Ui9000BarChart);
  }
}

registerBarChart();
