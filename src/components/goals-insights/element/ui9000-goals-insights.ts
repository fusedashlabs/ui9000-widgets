import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { ChartTooltipContent } from '../../../element/chart-tooltip-portal.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { dsText } from '../../../element/ds-text.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { assetHealthStyles } from '../../asset-health-overview/element/styles.js';
import { formatAssetHealthCount } from '../../asset-health-overview/lib/format.js';
import { scenePalette, startMotes, type ScenePalette } from '../../goals-perimeter/render/index.js';
import { diamondPath, normalizeGoalsInsights, type Evidence, type GoalsInsightsModel } from '../lib/index.js';
import {
  DEFAULT_VIEW,
  RING_CAPTION,
  renderGoalsInsights,
  type ColumnPicks,
  type ColumnView,
  type GlowFactory,
  type GoalsInsightsController,
  type GoalsInsightsHandlers,
} from '../render/index.js';
import { goalsInsightsStyles } from './styles.js';

/** Phosphor's light icons, on their 256 grid. */
const ICON = {
  shapes:
    'M69.69,62.1a6,6,0,0,0-11.38,0l-40,120A6,6,0,0,0,24,190h80a6,6,0,0,0,5.69-7.9ZM32.32,178,64,83l31.68,95ZM206,76a50,50,0,1,0-50,50A50.06,50.06,0,0,0,206,76Zm-88,0a38,38,0,1,1,38,38A38,38,0,0,1,118,76Zm106,70H136a6,6,0,0,0-6,6v56a6,6,0,0,0,6,6h88a6,6,0,0,0,6-6V152A6,6,0,0,0,224,146Zm-6,56H142V158h76Z',
  path: 'M200,170a30.05,30.05,0,0,0-29.4,24H72a34,34,0,0,1,0-68h96a38,38,0,0,0,0-76H72a6,6,0,0,0,0,12h96a26,26,0,0,1,0,52H72a46,46,0,0,0,0,92h98.6A30,30,0,1,0,200,170Zm0,48a18,18,0,1,1,18-18A18,18,0,0,1,200,218Z',
  graph:
    'M200,154a29.87,29.87,0,0,0-19.5,7.23L154.88,141.3A29.83,29.83,0,0,0,158,128a30.52,30.52,0,0,0-.22-3.6L174,119a30,30,0,1,0-4-15,30.52,30.52,0,0,0,.22,3.6L154,113a29.91,29.91,0,0,0-32.42-14.31l-8.14-18.3a30,30,0,1,0-11,4.88l8.14,18.3A29.92,29.92,0,0,0,102.06,143L74,168a30.08,30.08,0,1,0,8,9L110,152a29.91,29.91,0,0,0,37.47-1.23l25.62,19.93A30,30,0,1,0,200,154Zm0-68a18,18,0,1,1-18,18A18,18,0,0,1,200,86ZM78,56A18,18,0,1,1,96,74,18,18,0,0,1,78,56ZM56,210a18,18,0,1,1,18-18A18,18,0,0,1,56,210Zm72-64a18,18,0,1,1,18-18A18,18,0,0,1,128,146Zm72,56a18,18,0,1,1,18-18A18,18,0,0,1,200,202Z',
} as const;

const icon = (d: string) => html`<svg class="ah-icon" viewBox="0 0 256 256" aria-hidden="true"><path d=${d}></path></svg>`;

/** A mark of the column, redrawn at legend size: 18 × 18 round its centre, stroked in the current colour. */
const mark = (body: unknown) => html`<svg class="ah-legend-mark" width="18" height="18" viewBox="-9 -9 18 18" aria-hidden="true">${body}</svg>`;

/** A claim's diamond at legend size, as the column draws it: empty, a dot, or solid inside. */
const claimMark = (kind: Evidence, size = 5) => {
  const tone = { supporting: '', unverified: 'faint', disputed: 'warn', contradicting: 'blocked' }[kind];
  return svg`<path d=${diamondPath(size)} class=${`scene ${tone}`} stroke-linejoin="miter"></path>
    ${kind === 'disputed' ? svg`<circle r="1.3" class="solid warn"></circle>` : nothing}
    ${kind === 'contradicting' ? svg`<path d=${diamondPath(size * 0.5)} class="solid blocked"></path>` : nothing}`;
};

