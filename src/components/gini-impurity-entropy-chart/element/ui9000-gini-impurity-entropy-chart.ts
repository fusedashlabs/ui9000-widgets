import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import {
  chartShellStyles,
  Ui9000ChartElement,
} from '../../../element/ui9000-chart-base.js';
import type { DataPoint } from '../../../types/index.js';
import {
  getGiniImpurityEntropyDimensions,
  parseJsonAttr,
} from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  formatImpurityValue,
  formatProbability,
  normalizeGiniImpurityEntropyData,
  type GiniImpurityEntropyChartData,
  type GiniImpurityEntropyFusePayload,
  type GiniImpurityEntropyModel,
} from '../lib/index.js';
import { renderGiniImpurityEntropyChart } from '../render/draw.js';
import { giniImpurityEntropyChartStyles } from './styles.js';

type GiniPayload =
  | DataPoint[]
  | GiniImpurityEntropyChartData
  | GiniImpurityEntropyFusePayload;

@customElement('ui9000-gini-impurity-entropy-chart')
export class Ui9000GiniImpurityEntropyChart extends Ui9000ChartElement {
  static override styles = [giniImpurityEntropyChartStyles, chartShellStyles];

  @property({ type: Boolean, attribute: 'show-grid' })
  showGrid = true;

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  /** Client `showPHat` — vertical guide at the observed class proportion. */
  @property({ type: Boolean, attribute: 'show-p-hat' })
  showPHat = false;

  /** Client `showCI` — shaded confidence band around `pHat`. */
  @property({ type: Boolean, attribute: 'show-ci' })
  showCI = false;

  /** Client `showSplit` — child markers plus their ΔGini. */
  @property({ type: Boolean, attribute: 'show-split' })
  showSplit = false;

  @state()
  private _empty = false;

  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  /** Tooltip state re-renders on every mousemove — never re-parse the payload. */
  private _model?: { key: string; value: GiniImpurityEntropyModel };

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

  private parseModel(): GiniImpurityEntropyModel {
    const key = `${this.showPHat}|${this.showCI}|${this.showSplit}|${this.dataJson}`;
    if (this._model?.key === key) return this._model.value;

    const raw = parseJsonAttr<GiniPayload | null>(this.dataJson, null);
    const value = normalizeGiniImpurityEntropyData(raw, {
      // Only pass a flag on when set, so the widget `meta` stays in charge.
      showPHat: this.showPHat || undefined,
      showCI: this.showCI || undefined,
      showSplit: this.showSplit || undefined,
    });
    this._model = { key, value };
    return value;
  }

  private renderLegend(model: GiniImpurityEntropyModel) {
    if (!this.showLegend || !model.series.length) return nothing;
    return renderChartLegend(
      model.series.map((s) => ({
        label: s.name,
        swatch: s.dash
          ? { kind: 'dashed-line' as const, color: s.color }
          : { kind: 'line' as const, color: s.color },
      })),
    );
  }

  protected override onThemeChange(): void {
    this.scheduleDraw();
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector(
      '.chart-root',
    ) as HTMLElement | null;
    if (!root) return;

    const model = this.parseModel();
    this._empty = model.series.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const { width, height, margin } = getGiniImpurityEntropyDimensions(root);

    renderGiniImpurityEntropyChart(root, {
      model,
      width,
      height,
      margin,
      theme: readThemeFromElement(this),
      themeMode: this.themeMode(),
      showGrid: this.showGrid,
      ...this.axisLabelHandlers(),
      onHover: this.showTooltip
        ? ({ p, entries, event }) => {
            this.openTooltip(event, {
              title: `p = ${formatProbability(p)}`,
              rows: entries.map((entry) => ({
                label: entry.seriesName,
                value: formatImpurityValue(entry.value),
              })),
            });
          }
        : undefined,
      onLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const model = this.parseModel();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${this.renderLegend(model)}
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
    'ui9000-gini-impurity-entropy-chart': Ui9000GiniImpurityEntropyChart;
  }
}

export function registerGiniImpurityEntropyChart(): void {
  if (!customElements.get('ui9000-gini-impurity-entropy-chart')) {
    customElements.define(
      'ui9000-gini-impurity-entropy-chart',
      Ui9000GiniImpurityEntropyChart,
    );
  }
}

registerGiniImpurityEntropyChart();
