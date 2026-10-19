import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { ChartTooltipContent, ChartTooltipRow } from '../../../element/chart-tooltip-portal.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  formatNumber,
  formatShare,
  formatStageMetric,
  MAX_NODES,
  metricText,
  normalizeReasoningOrchestration,
  STATE_NAME,
  STATUS_NAME,
  type Metric,
  type ReasoningNode,
  type ReasoningOrchestrationModel,
  type ReasoningPath,
  type ReasoningStage,
} from '../lib/index.js';
import {
  entropyColors,
  formatScalingX,
  formatScalingY,
  highlightedChain,
  modelColor,
  MONO_FONT,
  orchestrationPalette,
  renderEntropyStrip,
  renderReasoningOrchestration,
  renderScalingChart,
  renderTopChart,
  type OrchestrationController,
  type OrchestrationSelection,
} from '../render/index.js';
import { reasoningOrchestrationStyles } from './styles.js';

/**
 * `show-*` flags arrive as the string "false" from `ui9000-chart-renderer`; a
 * plain `type: Boolean` would read any present attribute as true.
 */
const flagConverter = {
  fromAttribute: (value: string | null): boolean => value !== null && value !== 'false',
  toAttribute: (value: boolean): string => (value ? '' : 'false'),
};

/** Plot size where nothing is laid out (tests, a detached element). */
const FALLBACK = { width: 880, height: 520 };

export interface PathSelectDetail {
  /** The selected path, or null when a node was picked or the selection was cleared. */
  pathId: string | null;
  /** The picked node, when the selection came from a node. */
  nodeId: string | null;
  /** The highlighted chain, root first. Empty when cleared back to the active path. */
  nodes: string[];
}

const NO_SELECTION: OrchestrationSelection = { pathId: null, nodeId: null };

/**
 * Reasoning orchestration graph (AM-1): reasoning stages, candidate paths,
 * models and refinement steps, with the active path highlighted and the
 * alternatives subordinate. The top chart compares a stage metric across
 * depth; step entropy, the refinement pipeline and compute scaling sit in
 * panels under the plot. Hover explains a node, a path or a stage; a click
 * highlights a path (or the path to a node), Escape returns to the active one.
 */
@customElement('ui9000-reasoning-orchestration-graph')
export class Ui9000ReasoningOrchestrationGraph extends Ui9000ChartElement {
  static override styles = [reasoningOrchestrationStyles, chartShellStyles];

  @property({ converter: flagConverter, attribute: 'show-legend' })
  showLegend = true;

  @property({ converter: flagConverter, attribute: 'show-tooltip' })
  showTooltip = true;

  /** Readouts and the stage chart above the plot. */
  @property({ converter: flagConverter, attribute: 'show-top-chart' })
  showTopChart = true;

  /** Step entropy, refinement pipeline and compute scaling under the plot. */
  @property({ converter: flagConverter, attribute: 'show-panels' })
  showPanels = true;

  @property({ converter: flagConverter, attribute: 'show-annotations' })
  showAnnotations = true;

  /** Path id to highlight instead of the active path. */
  @property({ type: String, attribute: 'selected-path' })
  selectedPath = '';

  @state()
  private _model: ReasoningOrchestrationModel = normalizeReasoningOrchestration(null);

  @state()
  private _selection: OrchestrationSelection = NO_SELECTION;

  private _controller: OrchestrationController | null = null;
  private _resizeObserver?: ResizeObserver;
  private _raf = 0;