/** The claims: what each diamond says, and where it sits. */
const CLAIM_MARKS: { mark: unknown; label: string }[] = [
  {
    mark: mark(claimMark('supporting')),
    label: 'A diamond is one claim an agent filed, drawn as the map draws a resource group. Empty and in ink: it supports its goal',
  },
  { mark: mark(claimMark('unverified')), label: 'Empty and grey: it supports the goal on a single source so far' },
  { mark: mark(claimMark('disputed')), label: 'A dot, in yellow: another claim says the opposite. Neither counts until one is resolved' },
  { mark: mark(claimMark('contradicting')), label: 'Solid inside, in orange: it argues against its goal. Pinned — never averaged away' },
  {
    mark: mark(svg`<path d=${diamondPath(3.5)}></path><path d=${diamondPath(7)} opacity="0.45"></path>`),
    label:
      'A claim sits on the ring of the hour it was filed; round the column, claims on one subject turn together, and the more a claim moves the goal, the nearer the axis. The larger the diamond, the more evidence records behind it; zoomed in, the kind of asset it is about stands beside it',
  },
  { mark: mark(svg`<path d=${diamondPath(4)} opacity="0.35"></path>`), label: 'Faint: a claim one of the connected goals filed. This goal’s own claims, and those it shares, stand out' },
];

/** The column round them. */
const COLUMN_MARKS: { mark: unknown; label: string }[] = [
  {
    mark: mark(svg`<ellipse rx="7.5" ry="1.6" cy="-4"></ellipse><ellipse rx="6.5" ry="1.4" cy="0.5" opacity="0.4"></ellipse><ellipse rx="4.5" ry="1" cy="4.5" opacity="0.25"></ellipse>`),
    label: 'Each ring is a two-hour cycle, newest at the top; every fourth — eight hours — is lit and labelled. The dust in a ring is the evidence records that came in during its two hours',
  },
  {
    mark: mark(
      svg`<path d="M-4 8C-6 2 -6 -3 -1 -8M4 8C6 2 6 -3 1 -8" opacity="0.6"></path><circle cx="-5" cy="1" r="0.9" class="solid"></circle><circle cy="-2" r="0.9" class="solid cool"></circle><circle cx="5" cy="3" r="0.9" class="solid blocked"></circle>`,
    ),
    label:
      'Up the axis, into the goal: the sources behind the goal’s claims, a particle each — light when it backs the goal, orange when it argues against it; those of the last day rise quick and close, older ones slower and wider. Lights travelling a line to a connected goal are the sources of a claim the two share',
  },
  {
    mark: mark(svg`<path d="M-7 2Q0 -3 7 2" opacity="0.6" stroke-width="0.9"></path><path d="M-3 7Q4 0 -1 -7" opacity="0.4" stroke-width="0.9"></path>`),
    label: 'Faint lines between claims: claims on different subjects about the same kind of asset, filed within six hours of each other — a node when within two — and each claim to the next one filed on its subject',
  },
  {
    mark: mark(svg`<path d="M-6 7C-6 0 5 2 5 -7" stroke-width="1.4" opacity="0.7"></path>`),
    label: 'A claim with three or more sources runs to the goal it was filed under: the heavier the claim, the bolder its line',
  },
  {
    mark: mark(svg`<circle r="3.5" opacity="0.6" stroke-width="0.9"></circle><path d="M0 -6.5A6.5 6.5 0 1 1 -5.6 3.25" stroke-width="1.3"></path>`),
    label: 'A goal, as on the map: its agents in a sphere, its confidence lit on the ring and its scale. Connected goals stand aside; click one to pick out what it shares',
  },
];

/** The claims by colour, on the subtitle's line at the right: the key beside the reading under the title. */
const CLAIM_KEY: [kind: Evidence, label: string][] = [
  ['supporting', 'Supports'],
  ['contradicting', 'Contradicts'],
  ['disputed', 'Disputed'],
  ['unverified', 'Single source'],
];

const LEGEND_TIP: ChartTooltipContent = { title: 'Legend', body: 'What the shapes, colours and lines in the column mean.', rows: [] };

