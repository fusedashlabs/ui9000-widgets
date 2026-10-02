import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import type { WidgetScale } from '../../../types/index.js';
import {
  getPartialDependenceDimensions,
  parseJsonAttr,
} from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  normalizePartialDependenceData,
  type PartialDependenceChartData,
  type PartialDependenceModel,
} from '../lib/index.js';
import { renderPartialDependenceChart } from '../render/draw.js';
import { partialDependenceStyles } from './styles.js';

/** Client tooltip prints three decimals for both axes. */
const TOOLTIP_DECIMALS = 3;

@customElement('ui9000-partial-dependence-chart')
export class Ui9000PartialDependenceChart extends Ui9000ChartElement {
  static override styles = [partialDependenceStyles, chartShellStyles];

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

  private parseData(): PartialDependenceModel {
    return this.withSeriesMode(() =>
      normalizePartialDependenceData(
        parseJsonAttr<PartialDependenceChartData>(this.dataJson, null),
      ),
    );
  }

  /** Client legend carries the single "Average" entry; ICE curves stay unlabelled. */
  private renderLegend(model: PartialDependenceModel) {
    if (!this.showLegend || !model.averageSeries.length) return nothing;
    return renderChartLegend([
      { label: 'Average', swatch: { kind: 'dashed-line', color: model.color } },
    ]);
  }

  protected override onThemeChange(): void {
    this.scheduleDraw();
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._empty = model.iceSeries.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const themeMode = this.themeMode();
    const { width, height, margin } = getPartialDependenceDimensions(root, this.scale);
    const xLabel = model.axisDetails?.[model.xField]?.label ?? model.xField;
    const yLabel = model.axisDetails?.[model.yField]?.label ?? model.yField;

    renderPartialDependenceChart(root, {
      iceSeries: model.iceSeries,
      averageSeries: model.averageSeries,
      width,
      height,
      margin,
      theme,
      themeMode,
      color: model.color,
      showGrid: this.showGrid,
      showTooltip: this.showTooltip,
      onHover: this.showTooltip
        ? ({ x, y, event }) => {
            this.openTooltip(event, {
              rows: [
                { label: xLabel, value: x.toFixed(TOOLTIP_DECIMALS) },
                { label: yLabel, value: y == null ? '-' : y.toFixed(TOOLTIP_DECIMALS) },
              ],
            });
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
                Partial dependence needs numeric X and Y fields with at least one ICE series.
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
    'ui9000-partial-dependence-chart': Ui9000PartialDependenceChart;
  }
}

export function registerPartialDependenceChart(): void {
  if (!customElements.get('ui9000-partial-dependence-chart')) {
    customElements.define('ui9000-partial-dependence-chart', Ui9000PartialDependenceChart);
  }
}

registerPartialDependenceChart();
