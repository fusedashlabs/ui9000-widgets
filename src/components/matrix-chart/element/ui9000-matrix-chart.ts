import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import { axisFieldLabel, formatValueWithUnit } from '../../../utils/axis-units.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  formatCategoryLabel,
  formatMatrixValue,
  normalizeMatrixData,
  type MatrixCell,
  type MatrixInput,
  type MatrixModel,
} from '../lib/index.js';
import { matrixColorRanges, renderMatrixChart } from '../render/draw.js';
import { matrixStyles } from './styles.js';
import { dsText } from '../../../element/ds-text.js';

let nextChartId = 0;

@customElement('ui9000-matrix-chart')
export class Ui9000MatrixChart extends Ui9000ChartElement {
  static override styles = [matrixStyles, chartShellStyles];

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  /** KPI tiles show only the cells, without names and totals. */
  @property({ type: Boolean, attribute: 'in-kpi' })
  inKpi = false;

  @state()
  private _empty = false;

  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  private _drawnSignature: string | null = null;
  private _drawnModel: MatrixModel | null = null;
  private _revealed = false;
  private readonly _chartId = `ui9000-matrix-${(nextChartId += 1)}`;
  private _modelJson: string | null = null;
  private _model: MatrixModel = {
    cells: [],
    xDomain: [],
    yDomain: [],
    rawValues: [],
    categoryKey: '',
    valueKey: '',
  };

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

  override firstUpdated(): void {
    for (const selector of ['.widget-body', '.chart-body', '.chart-scroll']) {
      const el = this.shadowRoot?.querySelector(selector);
      if (el instanceof HTMLElement) this._resizeObserver?.observe(el);
    }
  }

  override updated(changed: PropertyValues): void {
    if (chartPropsChanged(changed)) this.scheduleDraw();
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  /** Normalizing a dense grid is not free — only redo it when `data` changes. */
  private parseData(): MatrixModel {
    if (this._modelJson !== this.dataJson) {
      this._modelJson = this.dataJson;
      this._model = normalizeMatrixData(parseJsonAttr<MatrixInput>(this.dataJson, []));
    }
    return this._model;
  }

  protected override onThemeChange(): void {
    this.scheduleDraw();
  }

  private draw(): void {
    const scroll = this.shadowRoot?.querySelector('.chart-scroll') as HTMLElement | null;
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!scroll || !root) return;

    const model = this.parseData();
    this._empty = model.cells.length === 0;
    if (this._empty) {
      root.replaceChildren();
      this._drawnSignature = null;
      this._drawnModel = null;
      return;
    }

    const width = scroll.clientWidth || 400;
    const height = scroll.clientHeight || 300;
    const themeMode = this.themeMode();

    // Skip redraws whose inputs are unchanged: a redraw resets the scroll and
    // settling after a resize would cost a pass for nothing.
    const signature = [width, height, themeMode, this.inKpi, this.showTooltip].join('|');
    if (this._drawnSignature === signature && this._drawnModel === model) return;
    this._drawnSignature = signature;
    this._drawnModel = model;

    // The reveal runs once, when the grid opens, not on every redraw.
    const reveal = !this._revealed;
    this._revealed = true;

    renderMatrixChart(root, {
      model,
      width,
      height,
      themeMode,
      fontFamily: readThemeFromElement(this).fontFamily,
      idPrefix: this._chartId,
      isInKpi: this.inKpi,
      reveal,
      onCellHover: this.showTooltip
        ? ({ cell, event }) => {
            this.openTooltip(event, this.tooltipContent(model, cell));
          }
        : undefined,
      onRowHover: this.showTooltip
        ? ({ row, total, event }) => {
            this.openTooltip(event, this.tooltipContent(model, { x: '', y: row, value: total }, 'Total'));
          }
        : undefined,
      onCellLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  /**
   * Client tooltip: the row field and its value, then the measure — each
   * carrying the unit declared for that field in `axisDetails`.
   */
  private tooltipContent(
    model: MatrixModel,
    cell: MatrixCell,
    valueLabel = 'Value',
  ): { title?: string; rows: { label: string; value: string }[] } {
    const rowValue = formatValueWithUnit(
      formatCategoryLabel(cell.y),
      model.axisDetails?.[model.categoryKey],
    );
    const value = formatValueWithUnit(
      formatMatrixValue(cell.value),
      model.axisDetails?.[model.valueKey],
    );
    if (model.categoryKey) {
      return {
        title: axisFieldLabel(model.categoryKey, model.axisDetails),
        rows: [
          { label: '', value: rowValue },
          { label: valueLabel, value },
        ],
      };
    }
    return {
      title: rowValue,
      rows: [{ label: valueLabel, value }],
    };
  }

  /** FuseDash `ChartLegend legendType="palette"` — Low → High swatch ramp. */
  private renderPaletteLegend(model: MatrixModel) {
    if (!this.showLegend) return nothing;
    const ranges = matrixColorRanges(model, this.themeMode());
    if (!ranges.length) return nothing;
    return html`
      <div class="palette-legend" part="legend">
        <span>Low</span>
        <span class="palette-swatches">
          ${ranges.map(
            (range) =>
              html`<span
                class="palette-swatch"
                style="background:${range.color}"
                title=${`${formatMatrixValue(range.start)} – ${formatMatrixValue(range.end)}`}
              ></span>`,
          )}
        </span>
        <span>High</span>
      </div>
    `;
  }

  override render() {
    const model = this.parseData();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(this.headerTitle())}
        <div class="widget-body">
          <div class="chart-body" part="chart-body">
            ${this._empty ? nothing : this.renderPaletteLegend(model)}
            <div class="chart-scroll" part="scroll">
              <div
                class="chart-root"
                part="chart"
                ?data-hoverable=${this.showTooltip}
                ?hidden=${this._empty}
              ></div>
            </div>
          </div>
          ${this._empty ? html`<div class="empty" part="empty">${dsText('No data', { size: 'md' })}</div>` : nothing}
          ${this.renderShellLabelTooltip()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-matrix-chart': Ui9000MatrixChart;
  }
}

export function registerMatrixChart(): void {
  if (!customElements.get('ui9000-matrix-chart')) {
    customElements.define('ui9000-matrix-chart', Ui9000MatrixChart);
  }
}

registerMatrixChart();
