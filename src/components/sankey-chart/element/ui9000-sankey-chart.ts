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

  protected override onThemeChange(): void {
    this.scheduleDraw();
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  private parseData(): SankeyModel {
    return this.withSeriesMode(() => normalizeSankeyData(parseJsonAttr<SankeyInput>(this.dataJson, [])));
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
      themeMode: this.themeMode(),
      onLinkHover: this.showTooltip
        ? ({ sourceLabel, targetLabel, value, event }) => {
            this.openTooltip(event, {
              rows: [
                {
                  label: this._view.sourceLabel,
                  value: formatCapitalizedWords(sourceLabel),
                },
                { label: model.valueLabel, value: formatSankeyValue(value) },
                {
                  label: this._view.targetLabel,
                  value: formatCapitalizedWords(targetLabel),
                },
              ],
            });
          }
        : undefined,
      onLinkLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
      onLabelHover: this.showTooltip
        ? ({ label, event }) =>
            this.openTooltip(event, { rows: [{ label: '', value: label }] })
        : undefined,
      onLabelLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
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
