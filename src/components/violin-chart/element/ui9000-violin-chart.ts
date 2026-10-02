import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import { getViolinDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  normalizeViolinData,
  type ViolinChartData,
  type ViolinModel,
  type ViolinOrientation,
} from '../lib/index.js';
import { renderViolinChart } from '../render/draw.js';
import { violinStyles } from './styles.js';

@customElement('ui9000-violin-chart')
export class Ui9000ViolinChart extends Ui9000ChartElement {
  static override styles = [violinStyles, chartShellStyles];

  /** Client ViolinChart: horizontal | vertical (default vertical when unset). */
  @property({ type: String })
  orientation: ViolinOrientation = 'vertical';

  @property({ type: Boolean, attribute: 'show-grid' })
  showGrid = true;

  /** Client hardcodes legend off. */
  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = false;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = false;

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

  private parseData(): ViolinModel {
    const raw = parseJsonAttr<ViolinChartData>(this.dataJson, [] as never);
    const model = normalizeViolinData(raw);
    if (this.orientation === 'horizontal' || this.orientation === 'vertical') {
      return { ...model, orientation: this.orientation };
    }
    return model;
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
    this._empty = model.groups.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const orientation = this.orientation;
    const { width, height, margin } = getViolinDimensions(root, orientation);

    renderViolinChart(root, {
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
    });
  }

  override render() {
    const title = this.headerTitle();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
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
    'ui9000-violin-chart': Ui9000ViolinChart;
  }
}

export function registerViolinChart(): void {
  if (!customElements.get('ui9000-violin-chart')) {
    customElements.define('ui9000-violin-chart', Ui9000ViolinChart);
  }
}

registerViolinChart();
