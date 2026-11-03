import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { ChartTooltipContent } from '../../../element/chart-tooltip-portal.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { dsText } from '../../../element/ds-text.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { assetHealthStyles } from '../../asset-health-overview/element/styles.js';
import { DEFAULT_CAMERA, formatAssetHealthCount, type StageCamera } from '../../asset-health-overview/lib/index.js';
import { scenePalette, startMotes, type ScenePalette } from '../../goals-perimeter/render/index.js';
import { normalizeGoalBurst, type GoalBurstModel } from '../lib/index.js';
import { renderGoalBurst, type GoalBurstController, type GoalBurstHandlers } from '../render/index.js';
import { goalBurstStyles } from './styles.js';

/** Phosphor's light icons, on their 256 grid. */
const ICON = {
  shapes:
    'M69.69,62.1a6,6,0,0,0-11.38,0l-40,120A6,6,0,0,0,24,190h80a6,6,0,0,0,5.69-7.9ZM32.32,178,64,83l31.68,95ZM206,76a50,50,0,1,0-50,50A50.06,50.06,0,0,0,206,76Zm-88,0a38,38,0,1,1,38,38A38,38,0,0,1,118,76Zm106,70H136a6,6,0,0,0-6,6v56a6,6,0,0,0,6,6h88a6,6,0,0,0,6-6V152A6,6,0,0,0,224,146Zm-6,56H142V158h76Z',
  path: 'M200,170a30.05,30.05,0,0,0-29.4,24H72a34,34,0,0,1,0-68h96a38,38,0,0,0,0-76H72a6,6,0,0,0,0,12h96a26,26,0,0,1,0,52H72a46,46,0,0,0,0,92h98.6A30,30,0,1,0,200,170Zm0,48a18,18,0,1,1,18-18A18,18,0,0,1,200,218Z',
  graph:
    'M200,154a29.87,29.87,0,0,0-19.5,7.23L154.88,141.3A29.83,29.83,0,0,0,158,128a30.52,30.52,0,0,0-.22-3.6L174,119a30,30,0,1,0-4-15,30.52,30.52,0,0,0,.22,3.6L154,113a29.91,29.91,0,0,0-32.42-14.31l-8.14-18.3a30,30,0,1,0-11,4.88l8.14,18.3A29.92,29.92,0,0,0,102.06,143L74,168a30.08,30.08,0,1,0,8,9L110,152a29.91,29.91,0,0,0,37.47-1.23l25.62,19.93A30,30,0,1,0,200,154Zm0-68a18,18,0,1,1-18,18A18,18,0,0,1,200,86ZM78,56A18,18,0,1,1,96,74,18,18,0,0,1,78,56ZM56,210a18,18,0,1,1,18-18A18,18,0,0,1,56,210Zm72-64a18,18,0,1,1,18-18A18,18,0,0,1,128,146Zm72,56a18,18,0,1,1,18-18A18,18,0,0,1,200,202Z',
} as const;

const icon = (d: string) => html`<svg class="ah-icon" viewBox="0 0 256 256" aria-hidden="true"><path d=${d}></path></svg>`;

/** A mark of the burst, redrawn at legend size: 18 × 18, stroked in the current colour. */
const mark = (body: unknown) => html`<svg class="ah-legend-mark" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${body}</svg>`;

