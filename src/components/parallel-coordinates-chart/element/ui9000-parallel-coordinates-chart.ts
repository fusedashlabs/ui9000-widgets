import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { readThemeFromElement } from '../../../context/widget-context.js';
import {
  getParallelCoordinatesDimensions,
  parseJsonAttr,
} from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  formatTooltipValue,
  normalizeParallelCoordinatesData,
  type ParallelCoordinatesInput,
  type ParallelCoordinatesModel,
  type ParallelCoordinatesOrientation,
} from '../lib/index.js';
import { renderParallelCoordinatesChart } from '../render/draw.js';
import { parallelCoordinatesStyles } from './styles.js';

@customElement('ui9000-parallel-coordinates-chart')
export class Ui9000ParallelCoordinatesChart extends Ui9000ChartElement {
  static override styles = [parallelCoordinatesStyles, chartShellStyles];

  /** Overrides the widget's own `orientation` when set to a known value. */
  @property({ type: String })
  orientation: ParallelCoordinatesOrientation | '' = '';

  /** Shows the colour ramp for the active axis in the right gutter. */
  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  /** Axis whose value colours the lines; clicking an axis changes it. */
  @property({ type: String, attribute: 'color-key' })
  colorKey = '';

  @state()
  private _activeColorKey = '';

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

  override firstUpdated(): void {
    const body = this.shadowRoot?.querySelector('.widget-body');
    const scroll = this.shadowRoot?.querySelector('.chart-scroll');
    if (body instanceof HTMLElement) this._resizeObserver?.observe(body);
    if (scroll instanceof HTMLElement) this._resizeObserver?.observe(scroll);
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

  private parseData(): ParallelCoordinatesModel {
    const raw = parseJsonAttr<ParallelCoordinatesInput>(this.dataJson, []);
    const model = this.withSeriesMode(() => normalizeParallelCoordinatesData(raw));
    if (this.orientation === 'horizontal' || this.orientation === 'vertical') {
      return { ...model, orientation: this.orientation };
    }
    return model;
  }

  private draw(): void {
    const scroll = this.shadowRoot?.querySelector('.chart-scroll') as HTMLElement | null;
    const root = this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null;
    if (!scroll || !root) return;

    const model = this.parseData();
    this._empty = model.axes.length === 0 || model.rows.length === 0;
    if (this._empty) {
      root.replaceChildren();
      return;
    }

    const { width, margin } = getParallelCoordinatesDimensions(scroll, model.orientation);
    const theme = readThemeFromElement(this);
    const colorKey = this.colorKey || this._activeColorKey || model.colorKey;

    renderParallelCoordinatesChart(root, {
      model,
      width,
      height: scroll.clientHeight || 300,
      margin,
      theme,
      themeMode: this.themeMode(),
      orientation: model.orientation,
      showLegend: this.showLegend,
      colorKey,
      ...this.axisLabelHandlers(),
      onColorKeyChange: (key) => {
        this._activeColorKey = key;
      },
      onRowHover: this.showTooltip
        ? ({ row, event }) => {
            this.openTooltip(event, {
              title: row.id,
              rows: model.axes.map((key) => ({
                label: key,
                value: formatTooltipValue(row.values[key]),
              })),
            });
          }
        : undefined,
      onRowLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
  }

  override render() {
    const title = this.headerTitle();
    const orientation = this.parseData().orientation;
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          <div class="chart-body" part="chart-body">
            <div class="chart-scroll" part="scroll" data-orientation=${orientation}>
              <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
            </div>
          </div>
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
    'ui9000-parallel-coordinates-chart': Ui9000ParallelCoordinatesChart;
  }
}

export function registerParallelCoordinatesChart(): void {
  if (!customElements.get('ui9000-parallel-coordinates-chart')) {
    customElements.define(
      'ui9000-parallel-coordinates-chart',
      Ui9000ParallelCoordinatesChart,
    );
  }
}

registerParallelCoordinatesChart();
