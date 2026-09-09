import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import { renderPaletteLegend } from '../../../element/chart-legend-render.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { getSankeyDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  buildColorRanges,
  formatCapitalizedWords,
  formatSankeyValue,
  normalizeSankeyData,
  type SankeyColorRange,
  type SankeyInput,
  type SankeyModel,
} from '../lib/index.js';
import { renderSankeyChart } from '../render/draw.js';
import { sankeyStyles } from './styles.js';

interface TooltipRow {
  key: string;
  value: string;
}

interface SankeyView {
  empty: boolean;
  circular: boolean;
  sourceLabel: string;
  targetLabel: string;
  colorRanges: SankeyColorRange[];
}

const EMPTY_VIEW: SankeyView = {
  empty: true,
  circular: false,
  sourceLabel: '',
  targetLabel: '',
  colorRanges: [],
};

@customElement('ui9000-sankey-chart')
export class Ui9000SankeyChart extends Ui9000ChartElement {
  static override styles = [sankeyStyles, chartShellStyles];

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  /** Overrides the header above the left column. */
  @property({ type: String, attribute: 'source-label' })
  sourceLabel = '';

  /** Overrides the header above the right column. */
  @property({ type: String, attribute: 'target-label' })
  targetLabel = '';

  @state()
  private _tooltip: { x: number; y: number; rows: TooltipRow[] } | null = null;

  @state()
  private _view: SankeyView = EMPTY_VIEW;

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

  private parseData(): SankeyModel {
    return normalizeSankeyData(parseJsonAttr<SankeyInput>(this.dataJson, []));
  }

  private renderLegend() {
    if (!this.showLegend || this._view.empty || !this._view.colorRanges.length) {
      return nothing;
    }
    return renderPaletteLegend(this._view.colorRanges.map((range) => range.color));
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    const colorRanges = buildColorRanges(
      model.links.map((l) => l.value),
      model.colors,
    );

    this._view = {
      empty: model.links.length === 0,
      circular: model.circular,
      sourceLabel: this.sourceLabel || model.sourceLabel,
      targetLabel: this.targetLabel || model.targetLabel,
      colorRanges,
    };

    if (!model.links.length) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height } = getSankeyDimensions(root);

    renderSankeyChart(root, {
      model,
      colorRanges,
      width,
      height,
      theme,
      onLinkHover: this.showTooltip
        ? ({ sourceLabel, targetLabel, value, event }) => {
            this.setTooltip(event, [
              { key: this._view.sourceLabel, value: formatCapitalizedWords(sourceLabel) },
              { key: model.valueLabel, value: formatSankeyValue(value) },
              { key: this._view.targetLabel, value: formatCapitalizedWords(targetLabel) },
            ]);
          }
        : undefined,
      onLinkLeave: this.showTooltip ? () => this.clearTooltip() : undefined,
      onLabelHover: this.showTooltip
        ? ({ label, event }) => this.setTooltip(event, [{ key: '', value: label }])
        : undefined,
      onLabelLeave: this.showTooltip ? () => this.clearTooltip() : undefined,
    });
  }

  private setTooltip(event: MouseEvent, rows: TooltipRow[]): void {
    const rect = this.getBoundingClientRect();
    this._tooltip = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      rows,
    };
  }

  private clearTooltip(): void {
    this._tooltip = null;
  }

  override render() {
    const { empty, circular, sourceLabel, targetLabel } = this._view;
    const showHeaders = !empty && Boolean(sourceLabel || targetLabel);

    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(this.headerTitle())}
        <div class="widget-body">
          ${this.renderLegend()}
          ${showHeaders
            ? html`<div class="axis-labels" part="axis-labels">
                <div>${sourceLabel}</div>
                <div>${targetLabel}</div>
              </div>`
            : nothing}

          <div class="chart-root" part="chart" ?hidden=${empty}></div>

          ${empty
            ? html`<div class="empty" part="empty">
                ${circular
                  ? 'Circular dependency detected in the data — this cannot be drawn as a Sankey.'
                  : 'No data'}
              </div>`
            : nothing}

          ${this._tooltip
            ? html`<div
                class="tooltip"
                part="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                ${this._tooltip.rows.map(
                  (row) =>
                    html`<div>
                      ${row.key ? html`<span class="key">${row.key}:</span> ` : nothing}${row.value}
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
    'ui9000-sankey-chart': Ui9000SankeyChart;
  }
}

export function registerSankeyChart(): void {
  if (!customElements.get('ui9000-sankey-chart')) {
    customElements.define('ui9000-sankey-chart', Ui9000SankeyChart);
  }
}

registerSankeyChart();