  private readonly _onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.hasSelection()) {
      event.stopPropagation();
      this.clearSelection();
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => this.scheduleDraw());
    this._resizeObserver.observe(this);
    this.addEventListener('keydown', this._onKeydown);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this._onKeydown);
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    super.disconnectedCallback();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) {
      this._model = normalizeReasoningOrchestration(parseJsonAttr(this.dataJson, null));
      this._selection = NO_SELECTION;
    }
    if (changed.has('dataJson') || changed.has('selectedPath')) {
      const known = this._model.paths.some((path) => path.id === this.selectedPath);
      this._selection = known ? { pathId: this.selectedPath, nodeId: null } : NO_SELECTION;
    }
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('showTooltip') && !this.showTooltip) this.closeAllTooltips();
    if (this.shouldRedraw(changed)) this.scheduleDraw();
  }

  /** The legend and the tooltip are shell chrome; toggling them leaves the plot alone. */
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
    super.onThemeChange();
    this.scheduleDraw();
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  private shadowPart(selector: string): HTMLElement | null {
    return (this.shadowRoot?.querySelector(selector) as HTMLElement | null) ?? null;
  }

  private mode(): 'light' | 'dark' {
    return this.themeMode() === 'dark' ? 'dark' : 'light';
  }

  /** Draws now. The element schedules draws on a frame; tests call this directly. */
  draw(): void {
    const root = this.shadowPart('.chart-root');
    const canvas = this.shadowPart('.chart-root > .ro-canvas');
    if (!root || !canvas) return;
    const model = this._model;
    if (model.empty) {
      canvas.replaceChildren();
      this._controller = null;
      return;
    }
    const width = root.clientWidth || FALLBACK.width;
    const height = root.clientHeight || FALLBACK.height;
    this._controller = renderReasoningOrchestration(canvas, {
      model,
      width,
      height,
      themeMode: this.mode(),
      fontFamily: MONO_FONT,
      selection: this._selection,
      showAnnotations: this.showAnnotations,
      readoutCeiling: this.labelsBottom(),
      readoutFloor: this.legendTop(),
      handlers: {
        onNodeHover: (node, event) => this.tip(event, this.nodeTooltip(node)),
        onPathHover: (path, event) => this.tip(event, this.pathTooltip(path)),
        onLeave: () => this.closeTooltip(),
        onSelect: (selection) => this.select(selection),
      },
    });
    this.drawStrips(width);
  }

  /** Bottom of the model labels in the plot's top corners, so stage names on the right edge start below them. */
  private labelsBottom(): number | undefined {
    const side = this.shadowPart('.chart-root .ro-models-side--right');
    return side?.offsetHeight ? side.offsetTop + side.offsetHeight + 12 : undefined;
  }

  /** Top of the legend in the plot's corner, so stage names on the right edge stop above it. */
  private legendTop(): number | undefined {
    const legend = this.shadowPart('.chart-root > .ro-legend');
    return legend?.offsetHeight ? legend.offsetTop - 16 : undefined;
  }

  /** The top chart and the panels; redrawn with the plot and on every selection. */
  private drawStrips(fallbackWidth: number): void {
    const model = this._model;
    const mode = this.mode();
    const chain = this._controller?.highlighted() ?? highlightedChain(model, this._selection).nodes;
    const highlight = this.highlightColor();
    const top = this.shadowPart('.ro-top-chart');
    if (top) {
      renderTopChart(top, {
        model,
        width: top.clientWidth || fallbackWidth,
        height: top.clientHeight || 40,
        themeMode: mode,
        chain,
        highlightColor: highlight,
        onStageHover: (stage, nodes, event) => this.tip(event, this.stageTooltip(stage, nodes)),
        onLeave: () => this.closeTooltip(),
      });
    }
    const entropy = this.shadowPart('.ro-entropy');
    if (entropy && model.entropy) {
      renderEntropyStrip(entropy, {
        entropy: model.entropy,
        model,
        width: entropy.clientWidth || fallbackWidth,
        height: entropy.clientHeight || 30,
        themeMode: mode,
        highlightColor: highlight,
        onStepHover: (step, values, event) =>
          this.tip(event, {
            title: `Step ${step + 1}`,
            rows: values.map((item) => ({ label: item.label, value: formatNumber(item.value) })),
          }),
        onLeave: () => this.closeTooltip(),
      });
    }
    const scaling = this.shadowPart('.ro-scaling');
    if (scaling && model.scaling) {
      const spec = model.scaling;
      renderScalingChart(scaling, {
        scaling: spec,
        model,
        width: scaling.clientWidth || 240,
        height: scaling.clientHeight || 56,
        themeMode: mode,
        onPointHover: (series, point, event) =>
          this.tip(event, {
            title: series.label,
            rows: [
              { label: spec.xLabel, value: formatScalingX(point.x) },
              { label: spec.yLabel, value: formatScalingY(spec, point.y) },
            ],
          }),
        onLeave: () => this.closeTooltip(),
      });
    }
  }

  /** The highlighted path's colour at its far end: its model, else the palette glow. */
  private highlightColor(): string {
    const palette = orchestrationPalette(this.mode());
    const { path, nodes } = highlightedChain(this._model, this._selection);
    const end = this._model.nodes.find((node) => node.id === nodes[nodes.length - 1]);
    const modelId = path?.modelId ?? end?.modelId;
    const model = this._model.models.find((item) => item.id === modelId);
    return model ? modelColor(palette, model) : palette.glow;
  }

  private tip(event: MouseEvent | FocusEvent, content: ChartTooltipContent): void {
    if (!this.showTooltip) return;
    if (event instanceof MouseEvent) {
      this.openTooltip(event, content);
      return;
    }
    // Keyboard focus: anchor the card on the focused mark.
    const rect = (event.currentTarget as Element | null)?.getBoundingClientRect();
    const clientX = rect ? rect.left + rect.width / 2 : 0;
    const clientY = rect ? rect.top : 0;
    this.openTooltip(
      { clientX, clientY, pageX: clientX + window.scrollX, pageY: clientY + window.scrollY } as MouseEvent,
      content,
    );
  }

  /** Highlighted path, or null for the active one. */
  get selection(): PathSelectDetail | null {
    if (!this.hasSelection()) return null;
    return { ...this._selection, nodes: this._controller?.highlighted() ?? [] };
  }

  /** Highlights a path by id, as a click on it would. */
  selectPath(pathId: string): void {
    if (this._model.paths.some((path) => path.id === pathId)) this.select({ pathId, nodeId: null });
  }

  /** Highlights the path from the root to a node, as a click on it would. */
  selectNode(nodeId: string): void {
    if (this._model.nodes.some((node) => node.id === nodeId)) this.select({ pathId: null, nodeId });
  }

  /** Back to the active path. */
  clearSelection(): void {
    this.select(NO_SELECTION);
  }

  private hasSelection(): boolean {
    return Boolean(this._selection.pathId || this._selection.nodeId);
  }

  private select(selection: OrchestrationSelection): void {
    const same = selection.pathId === this._selection.pathId && selection.nodeId === this._selection.nodeId;
    if (same) return;
    this._selection = selection;
    this.closeTooltip();
    this._controller?.setSelection(selection);
    this.drawStrips(this.shadowPart('.chart-root')?.clientWidth || FALLBACK.width);
    const cleared = !selection.pathId && !selection.nodeId;
    const detail: PathSelectDetail = {
      ...selection,
      nodes: cleared ? [] : (this._controller?.highlighted() ?? highlightedChain(this._model, selection).nodes),
    };
    this.dispatchEvent(new CustomEvent<PathSelectDetail>('path-select', { detail, bubbles: true, composed: true }));
  }

  private modelName(id: string | null): string {
    return this._model.models.find((model) => model.id === id)?.name ?? '';
  }

  private nodeTooltip(node: ReasoningNode): ChartTooltipContent {
    const rows: ChartTooltipRow[] = [];
    const stage = node.stageIndex === null ? undefined : this._model.stages[node.stageIndex];
    if (stage) rows.push({ label: 'Stage', value: stage.label });
    rows.push({ label: 'Depth', value: formatNumber(node.depth) });
    const model = this.modelName(node.modelId);
    if (model) rows.push({ label: 'Model', value: model });
    rows.push({ label: 'State', value: STATE_NAME[node.state] });
    if (node.score !== null) rows.push({ label: 'Score', value: formatShare(node.score) });
    const note = this._model.annotations.find((item) => item.nodeId === node.id);
    if (note) rows.push({ label: 'Event', value: note.title });
    return { title: node.label, rows };
  }

  private pathTooltip(path: ReasoningPath): ChartTooltipContent {
    const rows: ChartTooltipRow[] = [];
    const model = this.modelName(path.modelId);
    if (model) rows.push({ label: 'Model', value: model });
    rows.push({ label: 'Steps', value: formatNumber(path.nodes.length - 1) });
    const end = this._model.nodes.find((node) => node.id === path.nodes[path.nodes.length - 1]);
    if (end) {
      rows.push({ label: 'Depth', value: formatNumber(end.depth) });
      rows.push({ label: 'Ends', value: STATE_NAME[end.state] });
    }
    if (path.score !== null) rows.push({ label: 'Score', value: formatShare(path.score) });
    rows.push({ label: 'Click', value: 'Highlight' });
    return { title: path.label, rows };
  }

  private stageTooltip(stage: ReasoningStage, nodes: number): ChartTooltipContent {
    const from = formatNumber(stage.depthFrom);
    const to = formatNumber(stage.depthTo);
    const rows: ChartTooltipRow[] = [
      { label: 'Depth', value: from === to ? from : `${from}–${to}` },
      { label: 'Nodes', value: formatNumber(nodes) },
    ];
    if (stage.status) rows.push({ label: 'Status', value: STATUS_NAME[stage.status] });
    const model = this.modelName(stage.modelId);
    if (model) rows.push({ label: 'Model', value: model });
    const metric = this._model.stageMetric;
    for (const [key, value] of Object.entries(stage.metrics)) {
      const label = metric?.key === key ? metric.label : key;
      rows.push({ label, value: metric?.key === key ? formatStageMetric(metric, value) : formatNumber(value) });
    }
    return { title: stage.label, rows };
  }

  private renderMeta() {
    const { subtitle, empty } = this._model;
    if (empty || !subtitle) return undefined;
    return html`<span class="ro-meta" part="meta" title=${subtitle}>${subtitle}</span>`;
  }

  private renderMetricList(metrics: Metric[]): TemplateResult[] {
    return metrics.map(
      (metric, i) => html`${i ? ' · ' : ''}${metric.label} <strong>${metric.value}</strong>${metric.delta
          ? html` <span class="ro-delta" data-trend=${metric.trend ?? ''}>(${metric.delta})</span>`
          : nothing}`,
    );
  }

  private renderTop() {
    if (!this.showTopChart || this._model.empty) return nothing;
    const { summaryLabel, summary, summaryText, criterion } = this._model;
    return html`<div class="ro-top" part="top-chart">
      <div class="ro-readouts">
        <span class="ro-summary"
          >${summaryLabel}${summaryText
            ? html` · ${summaryText}`
            : summary.length
              ? html` · ${this.renderMetricList(summary)}`
              : nothing}</span
        >
        ${criterion ? html`<span class="ro-criterion">${criterion}</span>` : nothing}
      </div>
      <div class="ro-top-chart"></div>
    </div>`;
  }

  /** Model labels in the plot's top corners: first, third… on the left; second, fourth… on the right. */
  private renderModels() {
    const { models, empty } = this._model;
    if (empty || !models.length) return nothing;
    const palette = orchestrationPalette(this.mode());
    const chip = (model: (typeof models)[number]) => html`<span class="ro-chip" data-model=${model.id}>
      <span class="ro-dot" style="background:${modelColor(palette, model)}"></span>
      <span class="ro-chip-name">${model.name}</span> ${model.detail
        ? html`<span>· ${model.detail}</span>`
        : model.role
          ? html`<span>· ${model.role}</span>`
          : nothing}
    </span>`;
    return html`<div class="ro-models" part="models">
      <div class="ro-models-side">${models.filter((_, i) => i % 2 === 0).map(chip)}</div>
      <div class="ro-models-side ro-models-side--right">${models.filter((_, i) => i % 2 === 1).map(chip)}</div>
    </div>`;
  }

  /** Every colour and line in the plot, named: the highlighted path, each model, pruned. */
  private renderLegend() {
    if (!this.showLegend || this._model.empty) return nothing;
    const mode = this.mode();
    const palette = orchestrationPalette(mode);
    const { models, nodes, paths, activePathId } = this._model;
    const highlight = this.highlightColor();
    const pathLabel = this.hasSelection() ? 'Selected path' : 'Active path';
    const hasPath = this.hasSelection() || paths.some((path) => path.id === activePathId);
    const pruned = nodes.some((node) => node.state === 'pruned' || node.state === 'failed');
    return html`<div class="ro-legend" part="legend">
      ${hasPath
        ? html`<span class="ro-legend-item"
            ><span
              class="ro-swatch-path"
              style="background:linear-gradient(90deg, ${palette.pathStart}, ${palette.pathMid}, ${highlight})"
            ></span
            >${pathLabel}</span
          >`
        : nothing}
      ${models.map(
        (model) => html`<span class="ro-legend-item" data-model=${model.id}
          ><span class="ro-dot" style="background:${modelColor(palette, model)}"></span>${model.name}${model.role
            ? ` (${model.role})`
            : ''}</span
        >`,
      )}
      ${pruned
        ? html`<span class="ro-legend-item"
            ><span class="ro-swatch-pruned" style="color:${palette.pruned}">✕</span>Pruned</span
          >`
        : nothing}
    </div>`;
  }

  private renderReset() {
    if (!this.hasSelection() || this._model.empty) return nothing;
    const active = this._model.paths.some((path) => path.id === this._model.activePathId);
    return html`<button type="button" class="ro-reset" part="reset" @click=${() => this.clearSelection()}>
      <span aria-hidden="true">←</span> ${active ? 'Active path' : 'Clear selection'}
    </button>`;
  }

  private renderPanels() {
    const { entropy, pipeline, scaling, benchmarks, empty, models } = this._model;
    if (!this.showPanels || empty) return nothing;
    if (!entropy && !pipeline && !scaling && !benchmarks.length) return nothing;
    const mode = this.mode();
    const colors = entropy ? entropyColors(entropy, this._model, mode) : [];
    const head = entropy?.title || (benchmarks.length ? 'Benchmarks' : '');
    const activeStep = this.highlightColor();
    return html`<div class="ro-panels" part="panels">
      ${head || benchmarks.length
        ? html`<div class="ro-readouts">
            <span>${head}</span>
            ${benchmarks.length
              ? html`<span class="ro-benchmarks">
                  ${benchmarks.map(
                    (metric) => html`<span class="ro-benchmark" title=${metricText(metric)}
                      >${metric.label} <strong>${metric.value}</strong>${metric.delta
                        ? html` <span class="ro-delta" data-trend=${metric.trend ?? ''}>(${metric.delta})</span>`
                        : nothing}</span
                    >`,
                  )}
                </span>`
              : nothing}
          </div>`
        : nothing}
      ${entropy ? html`<div class="ro-entropy" part="entropy"></div>` : nothing}
      <div class="ro-panel-grid">
        ${entropy
          ? html`<section class="ro-panel" data-panel="entropy">
              <span class="ro-panel-title"
                >${entropy.label}${entropy.series.length > 1
                  ? ` · ${entropy.series.map((series, i) => series.label || `Series ${i + 1}`).join(' vs ')}`
                  : ''}</span
              >
              <span class="ro-series">
                ${entropy.series.map((series, i) => {
                  const mean = series.values.reduce((a, b) => a + b, 0) / series.values.length;
                  return html`<span class="ro-series-item"
                    ><span class="ro-dot" style="background:${colors[i]}"></span>${series.label || models[i]?.name || `Series ${i + 1}`}
                    ${i === 0 && entropy.series.length > 1 ? '↑' : i === 1 ? '↓' : ''} mean
                    <strong>${formatNumber(mean)}</strong></span
                  >`;
                })}
              </span>
            </section>`
          : nothing}
        ${pipeline
          ? html`<section class="ro-panel" data-panel="pipeline">
              <span class="ro-panel-title">${pipeline.label} · ${pipeline.stages.length} stages</span>
              <ol class="ro-pipeline" style="--ro-active:${activeStep}">
                ${pipeline.stages.map(
                  (step, i) => html`<li class="ro-step-item">
                    ${i ? html`<span class="ro-step-arrow" aria-hidden="true">→</span>` : nothing}
                    <span
                      class="ro-step"
                      data-status=${step.status}
                      title=${`${step.label}: ${STATUS_NAME[step.status]}${step.detail ? ` · ${step.detail}` : ''}`}
                    >
                      <span class="ro-step-mark" aria-hidden="true"></span>${step.label}
                      <span class="sr-only">${STATUS_NAME[step.status]}</span>
                    </span>
                  </li>`,
                )}
              </ol>
            </section>`
          : nothing}
        ${scaling
          ? html`<section class="ro-panel" data-panel="scaling">
              <span class="ro-panel-title"
                >${scaling.label} · ${scaling.series.map((series) => series.label).join(' vs ')}</span
              >
              <div class="ro-scaling"></div>
            </section>`
          : nothing}
      </div>
    </div>`;
  }

  private renderCapNote() {
    const { dropped, nodes, empty } = this._model;
    if (empty || !dropped.nodes) return nothing;
    return html`<div class="cap-note" part="note">
      Showing ${formatNumber(MAX_NODES)} of ${formatNumber(nodes.length + dropped.nodes)} nodes; pruned and deepest
      left out.
    </div>`;
  }

  override render() {
    const title = this.headerTitle() || (this.showHeader ? this._model.title : '');
    const empty = this._model.empty;
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title, { aside: this.renderMeta() })}
        <div class="widget-body">
          ${this.renderTop()}
          <div class="chart-root" part="chart" ?hidden=${empty}>
            <div class="ro-canvas"></div>
            ${this.renderModels()} ${this.renderLegend()} ${this.renderReset()}
          </div>
          ${empty ? html`<div class="empty" part="empty">No reasoning graph</div>` : nothing}
          ${this.renderPanels()} ${this.renderCapNote()} ${this.renderShellLabelTooltip()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-reasoning-orchestration-graph': Ui9000ReasoningOrchestrationGraph;
  }
  interface HTMLElementEventMap {
    'path-select': CustomEvent<PathSelectDetail>;
  }
}

export function registerReasoningOrchestrationGraph(): void {
  if (!customElements.get('ui9000-reasoning-orchestration-graph')) {
    customElements.define('ui9000-reasoning-orchestration-graph', Ui9000ReasoningOrchestrationGraph);
  }
}

registerReasoningOrchestrationGraph();
