import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import { getBoxPlotDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { swatchLegendEntries } from '../../../utils/chart-legend.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import { seriesColor as fdSeriesColor } from '../../../utils/fusedash-visual.js';
import {
  boxPlotMinCategorySpan,
  normalizeBoxPlotData,
  type BoxPlotBox,
  type BoxPlotBoxesPayload,
  type BoxPlotModel,
  type BoxPlotOrientation,
  type FuseDashBoxPlotPayload,
} from '../lib/index.js';
import { renderBoxPlotChart } from '../render/draw.js';
import { boxPlotStyles } from './styles.js';

@customElement('ui9000-box-plot-chart')
export class Ui9000BoxPlotChart extends Ui9000ChartElement {
  static override styles = [boxPlotStyles, chartShellStyles];

  @property({ type: String })
  orientation: BoxPlotOrientation = 'vertical';

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
    label: string;
    group?: string;
    q1: number;
    median: number;
    q3: number;
    min: number;
    max: number;
  } | null = null;

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

  private parseData(): BoxPlotModel {
    const raw = parseJsonAttr<
      BoxPlotBox[] | BoxPlotBoxesPayload | FuseDashBoxPlotPayload
    >(this.dataJson, []);
    const model = normalizeBoxPlotData(raw);
    if (this.orientation === 'horizontal' || this.orientation === 'vertical') {
      return { ...model, orientation: this.orientation };
    }
    return model;
  }

  private draw(): void {
    const chartBody = this.shadowRoot?.querySelector('.chart-body') as
      | HTMLElement
      | null;
    const scroll = this.shadowRoot?.querySelector('.chart-scroll') as
      | HTMLElement
      | null;
    const root = this.shadowRoot?.querySelector('.chart-root') as
      | HTMLElement
      | null;
    const xAxisRoot = this.shadowRoot?.querySelector('.chart-x-axis') as
      | HTMLElement
      | null;
    if (!chartBody || !scroll || !root) return;

    const model = this.parseData();
    this._empty = model.boxes.length === 0;
    if (this._empty) {
      root.replaceChildren();
      xAxisRoot?.replaceChildren();
      this._fixedXAxis = false;
      return;
    }

    const labels =
      model.categoryLabels?.length
        ? model.categoryLabels
        : [...new Set(model.boxes.map((b) => b.label))];
    const groupCount = model.groups.length || 1;
    const minPlotSpan = boxPlotMinCategorySpan(labels.length, groupCount);
    const { width, margin } = getBoxPlotDimensions(chartBody);
    const scrollViewportH = scroll.clientHeight || 300;
    const availPlotH = scrollViewportH - margin.top;
    const needsFixedXAxis =
      model.orientation === 'horizontal' && minPlotSpan > availPlotH + 1;
    this._fixedXAxis = needsFixedXAxis;

    const theme = readThemeFromElement(this);

    renderBoxPlotChart(root, {
      model,
      width,
      height: scrollViewportH,
      margin,
      theme,
      orientation: this.orientation,
      showGrid: this.showGrid,
      xAxisContainer: needsFixedXAxis ? xAxisRoot : null,
      xLabel: this.xLabel || undefined,
      yLabel: this.yLabel || undefined,
      ...this.axisLabelHandlers(),
      onBoxHover: this.showTooltip
        ? ({ box, event }) => {
            const rect = this.getBoundingClientRect();
            this._tooltip = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              label: box.label,
              group: box.group,
              q1: box.q1,
              median: box.median,
              q3: box.q3,
              min: box.smallestNonOutlier,
              max: box.biggestNonOutlier,
            };
          }
        : undefined,
      onBoxLeave: this.showTooltip ? () => { this._tooltip = null; } : undefined,
    });

    if (xAxisRoot && !needsFixedXAxis) {
      xAxisRoot.replaceChildren();
    }
  }

  private renderLegend(model: BoxPlotModel) {
    if (!this.showLegend || model.groups.length <= 1) return nothing;
    const theme = readThemeFromElement(this);
    return renderChartLegend(
      swatchLegendEntries(model.groups, theme, (group, i) => {
        const sample = model.boxes.find((b) => (b.group ?? 'default') === group);
        return sample?.color ?? fdSeriesColor(i);
      }),
    );
  }

  override render() {
    const title = this.headerTitle();
    const model = this.parseData();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          <div class="chart-body" part="chart-body">
            ${this.renderLegend(model)}
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
          ${this._tooltip
            ? html`<div
                class="tooltip"
                part="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                <div class="name">
                  ${this._tooltip.group
                    ? `${this._tooltip.group} · ${this._tooltip.label}`
                    : this._tooltip.label}
                </div>
                <div>min: ${this._tooltip.min}</div>
                <div>25%: ${this._tooltip.q1}</div>
                <div>median: ${this._tooltip.median}</div>
                <div>75%: ${this._tooltip.q3}</div>
                <div>max: ${this._tooltip.max}</div>
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
    'ui9000-box-plot-chart': Ui9000BoxPlotChart;
  }
}

export function registerBoxPlotChart(): void {
  if (!customElements.get('ui9000-box-plot-chart')) {
    customElements.define('ui9000-box-plot-chart', Ui9000BoxPlotChart);
  }
}

registerBoxPlotChart();
