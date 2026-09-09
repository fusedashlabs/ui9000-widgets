import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { WidgetScale } from '../../../types/index.js';
import { getPunchcardDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  normalizePunchcardData,
  type PunchcardInput,
  type PunchcardModel,
} from '../lib/index.js';
import { renderPunchcardChart } from '../render/draw.js';
import { punchcardStyles } from './styles.js';

@customElement('ui9000-punchcard-chart')
export class Ui9000PunchcardChart extends Ui9000ChartElement {
  static override styles = [punchcardStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: Boolean, attribute: 'show-grid' })
  showGrid = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @property({ type: String, attribute: 'x-label' })
  xLabel = '';

  @property({ type: String, attribute: 'y-label' })
  yLabel = '';

  @state()
  private _tooltip: {
    x: number;
    y: number;
    cellX: string;
    cellY: string;
    cellValue: number;
  } | null = null;

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

  private parseData(): PunchcardModel {
    const raw = parseJsonAttr<PunchcardInput>(this.dataJson, []);
    return normalizePunchcardData(raw);
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._empty = model.cells.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getPunchcardDimensions(root);

    renderPunchcardChart(root, {
      model,
      width,
      height,
      margin,
      theme,
      showGrid: this.showGrid,
      xLabel: this.xLabel || undefined,
      yLabel: this.yLabel || undefined,
      ...this.axisLabelHandlers(),
      onCellHover: this.showTooltip
        ? ({ cell, event }) => {
            const rect = this.getBoundingClientRect();
            this._tooltip = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              cellX: cell.x,
              cellY: cell.y,
              cellValue: cell.value,
            };
          }
        : undefined,
      onCellLeave: this.showTooltip ? () => { this._tooltip = null; } : undefined,
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
          ${this._tooltip
            ? html`<div
                class="tooltip"
                part="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                <div class="name">${this._tooltip.cellY}</div>
                <div>${this._tooltip.cellX}: ${this._tooltip.cellValue}</div>
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
    'ui9000-punchcard-chart': Ui9000PunchcardChart;
  }
}

export function registerPunchcardChart(): void {
  if (!customElements.get('ui9000-punchcard-chart')) {
    customElements.define('ui9000-punchcard-chart', Ui9000PunchcardChart);
  }
}

registerPunchcardChart();