/** Pointing must settle this long before a tip appears; moving from one mark to the next is instant. */
const TIP_DELAY_MS = 120;

/**
 * Goals & insights, after the Agent operations design: the evidence behind
 * one goal, drawn as a column. The goal stands over its apex, its agents in
 * a glass sphere and its confidence lit on the ring round it; under it a
 * ring every two hours, now at the top, and on the ring of the hour each was
 * filed, the claims its agents filed — diamonds in the colour of how they
 * read against the goal. The goals it shares evidence with stand either
 * side, and the claims with three or more sources run up to the goal they
 * were filed under. Under the SVG the column's light is drawn with WebGL.
 *
 * It turns slowly on its own and holds still under the pointer. Drag to turn
 * it and to open or close its rings, scroll to zoom, double-click to set it
 * back; click a claim or a connected goal to pick it out. Only the legend
 * button sits at the bottom left; the key to the claims' colours is beside
 * the reading under the title, and every mark explains itself on hover.
 */
@customElement('ui9000-goals-insights')
export class Ui9000GoalsInsights extends Ui9000ChartElement {
  static override styles = [assetHealthStyles, goalsInsightsStyles, chartShellStyles];

  /** Every ring laid flat: no turning. */
  @property({ type: Boolean, reflect: true })
  flat = false;

  /** Only problems stand out: the claims that argue against the goal or are disputed. */
  @property({ type: Boolean, attribute: 'problems-only', reflect: true })
  problemsOnly = false;

  /** Shows the legend button at the bottom left. */
  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  /** What paints the column's light; WebGL 2 unless set (tests stand in their own). */
  glowFactory: GlowFactory | undefined;

  @state()
  private _model: GoalsInsightsModel = normalizeGoalsInsights(null);

  @state()
  private _legendOpen = false;

  @state()
  private _legendAt: { left: number; bottom: number; maxHeight: number } | null = null;

  /** Where the column rests, and what is picked out, so a redraw keeps them. */
  private _view: ColumnView = { ...DEFAULT_VIEW };
  private _picks: ColumnPicks = { claim: null, goal: null };
  private _controller: GoalsInsightsController | null = null;
  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  private _resizeRaf = 0;
  private _stopMotes: (() => void) | null = null;
  /** The motes' colours, so a new page style restarts them in its own. */
  private _motesLights = '';
  private _tip: ChartTooltipContent | null = null;
  private _tipAt = { x: 0, y: 0 };
  private _tipTimer = 0;

