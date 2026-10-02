import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { DataPoint, WidgetScale } from '../../../types/index.js';
import { getLollipopDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { swatchLegendEntries, resolveSeriesLegendColor } from '../../../utils/chart-legend.js';
import {
  isFuseWidgetPayload,
  xDomainHintFromWidget,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type { MarkerShape } from '../../../utils/fusedash-visual.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  collectLabels,
  lollipopHorizontalMinSpan,
  normalizeLollipopData,
  type LollipopChartData,
  type LollipopLayout,
  type LollipopOrientation,
  type LollipopSeries,
} from '../lib/index.js';
import { renderLollipopChart } from '../render/draw.js';
import { lollipopStyles } from './styles.js';

@customElement('ui9000-lollipop')
export class Ui9000Lollipop extends Ui9000ChartElement {
  static override styles = [lollipopStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: String })
  orientation: LollipopOrientation = 'vertical';

  /** Multi-series only — a single series always renders as the plain lollipop */
  @property({ type: String })
  layout: LollipopLayout = 'grouped';

  @property({ type: String })
  marker: MarkerShape = 'rhombus';

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

  @state()
  private _fixedXAxis = false;

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

  private parseData(): LollipopSeries[] {
    const raw = parseJsonAttr<DataPoint[] | LollipopChartData | LollipopSeries[] | FuseWidgetLike>(
      this.dataJson,
      [],
    );
    return normalizeLollipopData(raw);
  }

  private resolveLayout(): LollipopLayout {
    if (this.layout === 'stacked') return 'stacked';
    const raw = parseJsonAttr<unknown>(this.dataJson, null);
    if (isFuseWidgetPayload(raw) && raw.stacked) return 'stacked';
    return 'grouped';
  }

  private labelHint(): string[] | undefined {
    const raw = parseJsonAttr<unknown>(this.dataJson, null);
    if (isFuseWidgetPayload(raw)) return xDomainHintFromWidget(raw);
    return undefined;
  }

  private renderLegend(series: LollipopSeries[]) {
    if (!this.showLegend || series.length <= 1) return nothing;
    const theme = readThemeFromElement(this);
    return renderChartLegend(
      swatchLegendEntries(
        series.map((s) => s.name ?? s.id),
        theme,
        (_group, i) => resolveSeriesLegendColor(series[i], i, theme),
      ),
    );
  }

  protected override onThemeChange(): void {
    this.scheduleDraw();
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
    this._empty = series.length === 0;
    if (this._empty) {
      root.replaceChildren();
      xAxisRoot?.replaceChildren();
      this._fixedXAxis = false;
      return;
    }

    const theme = readThemeFromElement(this);
    const layout = this.resolveLayout();
    const labels = collectLabels(series, this.labelHint());
    const { width, margin } = getLollipopDimensions(chartBody);
    const scrollViewportH = scroll.clientHeight || 300;
    const minPlotSpan = lollipopHorizontalMinSpan(
      labels.length,
      series.length,
    );
    const availPlotH = scrollViewportH - margin.top;
    const needsFixedXAxis =
      this.orientation === 'horizontal' && minPlotSpan > availPlotH + 1;
    this._fixedXAxis = needsFixedXAxis;

    renderLollipopChart(root, {
      series,
      width,
      height: scrollViewportH,
      margin,
      theme,
      themeMode: this.themeMode(),
      orientation: this.orientation,
      layout,
      marker: this.marker,
      showGrid: this.showGrid,
      labelHint: this.labelHint(),
      xLabel: this.xLabel || undefined,
      yLabel: this.yLabel || undefined,
      xAxisContainer: needsFixedXAxis ? xAxisRoot : null,
      ...this.axisLabelHandlers(),
      onPointHover: this.showTooltip
        ? ({ seriesName, point, event }) => {
            this.openTooltip(event, {
              title: seriesName,
              rows: [{ label: point.label, value: String(point.value) }],
            });
          }
        : undefined,
      onPointLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
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
    'ui9000-lollipop': Ui9000Lollipop;
  }
}

export function registerLollipop(): void {
  if (!customElements.get('ui9000-lollipop')) {
    customElements.define('ui9000-lollipop', Ui9000Lollipop);
  }
}

registerLollipop();
