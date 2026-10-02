import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend, type ChartLegendEntry } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { WidgetScale } from '../../../types/index.js';
import {
  getAreaGroupedBarChartDimensions,
  parseJsonAttr,
} from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  formatAgbValue,
  normalizeAreaGroupedBarData,
  type AreaGroupedBarChartInput,
  type AreaGroupedBarModel,
} from '../lib/index.js';
import { renderAreaGroupedBarChart } from '../render/draw.js';
import { areaGroupedBarChartStyles } from './styles.js';

@customElement('ui9000-area-grouped-bar-chart')
export class Ui9000AreaGroupedBarChart extends Ui9000ChartElement {
  static override styles = [areaGroupedBarChartStyles, chartShellStyles];

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

  private parseData(): AreaGroupedBarModel {
    const raw = parseJsonAttr<AreaGroupedBarChartInput>(this.dataJson, null);
    return normalizeAreaGroupedBarData(raw);
  }

  private legendEntries(model: AreaGroupedBarModel): ChartLegendEntry[] {
    const entries: ChartLegendEntry[] = [];
    if (model.lineField) {
      entries.push({
        label: model.lineLabel || model.lineField,
        swatch: { kind: 'line', color: model.lineColor },
      });
    }
    for (const g of model.groups) {
      entries.push({
        label: g.label,
        swatch: { kind: 'swatch', color: g.color, opacity: 0.85 },
      });
    }
    return entries;
  }

  private renderLegend(model: AreaGroupedBarModel) {
    if (!this.showLegend) return nothing;
    const entries = this.legendEntries(model);
    if (entries.length <= 1) return nothing;
    return renderChartLegend(entries);
  }

  private tooltipContent(
    model: AreaGroupedBarModel,
    category: string,
  ): { rows: { label: string; value: string }[] } {
    const xLabel = model.axisDetails?.[model.xField]?.label ?? model.xField;
    const rows: { label: string; value: string }[] = [
      { label: xLabel, value: category },
    ];

    const gMap = model.barsByCategory[category] ?? {};
    let barsSum = 0;
    for (const g of model.groups) {
      const v = gMap[g.key];
      if (!Number.isFinite(v)) continue;
      barsSum += v;
      rows.push({ label: g.label, value: formatAgbValue(v) });
    }

    const linePt = model.linePoints.find((p) => p.x === category);
    const lineValue = linePt?.y ?? barsSum;
    if (Number.isFinite(lineValue)) {
      const aLabel = model.lineLabel || model.lineField;
      rows.push({ label: aLabel, value: formatAgbValue(lineValue) });
    }
    return { rows };
  }

  protected override onThemeChange(): void {
    this.scheduleDraw();
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._empty =
      model.categories.length === 0 &&
      model.linePoints.length === 0 &&
      model.groups.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getAreaGroupedBarChartDimensions(root);

    renderAreaGroupedBarChart(root, {
      model,
      width,
      height,
      margin,
      theme,
      themeMode: this.themeMode(),
      showGrid: this.showGrid,
      showTooltip: this.showTooltip,
      ...this.axisLabelHandlers(),
      onHover: this.showTooltip
        ? ({ category, event }) => {
            this.openTooltip(event, this.tooltipContent(model, category));
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
    'ui9000-area-grouped-bar-chart': Ui9000AreaGroupedBarChart;
  }
}

export function registerAreaGroupedBarChart(): void {
  if (!customElements.get('ui9000-area-grouped-bar-chart')) {
    customElements.define('ui9000-area-grouped-bar-chart', Ui9000AreaGroupedBarChart);
  }
}

registerAreaGroupedBarChart();
