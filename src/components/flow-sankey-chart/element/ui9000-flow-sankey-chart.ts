import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import {
  CSS_VARS,
  readCssVar,
  readThemeFromElement,
  themeToCssVars,
} from '../../../context/widget-context.js';
import { DARK_THEME, DEFAULT_THEME, type WidgetTheme } from '../../../types/index.js';
import { renderChartLegend } from '../../../element/chart-legend-render.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { getFlowSankeyDimensions, parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  MAX_FLOW_LINKS,
  buildSeverityLegend,
  formatFlowValue,
  formatShare,
  neutralColor,
  normalizeFlowSankeyData,
  type FlowLegendEntry,
  type FlowSankeyInput,
  type FlowSankeyModel,
  type FlowSummaryCard,
} from '../lib/index.js';
import { renderFlowSankeyChart } from '../render/draw.js';
import { summaryIcon } from './icons.js';
import { flowSankeyStyles } from './styles.js';

/**
 * `show-*` flags arrive as the string "false" from `ui9000-chart-renderer`; a
 * plain `type: Boolean` would read any present attribute as true and the host
 * could never turn one off.
 */
const flagConverter = {
  fromAttribute: (value: string | null): boolean =>
    value !== null && value !== 'false',
  toAttribute: (value: boolean): string => (value ? '' : 'false'),
};

interface FlowSankeyView {
  empty: boolean;
  circular: boolean;
  subtitle: string;
  legendLabel: string;
  legend: FlowLegendEntry[];
  summary: FlowSummaryCard[];
  droppedLinks: number;
}

const EMPTY_VIEW: FlowSankeyView = {
  empty: true,
  circular: false,
  subtitle: '',
  legendLabel: '',
  legend: [],
  summary: [],
  droppedLinks: 0,
};

@customElement('ui9000-flow-sankey-chart')
export class Ui9000FlowSankeyChart extends Ui9000ChartElement {
  static override styles = [flowSankeyStyles, chartShellStyles];

  @property({ converter: flagConverter, attribute: 'show-legend' })
  showLegend = true;

  @property({ converter: flagConverter, attribute: 'show-tooltip' })
  showTooltip = true;

  /** Percentage gutter and its tick stubs. */
  @property({ converter: flagConverter, attribute: 'show-grid' })
  showGrid = true;

  /** Header cards above the plot (`Total Events`, `Time range`). */
  @property({ converter: flagConverter, attribute: 'show-summary' })
  showSummary = true;

  /**
   * Overrides the payload's subtitle, the way `chart-title` overrides its name.
   *
   * Null (the attribute absent) falls back to the payload. An empty attribute
   * is an explicit choice and suppresses the subtitle, so a host can turn it
   * off without having to edit the data.
   */
  @property({ type: String, attribute: 'chart-subtitle' })
  chartSubtitle: string | null = null;

  /** Overrides what the legend says its swatches encode. */
  @property({ type: String, attribute: 'legend-label' })
  legendLabel = '';

  /**
   * `light` or `dark`. Empty follows the host: a `data-theme="dark"` ancestor,
   * then the `--ui9000-mode` variable.
   */
  @property({ type: String, reflect: true })
  theme = '';

  /** Node id whose cause → impact path starts highlighted. */
  @property({ type: String, attribute: 'selected-node' })
  selectedNode = '';

  @state()
  private _view: FlowSankeyView = EMPTY_VIEW;

