import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { WidgetScale } from '../../../types/index.js';
import { getScatterPlotDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { swatchLegendEntries } from '../../../utils/chart-legend.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  normalizeScatterData,
  type ScatterChartData,
  type ScatterModel,
} from '../lib/index.js';
import { renderScatterPlot } from '../render/draw.js';
import { scatterPlotStyles } from './styles.js';

@customElement('ui9000-scatter-plot')
export class Ui9000ScatterPlot extends Ui9000ChartElement {
  static override styles = [scatterPlotStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: Boolean, attribute: 'show-grid' })
  showGrid = true;

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @property({ type: Boolean, attribute: 'show-reference-line' })
  showReferenceLine = false;

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

  private parseData(): ScatterModel {
    const raw = parseJsonAttr<ScatterChartData>(this.dataJson, null);
    return normalizeScatterData(raw);
  }

  private renderLegend(model: ScatterModel) {
    if (!this.showLegend || model.groups.length <= 1) return nothing;
    const theme = readThemeFromElement(this);
    return renderChartLegend(
      swatchLegendEntries(
        model.groups.map((g) => g.label),
        theme,
        (_label, index) => model.groups[index]?.color ?? theme.primary,
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
    this._empty = model.points.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getScatterPlotDimensions(root);

    renderScatterPlot(root, {
      points: model.points,
      width,
      height,
      margin,
      theme,
      themeMode: this.themeMode(),
      xField: model.xField,
      yField: model.yField,
      showGrid: this.showGrid,
      showReferenceLine: this.showReferenceLine,
      axisDetails: model.axisDetails,
      showTooltip: this.showTooltip,
      onHover: this.showTooltip
        ? ({ point, event }) => {
            const xLabel = model.axisDetails?.[model.xField]?.label ?? model.xField;
            const yLabel = model.axisDetails?.[model.yField]?.label ?? model.yField;
            const rows = [
              { label: xLabel, value: String(point.x) },
              { label: yLabel, value: String(point.y) },
            ];
            if (model.groupField) {
              const groupLabel =
                model.axisDetails?.[model.groupField]?.label ?? model.groupField;
              rows.push({ label: groupLabel, value: String(point.groupKey) });
            }
            this.openTooltip(event, { rows });
          }
        : undefined,
      onLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const model = this._empty ? null : this.parseData();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${model ? this.renderLegend(model) : nothing}
          <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
          ${this._empty
            ? html`<div class="empty" part="empty">
                Scatterplot requires two numeric fields. Pick numeric X and Y axes.
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
    'ui9000-scatter-plot': Ui9000ScatterPlot;
  }
}

export function registerScatterPlot(): void {
  if (!customElements.get('ui9000-scatter-plot')) {
    customElements.define('ui9000-scatter-plot', Ui9000ScatterPlot);
  }
}

registerScatterPlot();
