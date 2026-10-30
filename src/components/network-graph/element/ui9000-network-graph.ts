import { html, nothing, svg, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import type { ChartTooltipContent } from '../../../element/chart-tooltip-portal.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import { createTextMeasure } from '../../matrix-chart/lib/heatmap-layout.js';
import { renderHeatmapGrid, setHeatmapSelectedRow } from '../../matrix-chart/render/heatmap-grid.js';
import {
  buildNetworkHeatmap,
  CONNECTION_RING_MAX,
  CONNECTION_RING_MIN,
  filterGraphByDate,
  FULL_RANGE,
  formatLegendValue,
  formatMetricValue,
  formatNodeValue,
  formatPointDate,
  getConnectionCounts,
  getConnectionList,
  getDataDates,
  getNetworkTopics,
  getNodeTopics,
  getPeriodSeries,
  graphThemeColors,
  legendRanges,
  nodeColor,
  normalizeNetworkGraphData,
  rangeTrackOffset,
  slideThumb,
  sliderIndexFromPointer,
  thumbTrackPercent,
  trendColors,
  visibleNodeIds,
  type NetworkGraphInput,
  type NetworkGraphModel,
  type NetworkLegendRange,
  type NetworkLink,
  type NetworkNode,
  type NetworkRange,
  type NetworkTopic,
  type PeriodPoint,
} from '../lib/index.js';
import {
  networkNodeElement,
  renderNetworkGraph,
  resizeNetworkGraph,
  setNetworkGraphActive,
  setNetworkGraphColors,
  stopNetworkGraph,
  updateNetworkGraphVisibility,
  zoomNetworkGraph,
} from '../render/draw.js';
import { renderFocusView, setFocusViewSelection } from '../render/focus-view.js';
import { renderMetricChart } from '../render/metric-chart.js';
import { networkPanelStyles } from './panel-styles.js';
import {
  CARD_CHART_MONTHS,
  renderCompactDetails,
  renderFocusHeader,
  renderNodeDetails,
  renderTimeline,
  renderTopicSidebar,
  renderTrends,
  type CardList,
  type CardTab,
  type MetricChartSlot,
} from './panels.js';
import { networkGraphStyles } from './styles.js';
import { dsText } from '../../../element/ds-text.js';

/** Same diameters as map `DEFAULT_BUBBLES_RADIUS` (7 size steps). */
const LEGEND_BUBBLE_SIZES = [10, 15, 20, 25, 30, 35, 40];

type NetworkView = 'network' | 'heatmap';

const VIEWS: Array<{ value: NetworkView; label: string }> = [
  { value: 'network', label: 'Network' },
  { value: 'heatmap', label: 'Heatmap' },
];

/** Room kept between the view toggle and the heatmap texts next to it. */
const TOGGLE_GAP = 6;
const ZOOM_STEP = 1.4;
/** Padding of the heatmap pane, and the room under rows that fill it. */
const HEATMAP_PADDING_TOP = 8;
const HEATMAP_PADDING_X = 12;
const HEATMAP_BOTTOM_ROOM = 104;
const HEATMAP_TITLE = 'Link values';
const TOTALS_TITLE = 'Total';

/** Narrower widgets show the details column under the graph, folded. */
const COMPACT_WIDTH = 900;
/** Narrower still, the folded topics go above the legend. */
const STACKED_WIDTH = 400;
/** From this width the topics sit in the timeline row, in front of the year. */
const DOCKED_TRENDS_WIDTH = 560;
/** The topic list of the timeline row leaves this much of the graph's top free. */
const DOCKED_LIST_TOP_ROOM = 56;
const DOCKED_LIST_MIN_HEIGHT = 160;
const TRENDS_LIST_HEIGHT = 320;
/** Top row: the host's data control sits between the view toggle and the zoom buttons. */
const TOGGLE_OFFSET = 12;
const ZOOM_ROOM = 96;
const DATA_CONTROL_MIN_WIDTH = 160;
const TRENDS_MOTION_MS = 280;
const METRIC_CHART_HEIGHT = 170;
const DEFAULT_PERIOD = 6;
const CLOSED_LISTS: Record<CardList, boolean> = {
  topics: false,
  connections: false,
  ranking: false,
};

/** Nodes and links left by the legend window and the timeline. */
interface ShownGraph {
  model: NetworkGraphModel;
  range: NetworkRange;
  date: number | null;
  nodes: NetworkNode[];
  links: NetworkLink[];
  /** Null while nothing is filtered out. */
  visibleIds: Set<string> | null;
  visibleLinkIds: Set<string> | null;
}

interface MetricChartSpec {
  series: PeriodPoint[];
  height: number;
  label?: string;
  unit?: string;
}

const upperFirst = (text: string): string => (text ? text[0].toUpperCase() + text.slice(1) : text);

let nextChartId = 0;

@customElement('ui9000-network-graph')
export class Ui9000NetworkGraph extends Ui9000ChartElement {
  static override styles = [networkGraphStyles, networkPanelStyles, chartShellStyles];

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
  private _legendOpen = false;

  @state()
  private _view: NetworkView = 'network';

  /** Selected node, shared by the graph, the heatmap and the connections panel. */
  @state()
  private _activeNodeId: string | null = null;

  /** Date the graph is shown on; null for data without dates. */
  @state()
  private _date: number | null = null;

  @state()
  private _topicName: string | null = null;

  @state()
  private _trendsOpen = false;

  @state()
  private _trendsMoving = false;

  /** Focus view of a node (the "+" of the selected node). */
  @state()
  private _focusId: string | null = null;

  /** Linked node picked in the focus view; its card replaces the topic sidebar. */
  @state()
  private _detailId: string | null = null;

  @state()
  private _detailsOpen = false;

  @state()
  private _period = DEFAULT_PERIOD;

  @state()
  private _metricIndex = 0;

  @state()
  private _ascending = false;

  @state()
  private _cardTab: CardTab = 'statistics';

  @state()
  private _cardMetricIndex = 0;

  @state()
  private _cardLists = { ...CLOSED_LISTS };

  @state()
  private _layoutWidth = 0;

  @state()
  private _stageHeight = 0;

  @state()
  private _toggleWidth = 0;

  @state()
  private _toggleHeight = 0;

  /** A plain wheel zooms. Off by default: in the chat it scrolls the transcript. */
  @property({ type: Boolean, attribute: 'wheel-zoom' })
  wheelZoom = false;

  /** Shown over the stage, for the host to say why there is no graph. */
  @property({ type: String })
  message = '';

  private _fanRaf = 0;
  private _trendsTimer = 0;
  private _cardNodeId: string | null = null;
  private _shown: ShownGraph | null = null;
  private readonly _charts = new Map<string, MetricChartSpec>();

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
    document.addEventListener('click', this._onDocumentClick);
  }

  protected override firstUpdated(): void {
    for (const selector of ['.network-layout', '.network-stage', '.view-toggle']) {
      const element = this.shadowRoot?.querySelector(selector);
      if (element) this._resizeObserver?.observe(element);
    }
  }

  override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    cancelAnimationFrame(this._resizeRaf);
    cancelAnimationFrame(this._fanRaf);
    window.clearTimeout(this._trendsTimer);
    document.removeEventListener('click', this._onDocumentClick);
    this.stopLegendDrag();
    const root = this.chartRoot();
    if (root) stopNetworkGraph(root);
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) {
      this._graphStale = true;
      // New buckets: the old slider window and selection no longer mean anything.
      this._range = { ...FULL_RANGE };
      this._activeNodeId = null;
      this._focusId = null;
      this._detailId = null;
      this._model = null;
      this._modelMode = null;
      this._modelStyle = null;
      const model = this.model();
      this._date = getDataDates(model).at(-1) ?? null;
      this._topicName = model.topics?.find((topic) => topic.selected)?.name ?? null;
    }
    if (this.hasUpdated && (changed.has('_trendsOpen') || changed.has('_topicName'))) {
      this.clipTopicsWhileMoving();
    }
    // A node the timeline or the legend hides closes its focus view.
    const shown = this.shownGraph();
    if (this._focusId && !shown.nodes.some((node) => node.id === this._focusId)) {
      this._focusId = null;
      this._detailId = null;
    }
    // Another node starts on its first metric with the lists closed.
    const cardNodeId = this._detailId ?? this._focusId;
    if (cardNodeId !== this._cardNodeId) {
      this._cardNodeId = cardNodeId;
      this._cardTab = 'statistics';
      this._cardMetricIndex = 0;
      this._cardLists = { ...CLOSED_LISTS };
    }
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('showTooltip') && !this.showTooltip) {
      this._labelTooltip = null;
      this.closeAllTooltips();
    }
    if (this.shouldRedraw(changed)) this.scheduleDraw();
    if (changed.has('_activeNodeId') || changed.has('_view') || changed.has('_focusId')) {
      this.followConnections();
    }
    if (changed.has('_focusId') && this._focusId) {
      // Keyboard focus moves into the view, so Escape closes it at once.
      this.shadowRoot?.querySelector<HTMLElement>('.focus-overlay')?.focus({ preventScroll: true });
    }
    this.drawFocus();
    this.drawMetricCharts();
  }

  private readonly _onDocumentClick = (event: MouseEvent): void => {
    if (!this._trendsOpen) return;
    const inline = this.shadowRoot?.querySelector('.trends-inline');
    if (inline && !event.composedPath().includes(inline)) this._trendsOpen = false;
  };

  /** Set before the paint, so the first frame of the move is clipped too. */
  private clipTopicsWhileMoving(): void {
    this._trendsMoving = true;
    window.clearTimeout(this._trendsTimer);
    this._trendsTimer = window.setTimeout(() => {
      this._trendsMoving = false;
    }, TRENDS_MOTION_MS + 40);
  }

  /** Dotted curves from the selected node to the panel follow it while it moves. */
  private followConnections(): void {
    cancelAnimationFrame(this._fanRaf);
    if (!this._activeNodeId || this._view !== 'network' || this._focusId) return;
    const draw = (): void => {
      this.drawFan();
      this._fanRaf = requestAnimationFrame(draw);
    };
    this._fanRaf = requestAnimationFrame(draw);
  }

  private drawFan(): void {
    const root = this.chartRoot();
    const stage = this.shadowRoot?.querySelector('.network-stage');
    const id = this._activeNodeId;
    if (!root || !stage || !id) return;
    const nodeElement = networkNodeElement(root, id);
    if (!nodeElement) return;
    const base = stage.getBoundingClientRect();
    const box = nodeElement.getBoundingClientRect();
    const x0 = box.right - base.left;
    const y0 = box.top + box.height / 2 - base.top;
    this.shadowRoot?.querySelectorAll<SVGPathElement>('.fan-path').forEach((path) => {
      const dot = this.shadowRoot?.querySelector(`[data-dot="${path.dataset.target}"]`);
      if (!dot) return;
      const target = dot.getBoundingClientRect();
      const x1 = target.left + target.width / 2 - base.left;
      const y1 = target.top + target.height / 2 - base.top;
      const bend = Math.max((x1 - x0) * 0.55, 24);
      path.setAttribute('d', `M${x0} ${y0} C${x0 + bend} ${y0} ${x1 - bend} ${y1} ${x1} ${y1}`);
    });
  }

  private selectNode(id: string | null): void {
    this._activeNodeId = id;
    const root = this.chartRoot();
    if (root) setNetworkGraphActive(root, id);
    const heatmap = this.heatmapRoot();
    if (heatmap) setHeatmapSelectedRow(heatmap, id);
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
    const root = this.chartRoot();
    if (root) {
      this.withSeriesMode(() => setNetworkGraphColors(root, this.themeMode(), this.model().nodes));
    }
    this.requestUpdate();
    if (this._view === 'heatmap') this.scheduleDraw();
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
      this.measureLayout();
      const root = this.chartRoot();
      if (!root) return;
      if (this._view === 'heatmap' || !resizeNetworkGraph(root, root.clientWidth, root.clientHeight)) {
        this.draw();
      }
      this.drawFocus();
      this.drawMetricCharts();
    });
  }

  private measureLayout(): void {
    const layout = this.shadowRoot?.querySelector<HTMLElement>('.network-layout');
    const stage = this.shadowRoot?.querySelector<HTMLElement>('.network-stage');
    const toggle = this.shadowRoot?.querySelector<HTMLElement>('.view-toggle');
    if (layout) this._layoutWidth = layout.clientWidth;
    if (stage) this._stageHeight = stage.clientHeight;
    if (toggle?.offsetWidth) {
      this._toggleWidth = toggle.offsetWidth;
      this._toggleHeight = toggle.offsetHeight;
    }
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

  private shownGraph(): ShownGraph {
    const model = this.model();
    const cached = this._shown;
    if (cached?.model === model && cached.range === this._range && cached.date === this._date) {
      return cached;
    }
    const inRange = visibleNodeIds(model, this._range);
    const dated = this._date == null ? model : filterGraphByDate(model, this._date);
    const nodes = inRange ? dated.nodes.filter((node) => inRange.has(node.id)) : dated.nodes;
    const ids = new Set(nodes.map((node) => node.id));
    const links = dated.links.filter((link) => ids.has(link.source) && ids.has(link.target));
    const filtered = nodes.length < model.nodes.length || links.length < model.links.length;
    this._shown = {
      model,
      range: this._range,
      date: this._date,
      nodes,
      links,
      visibleIds: filtered ? ids : null,
      visibleLinkIds: filtered ? new Set(links.map((link) => link.id)) : null,
    };
    return this._shown;
  }

  /** The graph keeps its layout: the legend window and the timeline only hide parts of it. */
  private applyFilters(): void {
    const root = this.chartRoot();
    if (!root) return;
    const { visibleIds, visibleLinkIds } = this.shownGraph();
    const updated = updateNetworkGraphVisibility(root, visibleIds, visibleLinkIds);
    if (!updated || this._view === 'heatmap') this.scheduleDraw();
  }

  private openFocus(id: string): void {
    this._focusId = id;
    this._detailId = null;
    this.closeAllTooltips();
    // A node that is a topic shows its own figures.
    if (getNetworkTopics(this.model()).some((topic) => topic.name === id)) this._topicName = id;
  }

  private closeFocus(): void {
    this._focusId = null;
    this._detailId = null;
    this.closeAllTooltips();
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
    const { ids, labels, colors, values } = buildNetworkHeatmap(this.shownGraph());
    const words = model.labels;
    // What a cell and a total hold, from the data when it says.
    const cellTitle = words?.linkValue ? upperFirst(words.linkValue) : 'Value';
    const totalTitle = words?.linkValue ? `Total ${words.linkValue}` : TOTALS_TITLE;
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
          { label: totalTitle, value: formatNodeValue(total) },
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
      title: words?.heatmapTitle ?? HEATMAP_TITLE,
      // Each linked pair has two cells, one on each side of the diagonal.
      subtitle: words?.heatmapSubtitle ?? `${ids.length} nodes · ${values.size / 2} links`,
      rowTotalsTitle: totalTitle,
      columnTotalsTitle: totalTitle,
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
      onRowClick: (row) => this.selectNode(this._activeNodeId === row ? null : row),
      onCellEnter: (event, { row, column, value }) =>
        showTip(event, {
          rows: [
            { label: 'From', value: labelOf(row) },
            { label: 'To', value: labelOf(column) },
            { label: cellTitle, value: formatNodeValue(value) },
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
      if (heatmap) this.withSeriesMode(() => this.drawHeatmap(heatmap, model));
      if (root.childElementCount) return;
    } else if (root.childElementCount && !this._graphStale) {
      // Coming back from the heatmap: the settled layout is still there.
      return;
    }
    this._graphStale = false;

    const { visibleIds, visibleLinkIds } = this.shownGraph();
    this.withSeriesMode(() =>
      renderNetworkGraph(root, {
        model,
        visibleIds,
        visibleLinkIds,
        themeMode: this.themeMode(),
        fontFamily: readThemeFromElement(this).fontFamily,
        activeNodeId: this._activeNodeId,
        wheelZoom: this.wheelZoom,
        onSelect: (id) => {
          this._activeNodeId = id;
        },
        onOpenFocus: (id) => this.openFocus(id),
      }),
    );
  }

  private drawFocus(): void {
    const canvas = this.shadowRoot?.querySelector<HTMLElement>('.focus-canvas');
    if (!canvas) return;
    const { nodes, links } = this.shownGraph();
    const node = nodes.find((item) => item.id === this._focusId);
    if (!node) return;
    const mode = this.themeMode();
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const key = [node.id, width, height, mode, this.styleId(), nodes.length, links.length].join('|');
    if (canvas.dataset.drawn === key) {
      setFocusViewSelection(canvas, this._detailId);
      return;
    }
    canvas.dataset.drawn = key;
    const { onAxisLabelHover, onAxisLabelLeave } = this.axisLabelHandlers();
    this.withSeriesMode(() => renderFocusView(canvas, {
      node,
      nodes,
      links,
      width,
      height,
      themeMode: mode,
      selectedId: this._detailId,
      measure: createTextMeasure(readThemeFromElement(this).fontFamily),
      onSelect: (id) => {
        this._detailId = id;
      },
      onOpen: (id) => {
        this.openFocus(id);
        this.selectNode(id);
      },
      onClose: () => this.closeFocus(),
      onLabelHover: this.showTooltip ? onAxisLabelHover : undefined,
      onLabelLeave: this.showTooltip ? onAxisLabelLeave : undefined,
    }));
  }

  private readonly metricChart: MetricChartSlot = (key, series, metric, height) => {
    if (series.length < 2) return nothing;
    const chartHeight = height ?? METRIC_CHART_HEIGHT;
    this._charts.set(key, {
      series,
      height: chartHeight,
      label: metric?.label,
      unit: metric?.unit,
    });
    return html`<div class="metric-chart" data-chart=${key} style="height:${chartHeight}px"></div>`;
  };

  private drawMetricCharts(): void {
    const mode = this.themeMode();
    this.shadowRoot?.querySelectorAll<HTMLElement>('.metric-chart').forEach((box) => {
      const spec = this._charts.get(box.dataset.chart ?? '');
      if (!spec) return;
      const { series, height, label, unit } = spec;
      const width = box.clientWidth;
      const key = [
        label,
        width,
        height,
        mode,
        this.styleId(),
        series.map((point) => `${point.time}:${point.value}`).join(),
      ].join('|');
      if (box.dataset.drawn === key) return;
      box.dataset.drawn = key;
      this.withSeriesMode(() => renderMetricChart(box, {
        series,
        width,
        height,
        themeMode: mode,
        idPrefix: `${this._chartId}-${box.dataset.chart}`,
        label,
        onPointHover: (point, event) => {
          if (!this.showTooltip) return;
          this.openTooltip(event, {
            title: `${label ? `${label}: ` : ''}${formatMetricValue(point.value, unit)}`,
            body: formatPointDate(point.time),
            rows: [],
          });
        },
        onPointLeave: () => this.closeTooltip(),
      }));
    });
  }

  private setRange(edge: 'leftSlider' | 'rightSlider', raw: number): void {
    const next = slideThumb(this._range, edge, raw, this._ranges.length);
    if (next.leftSlider === this._range.leftSlider && next.rightSlider === this._range.rightSlider) {
      return;
    }
    this._range = next;
    this.applyFilters();
  }

  private setDate(time: number): void {
    if (time === this._date) return;
    this._date = time;
    this.applyFilters();
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

  private legendTypes(model: NetworkGraphModel): Array<{ name: string; color: string }> {
    const colors = new Map<string, string>();
    for (const node of model.nodes) {
      if (node.type && !colors.has(node.type)) {
        colors.set(node.type, nodeColor(node, this.themeMode()));
      }
    }
    return Array.from(colors, ([name, color]) => ({ name, color }));
  }

  private renderLegend(compact: boolean) {
    if (!this.showLegend || this._empty || this._ranges.length < 2) return nothing;
    const { leftSlider, rightSlider } = this._range;
    const last = this._ranges.length;
    const { onAxisLabelHover, onAxisLabelLeave } = this.axisLabelHandlers();
    const model = this.model();
    const sizeLabel = model.labels?.nodeValue;
    // Node types and their colours, when the data names its words.
    const types = model.labels ? this.legendTypes(model) : [];

    return html`
      <div class="graph-legend" part="legend" ?data-compact=${compact && !this._legendOpen}>
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
              ${sizeLabel ? html`<p class="legend-caption">Node size: ${sizeLabel}</p>` : nothing}
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
                            style="--bubble-size:${bubble}px;--inner-size:${inner}px"
                          ></span>`;
                        })}
                      </div>
                    </div>
                    <div class="legend-values">
                      ${this._ranges.map(
                        (range) => html`<span
                          class="legend-value"
                          @mouseenter=${this.showTooltip
                            ? (e: MouseEvent) => onAxisLabelHover?.(formatNodeValue(range.start), e)
                            : undefined}
                          @mouseleave=${this.showTooltip ? onAxisLabelLeave : undefined}
                          >${formatLegendValue(
                            range.start,
                            model.nodes.every(
                              (node) => node.value == null || Number.isInteger(node.value),
                            ),
                          )}</span
                        >`,
                      )}
                    </div>
                  </div>
                </div>
              </div>
              ${types.length
                ? html`<p class="legend-caption">Colour: node type</p>
                    <div class="legend-types" aria-label="Node types">
                      ${types.map(
                        (type) => html`<div class="legend-type">
                          <span class="legend-type-dot" style="background:${type.color}"></span>
                          <span class="legend-type-name">${type.name}</span>
                        </div>`,
                      )}
                    </div>`
                : nothing}
            </div>`
          : nothing}
      </div>
    `;
  }

  /** Series and status colours; the rest of the panels reads the `--ui9000-*` tokens. */
  private stageStyle(): string {
    const mode = this.themeMode();
    const { up, down } = trendColors(mode);
    const { accent } = this.withSeriesMode(() => graphThemeColors(mode));
    return `--graph-accent:${accent};--panel-up:${up};--panel-down:${down}`;
  }

  private renderZoomControls() {
    const zoomBy = (factor: number): void => {
      const root = this.chartRoot();
      if (root) zoomNetworkGraph(root, factor);
    };
    return html`<div class="zoom-controls">
      <button type="button" class="zoom-button" aria-label="Zoom in" @click=${() => zoomBy(ZOOM_STEP)}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
      <button type="button" class="zoom-button" aria-label="Zoom out" @click=${() => zoomBy(1 / ZOOM_STEP)}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M1 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>`;
  }

  /** Neighbours of the selected node, strongest link first. */
  private renderConnections(shown: ShownGraph, linkValue: string | undefined) {
    const id = this._activeNodeId;
    if (!id || !shown.nodes.some((node) => node.id === id)) return nothing;
    const connections = getConnectionList(id, shown.nodes, shown.links);
    const maxWeight = connections[0]?.weight ?? 0;
    return html`<svg class="fan-overlay" aria-hidden="true">
        ${connections.map(
          ({ node }) => svg`<path
            class="fan-path"
            data-target=${node.id}
            fill="none"
            stroke="var(--graph-accent)"
            stroke-opacity="0.7"
            stroke-width="1.5"
            stroke-dasharray="0.5 4"
            stroke-linecap="round"
          />`,
        )}
      </svg>
      <aside class="connections-panel" aria-label="Connections">
        <p class="connections-title">Connections:</p>
        <ul class="connections-list">
          ${connections.map(({ node, weight }) => {
            const share = maxWeight ? weight / maxWeight : 0;
            const ring =
              CONNECTION_RING_MIN + (CONNECTION_RING_MAX - CONNECTION_RING_MIN) * Math.sqrt(share);
            return html`<li class="connection-item">
              <button type="button" class="connection-button" @click=${() => this.selectNode(node.id)}>
                <span class="connection-dot" data-dot=${node.id} style="--ring:${ring * 2}px"></span>
                <span class="connection-text">
                  <span class="connection-name">${node.label}</span>
                  <span class="connection-sub">
                    ${formatNodeValue(weight)}
                    ${linkValue ?? (weight === 1 ? 'connection' : 'connections')}
                  </span>
                </span>
              </button>
            </li>`;
          })}
        </ul>
      </aside>`;
  }

  private renderViewToggle(hidden: boolean) {
    return html`<div class="view-toggle" ?hidden=${hidden} role="tablist" aria-label="Chart view">
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

  private renderTopics(
    topics: NetworkTopic[],
    compact: boolean,
    docked: boolean,
  ): TemplateResult | typeof nothing {
    const labels = this._model?.labels;
    return renderTrends({
      topics,
      selected: this._topicName,
      open: this._trendsOpen,
      moving: this._trendsMoving,
      title: labels?.topics,
      changeHint: labels?.topicChange,
      compact,
      raised: compact && this._layoutWidth < STACKED_WIDTH,
      docked,
      listMaxHeight: docked
        ? Math.max(DOCKED_LIST_MIN_HEIGHT, this._stageHeight - DOCKED_LIST_TOP_ROOM)
        : TRENDS_LIST_HEIGHT,
      listId: `${this._chartId}-topics`,
      onSelect: (name) => {
        this._topicName = name;
      },
      onToggle: () => {
        this._trendsOpen = !this._trendsOpen;
      },
      onOpen: () => {
        this._trendsOpen = true;
      },
      onClose: () => {
        this._trendsOpen = false;
      },
    });
  }

  /** The details column: the node card in the focus view, else the topic. */
  private renderDetails(
    model: NetworkGraphModel,
    shown: ShownGraph,
    topics: NetworkTopic[],
    focusNode: NetworkNode | null,
    compact: boolean,
  ): TemplateResult | typeof nothing {
    const { labels } = model;
    const topic = topics.find((item) => item.name === this._topicName) ?? null;
    const ranking = topic?.ranking ?? model.ranking ?? [];
    const detailNode = shown.nodes.find((node) => node.id === this._detailId) ?? focusNode;

    let body: TemplateResult;
    let title: string;
    if (focusNode && detailNode) {
      const topicNames = topics.map((item) => item.name);
      const metrics = detailNode.metrics ?? [];
      const metric = metrics[Math.min(this._cardMetricIndex, metrics.length - 1)];
      const counts = getConnectionCounts(shown.nodes, shown.links);
      title = detailNode.label;
      body = renderNodeDetails({
        node: detailNode,
        connections: getConnectionList(detailNode.id, shown.nodes, shown.links),
        topics: getNodeTopics(detailNode, topicNames),
        topicName: this._topicName,
        ranking,
        connectionsOf: (name) => counts.get(name),
        labels,
        tab: this._cardTab,
        metricIndex: this._cardMetricIndex,
        open: this._cardLists,
        series: getPeriodSeries(metric?.series ?? [], CARD_CHART_MONTHS),
        chart: this.metricChart,
        onTab: (tab) => {
          this._cardTab = tab;
        },
        onMetric: (index) => {
          this._cardMetricIndex = index;
        },
        onToggleList: (list) => {
          this._cardLists = { ...this._cardLists, [list]: !this._cardLists[list] };
        },
        onTopicSelect: (name) => {
          this._topicName = name;
        },
        onNodeSelect: (id) => {
          this._detailId = id;
        },
      });
    } else if (ranking.length || topic?.metrics?.length) {
      const metrics = topic?.metrics ?? [];
      const metric = metrics[Math.min(this._metricIndex, metrics.length - 1)];
      title = topic?.name ?? labels?.ranking ?? 'Details';
      body = renderTopicSidebar({
        topic,
        ranking,
        labels,
        period: this._period,
        metricIndex: this._metricIndex,
        ascending: this._ascending,
        series: getPeriodSeries(metric?.series ?? [], this._period),
        chart: this.metricChart,
        onPeriod: (months) => {
          this._period = months;
        },
        onMetric: (index) => {
          this._metricIndex = index;
        },
        onSort: () => {
          this._ascending = !this._ascending;
        },
      });
    } else {
      return nothing;
    }

    if (!compact) return body;
    return renderCompactDetails({
      title,
      metrics: focusNode ? [] : topic?.metrics,
      open: this._detailsOpen,
      bodyId: `${this._chartId}-details`,
      body,
      onToggle: () => {
        this._detailsOpen = !this._detailsOpen;
      },
    });
  }

  private renderFocus(model: NetworkGraphModel, topics: NetworkTopic[], node: NetworkNode) {
    return html`<div
      class="focus-overlay"
      tabindex="-1"
      role="dialog"
      aria-label=${`Focus on ${node.label}`}
      @keydown=${(event: KeyboardEvent) => {
        if (event.key === 'Escape') this.closeFocus();
      }}
    >
      ${renderFocusHeader({
        node,
        topicNames: topics.map((topic) => topic.name),
        topicName: this._topicName,
        topicLabel: model.labels?.topic,
        onClose: () => this.closeFocus(),
        onTopicChange: (name) => {
          this._topicName = name;
        },
      })}
      <div class="focus-canvas"></div>
    </div>`;
  }

  override render() {
    const model = this.model();
    const shown = this.shownGraph();
    const topics = getNetworkTopics(model);
    const isHeatmap = this._view === 'heatmap';
    const focusNode = isHeatmap
      ? null
      : (shown.nodes.find((node) => node.id === this._focusId) ?? null);
    const isFocus = !!focusNode;
    const width = this._layoutWidth;
    const compact = width > 0 && width < COMPACT_WIDTH;
    const dates = getDataDates(model);
    // A single date leaves nothing to pick.
    const date = dates.length > 1 ? this._date : null;
    const trendsDocked = date != null && width >= DOCKED_TRENDS_WIDTH;
    // Centred, so the same room on both sides: the wider of the toggle and the zoom buttons.
    const dataControlSide = Math.max(
      TOGGLE_OFFSET + (this._toggleWidth ? this._toggleWidth + 8 : 0),
      ZOOM_ROOM,
    );
    const showDataControl = width - 2 * dataControlSide >= DATA_CONTROL_MIN_WIDTH;

    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(this.headerTitle())}
        <div class="widget-body">
          <div
            class="network-layout"
            ?hidden=${this._empty && !this.message}
            ?data-compact=${compact}
            style=${this.stageStyle()}
          >
            <div class="network-main">
              <div class="network-stage">
                ${this.renderViewToggle(isFocus)}
                <div class="chart-root" part="chart" ?data-covered=${isHeatmap || isFocus}></div>
                ${isHeatmap || isFocus ? nothing : this.renderZoomControls()}
                ${isHeatmap || isFocus
                  ? nothing
                  : this.renderConnections(shown, model.labels?.linkValue)}
                <div class="heatmap-pane" ?hidden=${!isHeatmap}>
                  <div class="heatmap-root" part="heatmap"></div>
                  <div class="heatmap-fade"></div>
                </div>
                ${focusNode ? this.renderFocus(model, topics, focusNode) : nothing}
                ${isHeatmap || isFocus ? nothing : this.renderLegend(compact)}
                ${isFocus || trendsDocked ? nothing : this.renderTopics(topics, compact, false)}
                ${this.message ? html`<div class="stage-message">${this.message}</div>` : nothing}
                <div
                  class="data-control"
                  ?hidden=${isFocus || !showDataControl}
                  style="max-width:calc(100% - ${2 * dataControlSide}px);height:${this._toggleHeight}px"
                >
                  <slot name="data-control"></slot>
                </div>
              </div>
              ${date != null
                ? renderTimeline({
                    value: date,
                    dates,
                    compact,
                    leading:
                      trendsDocked && !isFocus ? this.renderTopics(topics, compact, true) : nothing,
                    onChange: (time) => this.setDate(time),
                  })
                : nothing}
            </div>
            ${this.renderDetails(model, shown, topics, focusNode, compact)}
          </div>
          ${this._empty && !this.message
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
