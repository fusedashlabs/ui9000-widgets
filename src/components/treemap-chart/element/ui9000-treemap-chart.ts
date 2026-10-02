import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import { renderPaletteLegend } from '../../../element/chart-legend-render.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { getTreemapDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import { formatValueWithUnit } from '../../../utils/axis-units.js';
import { formatCapitalizedText, formatCapitalizedWords } from '../../../utils/format-text.js';
import { formatTreemapValue } from '../lib/format.js';
import { normalizeTreemapData } from '../lib/normalize.js';
import type { TreemapChartData, TreemapModel } from '../lib/types.js';
import { renderTreemapChart, type TreemapHoverPayload } from '../render/draw.js';
import { treemapChartStyles } from './styles.js';

type TooltipRow = { label: string; value: string };

@customElement('ui9000-treemap-chart')
export class Ui9000TreemapChart extends Ui9000ChartElement {
  static override styles = [treemapChartStyles, chartShellStyles];

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _empty = false;

  @state()
  private _rangeColors: string[] = [];

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

  /**
   * The palette legend only appears once the data is known, which shortens the
   * plot — observing the plot box (not just the host) redraws it at the size it
   * actually got.
   */
  override firstUpdated(): void {
    const root = this.shadowRoot?.querySelector('.chart-root');
    if (root) this._resizeObserver?.observe(root);
  }

  override updated(changed: PropertyValues): void {
    if (chartPropsChanged(changed)) this.scheduleDraw();
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  private parseData(): TreemapModel {
    const raw = parseJsonAttr<TreemapChartData>(this.dataJson, null);
    return this.withSeriesMode(() => normalizeTreemapData(raw));
  }

  /** Client tooltip: `Value` plus the dimension the tile encodes. */
  private tooltipFor(model: TreemapModel, payload: TreemapHoverPayload): {
    title?: string;
    rows: TooltipRow[];
  } {
    const { tile, group } = payload;
    const rows: TooltipRow[] = [
      { label: 'Value', value: formatTreemapValue(tile.value, model.mode) },
    ];

    if (model.mode === 'grouped') {
      // The tile is a subgroup value, so the second row names the card it sits
      // in — the client labels it with `groupBy[0]` but prints the tile again.
      if (group && model.categoryField) {
        rows.push({ label: formatCapitalizedText(model.categoryField), value: group.label });
      }
      return { title: formatCapitalizedWords(tile.label), rows };
    }

    if (model.categoryField) {
      const detail = model.axisDetails?.[model.categoryField];
      rows.push({
        label: detail?.label ?? model.categoryField,
        value: formatValueWithUnit(tile.label, detail),
      });
    }
    return { rows };
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._empty = model.mode === 'single' ? !model.tiles.length : !model.groups.length;
    // Grouped cards ramp their own colors, so the shared strip is single-mode only.
    this._rangeColors = !this._empty && model.mode === 'single' ? model.rangeColors : [];

    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const theme = readThemeFromElement(this);
    const { width, height } = getTreemapDimensions(root);

    renderTreemapChart(root, {
      model,
      width,
      height,
      theme,
      showTooltip: this.showTooltip,
      onHover: this.showTooltip
        ? (payload) => {
            this.openTooltip(payload.event, this.tooltipFor(model, payload));
          }
        : undefined,
      onLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  private renderLegend() {
    if (!this.showLegend || !this._rangeColors.length) return nothing;
    return renderPaletteLegend(this._rangeColors);
  }

  override render() {
    const title = this.headerTitle();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          ${this.renderLegend()}
          <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
          ${this._empty ? html`<div class="empty" part="empty">No data</div>` : nothing}
          ${this.renderShellLabelTooltip()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-treemap-chart': Ui9000TreemapChart;
  }
}

export function registerTreemapChart(): void {
  if (!customElements.get('ui9000-treemap-chart')) {
    customElements.define('ui9000-treemap-chart', Ui9000TreemapChart);
  }
}

registerTreemapChart();
