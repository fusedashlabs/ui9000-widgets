import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend, type ChartLegendEntry } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { WidgetScale } from '../../../types/index.js';
import { getSparkLineDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import {
  isFuseWidgetPayload,
  xDomainHintFromWidget,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import { formatCompact, type SparkLineHoverEntry } from '../../spark-line-chart/lib/index.js';
import { sparkLineChartStyles } from '../../spark-line-chart/element/styles.js';
import {
  normalizeScatterSparklineData,
  type ScatterSparklineChartData,
  type ScatterSparklineModel,
  type ScatterSparklineRawPoint,
} from '../lib/index.js';
import { renderScatterSparklineChart } from '../render/draw.js';

@customElement('ui9000-scatter-sparkline-chart')
export class Ui9000ScatterSparklineChart extends Ui9000ChartElement {
  static override styles = [sparkLineChartStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: Boolean, attribute: 'show-grid' })
  showGrid = true;

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _tooltip:
    | {
        x: number;
        y: number;
        mode: 'line';
        xLabel: string;
        entries: SparkLineHoverEntry[];
      }
    | {
        x: number;
        y: number;
        mode: 'point';
        rows: Array<{ label: string; value: string }>;
      }
    | null = null;

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

  private parseModel(): ScatterSparklineModel {
    const raw = parseJsonAttr<ScatterSparklineChartData | FuseWidgetLike>(
      this.dataJson,
      {},
    );
    return normalizeScatterSparklineData(raw);
  }

  private xDomainHint(): string[] | undefined {
    const raw = parseJsonAttr<unknown>(this.dataJson, null);
    if (isFuseWidgetPayload(raw)) return xDomainHintFromWidget(raw);
    return undefined;
  }

  private renderLegend(model: ScatterSparklineModel) {
    if (!this.showLegend) return nothing;
    const entries: ChartLegendEntry[] = [
      {
        label: model.lineLegendLabel,
        swatch: { kind: 'line', color: model.lineColor },
      },
      {
        label: model.pointLegendLabel,
        swatch: { kind: 'swatch', color: model.pointLegendColor },
      },
    ];
    return renderChartLegend(entries);
  }

  private formatPointTooltip(
    model: ScatterSparklineModel,
    point: ScatterSparklineRawPoint,
  ): Array<{ label: string; value: string }> {
    const xLabel =
      model.axisDetails?.[model.xField]?.label ?? model.xField;
    const yLabel =
      model.axisDetails?.[model.yField]?.label ?? model.yField;
    const rows: Array<{ label: string; value: string }> = [
      { label: xLabel, value: point.x },
      { label: yLabel, value: formatCompact(point.y) },
    ];
    if (model.groupField && point.row[model.groupField] != null) {
      const gLabel =
        model.axisDetails?.[model.groupField]?.label ?? model.groupField;
      rows.push({
        label: gLabel,
        value: String(point.row[model.groupField]),
      });
    }
    return rows;
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseModel();
    const hasSeries = model.series.some((s) => s.points.length > 0);
    this._empty = !hasSeries && model.scatterPoints.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getSparkLineDimensions(root);

    renderScatterSparklineChart(root, {
      model,
      width,
      height,
      margin,
      theme,
      showGrid: this.showGrid,
      xDomainHint: this.xDomainHint(),
      showTooltip: this.showTooltip,
      ...this.axisLabelHandlers(),
      onLineHover: this.showTooltip
        ? ({ xLabel, entries, event }) => {
            const rect = this.getBoundingClientRect();
            this._tooltip = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              mode: 'line',
              xLabel,
              entries,
            };
          }
        : undefined,
      onPointHover: this.showTooltip
        ? ({ point, event }) => {
            const rect = this.getBoundingClientRect();
            this._tooltip = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              mode: 'point',
              rows: this.formatPointTooltip(model, point),
            };
          }
        : undefined,
      onLeave: this.showTooltip ? () => { this._tooltip = null; } : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const model = this._empty ? null : this.parseModel();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${model ? this.renderLegend(model) : nothing}
          <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
          ${this._empty ? html`<div class="empty" part="empty">No data</div>` : nothing}
          ${this._tooltip?.mode === 'line'
            ? html`<div
                class="tooltip"
                part="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                <div class="x">${this._tooltip.xLabel}</div>
                ${this._tooltip.entries.map(
                  (entry) => html`<div class="row">
                    <span class="swatch" style="background:${entry.color}"></span>
                    <span>${entry.seriesName}</span>
                    <span class="value">${formatCompact(entry.value)}</span>
                  </div>`,
                )}
              </div>`
            : nothing}
          ${this._tooltip?.mode === 'point'
            ? html`<div
                class="tooltip"
                part="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                ${this._tooltip.rows.map(
                  (row) => html`<div class="row">
                    <span>${row.label}</span>
                    <span class="value">${row.value}</span>
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
    'ui9000-scatter-sparkline-chart': Ui9000ScatterSparklineChart;
  }
}

export function registerScatterSparklineChart(): void {
  if (!customElements.get('ui9000-scatter-sparkline-chart')) {
    customElements.define(
      'ui9000-scatter-sparkline-chart',
      Ui9000ScatterSparklineChart,
    );
  }
}

registerScatterSparklineChart();