/** The burst's marks: the goal's agents, as on the map; then its calls, the clock they are read against, and its groups' assets. */
const LEGEND_MARKS: { mark: unknown; label: string }[] = [
  {
    mark: mark(svg`<circle cx="5" cy="7" r="1" class="solid"></circle><circle cx="10" cy="5" r="1.3" class="solid"></circle><circle cx="12.5" cy="11" r="1" class="solid" opacity="0.6"></circle><circle cx="7" cy="12" r="0.8" class="solid" opacity="0.45"></circle>`),
    label: 'A dot is one agent of this goal — white at work, grey when idle. The cloud of them is the goal, as on the map',
  },
  { mark: mark(svg`<circle cx="9" cy="9" r="2.6" class="solid blocked"></circle>`), label: 'A blocked agent — stopped by a rule' },
  { mark: mark(svg`<path d="M6 6l6 6M12 6l-6 6" class="failed" stroke-width="1.4"></path>`), label: 'A failed agent' },
  { mark: mark(svg`<circle cx="9" cy="9" r="3" class="awaiting" stroke-width="1.3"></circle>`), label: 'An agent holding — waiting on a person or a slow dependency' },
  { mark: mark(svg`<path d="M9 5 13 12H5Z" class="solid warn"></path>`), label: 'An agent past 80% of its token budget' },
  {
    mark: mark(svg`<circle cx="9" cy="9" r="6.5" opacity="0.3"></circle><path d="M9 2.5A6.5 6.5 0 1 1 3.4 12.2" stroke-width="1.4"></path>`),
    label: 'The ring round the cloud fills with progress to target, on a scale with a longer mark every 10%',
  },
  {
    mark: mark(svg`<path d="M3 15 8 8M4 15l9-5M3.5 15 15 13" opacity="0.6" stroke-width="0.8"></path><circle cx="8" cy="8" r="0.9" class="solid"></circle><circle cx="13" cy="10" r="0.9" class="solid"></circle><circle cx="15" cy="13" r="0.9" class="solid"></circle>`),
    label: 'A spike is one call, thrown into the sector of the resource group it went to: the longer, the slower it was answered',
  },
  {
    mark: mark(svg`<path d="M3 15 15 4" class="blocked" stroke-width="1.1"></path><path d="M3 15 10 10" class="warn" stroke-width="1.1"></path>`),
    label: 'A spike in colour did not get through: it runs out to the asset that stops it, in the colour of what holds the agents. An amber one was throttled, answered late',
  },
  {
    mark: mark(svg`<circle cx="9" cy="9" r="3" stroke-dasharray="0.6 1.6" opacity="0.6"></circle><circle cx="9" cy="9" r="6.5" stroke-dasharray="0.6 1.6" opacity="0.6"></circle>`),
    label: 'The dotted rings on the floor are the clock the spikes are read against: 0.1s, 0.5s, 1s and 2s out',
  },
  {
    mark: mark(svg`<path d="M2.5 11A8 8 0 0 1 15.5 11" stroke-width="1.3"></path><path d="M2.5 9.5v3M15.5 9.5v3" stroke-width="1.1"></path>`),
    label: 'The arc across a sector: nineteen in twenty of its calls are answered inside it',
  },
  {
    mark: mark(svg`<path d="M2 13A9 9 0 0 1 16 13" opacity="0.7"></path><path d="M3.6 10.4 2.6 9.4M6 8.6 5.4 7.4M9 8V5.5M12 8.6l.6-1.2M14.4 10.4l1-1" opacity="0.7"></path><circle cx="9" cy="8" r="2.4" class="blocked" stroke-width="1"></circle>`),
    label: 'The arc round a sector carries the group’s assets the goal works with, a tick each — a longer one for an asset known by name. A ringed mark on it is an asset in trouble, where its calls fan in',
  },
];

/** How the goal fares with a group, as the dot beside its label's name says. */
const GROUP_HEALTH: { mark: unknown; label: string }[] = [
  { mark: mark(svg`<circle cx="9" cy="9" r="2.5" class="solid faint"></circle>`), label: 'Flows — every call gets through' },
  { mark: mark(svg`<circle cx="9" cy="9" r="2.5" class="solid warn"></circle>`), label: 'Slowed — some calls answered late or turned away; no agent held' },
  {
    mark: mark(svg`<circle cx="9" cy="9" r="2.5" class="solid blocked"></circle>`),
    label: 'Agents held there, with their count — orange blocked, red failed, purple awaiting',
  },
];

/** The spikes by colour, in the order of severity: the key beside the reading under the title. */
const SPIKE_KEY: [color: string, label: string][] = [
  ['var(--ah-ink-2)', 'Flows'],
  ['var(--ah-warn)', 'Slowed'],
  ['var(--ah-awaiting)', 'Holding'],
  ['var(--ah-blocked)', 'Blocked'],
  ['var(--ah-failed)', 'Failed'],
];

const LEGEND_TIP: ChartTooltipContent = { title: 'Legend', body: 'What the shapes, colours and marks of the burst mean.', rows: [] };

/** Pointing must settle this long before a tip appears; moving from one mark to the next is instant. */
const TIP_DELAY_MS = 120;

/**
 * Goal burst, after the Agent operations design: one goal drawn as its
 * traffic. Its agents — one dot each, the perimeter's cloud — sit in the
 * middle, the progress ring round them; out of the cloud its calls are thrown
 * as spikes, into one sector per resource group it draws on, as long as they
 * took to be answered on the clock the floor carries, in the colour of what
 * became of them. The calls that do not get through run on to the asset that
 * stops them. A label beside the burst reads each sector.
 *
 * Drag to turn it, scroll to zoom, shift-drag to pan, double-click to set it
 * back; click a sector to pick it out. It takes the asset health overview's
 * payload. The legend sits at the bottom left, the key to the spikes'
 * colours beside the reading under the title; every mark explains itself on
 * hover.
 */