  /** Resolved before each render, so chrome and plot never disagree. */
  private _mode: 'light' | 'dark' = 'light';
  private _theme: WidgetTheme = DEFAULT_THEME;
  /** True when the appearance was asked for rather than inherited. */
  private _ownsPalette = false;

  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  /**
   * Selection is draw-layer state; it must never trigger a Lit redraw. Clicks
   * and `selected-node` both write it, whichever changed last wins.
   */
  private _selectedId: string | null = null;

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
   * An explicit `theme` beats a `data-theme` ancestor, which beats
   * `--ui9000-mode`.
   *
   * Who then owns the colours depends on how the mode was chosen. Asked for
   * outright, the chart paints its own palette: ambient `--ui9000-color-*`
   * defaults are everywhere (Storybook sets a light set on every story), and
   * letting those win leaves dark ink on the dark panel. Inherited from
   * `--ui9000-mode`, the host is doing the theming, so its variables win.
   * Either way the font family follows the host — it is not an appearance.
   */
  private resolveAppearance(): void {
    const explicit =
      this.theme === 'dark' || this.theme === 'light' ? this.theme : '';
    const fromHost = this.closest('[data-theme="dark"]') ? 'dark' : '';
    const asked = explicit || fromHost;
    const fromVar =
      readCssVar(this, CSS_VARS.mode, 'light') === 'dark' ? 'dark' : 'light';

    this._mode = (asked || fromVar) === 'dark' ? 'dark' : 'light';
    this._ownsPalette = Boolean(asked);

    const base = this._mode === 'dark' ? DARK_THEME : DEFAULT_THEME;
    this._theme = this._ownsPalette
      ? {
          ...base,
          fontFamily: readCssVar(this, CSS_VARS.fontFamily, base.fontFamily),
        }
      : readThemeFromElement(this, base);

    if (this.getAttribute('data-mode') !== this._mode) {
      this.setAttribute('data-mode', this._mode);
    }
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('selectedNode')) this._selectedId = this.selectedNode || null;
    this.resolveAppearance();
  }

  /**
   * The resolved palette as CSS variables for the shell — including the panel
   * fill and borders, which `WidgetTheme` carries here — so the HTML chrome and
   * the SVG plot are painted from one source.
   */
  private shellVars(): Record<string, string> {
    return themeToCssVars(this._theme);
  }

  override updated(changed: PropertyValues): void {
    if (chartPropsChanged(changed)) this.scheduleDraw();
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  private parseData(): FlowSankeyModel {
    return normalizeFlowSankeyData(
      parseJsonAttr<FlowSankeyInput>(this.dataJson, []),
    );
  }

  private renderLegend() {
    if (!this.showLegend || this._view.empty || !this._view.legend.length) {
      return nothing;
    }
    return renderChartLegend(
      this._view.legend.map((entry) => ({
        label: entry.label,
        swatch: { kind: 'swatch' as const, color: entry.color },
      })),
      this._view.legendLabel,
    );
  }

  private renderSummary(): TemplateResult | typeof nothing {
    if (!this.showSummary || !this._view.summary.length) return nothing;
    return html`
      <div class="summary-cards" part="summary">
        ${this._view.summary.map(
          (card) => html`
            <div class="summary-card">
              ${card.icon
                ? html`<span class="summary-icon"
                    >${summaryIcon(card.icon) ?? card.icon}</span
                  >`
                : nothing}
              <span class="summary-text">
                <span class="summary-label">${card.label}</span>
                ${card.caption
                  ? html`<span class="summary-caption">${card.caption}</span>`
                  : nothing}
              </span>
              ${card.value
                ? html`<span class="summary-value">${card.value}</span>`
                : nothing}
            </div>
          `,
        )}
      </div>
    `;
  }

  private draw(): void {
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!root) return;

    const model = this.parseData();
    this._view = {
      empty: model.links.length === 0,
      circular: model.circular,
      subtitle: this.chartSubtitle ?? model.subtitle,
      legendLabel: this.legendLabel || model.legendLabel,
      legend: buildSeverityLegend(model, neutralColor(this._mode)),
      summary: model.summary,
      droppedLinks: model.droppedLinks,
    };

    if (!model.links.length) {
      root.replaceChildren();
      return;
    }

    const { width, height } = getFlowSankeyDimensions(root);

    renderFlowSankeyChart(root, {
      model,
      width,
      height,
      theme: this._theme,
      themeMode: this._mode,
      showGrid: this.showGrid,
      selectedId: this._selectedId,
      onLinkHover: this.showTooltip
        ? ({ sourceLabel, targetLabel, value, event }) => {
            this.openTooltip(event, {
              rows: [
                { label: 'From', value: sourceLabel },
                { label: 'To', value: targetLabel },
                {
                  label: model.valueLabel || 'Value',
                  value: formatFlowValue(value),
                },
              ],
            });
          }
        : undefined,
      onLinkLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
      onNodeHover: this.showTooltip
        ? ({ label, stageLabel, value, share, event }) => {
            this.openTooltip(event, {
              rows: [
                { label: stageLabel || 'Stage', value: label },
                {
                  label: model.valueLabel || 'Value',
                  value: `${formatFlowValue(value)} ${formatShare(share)}`.trim(),
                },
              ],
            });
          }
        : undefined,
      onNodeLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
      onSelect: (nodeId) => {
        this._selectedId = nodeId;
        this.dispatchEvent(
          new CustomEvent('flow-select', {
            detail: { nodeId },
            bubbles: true,
            composed: true,
          }),
        );
      },
    });
  }

  /** Says so when the cap left the smallest flows off the plot. */
  private renderCapNote(): TemplateResult | typeof nothing {
    const { empty, droppedLinks } = this._view;
    if (empty || !droppedLinks) return nothing;
    const total = formatFlowValue(MAX_FLOW_LINKS + droppedLinks);
    return html`<div class="cap-note" part="note">
      Showing the ${formatFlowValue(MAX_FLOW_LINKS)} largest of ${total} flows.
    </div>`;
  }

  override render() {
    const { empty, circular } = this._view;
    // `headerTitle()` already returns '' when the host suppressed the header;
    // the subtitle and cards belong to that same chrome, so they follow it.
    const title = this.headerTitle();
    // No overflow menu: its only item was "Download image", and this chart is
    // read in place rather than exported.
    const chrome = this.showHeader
      ? {
          subtitle: this._view.subtitle,
          aside: this.renderSummary(),
          showActions: false,
        }
      : { showActions: false };

    return html`
      <div
        class="widget-shell"
        part="shell"
        style=${styleMap(this.shellVars())}
      >
        ${this.renderShellHeader(title, chrome)}
        <div class="widget-body">
          ${this.renderLegend()}

          <div class="chart-root" part="chart" ?hidden=${empty}></div>

          ${empty
            ? html`<div class="empty" part="empty">
                ${circular
                  ? 'Circular dependency detected in the data — this cannot be drawn as a flow.'
                  : 'No data'}
              </div>`
            : nothing}

          ${this.renderCapNote()}

          ${this.renderShellLabelTooltip()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-flow-sankey-chart': Ui9000FlowSankeyChart;
  }
}

export function registerFlowSankeyChart(): void {
  if (!customElements.get('ui9000-flow-sankey-chart')) {
    customElements.define('ui9000-flow-sankey-chart', Ui9000FlowSankeyChart);
  }
}

registerFlowSankeyChart();
