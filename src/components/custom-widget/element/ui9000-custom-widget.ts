import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { loadChart } from '../../../lazy/index.js';
import type { WidgetScale } from '../../../types/index.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import {
  normalizeCustomWidget,
  paneFlexDirection,
  type ArrangingDirection,
  type CustomPane,
  type CustomWidgetModel,
} from '../lib/index.js';
import { customWidgetStyles } from './styles.js';

/**
 * `show-*` flags default to on; `show-x="false"` turns them off. Matches how
 * `ui9000-chart-renderer` reads the same attributes.
 */
const flagConverter = {
  fromAttribute: (value: string | null): boolean => value !== null && value !== 'false',
  toAttribute: (value: boolean): string => (value ? '' : 'false'),
};

const EMPTY_MODEL: CustomWidgetModel = {
  title: '',
  direction: 'vertical',
  hasKpi: false,
  panes: [],
  widget: null,
  isEmpty: true,
};

/** Client `WidgetDefaultState` copy, minus the editor-only toolbar */
const DEFAULT_STATE_TITLE = 'Choose an Option';
const DEFAULT_STATE_SUBTITLE =
  'We recommend starting with a chart, then enhancing your widget with lists, tables, or descriptions.';

/**
 * FuseDash CustomWidget shell: title, optional KPI band, and up to two arranged
 * panes. Chart panes mount `ui9000-chart-renderer`, the KPI band mounts
 * `ui9000-kpi-widget`; table / text / image panes mount those primitives.
 */
@customElement('ui9000-custom-widget')
export class Ui9000CustomWidget extends Ui9000ChartElement {
  static override styles = [customWidgetStyles, chartShellStyles];

  @property({ type: String, attribute: 'scale' })
  scale: WidgetScale = 'default';

  /** Overrides `arranging.direction` from the payload */
  @property({ type: String, attribute: 'direction' })
  direction: ArrangingDirection | '' = '';

  @property({ converter: flagConverter, attribute: 'show-grid' })
  showGrid = true;

  @property({ converter: flagConverter, attribute: 'show-legend' })
  showLegend = true;

  @property({ converter: flagConverter, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _model: CustomWidgetModel = EMPTY_MODEL;

  /**
   * In-memory payload. Not mirrored to the `data` attribute. A host that
   * rewrites iframe attributes must not replace rows already drawn.
   */
  private _widgetJson: string | null = null;

  get widgetJson(): string {
    return this._widgetJson ?? this.dataJson;
  }

  set widgetJson(value: string) {
    const next = value && value.trim() ? value : '{}';
    if (next === this._widgetJson) return;
    this._widgetJson = next;
    this.dataJson = next;
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'data' && this._widgetJson != null) return;
    super.attributeChangedCallback(name, old, value);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._model = normalizeCustomWidget(parseJsonAttr<unknown>(this.dataJson, null));
    void this.loadPaneElements();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) {
      this._model = normalizeCustomWidget(parseJsonAttr<unknown>(this.dataJson, null));
      void this.loadPaneElements();
    }
  }

  /** Register the child elements this model actually uses. */
  private async loadPaneElements(): Promise<void> {
    const pending: Promise<unknown>[] = [];
    if (this._model.hasKpi) pending.push(loadChart('kpi-widget'));
    if (this._model.panes.some((pane) => pane.kind === 'chartWidget' && pane.renderable)) {
      pending.push(loadChart('chart-renderer'));
    }
    if (this._model.panes.some((pane) => pane.kind === 'tableWidget' && pane.renderable)) {
      pending.push(loadChart('table'));
    }
    if (this._model.panes.some((pane) => pane.kind === 'textWidget' && pane.renderable)) {
      pending.push(loadChart('text'));
    }
    if (this._model.panes.some((pane) => pane.kind === 'imageWidget' && pane.renderable)) {
      pending.push(loadChart('image'));
    }
    await Promise.all(pending);
  }

  private get resolvedDirection(): ArrangingDirection {
    return this.direction === 'horizontal' || this.direction === 'vertical'
      ? this.direction
      : this._model.direction;
  }

  /** chart-renderer reads absent as "unset", so forward an explicit value */
  private flag(value: boolean): string {
    return value ? '' : 'false';
  }

  /**
   * Inner FuseDash chartType for the chart pane. Must be forwarded as
   * `chart-type` so the renderer does not treat `isCustom` as customWidget.
   */
  private paneChartType(): string {
    const chartType = this._model.widget?.chartType;
    return typeof chartType === 'string' ? chartType.trim() : '';
  }