  private readonly _onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this._legendOpen) return;
    event.stopPropagation();
    this._legendOpen = false;
  };

  /** A press outside the legend closes it. */
  private readonly _onDocumentPointer = (event: PointerEvent): void => {
    if (!this._legendOpen) return;
    const path = event.composedPath();
    const popover = this.shadowRoot?.querySelector('.ah-legend');
    const button = this.shadowRoot?.querySelector('.ah-legend-button');
    if ((popover && path.includes(popover)) || (button && path.includes(button))) return;
    this._legendOpen = false;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this._resizeObserver.observe(this);
    this.addEventListener('keydown', this._onKeydown);
    document.addEventListener('pointerdown', this._onDocumentPointer, true);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('pointerdown', this._onDocumentPointer, true);
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    cancelAnimationFrame(this._resizeRaf);
    window.clearTimeout(this._tipTimer);
    this.keepState();
    this._controller?.destroy();
    this._controller = null;
    this._stopMotes?.();
    this._stopMotes = null;
    this._motesLights = '';
    super.disconnectedCallback();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) this._model = normalizeGoalsInsights(parseJsonAttr(this.dataJson, null));
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('showTooltip') && !this.showTooltip) this.hideTip();
    if (changed.has('flat') && this._controller) this._controller.setFlat(this.flat);
    if (changed.has('problemsOnly') && this._controller) this._controller.setProblemsOnly(this.problemsOnly);
    if (changed.has('dataJson') || !this._controller) this.scheduleDraw();
  }

  protected override onThemeChange(): void {
    super.onThemeChange();
    this.scheduleDraw();
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  /** A resize re-fits the column; it keeps turning as it was. */
  private scheduleResize(): void {
    cancelAnimationFrame(this._resizeRaf);
    this._resizeRaf = requestAnimationFrame(() => {
      const root = this.chartRoot();
      if (!root) return;
      if (this._controller) this._controller.resize(...this.viewport(root));
      else this.draw();
      if (this._legendOpen) this.placeLegend();
    });
  }

  private chartRoot(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null) ?? null;
  }

  private canvas(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.chart-root > .ah-canvas') as HTMLElement | null) ?? null;
  }

  /** The scene behind the column: the whole card, dark or light with the page. */
  private sceneLayer(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.ah-scene') as HTMLElement | null) ?? null;
  }

  /** The measured plot, or the design stage where nothing is laid out (tests, detached). */
  private viewport(root: HTMLElement): [number, number] {
    return [root.clientWidth || 1280, root.clientHeight || 620];
  }

  /** The view and the picks off the live column, so the next one starts where it was. */
  private keepState(): void {
    if (!this._controller) return;
    this._view = this._controller.view();
    this._picks = this._controller.picks();
  }

  /** Draws now. The element schedules draws on a frame; tests call this directly. */
  draw(): void {
    const root = this.chartRoot();
    const canvas = this.canvas();
    if (!root || !canvas) return;
    this.keepState();
    this._controller?.destroy();
    this._controller = null;
    if (this._model.empty) {
      canvas.replaceChildren();
      return;
    }
    const palette = scenePalette(this.styleId(), this.themeMode());
    this.paintScene(palette);
    this.startMotes(palette);
    const [width, height] = this.viewport(root);
    this._controller = renderGoalsInsights(canvas, {
      model: this._model,
      width,
      height,
      palette,
      flat: this.flat,
      problemsOnly: this.problemsOnly,
      view: this._view,
      picks: this._picks,
      sceneLayer: this.sceneLayer(),
      glow: this.glowFactory,
      handlers: this.handlers(),
    });
  }

  /** The page style's colours for what the stylesheet draws: hairlines, the glows and the glint, the floor, the mist and the column's light. */
  private paintScene(palette: ScenePalette): void {
    const vars: Record<string, string> = {
      '--ah-line': palette.line,
      '--ah-arc-glow': palette.arcGlow,
      '--ah-glint': palette.glint,
      '--ah-glint-stroke': palette.glintStroke,
      '--ah-grid': palette.grid,
      '--ah-mist': palette.mist,
      '--ah-floor-mist': palette.floorMist,
      '--gi-cool': palette.grid,
    };
    for (const [name, value] of Object.entries(vars)) this.style.setProperty(name, value);
  }

  private startMotes(palette: ScenePalette): void {
    const lights = `${palette.mode}:${palette.motes.join('|')}`;
    if (this._stopMotes && lights === this._motesLights) return;
    this._stopMotes?.();
    this._stopMotes = null;
    this._motesLights = lights;
    const motes = this.shadowRoot?.querySelector('.gi-motes') as HTMLCanvasElement | null;
    if (!motes) return;
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // the right edge carries the connected goal's label, so fewer there
    this._stopMotes = startMotes(motes, [0.8, 0.7, 0.35, 0.9], still, palette.motes, palette.mode);
  }

  /** Where the column is seen from. */
  get view(): ColumnView {
    return this._controller?.view() ?? { ...this._view };
  }

  /** What is picked out: a claim and a connected goal, by their ids. */
  get picks(): ColumnPicks {
    return this._controller?.picks() ?? { ...this._picks };
  }

  /** Back to the resting angle, at 100%, centred. */
  resetView(): void {
    this._controller?.resetView();
  }

  private handlers(): GoalsInsightsHandlers {
    return {
      onTip: (content, event) => {
        if (this.showTooltip) this.showMarkTip(event, content);
      },
      onLeave: () => this.hideTip(),
    };
  }

  /** The line under the title: the goal's code, its status, its agents and how many are held, the column's scale — and the key to the claims' colours. */
  private renderReading() {
    if (this._model.empty) return undefined;
    const { goal, dropped } = this._model;
    const divider = html`<span class="ah-divider" aria-hidden="true"></span>`;
    const parts = [
      html`<span>${goal.code}</span>`,
      goal.status ? html`<span class="ah-status" data-tone=${goal.status.tone}><span class="ah-status-dot" aria-hidden="true"></span>${goal.status.label}</span>` : null,
      html`<span>${formatAssetHealthCount(goal.agents.total)} agents</span>`,
      html`<span class=${goal.held ? 'ah-held' : ''}>${formatAssetHealthCount(goal.held)} held</span>`,
      html`<span class="gi-caption">${RING_CAPTION}${dropped ? ` · ${formatAssetHealthCount(dropped)} ${dropped === 1 ? 'claim' : 'claims'} not drawn` : ''}</span>`,
    ].filter((part) => part !== null);
    return html`<div class="gi-aside">
      <span class="ah-reading-line" part="reading">${parts.map((part, i) => (i ? html`${divider}${part}` : part))}</span>
      <span class="gi-key" part="key">
        <span class="gi-key-caption">Claim</span>
        ${CLAIM_KEY.map(
          ([kind, label]) =>
            html`<span class="gi-key-entry"
              ><svg class="ah-legend-mark gi-key-mark" width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true">${claimMark(kind, 4.6)}</svg>${label}</span
            >`,
        )}
      </span>
    </div>`;
  }

  /** The legend button at the bottom left. */
  private renderControls() {
    if (this._model.empty || !this.showLegend) return nothing;
    return html`<div class="ah-controls" part="controls">
      <button
        type="button"
        class="ah-well ah-legend-button"
        aria-label="Legend"
        aria-expanded=${this._legendOpen ? 'true' : 'false'}
        @mouseenter=${(event: MouseEvent) => this.showMarkTip(event, LEGEND_TIP)}
        @mousemove=${(event: MouseEvent) => this.moveTip(event)}
        @mouseleave=${() => this.hideTip()}
        @pointerdown=${() => this.hideTip()}
        @click=${() => this.toggleLegend()}
      >
        ${icon(ICON.shapes)}
      </button>
    </div>`;
  }

  /** Shows a tip after the pointer settles, or at once when one already shows (moving from one mark to the next) or for focus. */
  private showMarkTip(event: MouseEvent | FocusEvent, content: ChartTooltipContent): void {
    window.clearTimeout(this._tipTimer);
    if (event instanceof MouseEvent) this._tipAt = { x: event.clientX, y: event.clientY };
    else if (event.target instanceof Element) {
      const rect = event.target.getBoundingClientRect();
      this._tipAt = { x: rect.left + rect.width / 2, y: rect.top };
    }
    const show = () => {
      this._tip = content;
      this.presentTip();
    };
    if (this._tip || !(event instanceof MouseEvent)) show();
    else this._tipTimer = window.setTimeout(show, TIP_DELAY_MS);
  }

  private moveTip(event: MouseEvent): void {
    this._tipAt = { x: event.clientX, y: event.clientY };
    if (this._tip) this.presentTip();
  }

  private hideTip(): void {
    window.clearTimeout(this._tipTimer);
    this._tip = null;
    this.closeTooltip();
  }

  /** Puts the tip on the shared chart tooltip, at its anchor; the tooltip flips at the viewport's edges. */
  private presentTip(): void {
    if (!this._tip) return;
    const { x, y } = this._tipAt;
    this.openTooltip({ clientX: x, clientY: y, pageX: x + window.scrollX, pageY: y + window.scrollY } as MouseEvent, this._tip);
  }

  private toggleLegend(): void {
    this._legendOpen = !this._legendOpen;
    if (this._legendOpen) this.placeLegend();
  }

  /**
   * To the right of its button, its foot level with the button's — placed in
   * the chart's shell, not the window, so it stays put under a scaled or
   * scrolled ancestor (as on the Storybook docs page).
   */
  private placeLegend(): void {
    const button = this.shadowRoot?.querySelector('.ah-legend-button');
    const shell = this.shadowRoot?.querySelector<HTMLElement>('.widget-shell');
    if (!button || !shell) return;
    const box = shell.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    // an ancestor's transform scales what the rects measure, not the shell's own px
    const k = shell.offsetWidth ? box.width / shell.offsetWidth : 1;
    const width = Math.min(340, shell.offsetWidth - 24);
    const left = Math.max(12, Math.min((rect.right - box.left) / k + 16, shell.offsetWidth - width - 12));
    const bottom = Math.max(12, (box.bottom - rect.bottom) / k);
    this._legendAt = { left, bottom, maxHeight: Math.max(160, (rect.bottom - box.top) / k - 12) };
  }

  /** How to read the column: what its shapes, colours and lines mean. */
  private renderLegend() {
    if (!this._legendOpen || !this.showLegend) return nothing;
    const at = this._legendAt ?? { left: 72, bottom: 24, maxHeight: 480 };
    const row = (entry: { mark: unknown; label: string }) => html`<div class="ah-legend-row">${entry.mark}<span>${entry.label}</span></div>`;
    return html`<div
      class="ah-legend"
      part="legend"
      role="dialog"
      aria-label="Reading the column"
      style="left:${at.left}px;bottom:${at.bottom}px;max-height:${at.maxHeight}px"
    >
      <header class="ah-legend-head">${icon(ICON.shapes)}<h2>Reading the column</h2></header>
      <section class="ah-legend-well">
        <header class="ah-legend-head">${icon(ICON.path)}<h3>Claims</h3></header>
        <div class="ah-legend-rows">${CLAIM_MARKS.map(row)}</div>
      </section>
      <section class="ah-legend-well">
        <header class="ah-legend-head">${icon(ICON.graph)}<h3>The column</h3></header>
        <div class="ah-legend-rows">${COLUMN_MARKS.map(row)}</div>
      </section>
    </div>`;
  }

  override render() {
    const title = this.headerTitle() || (this.showHeader ? this._model.title : '');
    return html`
      <div class="widget-shell" part="shell">
        <div class="ah-scene" aria-hidden="true" ?hidden=${this._model.empty}>
          <div class="ah-backdrop"></div>
          <svg class="ah-grid-floor" viewBox="0 0 1600 712" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="gi-grid-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="white" stop-opacity="0"></stop>
                <stop offset=".45" stop-color="white" stop-opacity=".55"></stop>
                <stop offset="1" stop-color="white" stop-opacity="1"></stop>
              </linearGradient>
              <radialGradient id="gi-grid-hole" cx=".5" cy=".42" r=".55">
                <stop offset="0" stop-color="black"></stop>
                <stop offset=".55" stop-color="black" stop-opacity=".6"></stop>
                <stop offset="1" stop-color="black" stop-opacity="0"></stop>
              </radialGradient>
              <mask id="gi-grid-mask">
                <rect width="1600" height="712" fill="url(#gi-grid-fade)"></rect>
                <rect width="1600" height="712" fill="url(#gi-grid-hole)"></rect>
              </mask>
            </defs>
            <g mask="url(#gi-grid-mask)" class="ah-grid">
              ${Array.from({ length: 29 }, (_, i) => svg`<line x1="800" y1="250" x2=${-1300 + i * 150} y2="712"></line>`)}
              ${[274.8, 293.5, 323.1, 363.1, 413.3, 473.5, 543.4, 623, 712].map((y) => svg`<line x1="0" y1=${y} x2="1600" y2=${y}></line>`)}
            </g>
          </svg>
          <div class="ah-grain"></div>
          <canvas class="gi-motes"></canvas>
        </div>
        ${this.renderShellHeader(title, { aside: this.renderReading() })}
        <div class="widget-body">
          <div class="chart-root" part="chart" ?hidden=${this._model.empty}>
            <div class="ah-canvas"></div>
            ${this.renderControls()}
          </div>
          ${this._model.empty ? html`<div class="empty" part="empty">${dsText('No goal data', { size: 'md' })}</div>` : nothing}
          ${this.renderShellLabelTooltip()}
        </div>
        ${this.renderLegend()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-goals-insights': Ui9000GoalsInsights;
  }
}

export function registerGoalsInsights(): void {
  if (!customElements.get('ui9000-goals-insights')) {
    customElements.define('ui9000-goals-insights', Ui9000GoalsInsights);
  }
}

registerGoalsInsights();
