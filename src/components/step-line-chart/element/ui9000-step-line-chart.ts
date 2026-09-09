import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import type { DataPoint, WidgetScale } from '../../../types/index.js';
import { getStepLineDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { lineLegendEntries } from '../../../utils/chart-legend.js';
import {
  isFuseWidgetPayload,
  xDomainHintFromWidget,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import { FD } from '../../../utils/fusedash-visual.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  formatCompact,
  normalizeStepLineData,
  type StepLineChartData,
  type StepLineGrafType,
  type StepLineHoverEntry,
  type StepLineSeries,
} from '../lib/index.js';
import { renderStepLineChart } from '../render/draw.js';
import { stepLineChartStyles } from './styles.js';

@customElement('ui9000-step-line-chart')
export class Ui9000StepLineChart extends Ui9000ChartElement {
  static override styles = [stepLineChartStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @property({ type: String, attribute: 'graf-type' })
  grafType: StepLineGrafType = 'none';

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
  private _tooltip: {
    x: number;
    y: number;
    xLabel: string;
    entries: StepLineHoverEntry[];
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

  private parseData(): StepLineSeries[] {
    const raw = parseJsonAttr<DataPoint[] | StepLineChartData | StepLineSeries[] | FuseWidgetLike>(
      this.dataJson,
      [],
    );
    return normalizeStepLineData(raw);
  }

  private xDomainHint(): string[] | undefined {
    const raw = parseJsonAttr<unknown>(this.dataJson, null);
    if (isFuseWidgetPayload(raw)) return xDomainHintFromWidget(raw);
    return undefined;
  }

  private renderLegend(series: StepLineSeries[]) {
    const overlay =
      this.grafType === 'curve'
        ? { label: 'Ideal', kind: 'line' as const, color: FD.stepIdealColor }
        : this.grafType === 'line'
          ? { label: 'Random guessing', kind: 'dashed-line' as const, color: '' }
          : null;
    const itemCount = series.length + (overlay ? 1 : 0);
    if (!this.showLegend || itemCount <= 1) return nothing;
    const theme = readThemeFromElement(this);
    const entries = lineLegendEntries(series, theme);
    if (overlay) {
      entries.push({
        label: overlay.label,
        swatch:
          overlay.kind === 'dashed-line'
            ? { kind: 'dashed-line', color: theme.textMuted }
            : { kind: 'line', color: overlay.color },
      });
    }
    return renderChartLegend(entries);
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const series = this.parseData();
    this._empty = series.length === 0 || series.every((s) => !s.points.length);
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height, margin } = getStepLineDimensions(root);

    renderStepLineChart(root, {
      series,
      width,
      height,
      margin,
      theme,
      grafType: this.grafType,
      showGrid: this.showGrid,
      xDomainHint: this.xDomainHint(),
      showTooltip: this.showTooltip,
      xLabel: this.xLabel || undefined,
      yLabel: this.yLabel || undefined,
      ...this.axisLabelHandlers(),
      onHover: this.showTooltip
        ? ({ xLabel, entries, event }) => {
            const rect = this.getBoundingClientRect();
            this._tooltip = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              xLabel,
              entries,
            };
          }
        : undefined,
      onLeave: this.showTooltip ? () => { this._tooltip = null; } : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const series =
      this._empty ? [] : this.parseData().filter((s) => s.points.length > 0);
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${this.renderLegend(series)}
          <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
          ${this._empty ? html`<div class="empty" part="empty">No data</div>` : nothing}
          ${this._tooltip
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
          ${this.renderShellLabelTooltip()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-step-line-chart': Ui9000StepLineChart;
  }
}

export function registerStepLineChart(): void {
  if (!customElements.get('ui9000-step-line-chart')) {
    customElements.define('ui9000-step-line-chart', Ui9000StepLineChart);
  }
}

registerStepLineChart();
