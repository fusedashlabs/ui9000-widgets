import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { WidgetScale } from '../../../types/index.js';
import { getBubbleChartDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { swatchLegendEntries } from '../../../utils/chart-legend.js';
import { formatCompactNumber } from '../../../utils/fusedash-visual.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  normalizeBubbleData,
  type BubbleChartData,
  type BubbleModel,
} from '../lib/index.js';
import { renderBubbleChart } from '../render/draw.js';
import { bubbleChartStyles } from './styles.js';

@customElement('ui9000-bubble-chart')
export class Ui9000BubbleChart extends Ui9000ChartElement {
  static override styles = [bubbleChartStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: Boolean, attribute: 'show-grid' })
  showGrid = true;

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _tooltip: { x: number; y: number; lines: string[] } | null = null;

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

  private parseData(): BubbleModel {
    const raw = parseJsonAttr<BubbleChartData>(this.dataJson, null);
    return normalizeBubbleData(raw);
  }

  private renderLegend(model: BubbleModel) {
    if (!this.showLegend || model.groups.length <= 1) return nothing;
    const theme = readThemeFromElement(this);
    return renderChartLegend(
      swatchLegendEntries(
        model.groups.map((g) => g.label),
        theme,
        (_label, index) => model.groups[index]?.color ?? theme.primary,
      ),
    );
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._empty = model.points.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getBubbleChartDimensions(root);

    renderBubbleChart(root, {
      model,
      width,
      height,
      margin,
      theme,
      showGrid: this.showGrid,
      showTooltip: this.showTooltip,
      onHover: this.showTooltip
        ? ({ point, event }) => {
            const rect = this.getBoundingClientRect();
            const xLabel = model.axisDetails?.[model.xField]?.label ?? model.xField;
            const yLabel = model.axisDetails?.[model.yField]?.label ?? model.yField;
            const lines = [
              `${xLabel}: ${formatCompactNumber(point.x)}`,
              `${yLabel}: ${formatCompactNumber(point.y)}`,
            ];
            if (model.groupField) {
              const groupLabel =
                model.axisDetails?.[model.groupField]?.label ?? model.groupField;
              lines.push(`${groupLabel}: ${point.groupKey}`);
            }
            this._tooltip = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              lines,
            };
          }
        : undefined,
      onLeave: this.showTooltip ? () => { this._tooltip = null; } : undefined,
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
                Bubble chart requires two numeric fields. Pick numeric X and Y axes.
              </div>`
            : nothing}
          ${this._tooltip
            ? html`<div
                class="tooltip"
                part="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                ${this._tooltip.lines.map((line) => html`<div>${line}</div>`)}
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
    'ui9000-bubble-chart': Ui9000BubbleChart;
  }
}

export function registerBubbleChart(): void {
  if (!customElements.get('ui9000-bubble-chart')) {
    customElements.define('ui9000-bubble-chart', Ui9000BubbleChart);
  }
}

registerBubbleChart();
