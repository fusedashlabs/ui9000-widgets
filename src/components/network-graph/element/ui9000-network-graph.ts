import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  FULL_RANGE,
  formatLegendValue,
  legendRanges,
  normalizeNetworkGraphData,
  rangeTrackOffset,
  slideThumb,
  sliderIndexFromPointer,
  thumbTrackPercent,
  visibleNodeIds,
  type NetworkGraphInput,
  type NetworkGraphModel,
  type NetworkLegendRange,
  type NetworkRange,
} from '../lib/index.js';
import {
  renderNetworkGraph,
  resizeNetworkGraph,
  stopNetworkGraph,
  updateNetworkGraphVisibility,
} from '../render/draw.js';
import { networkGraphStyles } from './styles.js';

/** Same diameters as map `DEFAULT_BUBBLES_RADIUS` (7 size steps). */
const LEGEND_BUBBLE_SIZES = [10, 15, 20, 25, 30, 35, 40];
const MUTED_LEGEND_FILL = '#6C758429';

@customElement('ui9000-network-graph')
export class Ui9000NetworkGraph extends Ui9000ChartElement {
  static override styles = [networkGraphStyles, chartShellStyles];

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _empty = false;

  @state()
  private _ranges: NetworkLegendRange[] = [];

  @state()
  private _range: NetworkRange = { ...FULL_RANGE };

  @state()
  private _legendOpen = true;

  /** Non-reactive: selection is owned by the draw layer, redrawing would reset it. */
  private _activeNodeId: string | null = null;

