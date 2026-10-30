import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import type { ChartTooltipContent } from '../../../element/chart-tooltip-portal.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import { renderHeatmapGrid } from '../../matrix-chart/render/heatmap-grid.js';
import {
  buildNetworkHeatmap,
  FULL_RANGE,
  formatLegendValue,
  formatNodeValue,
  GRAPH_CONTROL_COLORS,
  GRAPH_THEME_COLORS,
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
import { dsText } from '../../../element/ds-text.js';

/** Same diameters as map `DEFAULT_BUBBLES_RADIUS` (7 size steps). */
const LEGEND_BUBBLE_SIZES = [10, 15, 20, 25, 30, 35, 40];
const MUTED_LEGEND_FILL = '#6C758429';

type NetworkView = 'network' | 'heatmap';

const VIEWS: Array<{ value: NetworkView; label: string }> = [
  { value: 'network', label: 'Network' },
  { value: 'heatmap', label: 'Heatmap' },
];

/** Room kept between the view toggle and the heatmap texts next to it. */
const TOGGLE_GAP = 6;
/** Padding of the heatmap pane, and the room under rows that fill it. */
const HEATMAP_PADDING_TOP = 8;
const HEATMAP_PADDING_X = 12;
const HEATMAP_BOTTOM_ROOM = 104;

let nextChartId = 0;

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

  @state()
  private _view: NetworkView = 'network';

  /** Non-reactive: selection is owned by the draw layer, redrawing would reset it. */
  private _activeNodeId: string | null = null;

  /** The drawn graph no longer matches its data, theme or selection. */
  private _graphStale = true;
  private _heatmapRevealed = false;
  private readonly _chartId = `ui9000-network-${(nextChartId += 1)}`;
  private _model: NetworkGraphModel | null = null;
  private _modelMode: 'light' | 'dark' | null = null;
  private _modelStyle: string | null = null;
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
      this._graphStale = true;
      // New buckets: the old slider window and selection no longer mean anything.
      this._range = { ...FULL_RANGE };
      this._activeNodeId = null;
      this._model = null;
      this._modelMode = null;
      this._modelStyle = null;
    }
    if (changed.has('showTooltip') && !this.showTooltip) {
      this._labelTooltip = null;
      this.closeAllTooltips();
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

  protected override onThemeChange(): void {
    this._graphStale = true;
    this.scheduleDraw();
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
      if (this._view === 'heatmap') this.draw();
      if (!resizeNetworkGraph(root, root.clientWidth, root.clientHeight)) this.draw();
    });
  }

  private chartRoot(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null) ?? null;
  }

  private model(): NetworkGraphModel {
    const mode = this.themeMode();
    const styleId = this.styleId();
    if (!this._model || this._modelMode !== mode || this._modelStyle !== styleId) {
      this._model = this.withSeriesMode(() =>
        normalizeNetworkGraphData(
          parseJsonAttr<NetworkGraphInput | null>(this.dataJson, null),
        ),
      );
      this._modelMode = mode;
      this._modelStyle = styleId;
    }
    return this._model;
  }

  private heatmapRoot(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.heatmap-root') as HTMLElement | null) ?? null;
  }

  private setView(view: NetworkView): void {
    if (view === this._view) return;
    this._view = view;
    this.closeAllTooltips();
    this.scheduleDraw();
  }

  private drawHeatmap(root: HTMLElement, model: NetworkGraphModel): void {
    const { ids, labels, colors, values } = buildNetworkHeatmap(model);
    const toggle = this.shadowRoot?.querySelector('.view-toggle') as HTMLElement | null;
    const labelOf = (id: string): string => labels[ids.indexOf(id)] ?? id;
    let tip: ChartTooltipContent | null = null;
    const showTip = (event: MouseEvent, content: ChartTooltipContent): void => {
      if (!this.showTooltip) return;
      tip = content;
      this.openTooltip(event, content);
    };
    const showTotal = (event: MouseEvent, id: string, total: number): void =>
      showTip(event, {
        rows: [
          { label: 'Node', value: labelOf(id) },
          { label: 'Total', value: formatNodeValue(total) },
        ],
      });

    renderHeatmapGrid(root, {
      rows: ids,
      columns: ids,
      rowLabels: labels,
      columnLabels: labels,
      rowColors: colors,
      values,
      width: root.clientWidth || 400,
      height: root.clientHeight || 300,
      idPrefix: this._chartId,
      themeMode: this.themeMode(),
      fontFamily: readThemeFromElement(this).fontFamily,
      hoverable: this.showTooltip,
      title: 'Link values',
      // Each linked pair has two cells, one on each side of the diagonal.
      subtitle: `${ids.length} nodes · ${values.size / 2} links`,
      rowTotalsTitle: 'Total',
      columnTotalsTitle: 'Total',
      fillHeight: true,
      fillBottomRoom: HEATMAP_BOTTOM_ROOM,
      cornerInset: toggle
        ? {
            width: toggle.offsetLeft - HEATMAP_PADDING_X + toggle.offsetWidth + TOGGLE_GAP,
            height: toggle.offsetTop - HEATMAP_PADDING_TOP + toggle.offsetHeight + TOGGLE_GAP,
          }
        : undefined,
      reveal: !this._heatmapRevealed,
      selectedRow: this._activeNodeId,
      onRowClick: (row) => {
        this._activeNodeId = this._activeNodeId === row ? null : row;
        this._graphStale = true;
        this.scheduleDraw();
      },
      onCellEnter: (event, { row, column, value }) =>
        showTip(event, {
          rows: [
            { label: 'From', value: labelOf(row) },
            { label: 'To', value: labelOf(column) },
            { label: 'Value', value: formatNodeValue(value) },
          ],
        }),
      onRowEnter: (event, { row, total }) => showTotal(event, row, total),
      onColumnEnter: (event, { column, total }) => showTotal(event, column, total),
      onPointerMove: (event) => {
        if (tip) this.openTooltip(event, tip);
      },
      onPointerLeave: this.showTooltip ? () => this.closeTooltip() : undefined,
    });
    this._heatmapRevealed = true;
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
      this.heatmapRoot()?.replaceChildren();
      return;
    }

    if (this._view === 'heatmap') {
      const heatmap = this.heatmapRoot();
      if (heatmap) this.drawHeatmap(heatmap, model);
      if (root.childElementCount) return;
    } else if (root.childElementCount && !this._graphStale) {
      // Coming back from the heatmap: the settled layout is still there.
      return;
    }
    this._graphStale = false;

    renderNetworkGraph(root, {
      model,
      visibleIds: visibleNodeIds(model, this._range),
      width: root.clientWidth,
      height: root.clientHeight,
      theme: readThemeFromElement(this),
      themeMode: this.themeMode(),
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
                          >${formatLegendValue(
                            range.start,
                            !!this._model?.nodes.length &&
                              this._model.nodes.every((node) => Number.isInteger(node.value)),
                          )}</span
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

  private stageStyle(): string {
    const mode = this.themeMode();
    const controls = GRAPH_CONTROL_COLORS[mode];
    return [
      `--graph-background:${GRAPH_THEME_COLORS[mode].background}`,
      `--toggle-track:${controls.track}`,
      `--toggle-thumb:${controls.thumb}`,
      `--toggle-text:${controls.text}`,
      `--toggle-text-active:${controls.textActive}`,
      `--toggle-shadow:${controls.shadow}`,
    ].join(';');
  }

  private renderViewToggle() {
    return html`<div class="view-toggle" role="tablist" aria-label="Chart view">
      ${VIEWS.map(
        ({ value, label }) => html`<button
          type="button"
          role="tab"
          class="view-button"
          aria-selected=${this._view === value}
          ?data-active=${this._view === value}
          @click=${() => this.setView(value)}
        >
          ${label}
        </button>`,
      )}
    </div>`;
  }

  override render() {
    const isHeatmap = this._view === 'heatmap';
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(this.headerTitle())}
        <div class="widget-body">
          <div
            class="network-stage"
            ?hidden=${this._empty}
            style=${this.stageStyle()}
          >
            ${this.renderViewToggle()}
            <div class="chart-root" part="chart" ?data-covered=${isHeatmap}></div>
            <div class="heatmap-pane" ?hidden=${!isHeatmap}>
              <div class="heatmap-root" part="heatmap"></div>
              <div class="heatmap-fade"></div>
            </div>
          </div>
          ${isHeatmap ? nothing : this.renderLegend()}
          ${this._empty
            ? html`<div class="empty" part="empty">${dsText('Network graph requires a nodes and links payload.', { size: 'md' })}</div>`
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
