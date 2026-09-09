import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { CSS_VARS, readCssVar } from '../../../context/widget-context.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import { fetchMapGeoJson } from '../lib/geojson.js';
import { joinLayerFeatures } from '../lib/join.js';
import {
  DEFAULT_BUBBLES_RADIUS,
  defaultLayerSlider,
  formatAverage,
  formatFieldLabel,
  formatLegendBucket,
  legendLayerOrder,
  legendSpikeHeight,
  MUTED_LEGEND_FILL,
  rangeTrackOffset,
  sanitizeKey,
  slideThumb,
  sliderIndexFromPointer,
  thumbTrackPercent,
  type LayerSlider,
  formatMapValue,
  normalizeMapData,
  type MapChartInput,
  type MapHoverEntry,
  type MapLayerModel,
  type MapModel,
} from '../lib/index.js';
import { renderMapChart, resizeMapChart, stopMapChart, type MapChartController } from '../render/draw.js';
import { mapChartStyles } from './styles.js';

const SPIKE_COLOR = '#939BA7';

function renderLegendSpike(index: number, id: string) {
  const h = legendSpikeHeight(index);
  return html`
    <span class="legend-spike">
      <svg width="25" height=${h} viewBox=${`0 0 25 ${h}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask
          id=${`mask_${id}`}
          style="mask-type:alpha"
          maskUnits="userSpaceOnUse"
          x="6"
          y="0"
          width="13"
          height=${h}
        >
          <path
            d=${`M18.1992 ${h - 0.75}L12.1992 0.25L6.19922 ${h - 0.75}Z`}
            fill=${`url(#linear_gradient_${id})`}
          />
        </mask>
        <g mask=${`url(#mask_${id})`}>
          <path d=${`M18.1992 ${h - 0.75}L12.1992 0.25L6.19922 ${h - 0.75}Z`} fill=${SPIKE_COLOR} />
        </g>
        <path
          d=${`M22.1992 ${h - 0.75}H19.0291C18.5479 ${h - 0.75} 18.135 ${h - 0.1} 18.0463 ${h - 0.5}L12.1992 0.25L6.35216 ${h - 0.5}C6.26348 ${h - 0.1} 5.85051 ${h - 0.75} 5.36929 ${h - 0.75}H2.19922`}
          stroke=${SPIKE_COLOR}
          fill=${SPIKE_COLOR}
          fill-opacity="0"
          stroke-width="1"
        />
        <defs>
          <linearGradient
            id=${`linear_gradient_${id}`}
            x1="12.1992"
            y1="0.25"
            x2="12.1992"
            y2=${h}
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color=${SPIKE_COLOR} stop-opacity="0.7" />
            <stop offset="1" stop-color=${SPIKE_COLOR} stop-opacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  `;
}

type RuntimeConfig = {
  MAPBOX_TOKEN?: string;
  MAPBOX_DARK_TOKEN?: string;
  MAP_PMTILES_BASE_URL?: string;
  MAP_GEOJSON_BASE_URL?: string;
};

@customElement('ui9000-map-chart')
export class Ui9000MapChart extends Ui9000ChartElement {
  static override styles = [mapChartStyles, chartShellStyles];

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @property({ type: String, attribute: 'mapbox-token' })
  mapboxToken = '';

  @property({ type: String, attribute: 'geojson-base-url' })
  geojsonBaseUrl = '';

  @property({ type: String, attribute: 'pmtiles-base-url' })
  pmtilesBaseUrl = '/pmtiles';

  @state()
  private _empty = false;

  @state()
  private _emptyReason = 'No data';

  @state()
  private _tooltip: { x: number; y: number; title: string; value: string } | null = null;

  @state()
  private _layers: MapLayerModel[] = [];

  @state()
  private _sliders: Record<string, LayerSlider> = {};

  @state()
  private _activeLayers: string[] = [];

  @state()
  private _legendOpen = true;

  @state()
  private _layerOpen: Record<string, boolean> = {};

  private _model: MapModel | null = null;
  private _ctl: MapChartController | null = null;
  private _legendKey = '';
  private _legendDrag?: {
    thumb: HTMLElement;
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  };
  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  private _drawGen = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame(() => {
        const root = this.chartRoot();
        if (root && !resizeMapChart(root)) this.scheduleDraw();
      });
    });
    this._resizeObserver.observe(this);
  }

  override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    this.stopLegendDrag();
    const root = this.chartRoot();
    if (root) stopMapChart(root);
    this._ctl = null;
    super.disconnectedCallback();
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('dataJson') || changed.has('geojsonBaseUrl')) this._model = null;
    if (changed.has('showTooltip') && !this.showTooltip) this._tooltip = null;
    if (this.shouldRedraw(changed)) this.scheduleDraw();
  }

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
    this._raf = requestAnimationFrame(() => {
      void this.draw();
    });
  }

  private chartRoot(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null) ?? null;
  }

  private token(): string {
    if (this.mapboxToken.trim()) return this.mapboxToken.trim();
    const runtime =
      typeof window !== 'undefined'
        ? (window as Window & { __RUNTIME_CONFIG__?: RuntimeConfig }).__RUNTIME_CONFIG__
        : undefined;
    if (runtime?.MAPBOX_TOKEN) return runtime.MAPBOX_TOKEN;
    const env = (import.meta as { env?: Record<string, string | undefined> }).env;
    return (env?.STORYBOOK_MAPBOX_TOKEN || env?.VITE_MAPBOX_TOKEN || '').trim();
  }

  private geojsonUrl(): string {
    if (this.geojsonBaseUrl.trim()) return this.geojsonBaseUrl.trim();
    const runtime =
      typeof window !== 'undefined'
        ? (window as Window & { __RUNTIME_CONFIG__?: RuntimeConfig }).__RUNTIME_CONFIG__
        : undefined;
    return (runtime?.MAP_GEOJSON_BASE_URL || '').trim();
  }

  private pmtilesUrl(): string {
    if (this.pmtilesBaseUrl.trim()) return this.pmtilesBaseUrl.trim();
    const runtime =
      typeof window !== 'undefined'
        ? (window as Window & { __RUNTIME_CONFIG__?: RuntimeConfig }).__RUNTIME_CONFIG__
        : undefined;
    if (runtime?.MAP_PMTILES_BASE_URL) return runtime.MAP_PMTILES_BASE_URL;
    const env = (import.meta as { env?: Record<string, string | undefined> }).env;
    return (env?.STORYBOOK_MAP_PMTILES_BASE_URL || env?.VITE_MAP_PMTILES_BASE_URL || '/pmtiles').trim();
  }

  private mode(): 'light' | 'dark' {
    const value = readCssVar(this, CSS_VARS.mode, 'light');
    return value === 'dark' ? 'dark' : 'light';
  }

  private async draw(): Promise<void> {
    const root = this.chartRoot();
    if (!root) return;
    const gen = ++this._drawGen;

    const parsed = parseJsonAttr<MapChartInput>(this.dataJson, null);
    let model = this._model ?? normalizeMapData(parsed);
    this._model = model;

    if (!model.layers.length) {
      this._empty = true;
      this._emptyReason = 'No data';
      this._layers = [];
      stopMapChart(root);
      this._ctl = null;
      return;
    }

    const needsGeo = model.layers.some((layer) => !layer.features.length);
    const geoBase = this.geojsonUrl();
    let geoFetchFailed = false;
    if (needsGeo && geoBase) {
      const types = [...new Set(model.layers.map((l) => l.mapType))];
      const loaded = await Promise.all(
        types.map(async (mapType) => [mapType, await fetchMapGeoJson(mapType, geoBase)] as const),
      );
      if (gen !== this._drawGen) return;
      const byType = Object.fromEntries(loaded.filter((entry) => entry[1]));
      geoFetchFailed = loaded.some((entry) => !entry[1]);
      model = {
        ...model,
        layers: model.layers.map((layer) =>
          layer.features.length ? layer : joinLayerFeatures(layer, byType[layer.mapType] ?? undefined),
        ),
      };
      this._model = model;
    }

    const token = this.token();
    if (!token) {
      this._empty = true;
      this._emptyReason = 'Mapbox token required';
      this._layers = model.layers;
      stopMapChart(root);
      this._ctl = null;
      return;
    }

    const hasMarks = model.layers.some((layer) => layer.features.length > 0);
    this._empty = !hasMarks;
    this._emptyReason = hasMarks
      ? 'No data'
      : model.layers.some((l) => l.matchTotal > 0 && l.matchHit === 0)
        ? 'No locations matched the map boundaries'
        : geoFetchFailed
          ? 'Could not load map boundaries'
          : 'Map boundaries required';
    this._layers = model.layers;
    if (!hasMarks) {
      stopMapChart(root);
      this._ctl = null;
      return;
    }
    this.syncLegendState(model.layers);

    const ctl = await renderMapChart(root, {
      model,
      token,
      mode: this.mode(),
      showTooltip: this.showTooltip,
      pmtilesBaseUrl: this.pmtilesUrl(),
      activeLayerIds: this._activeLayers,
      sliders: this._sliders,
      year: model.layers.find((layer) => layer.selectedYear)?.selectedYear,
      onHover: this.showTooltip
        ? (entry) => this.setTooltip(entry)
        : undefined,
    });
    if (gen !== this._drawGen) {
      ctl?.destroy();
      return;
    }
    this._ctl = ctl;
    if (!this._ctl) {
      this._empty = true;
      this._emptyReason = 'Mapbox GL failed to load';
      stopMapChart(root);
    }
  }

  private syncLegendState(layers: MapLayerModel[]): void {
    const ids = layers.map((layer) => layer.layerId);
    const key = ids.join('\0');
    if (key !== this._legendKey) {
      this._legendKey = key;
      this._sliders = Object.fromEntries(
        layers.map((layer) => [layer.layerId, defaultLayerSlider(layer.colorRanges.length)]),
      );
      this._activeLayers = ids;
      this._layerOpen = {};
      return;
    }
    const sliders = { ...this._sliders };
    let slidersChanged = false;
    for (const layer of layers) {
      if (!sliders[layer.layerId]) {
        sliders[layer.layerId] = defaultLayerSlider(layer.colorRanges.length);
        slidersChanged = true;
      }
    }
    if (slidersChanged) this._sliders = sliders;
  }

  private pushLegend(): void {
    this._ctl?.applyLegend(this._activeLayers, this._sliders);
  }

  private toggleLayer(layerId: string): void {
    const on = this._activeLayers.includes(layerId);
    this._activeLayers = on
      ? this._activeLayers.filter((id) => id !== layerId)
      : [...this._activeLayers, layerId];
    this.pushLegend();
  }

  private toggleLayerOpen(layerId: string): void {
    this._layerOpen = { ...this._layerOpen, [layerId]: this._layerOpen[layerId] === false };
  }

  private setSlider(layerId: string, edge: 'leftSlider' | 'rightSlider', raw: number): void {
    const layer = this._layers.find((item) => item.layerId === layerId);
    const rangeCount = layer?.colorRanges.length ?? 1;
    const current = this._sliders[layerId] ?? defaultLayerSlider(rangeCount);
    const next = slideThumb(current, edge, raw, rangeCount);
    if (next.leftSlider === current.leftSlider && next.rightSlider === current.rightSlider) return;
    this._sliders = { ...this._sliders, [layerId]: next };
    this.pushLegend();
  }

  private startThumbDrag(layerId: string, edge: 'leftSlider' | 'rightSlider', e: PointerEvent): void {
    const thumb = e.currentTarget;
    if (!(thumb instanceof HTMLElement)) return;
    const track = thumb.parentElement;
    if (!track) return;
    e.preventDefault();
    e.stopPropagation();
    thumb.setPointerCapture(e.pointerId);
    this.stopLegendDrag();

    const move = (ev: PointerEvent) => {
      const layer = this._layers.find((item) => item.layerId === layerId);
      const max = layer?.colorRanges.length ?? 1;
      const index = sliderIndexFromPointer(ev.clientX, track.getBoundingClientRect(), max);
      this.setSlider(layerId, edge, index);
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

  private setTooltip(entry: MapHoverEntry | null): void {
    if (!entry) {
      this._tooltip = null;
      return;
    }
    const root = this.chartRoot();
    const x = entry.point?.x ?? (root?.clientWidth ?? 0) / 2;
    const y = entry.point?.y ?? 48;
    this._tooltip = {
      x,
      y,
      title: entry.regionName,
      value: `${entry.valueKey}: ${formatMapValue(entry.value)}`,
    };
  }

  private matchNotice(): string | null {
    const total = this._layers.reduce((sum, l) => sum + l.matchTotal, 0);
    const hit = this._layers.reduce((sum, l) => sum + l.matchHit, 0);
    if (total > 0 && hit === 0) {
      return `0 of ${total} ${total === 1 ? 'location' : 'locations'} matched the map boundaries`;
    }
    return null;
  }

  private renderLegend() {
    if (!this.showLegend || this._empty) return nothing;
    const layers = legendLayerOrder(this._layers.filter((layer) => layer.features.length > 0));
    if (!layers.length) return nothing;

    return html`
      <div class="map-legend" part="legend">
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
              ${layers.map((layer) => this.renderLegendLayer(layer))}
            </div>`
          : nothing}
      </div>
    `;
  }

  private renderLegendLayer(layer: MapLayerModel) {
    const active = this._activeLayers.includes(layer.layerId);
    const open = this._layerOpen[layer.layerId] !== false;
    const slider = this._sliders[layer.layerId] ?? defaultLayerSlider(layer.colorRanges.length);
    const ranges = layer.colorRanges;
    const isBubble = layer.visualisationType === 'bubbles';
    const isSpike = layer.visualisationType === 'spike';
    const isMarkers = layer.visualisationType === 'markers';
    const showRamp = ranges.length > 0;

    return html`
      <div class="legend-layer">
        <div class="legend-layer-header">
          <label class="legend-check">
            <input
              type="checkbox"
              .checked=${active}
              @change=${(e: Event) => {
                e.stopPropagation();
                this.toggleLayer(layer.layerId);
              }}
            />
            <span>${layer.layerName}</span>
          </label>
          <button
            type="button"
            class="legend-chevron"
            aria-expanded=${open}
            aria-label=${open ? `Collapse ${layer.layerName}` : `Expand ${layer.layerName}`}
            @click=${() => this.toggleLayerOpen(layer.layerId)}
          ></button>
        </div>
        ${open
          ? html`
              <div class="legend-details">
                <p class="legend-stat">
                  <span class="legend-avg">${formatAverage(layer.average)}</span>
                  ${formatFieldLabel(layer.valueKey)}
                </p>
                ${showRamp
                  ? html`
                      <div class="legend-scale" data-kind=${layer.visualisationType}>
                        <div
                          class="legend-colors"
                          ?data-qualitative=${isBubble || isSpike}
                        >
                          <div class="legend-range">
                            <div
                              class="legend-range-track"
                              style="left:${rangeTrackOffset('left', slider.leftSlider, ranges.length)}"
                            >
                              <button
                                type="button"
                                class="legend-thumb"
                                aria-label="Lowest ${layer.layerName} range"
                                style="left:${thumbTrackPercent(slider.leftSlider, ranges.length)}"
                                @pointerdown=${(e: PointerEvent) =>
                                  this.startThumbDrag(layer.layerId, 'leftSlider', e)}
                              ></button>
                            </div>
                            <div
                              class="legend-range-track"
                              style="right:${rangeTrackOffset('right', slider.rightSlider, ranges.length)}"
                            >
                              <button
                                type="button"
                                class="legend-thumb"
                                aria-label="Highest ${layer.layerName} range"
                                style="left:${thumbTrackPercent(slider.rightSlider, ranges.length)}"
                                @pointerdown=${(e: PointerEvent) =>
                                  this.startThumbDrag(layer.layerId, 'rightSlider', e)}
                              ></button>
                            </div>
                          </div>
                          <div class="legend-buckets">
                            ${ranges.map((range, index) => {
                              const inRange =
                                slider.leftSlider <= index && index < slider.rightSlider;
                              const fill =
                                isBubble || isSpike
                                  ? MUTED_LEGEND_FILL
                                  : inRange
                                    ? range.color
                                    : MUTED_LEGEND_FILL;
                              const bubble = isBubble ? (DEFAULT_BUBBLES_RADIUS[index] ?? 12) : 0;
                              const inner = bubble - 15 > 0 ? bubble - 15 : 0;
                              return html`<span
                                class="legend-bucket"
                                ?data-bubble=${isBubble}
                                ?data-inner=${inner > 0}
                                ?data-qualitative=${isBubble || isSpike}
                                style="background:${fill};--bubble-size:${bubble}px;--inner-size:${inner}px"
                              ></span>`;
                            })}
                          </div>
                          ${isSpike
                            ? html`<div class="legend-spikes">
                                ${ranges.map((_range, index) =>
                                  renderLegendSpike(
                                    index,
                                    `${sanitizeKey(layer.layerId)}_${index}`,
                                  ),
                                )}
                              </div>`
                            : nothing}
                        </div>
                        ${isMarkers
                          ? nothing
                          : html`<div class="legend-values">
                              ${ranges.map(
                                (range) =>
                                  html`<span class="legend-value">${formatLegendBucket(range.start, 2)}</span>`,
                              )}
                            </div>`}
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  override render() {
    const title = this.headerTitle();
    const notice = this.matchNotice();
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title)}
        <div class="widget-body">
          <div class="chart-root" part="chart" ?hidden=${this._empty}></div>
          ${this._empty ? html`<div class="empty" part="empty">${this._emptyReason}</div>` : nothing}
          ${this.renderLegend()}
          ${notice && !this._empty ? html`<div class="match-notice">${notice}</div>` : nothing}
          ${this._tooltip
            ? html`<div
                class="tooltip"
                part="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                <div>${this._tooltip.title}</div>
                <div>${this._tooltip.value}</div>
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
    'ui9000-map-chart': Ui9000MapChart;
  }
}

export function registerMapChart(): void {
  if (!customElements.get('ui9000-map-chart')) {
    customElements.define('ui9000-map-chart', Ui9000MapChart);
  }
}

registerMapChart();