  private _model: NetworkGraphModel | null = null;
  private _legendDrag?: {
    thumb: HTMLElement;
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  };
  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  private _resizeRaf = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this._resizeObserver.observe(this);
  }

  override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    cancelAnimationFrame(this._resizeRaf);
    this.stopLegendDrag();
    const root = this.chartRoot();
    if (root) stopNetworkGraph(root);
    super.disconnectedCallback();
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('dataJson')) {
      // New buckets: the old slider window and selection no longer mean anything.
      this._range = { ...FULL_RANGE };
      this._activeNodeId = null;
      this._model = null;
    }
    if (changed.has('showTooltip') && !this.showTooltip) {
      this._labelTooltip = null;
    }
    if (this.shouldRedraw(changed)) this.scheduleDraw();
  }

  /**
   * Legend / tooltip are Lit chrome. Toggling them must not re-settle the force
   * layout (same class of rule as filter/resize staying in place).
   */
  private shouldRedraw(changed: PropertyValues): boolean {
    if (!chartPropsChanged(changed)) return false;
    for (const key of changed.keys()) {
      if (typeof key !== 'string' || key.startsWith('_')) continue;
      if (key === 'showLegend' || key === 'showTooltip') continue;
      return true;
    }
    return false;
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  /**
   * A resize only re-frames the settled layout — re-running the force ticks
   * would reshuffle the graph every time the chat pane changes width.
   */
  private scheduleResize(): void {
    cancelAnimationFrame(this._resizeRaf);
    this._resizeRaf = requestAnimationFrame(() => {
      const root = this.chartRoot();
      if (!root) return;
      if (!resizeNetworkGraph(root, root.clientWidth, root.clientHeight)) this.draw();
    });
  }

  private chartRoot(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null) ?? null;
  }

  private model(): NetworkGraphModel {
    if (!this._model) {
      this._model = normalizeNetworkGraphData(
        parseJsonAttr<NetworkGraphInput | null>(this.dataJson, null),
      );
    }
    return this._model;
  }

  private draw(): void {
    const root = this.chartRoot();
    if (!root) return;

    const model = this.model();
    this._empty = model.nodes.length === 0;
    this._ranges = legendRanges(model.breakpoints);

    if (this._empty) {
      stopNetworkGraph(root);
      root.replaceChildren();
      return;
    }

    renderNetworkGraph(root, {
      model,
      visibleIds: visibleNodeIds(model, this._range),
      width: root.clientWidth,
      height: root.clientHeight,
      theme: readThemeFromElement(this),
      activeNodeId: this._activeNodeId,
      onSelect: (id) => {
        this._activeNodeId = id;
      },
    });
  }

  private setRange(edge: 'leftSlider' | 'rightSlider', raw: number): void {
    const next = slideThumb(this._range, edge, raw, this._ranges.length);
    if (next.leftSlider === this._range.leftSlider && next.rightSlider === this._range.rightSlider) {
      return;
    }
    this._range = next;
    const root = this.chartRoot();
    if (!root) return;
    const visible = visibleNodeIds(this.model(), next);
    if (!updateNetworkGraphVisibility(root, visible)) this.scheduleDraw();
  }

  private startThumbDrag(edge: 'leftSlider' | 'rightSlider', e: PointerEvent): void {
    const thumb = e.currentTarget;
    if (!(thumb instanceof HTMLElement)) return;
    const track = thumb.parentElement;
    if (!track) return;
    e.preventDefault();
    e.stopPropagation();
    thumb.setPointerCapture(e.pointerId);
    this.stopLegendDrag();

    const move = (ev: PointerEvent) => {
      const index = sliderIndexFromPointer(
        ev.clientX,
        track.getBoundingClientRect(),
        this._ranges.length,
      );
      this.setRange(edge, index);
    };
    const up = (ev: PointerEvent) => {
      if (thumb.hasPointerCapture(ev.pointerId)) thumb.releasePointerCapture(ev.pointerId);
      this.stopLegendDrag();
    };
    thumb.addEventListener('pointermove', move);
    thumb.addEventListener('pointerup', up);
    thumb.addEventListener('pointercancel', up);
    this._legendDrag = { thumb, move, up };
    move(e);
  }

  private stopLegendDrag(): void {
    const drag = this._legendDrag;
    if (!drag) return;
    drag.thumb.removeEventListener('pointermove', drag.move);
    drag.thumb.removeEventListener('pointerup', drag.up);
    drag.thumb.removeEventListener('pointercancel', drag.up);
    this._legendDrag = undefined;
  }

  private renderLegend() {
    if (!this.showLegend || this._empty || this._ranges.length < 2) return nothing;
    const { leftSlider, rightSlider } = this._range;
    const last = this._ranges.length;
    const { onAxisLabelHover, onAxisLabelLeave } = this.axisLabelHandlers();

    return html`
      <div class="graph-legend" part="legend">
        <div class="legend-panel-header">
          <p class="legend-kicker">Legend</p>
          <button
            type="button"
            class="legend-chevron"
            aria-expanded=${this._legendOpen}
            aria-label=${this._legendOpen ? 'Collapse legend' : 'Expand legend'}
            @click=${() => {
              this._legendOpen = !this._legendOpen;
            }}
          ></button>
        </div>
        ${this._legendOpen
          ? html`<div class="legend-layers">
              <div class="legend-layer">
                <div class="legend-details">
                  <div class="legend-scale" data-kind="bubbles">
                    <div class="legend-colors" data-qualitative>
                      <div class="legend-range">
                        <div
                          class="legend-range-track"
                          style="left:${rangeTrackOffset('left', leftSlider, last)}"
                        >
                          <button
                            type="button"
                            class="legend-thumb"
                            aria-label="Smallest node size shown"
                            style="left:${thumbTrackPercent(leftSlider, last)}"
                            @pointerdown=${(e: PointerEvent) => this.startThumbDrag('leftSlider', e)}
                          ></button>
                        </div>
                        <div
                          class="legend-range-track"
                          style="right:${rangeTrackOffset('right', rightSlider, last)}"
                        >
                          <button
                            type="button"
                            class="legend-thumb"
                            aria-label="Largest node size shown"
                            style="left:${thumbTrackPercent(rightSlider, last)}"
                            @pointerdown=${(e: PointerEvent) => this.startThumbDrag('rightSlider', e)}
                          ></button>
                        </div>
                      </div>
                      <div class="legend-buckets">
                        ${this._ranges.map((_range, index) => {
                          const muted = !(leftSlider <= index && index < rightSlider);
                          const bubble = LEGEND_BUBBLE_SIZES[index] ?? 12;
                          const inner = bubble - 15 > 0 ? bubble - 15 : 0;
                          return html`<span
                            class="legend-bucket"
                            ?data-bubble=${true}
                            ?data-inner=${inner > 0}
                            ?data-qualitative=${true}
                            ?data-muted=${muted}
                            style="background:${MUTED_LEGEND_FILL};--bubble-size:${bubble}px;--inner-size:${inner}px"
                          ></span>`;
                        })}
                      </div>
                    </div>
                    <div class="legend-values">
                      ${this._ranges.map(
                        (range) => html`<span
                          class="legend-value"
                          @mouseenter=${this.showTooltip
                            ? (e: MouseEvent) => onAxisLabelHover?.(String(range.start), e)
                            : undefined}
                          @mouseleave=${this.showTooltip ? onAxisLabelLeave : undefined}
                          >${formatLegendValue(range.start, 2)}</span
                        >`,
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>`
          : nothing}
      </div>
    `;
  }

  override render() {
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(this.headerTitle())}
        <div class="widget-body">
          <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
          ${this.renderLegend()}
          ${this._empty
            ? html`<div class="empty" part="empty">
                Network graph requires a nodes and links payload.
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
    'ui9000-network-graph': Ui9000NetworkGraph;
  }
}

export function registerNetworkGraph(): void {
  if (!customElements.get('ui9000-network-graph')) {
    customElements.define('ui9000-network-graph', Ui9000NetworkGraph);
  }
}

registerNetworkGraph();
