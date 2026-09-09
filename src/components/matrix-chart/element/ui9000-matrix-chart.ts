import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { CSS_VARS, readCssVar, readThemeFromElement } from '../../../context/widget-context.js';
import { axisFieldLabel, formatValueWithUnit } from '../../../utils/axis-units.js';
import { getMatrixDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  formatCategoryLabel,
  formatMatrixValue,
  normalizeMatrixData,
  type MatrixCell,
  type MatrixInput,
  type MatrixModel,
} from '../lib/index.js';
import {
  matrixColorRanges,
  matrixLayout,
  renderMatrixChart,
} from '../render/draw.js';
import { matrixStyles } from './styles.js';

@customElement('ui9000-matrix-chart')
export class Ui9000MatrixChart extends Ui9000ChartElement {
  static override styles = [matrixStyles, chartShellStyles];

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _tooltip: {
    x: number;
    y: number;
    /** Client rows: "<row field>: <row value>" then "Value: <measure>" */
    category: string;
    value: string;
  } | null = null;

  @state()
  private _empty = false;

  @state()
  private _pinnedTopAxis = false;

  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  private _drawnSignature: string | null = null;
  private _drawnModel: MatrixModel | null = null;
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

  private draw(): void {
    const chartBody = this.shadowRoot?.querySelector('.chart-body') as HTMLElement | null;
    const scroll = this.shadowRoot?.querySelector('.chart-scroll') as HTMLElement | null;
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    const topAxis = this.shadowRoot?.querySelector('.chart-top-axis') as HTMLElement | null;
    if (!chartBody || !scroll || !root) return;

    const model = this.parseData();
    this._empty = model.cells.length === 0;
    if (this._empty) {
      root.replaceChildren();
      topAxis?.replaceChildren();
      this._pinnedTopAxis = false;
      this._drawnSignature = null;
      this._drawnModel = null;
      return;
    }

    const { width, margin } = getMatrixDimensions(chartBody);
    const bodyHeight = chartBody.clientHeight || 300;
    const viewportHeight = scroll.clientHeight || 300;
    const themeMode =
      readCssVar(this, CSS_VARS.mode, 'light') === 'dark' ? 'dark' : 'light';

    // Drawing the header changes the scroll viewport, which fires the resize
    // observer again — skip redraws whose inputs are unchanged so that
    // settling costs one extra pass instead of running forever.
    const signature = [
      width,
      bodyHeight,
      viewportHeight,
      themeMode,
      this.showTooltip,
    ].join('|');
    if (this._drawnSignature === signature && this._drawnModel === model) return;
    this._drawnSignature = signature;
    this._drawnModel = model;

    this._pinnedTopAxis = matrixLayout(model, viewportHeight, margin).separateTopAxis;

    renderMatrixChart(root, {
      model,
      width,
      height: viewportHeight,
      bodyHeight,
      margin,
      theme: readThemeFromElement(this),
      themeMode,
      topAxisContainer: topAxis,
      ...this.axisLabelHandlers(),
      onCellHover: this.showTooltip
        ? ({ cell, event }) => {
            const rect = this.getBoundingClientRect();
            this._tooltip = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              ...this.tooltipRows(model, cell),
            };
          }
        : undefined,
      onCellLeave: this.showTooltip
        ? () => {
            this._tooltip = null;
          }
        : undefined,
    });
  }

  /**
   * Client tooltip: the row field and its value, then the measure — each
   * carrying the unit declared for that field in `axisDetails`.
   */
  private tooltipRows(
    model: MatrixModel,
    cell: MatrixCell,
  ): { category: string; value: string } {
    const rowValue = formatValueWithUnit(
      formatCategoryLabel(cell.y),
      model.axisDetails?.[model.categoryKey],
    );
    const value = formatValueWithUnit(
      formatMatrixValue(cell.value),
      model.axisDetails?.[model.valueKey],
    );
    return {
      category: model.categoryKey
        ? `${axisFieldLabel(model.categoryKey, model.axisDetails)}: ${rowValue}`
        : rowValue,
      value,
    };
  }

  /** FuseDash `ChartLegend legendType="palette"` — Low → High swatch ramp. */
  private renderPaletteLegend(model: MatrixModel) {
    if (!this.showLegend) return nothing;
    const ranges = matrixColorRanges(model);
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
            <div
              class="chart-top-axis"
              part="top-axis"
              ?hidden=${!this._pinnedTopAxis}
            ></div>
            <div class="chart-scroll" part="scroll">
              <div
                class="chart-root"
                part="chart"
                ?data-hoverable=${this.showTooltip}
                ?hidden=${this._empty}
              ></div>
            </div>
          </div>
          ${this._empty ? html`<div class="empty" part="empty">No data</div>` : nothing}
          ${this._tooltip
            ? html`<div
                class="tooltip"
                part="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                <div class="name">${this._tooltip.category}</div>
                <div>Value: ${this._tooltip.value}</div>
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
    'ui9000-matrix-chart': Ui9000MatrixChart;
  }
}

export function registerMatrixChart(): void {
  if (!customElements.get('ui9000-matrix-chart')) {
    customElements.define('ui9000-matrix-chart', Ui9000MatrixChart);
  }
}

registerMatrixChart();