  /** KPI cards only — omit widget `name` so the band does not repeat the shell title */
  private kpiDataJson(): string {
    const kpis = this._model.widget?.kpis;
    return JSON.stringify(Array.isArray(kpis) ? kpis : []);
  }

  private renderEmpty(title: string, subtitle: string, className: string): TemplateResult {
    return html`
      <div class=${className}>
        <div>
          <strong>${title}</strong>
          <span>${subtitle}</span>
        </div>
      </div>
    `;
  }

  private renderTable(pane: CustomPane): TemplateResult {
    const table = pane.table;
    if (!table) {
      return this.renderEmpty(pane.emptyTitle, pane.emptySubtitle, 'pane-empty');
    }
    return html`
      <div class="pane" data-kind=${pane.kind}>
        <ui9000-table data=${JSON.stringify(table)}></ui9000-table>
      </div>
    `;
  }

  private renderText(pane: CustomPane): TemplateResult {
    if (!pane.text) {
      return html`
        <div class="pane" data-kind=${pane.kind}>
          ${this.renderEmpty(pane.emptyTitle, pane.emptySubtitle, 'pane-empty')}
        </div>
      `;
    }
    return html`
      <div class="pane" data-kind=${pane.kind}>
        <ui9000-text data=${JSON.stringify({ text: pane.text })}></ui9000-text>
      </div>
    `;
  }

  private renderImage(pane: CustomPane): TemplateResult {
    if (!pane.image) {
      return html`
        <div class="pane" data-kind=${pane.kind}>
          ${this.renderEmpty(pane.emptyTitle, pane.emptySubtitle, 'pane-empty')}
        </div>
      `;
    }
    return html`
      <div class="pane" data-kind=${pane.kind}>
        <ui9000-image data=${JSON.stringify({ src: pane.image.src, alt: pane.image.alt })}></ui9000-image>
      </div>
    `;
  }

  private renderPane(pane: CustomPane): TemplateResult {
    if (pane.kind === 'tableWidget') {
      return pane.renderable ? this.renderTable(pane) : html`
        <div class="pane" data-kind=${pane.kind}>
          ${this.renderEmpty(pane.emptyTitle, pane.emptySubtitle, 'pane-empty')}
        </div>
      `;
    }
    if (pane.kind === 'textWidget') return this.renderText(pane);
    if (pane.kind === 'imageWidget') return this.renderImage(pane);
    if (!pane.renderable) {
      return html`
        <div class="pane" data-kind=${pane.kind}>
          ${this.renderEmpty(pane.emptyTitle, pane.emptySubtitle, 'pane-empty')}
        </div>
      `;
    }
    return html`
      <div class="pane" data-kind=${pane.kind}>
        <ui9000-chart-renderer
          embedded
          data=${this.dataJson}
          chart-type=${this.paneChartType()}
          scale=${this.scale}
          show-header="false"
          show-grid=${this.flag(this.showGrid)}
          show-legend=${this.flag(this.showLegend)}
          show-tooltip=${this.flag(this.showTooltip)}
        ></ui9000-chart-renderer>
      </div>
    `;
  }

  private renderKpiBand(): TemplateResult {
    return html`
      <div class="kpi-band">
        <ui9000-kpi-widget
          data=${this.kpiDataJson()}
          scale=${this.scale}
          show-header="false"
        ></ui9000-kpi-widget>
      </div>
    `;
  }

  override render() {
    const model = this._model;
    const title = this.headerTitle();

    return html`
      <div class="widget-shell custom-root" part="shell">
        ${this.renderShellHeader(title)} ${model.hasKpi ? this.renderKpiBand() : nothing}
        ${model.isEmpty
          ? this.renderEmpty(DEFAULT_STATE_TITLE, DEFAULT_STATE_SUBTITLE, 'default-state')
          : html`
              <div
                class="custom-content"
                data-direction=${this.resolvedDirection}
                data-panes=${model.panes.length}
                style=${styleMap({
                  flexDirection: paneFlexDirection(this.resolvedDirection),
                })}
              >
                ${model.panes.map((pane) => this.renderPane(pane))}
              </div>
            `}
        ${this.renderShellLabelTooltip()}
      </div>
    `;
  }
}

export function registerCustomWidget(): void {
  if (!customElements.get('ui9000-custom-widget')) {
    customElements.define('ui9000-custom-widget', Ui9000CustomWidget);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-custom-widget': Ui9000CustomWidget;
  }
}
