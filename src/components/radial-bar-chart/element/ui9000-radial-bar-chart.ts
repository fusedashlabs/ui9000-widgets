import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import type { WidgetScale } from '../../../types/index.js';
import { getRadialBarDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { swatchLegendEntries } from '../../../utils/chart-legend.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  formatRadialBarCategory,
  formatRadialBarValue,
  normalizeRadialBarData,
  type RadialBarChartData,
  type RadialBarModel,
} from '../lib/index.js';
import { renderRadialBarChart } from '../render/draw.js';
import { radialBarChartStyles } from './styles.js';

@customElement('ui9000-radial-bar-chart')
export class Ui9000RadialBarChart extends Ui9000ChartElement {
  static override styles = [radialBarChartStyles, chartShellStyles];

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

  /**
   * Model from the last draw. `render()` reads it for the legend so a paint
   * never re-parses the `data` attribute; `_`-prefixed state is ignored by
   * `chartPropsChanged`, so assigning it cannot loop back into a redraw.
   */
  @state()
  private _model: RadialBarModel | null = null;

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

  protected override onThemeChange(): void {
    this.scheduleDraw();
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  private parseData(): RadialBarModel {
    const raw = parseJsonAttr<RadialBarChartData>(this.dataJson, null);
    return this.withSeriesMode(() => normalizeRadialBarData(raw));
  }

  private renderLegend(model: RadialBarModel) {
    if (!this.showLegend || !model.legend.length) return nothing;
    const theme = readThemeFromElement(this);
    return renderChartLegend(
      swatchLegendEntries(
        model.legend.map((bar) => bar.label),
        theme,
        (_label, index) => model.legend[index]?.color ?? theme.primary,
      ),
    );
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._model = model;
    this._empty = model.bars.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getRadialBarDimensions(root, this.scale);
    const xField = model.xField;
    const yField = model.yField;

    renderRadialBarChart(root, {
      bars: model.bars,
      width,
      height,
      margin,
      theme,
      themeMode: this.themeMode(),
      showGrid: this.showGrid,
      showTooltip: this.showTooltip,
      ...this.axisLabelHandlers(),
      onHover: this.showTooltip
        ? ({ bar, event }) => {
            const xDetail = xField ? model.axisDetails?.[xField] : undefined;
            const yDetail = yField ? model.axisDetails?.[yField] : undefined;
            this.openTooltip(event, {
              title: formatRadialBarCategory(bar.label),
              rows: [
                {
                  label: xDetail?.label ?? xField ?? 'Category',
                  value: formatRadialBarCategory(bar.label, xDetail),
                },
                {
                  label: yDetail?.label ?? yField ?? 'Value',
                  value: formatRadialBarValue(bar.value, yDetail),
                },
              ],
            });
          }
        : undefined,
      onLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const model = this._empty ? null : this._model;
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${model ? this.renderLegend(model) : nothing}
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
    'ui9000-radial-bar-chart': Ui9000RadialBarChart;
  }
}

export function registerRadialBarChart(): void {
  if (!customElements.get('ui9000-radial-bar-chart')) {
    customElements.define('ui9000-radial-bar-chart', Ui9000RadialBarChart);
  }
}

registerRadialBarChart();
