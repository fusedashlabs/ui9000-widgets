import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import { getWaterfallDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { swatchLegendEntries } from '../../../utils/chart-legend.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  normalizeWaterfallData,
  type WaterfallChartData,
  type WaterfallModel,
  type WaterfallOrientation,
  type WaterfallStep,
} from '../lib/index.js';
import { renderWaterfallChart } from '../render/draw.js';
import { waterfallStyles } from './styles.js';

@customElement('ui9000-waterfall-chart')
export class Ui9000WaterfallChart extends Ui9000ChartElement {
  static override styles = [waterfallStyles, chartShellStyles];

  /** Client WaterfallChart: horizontal (default mock) | vertical. */
  @property({ type: String })
  orientation: WaterfallOrientation = 'horizontal';

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

  override firstUpdated(): void {
    const body = this.shadowRoot?.querySelector('.widget-body');
    if (body instanceof HTMLElement) this._resizeObserver?.observe(body);
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  private parseData(): WaterfallModel {
    const raw = parseJsonAttr<WaterfallChartData>(this.dataJson, [] as never);
    const model = normalizeWaterfallData(raw);
    if (this.orientation === 'horizontal' || this.orientation === 'vertical') {
      return { ...model, orientation: this.orientation };
    }
    return model;
  }

  private renderLegend(model: WaterfallModel) {
    if (!this.showLegend || model.steps.length === 0) return nothing;
    const theme = readThemeFromElement(this);
    const keys = ['positive', 'negative'];
    const colors = [model.colors.positive, model.colors.negative];
    return renderChartLegend(
      swatchLegendEntries(keys, theme, (_k, i) => colors[i]!),
    );
  }

  protected override onThemeChange(): void {
    this.scheduleDraw();
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as
      | HTMLElement
      | null;
    if (!root) return;

    const model = this.parseData();
    this._empty = model.steps.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const orientation = this.orientation;
    const { width, height, margin } = getWaterfallDimensions(root, orientation);

    renderWaterfallChart(root, {
      model,
      width,
      height,
      margin,
      theme,
      themeMode: this.themeMode(),
      orientation,
      showGrid: this.showGrid,
      xLabel: this.xLabel || undefined,
      yLabel: this.yLabel || undefined,
      ...this.axisLabelHandlers(),
      onStepHover: this.showTooltip
        ? ({ step, event }: { step: WaterfallStep; event: MouseEvent }) => {
            this.openTooltip(event, {
              title: step.label,
              rows: [
                { label: 'Start', value: String(step.start) },
                { label: 'End', value: String(step.end) },
                { label: 'Difference', value: String(step.difference) },
                { label: 'Vector', value: step.vector },
              ],
            });
          }
        : undefined,
      onStepLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const model = this.parseData();
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
    'ui9000-waterfall-chart': Ui9000WaterfallChart;
  }
}

export function registerWaterfallChart(): void {
  if (!customElements.get('ui9000-waterfall-chart')) {
    customElements.define('ui9000-waterfall-chart', Ui9000WaterfallChart);
  }
}

registerWaterfallChart();
