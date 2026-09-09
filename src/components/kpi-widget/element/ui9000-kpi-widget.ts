import { html, nothing, type PropertyValues } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import type { WidgetScale } from '../../../types/index.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import {
  getAdvancedSplitLayout,
  getKpiGridColumns,
  getKpiGridScrollAxis,
  MIN_KPI_CELL_WIDTH,
  visualisationChartType,
  normalizeKpiData,
  type AdvancedSplitLayout,
  type KpiCardModel,
  type KpiCardRole,
  type KpiGridScrollAxis,
  type KpiWidgetData,
  type KpiWidgetModel,
} from '../lib/index.js';
import { kpiWidgetStyles } from './styles.js';

@customElement('ui9000-kpi-widget')
export class Ui9000KpiWidget extends Ui9000ChartElement {
  static override styles = [kpiWidgetStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  @state()
  private _model: KpiWidgetModel = { layout: 'empty', cards: [], supporting: [] };

  @state()
  private _gridColumns = 1;

  @state()
  private _scrollAxis: KpiGridScrollAxis = 'vertical';

  @state()
  private _advancedSplit: AdvancedSplitLayout = 'horizontal';

  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  private _rendererLoading = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => this.scheduleLayout());
    this._resizeObserver.observe(this);
  }

  override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    super.disconnectedCallback();
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('dataJson')) {
      this._model = normalizeKpiData(parseJsonAttr<KpiWidgetData>(this.dataJson, null));
      this.updateGridLayout();
      this.ensureChartRenderer();
    }
  }

  /** Nested viz uses `<ui9000-chart-renderer>` — load it only for advanced KPIs. */
  private ensureChartRenderer(): void {
    if (
      this._rendererLoading ||
      this._model.layout !== 'advanced' ||
      !this._model.visualisation
    ) {
      return;
    }
    this._rendererLoading = true;
    void import('../../chart-renderer/index.js').then(() => this.requestUpdate());
  }

  private scheduleLayout(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.updateGridLayout());
  }

  private updateGridLayout(): void {
    const layout = this._model.layout;
    const count =
      layout === 'advanced' ? this._model.supporting.length : this._model.cards.length;
    const columns = getKpiGridColumns(this.clientWidth, Math.max(count, 1));
    const scrollAxis = getKpiGridScrollAxis(columns, count);
    const split = getAdvancedSplitLayout(
      this.clientWidth,
      this.clientHeight,
      this._advancedSplit,
    );
    if (columns !== this._gridColumns) this._gridColumns = columns;
    if (scrollAxis !== this._scrollAxis) this._scrollAxis = scrollAxis;
    if (split !== this._advancedSplit) this._advancedSplit = split;
  }

  private renderBadge(card: KpiCardModel) {
    if (!card.status) return nothing;
    return html`
      <span class="kpi-badge" data-variant=${card.status.variant}>${card.status.text}</span>
    `;
  }

  private renderValue(card: KpiCardModel) {
    const label = card.label;
    const unitLeft = label?.position === 'left' && label.text;
    const unitRight = label?.position === 'right' && label.text;
    const showIndicator = Boolean(card.showPercentage && card.indicator);

    return html`
      <div class="kpi-value-row">
        ${unitLeft ? html`<span class="kpi-unit">${unitLeft}</span>` : nothing}
        <h2 class="kpi-value">${card.value}</h2>
        ${card.suffix ? html`<span class="kpi-suffix">${card.suffix}</span>` : nothing}
        ${unitRight ? html`<span class="kpi-unit">${unitRight}</span>` : nothing}
        ${showIndicator
          ? html`
              <span class="kpi-indicator">
                <span class="kpi-indicator-arrow" aria-hidden="true">›</span>
                ${card.indicator}
              </span>
            `
          : nothing}
      </div>
    `;
  }

  private renderCard(card: KpiCardModel, role: KpiCardRole) {
    const showName = !card.hideName;
    const showHeaderBadge = Boolean(card.status) && (role === 'single' || role === 'main');
    const showInlineBadge = Boolean(card.status) && !showHeaderBadge;

    return html`
      <article class="kpi-card" data-role=${role} aria-label=${card.name}>
        ${showName || showHeaderBadge
          ? html`
              <div class="kpi-header">
                ${showName ? html`<p class="kpi-name">${card.name}</p>` : html`<span></span>`}
                ${showHeaderBadge ? this.renderBadge(card) : nothing}
              </div>
            `
          : nothing}
        ${this.renderValue(card)}
        ${showInlineBadge || card.subtitle
          ? html`
              <div class="kpi-subtitle-row">
                ${showInlineBadge ? this.renderBadge(card) : nothing}
                ${card.subtitle ? html`<p class="kpi-subtitle">${card.subtitle}</p>` : nothing}
              </div>
            `
          : nothing}
      </article>
    `;
  }

  private renderFooter() {
    const { target, showTimestamp, updatedAt } = this._model;
    const hasTarget = Boolean(target && String(target).length);
    const updated =
      showTimestamp && updatedAt
        ? new Date(updatedAt).toLocaleDateString('en-US')
        : '';
    if (!hasTarget && !updated) return nothing;

    return html`
      <div class="kpi-footer">
        ${hasTarget
          ? html`
              <div class="kpi-footer-block">
                <span class="kpi-footer-label">Target</span>
                <span class="kpi-footer-value">${target}</span>
              </div>
            `
          : html`<span></span>`}
        ${updated
          ? html`
              <div class="kpi-footer-block">
                <span class="kpi-footer-label">Updated</span>
                <span class="kpi-footer-value">${updated}</span>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private renderAdvanced() {
    const main = this._model.main;
    if (!main) return nothing;
    const viz = this._model.visualisation;
    const chartType =
      viz && typeof viz === 'object'
        ? visualisationChartType({ visualisation: viz })
        : undefined;
    const supporting = this._model.supporting;
    const supportingStyle =
      supporting.length > 0
        ? styleMap({
            gridTemplateColumns: `repeat(${this._gridColumns}, minmax(${MIN_KPI_CELL_WIDTH}px, 1fr))`,
          })
        : nothing;

    return html`
      <div class="kpi-advanced">
        <div class="kpi-advanced-main">
          <article class="kpi-card" data-role="main" aria-label=${main.name}>
            <div class="kpi-header">
              <p class="kpi-name">${main.name}</p>
              ${this.renderBadge(main)}
            </div>
            <div class="kpi-advanced-split" data-split=${this._advancedSplit}>
              <div class="kpi-advanced-value">${this.renderValue(main)}</div>
              ${viz && chartType
                ? html`
                    <div class="kpi-advanced-chart">
                      <ui9000-chart-renderer
                        data=${JSON.stringify(viz)}
                        chart-type=${chartType}
                        scale=${this.scale}
                        show-header="false"
                        show-legend="false"
                        show-grid
                        show-tooltip
                      ></ui9000-chart-renderer>
                    </div>
                  `
                : nothing}
            </div>
          </article>
        </div>
        ${supporting.length
          ? html`
              <div
                class="kpi-supporting"
                data-scroll=${this._scrollAxis}
                style=${supportingStyle}
              >
                ${supporting.map((card) => this.renderCard(card, 'supporting'))}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  override render() {
    const model = this._model;
    const layout = model.layout;
    const single = layout === 'single';
    const title = model.title;

    const gridStyle =
      layout === 'grid'
        ? styleMap({
            gridTemplateColumns: `repeat(${this._gridColumns}, minmax(${MIN_KPI_CELL_WIDTH}px, 1fr))`,
          })
        : nothing;

    return html`
      <div class="kpi-root" data-layout=${layout} data-single=${single ? 'true' : 'false'}>
        ${title ? html`<div class="kpi-section-title">${title}</div>` : nothing}
        ${layout === 'empty'
          ? html`<div class="empty">No KPI data</div>`
          : layout === 'advanced'
            ? this.renderAdvanced()
            : html`
                <div
                  class="kpi-grid"
                  data-layout=${single ? 'single' : 'grid'}
                  data-scroll=${this._scrollAxis}
                  style=${gridStyle}
                >
                  ${model.cards.map((card) =>
                    this.renderCard(card, single ? 'single' : 'grid'),
                  )}
                </div>
              `}
        ${this.renderFooter()}
        ${this.renderShellLabelTooltip()}
      </div>
    `;
  }
}

export function registerKpiWidget(): void {
  if (!customElements.get('ui9000-kpi-widget')) {
    customElements.define('ui9000-kpi-widget', Ui9000KpiWidget);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-kpi-widget': Ui9000KpiWidget;
  }
}