@customElement('ui9000-goal-burst')
export class Ui9000GoalBurst extends Ui9000ChartElement {
  static override styles = [assetHealthStyles, goalBurstStyles, chartShellStyles];

  /** Seen from straight overhead, without turning. */
  @property({ type: Boolean, reflect: true })
  flat = false;

  /** Only problems stand out: the agents at work and the calls that get through all but go out, and the sectors where traffic flows step back. */
  @property({ type: Boolean, attribute: 'problems-only', reflect: true })
  problemsOnly = false;

  /** Shows the legend button at the bottom left. */
  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _model: GoalBurstModel = normalizeGoalBurst(null);

  @state()
  private _legendOpen = false;

  @state()
  private _legendAt: { left: number; bottom: number; maxHeight: number } | null = null;

  /** Where the burst rests, so a redraw keeps it as it was turned. */
  private _camera: StageCamera = { ...DEFAULT_CAMERA };
  /** The sector picked out, kept across a redraw as the camera is. */
  private _picked: string | null = null;
  private _controller: GoalBurstController | null = null;
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
    this._controller?.destroy();
    this._controller = null;
    this._stopMotes?.();
    this._stopMotes = null;
    super.disconnectedCallback();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) this._model = normalizeGoalBurst(parseJsonAttr(this.dataJson, null));
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('showTooltip') && !this.showTooltip) this.hideTip();
    if (changed.has('flat') && this._controller) this._controller.setPlan(this.flat);
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

  /** A resize re-fits the burst; the spikes stay as they are. */
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

  /** The scene behind the burst: the whole card, dark or light with the page. */
  private sceneLayer(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.ah-scene') as HTMLElement | null) ?? null;
  }

  /** The measured plot, or the design stage where nothing is laid out (tests, detached). */
  private viewport(root: HTMLElement): [number, number] {
    return [root.clientWidth || 1280, root.clientHeight || 620];
  }

  /** Draws now. The element schedules draws on a frame; tests call this directly. */
  draw(): void {
    const root = this.chartRoot();
    const canvas = this.canvas();
    if (!root || !canvas) return;
    if (this._controller) {
      this._camera = this._controller.camera();
      this._picked = this._controller.picked();
    }
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
    this._controller = renderGoalBurst(canvas, {
      model: this._model,
      width,
      height,
      palette,
      plan: this.flat,
      problemsOnly: this.problemsOnly,
      camera: this._camera,
      picked: this._picked,
      sceneLayer: this.sceneLayer(),
      handlers: this.handlers(),
    });
  }

  /** The page style's colours for what the stylesheet draws: hairlines, the arc's glow and the glint, the floor and the mist. */
  private paintScene(palette: ScenePalette): void {
    const vars: Record<string, string> = {
      '--ah-line': palette.line,
      '--ah-arc-glow': palette.arcGlow,
      '--ah-glint': palette.glint,
      '--ah-glint-stroke': palette.glintStroke,
      '--ah-grid': palette.grid,
      '--ah-mist': palette.mist,
      '--ah-floor-mist': palette.floorMist,
    };
    for (const [name, value] of Object.entries(vars)) this.style.setProperty(name, value);
  }

  private startMotes(palette: ScenePalette): void {
    const lights = `${palette.mode}:${palette.motes.join('|')}`;
    if (this._stopMotes && lights === this._motesLights) return;
    this._stopMotes?.();
    this._stopMotes = null;
    this._motesLights = lights;
    const motes = this.shadowRoot?.querySelector('.gb-motes') as HTMLCanvasElement | null;
    if (!motes) return;
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._stopMotes = startMotes(motes, [0.7, 0.6, 0.35, 0.9], still, palette.motes, palette.mode);
  }

  /** The camera the burst is turned to. */
  get camera(): StageCamera {
    return this._controller?.camera() ?? { ...this._camera };
  }

  /** Back to the resting angle, at 100% and unpanned. */
  resetCamera(): void {
    this._controller?.resetCamera();
  }

  private handlers(): GoalBurstHandlers {
    return {
      onTip: (content, event) => {
        if (this.showTooltip) this.showMarkTip(event, content);
      },
      onLeave: () => this.hideTip(),
      onCamera: (camera) => {
        this._camera = camera;
      },
      onCompact: (compact) => this.toggleAttribute('data-compact', compact),
    };
  }

  /** The line under the title: the goal's code, its status, its agents and how many are held — and the key to the spikes' colours. */
  private renderReading() {
    if (this._model.empty) return undefined;
    const { goal } = this._model;
    const divider = html`<span class="ah-divider" aria-hidden="true"></span>`;
    const parts = [
      goal.code ? html`<span>${goal.code}</span>` : null,
      goal.status ? html`<span class="ah-status" data-tone=${goal.status.tone}><span class="ah-status-dot" aria-hidden="true"></span>${goal.status.label}</span>` : null,
      html`<span>${formatAssetHealthCount(goal.total)} agents</span>`,
      html`<span class=${goal.held ? 'ah-held' : ''}>${formatAssetHealthCount(goal.held)} held</span>`,
    ].filter((part) => part !== null);
    return html`<div class="gb-aside">
      <span class="ah-reading-line" part="reading">${parts.map((part, i) => (i ? html`${divider}${part}` : part))}</span>
      <span class="gb-key" part="key">
        <span class="gb-key-caption">Spike = a call · longer = slower answer</span>
        ${SPIKE_KEY.map(
          ([color, label]) =>
            html`<span class="gb-key-entry"><span class="gb-key-swatch" style="background:${color}" aria-hidden="true"></span>${label}</span>`,
        )}
        <span class="gb-key-entry"><span class="gb-key-swatch answered" style="background:var(--ah-ink)" aria-hidden="true"></span>95% answered</span>
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

  /** How to read the burst: what the shapes, colours and marks mean. */
  private renderLegend() {
    if (!this._legendOpen || !this.showLegend) return nothing;
    const at = this._legendAt ?? { left: 72, bottom: 24, maxHeight: 480 };
    const row = (entry: { mark: unknown; label: string }) => html`<div class="ah-legend-row">${entry.mark}<span>${entry.label}</span></div>`;
    return html`<div
      class="ah-legend"
      part="legend"
      role="dialog"
      aria-label="Reading the goal"
      style="left:${at.left}px;bottom:${at.bottom}px;max-height:${at.maxHeight}px"
    >
      <header class="ah-legend-head">${icon(ICON.shapes)}<h2>Reading the goal</h2></header>
      <section class="ah-legend-well">
        <header class="ah-legend-head">${icon(ICON.path)}<h3>Marks</h3></header>
        <div class="ah-legend-rows">${LEGEND_MARKS.map(row)}</div>
      </section>
      <section class="ah-legend-well">
        <header class="ah-legend-head">${icon(ICON.graph)}<h3>A goal and its resource groups</h3></header>
        <div class="ah-legend-rows">${GROUP_HEALTH.map(row)}</div>
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
              <linearGradient id="gb-grid-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="white" stop-opacity="0"></stop>
                <stop offset=".45" stop-color="white" stop-opacity=".55"></stop>
                <stop offset="1" stop-color="white" stop-opacity="1"></stop>
              </linearGradient>
              <radialGradient id="gb-grid-hole" cx=".5" cy=".42" r=".55">
                <stop offset="0" stop-color="black"></stop>
                <stop offset=".55" stop-color="black" stop-opacity=".6"></stop>
                <stop offset="1" stop-color="black" stop-opacity="0"></stop>
              </radialGradient>
              <mask id="gb-grid-mask">
                <rect width="1600" height="712" fill="url(#gb-grid-fade)"></rect>
                <rect width="1600" height="712" fill="url(#gb-grid-hole)"></rect>
              </mask>
            </defs>
            <g mask="url(#gb-grid-mask)" class="ah-grid">
              ${Array.from({ length: 29 }, (_, i) => svg`<line x1="800" y1="250" x2=${-1300 + i * 150} y2="712"></line>`)}
              ${[274.8, 293.5, 323.1, 363.1, 413.3, 473.5, 543.4, 623, 712].map((y) => svg`<line x1="0" y1=${y} x2="1600" y2=${y}></line>`)}
            </g>
          </svg>
          <div class="ah-grain"></div>
          <canvas class="gb-motes"></canvas>
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
    'ui9000-goal-burst': Ui9000GoalBurst;
  }
}

export function registerGoalBurst(): void {
  if (!customElements.get('ui9000-goal-burst')) {
    customElements.define('ui9000-goal-burst', Ui9000GoalBurst);
  }
}

registerGoalBurst();
