import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { ChartTooltipContent } from '../../../element/chart-tooltip-portal.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { dsText } from '../../../element/ds-text.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { DEFAULT_CAMERA, formatAssetHealthCount, normalizeAssetHealth, type AssetHealthModel, type StageCamera } from '../lib/index.js';
import { renderAssetHealth, scenePalette, type AssetHealthController, type AssetHealthHandlers } from '../render/index.js';
import { assetHealthStyles } from './styles.js';

type Mode = 'light' | 'dark';

/** Phosphor's light icons, on their 256 grid. */
const ICON = {
  shapes:
    'M69.69,62.1a6,6,0,0,0-11.38,0l-40,120A6,6,0,0,0,24,190h80a6,6,0,0,0,5.69-7.9ZM32.32,178,64,83l31.68,95ZM206,76a50,50,0,1,0-50,50A50.06,50.06,0,0,0,206,76Zm-88,0a38,38,0,1,1,38,38A38,38,0,0,1,118,76Zm106,70H136a6,6,0,0,0-6,6v56a6,6,0,0,0,6,6h88a6,6,0,0,0,6-6V152A6,6,0,0,0,224,146Zm-6,56H142V158h76Z',
  path: 'M200,170a30.05,30.05,0,0,0-29.4,24H72a34,34,0,0,1,0-68h96a38,38,0,0,0,0-76H72a6,6,0,0,0,0,12h96a26,26,0,0,1,0,52H72a46,46,0,0,0,0,92h98.6A30,30,0,1,0,200,170Zm0,48a18,18,0,1,1,18-18A18,18,0,0,1,200,218Z',
  graph:
    'M200,154a29.87,29.87,0,0,0-19.5,7.23L154.88,141.3A29.83,29.83,0,0,0,158,128a30.52,30.52,0,0,0-.22-3.6L174,119a30,30,0,1,0-4-15,30.52,30.52,0,0,0,.22,3.6L154,113a29.91,29.91,0,0,0-32.42-14.31l-8.14-18.3a30,30,0,1,0-11,4.88l8.14,18.3A29.92,29.92,0,0,0,102.06,143L74,168a30.08,30.08,0,1,0,8,9L110,152a29.91,29.91,0,0,0,37.47-1.23l25.62,19.93A30,30,0,1,0,200,154Zm0-68a18,18,0,1,1-18,18A18,18,0,0,1,200,86ZM78,56A18,18,0,1,1,96,74,18,18,0,0,1,78,56ZM56,210a18,18,0,1,1,18-18A18,18,0,0,1,56,210Zm72-64a18,18,0,1,1,18-18A18,18,0,0,1,128,146Zm72,56a18,18,0,1,1,18-18A18,18,0,0,1,200,202Z',
} as const;

const icon = (d: string) => html`<svg class="ah-icon" viewBox="0 0 256 256" aria-hidden="true"><path d=${d}></path></svg>`;

/** A mark of the arena, redrawn at legend size: 18 × 18, stroked in the current colour. */
const mark = (body: unknown) => html`<svg class="ah-legend-mark" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${body}</svg>`;

const DIAMOND = 'M9 3.5 14.5 9 9 14.5 3.5 9Z';

/** The goal's marks: its agents, seated; then what stands round them. */
const LEGEND_MARKS: { mark: unknown; label: string }[] = [
  {
    mark: mark(svg`${[5, 9, 13].flatMap((x) => [6, 10, 14].map((y) => svg`<circle cx=${x} cy=${y} r="0.9" class="solid" opacity=${y === 14 ? 0.5 : 1}></circle>`))}`),
    label: 'A dot is one agent of this goal, seated in the section of the asset category its work is with. The idle sit round the hub',
  },
  { mark: mark(svg`<circle cx="9" cy="9" r="2.6" class="solid blocked"></circle>`), label: 'A blocked agent — in the front rows, against the gate that stops it' },
  { mark: mark(svg`<path d="M6 6l6 6M12 6l-6 6" class="failed" stroke-width="1.4"></path>`), label: 'A failed agent' },
  { mark: mark(svg`<circle cx="9" cy="9" r="3" class="awaiting" stroke-width="1.3"></circle>`), label: 'An agent holding — waiting on a person or a slow dependency' },
  { mark: mark(svg`<path d="M9 5 13 12H5Z" class="solid warn"></path>`), label: 'An agent past 80% of its token budget' },
  {
    mark: mark(svg`<circle cx="9" cy="9" r="6.5" opacity="0.3"></circle><path d="M9 2.5A6.5 6.5 0 1 1 3.4 12.2" stroke-width="1.4"></path>`),
    label: 'The ring in the middle fills with progress to target, on a scale with a longer mark every 10%',
  },
  {
    mark: mark(svg`<path d="M2 12.5A9 9 0 0 1 11 4" stroke-width="1.3"></path><path d="M11 4A9 9 0 0 1 16 8.5" class="blocked" stroke-width="2"></path>`),
    label: 'The arc in front of a section is its category’s gate: white where the goal’s calls get through, in colour for the share slowed, held or turned away',
  },
  {
    mark: mark(
      svg`<path d="M3 9h3.4v3.4H3zM7.3 9h3.4v3.4H7.3zM7.3 13.3h3.4v3.4H7.3zM3 13.3h3.4v3.4H3z" opacity="0.7" stroke-width="0.8"></path><path d="M11.6 9H15v3.4h-3.4z" class="solid-stroke failed" stroke-width="0.8"></path><path d="M13.3 9V2.5" class="failed" stroke-width="1.3"></path>`,
    ),
    label: 'A cell behind the gate is one asset the goal works with. A lit one, with a beam on it, is an asset in trouble, wearing the mark of the agents it holds',
  },
  {
    mark: mark(svg`<path d="M3 15V9M6 15V6M9 15V8M12 15V5" opacity="0.7" stroke-width="1.3"></path><path d="M15 15V9" opacity="0.7" stroke-width="1.3"></path><path d="M15 9V4" class="blocked" stroke-width="1.3"></path>`),
    label: 'The wall behind a section is the goal’s last 24 hours with that category: a bar a stretch of the day, as tall as its calls, its top in colour for the share held up',
  },
  {
    mark: mark(svg`<path d="M2 13c4-1 7-4 9-8" stroke-dasharray="1 2.2" opacity="0.8"></path><path d="M13 2.5 15.5 5 13 7.5 10.5 5Z"></path>`),
    label: 'Sparks running from the rows to a gate’s diamond are the goal’s calls; one turned away comes back in colour',
  },
];

/** How the goal fares with a category, as its diamond shows it: empty, a dot, solid. */
const DIAMOND_HEALTH: { mark: unknown; label: string }[] = [
  { mark: mark(svg`<path d=${DIAMOND}></path>`), label: 'Traffic flows' },
  { mark: mark(svg`<path d=${DIAMOND} class="warn"></path><circle cx="9" cy="9" r="1.5" class="solid warn"></circle>`), label: 'Some of it slowed' },
  {
    mark: mark(svg`<path d=${DIAMOND} class="blocked"></path><path d="M9 6.2 11.8 9 9 11.8 6.2 9Z" class="solid blocked"></path>`),
    label: 'Agents held there, with their count — orange blocked, red failed, purple awaiting',
  },
];

const LEGEND_TIP: ChartTooltipContent = { title: 'Legend', body: 'What the shapes, colours and marks of the arena mean.', rows: [] };

/** Pointing must settle this long before a tip appears; moving from one mark to the next is instant. */
const TIP_DELAY_MS = 120;

/**
 * Local Storybook-style wrappers may set `data-theme`. App shells that put
 * `data-theme` on `<html>` (FuseDash) are ignored so host `--ui9000-*` wins.
 */
function themeFromLocalAncestor(el: Element): Mode | '' {
  const themed = el.closest('[data-theme]');
  if (!themed || themed === el.ownerDocument?.documentElement) return '';
  const value = themed.getAttribute('data-theme')?.trim();
  return value === 'dark' || value === 'light' ? value : '';
}

/**
 * Asset health overview (AM-6), after the Agent operations design's goal
 * rings: one goal opened as an arena. Its agents — one dot each — sit in rows,
 * each in the section of the asset category its work is with, the held ones
 * in front against that category's gate; behind the gate stand the
 * category's assets, a cell each, the ones in trouble lit with a beam, and
 * behind them the wall of its last 24 hours. The goal's progress lies in the
 * middle of the floor, and a label beside the arena reads each section.
 *
 * Drag to turn it, scroll to zoom, shift-drag to pan, double-click to set it
 * back; click a section to pick it out. The legend sits at the bottom left; every mark explains itself on
 * hover. `theme` switches the stage (`light` / `dark`); left empty it follows
 * a local `data-theme` wrapper (not `<html>`), then `paintMode` / host
 * `--ui9000-*`.
 */
@customElement('ui9000-asset-health-overview')
export class Ui9000AssetHealthOverview extends Ui9000ChartElement {
  static override styles = [assetHealthStyles, chartShellStyles];

  /** Seen from straight overhead, without turning. */
  @property({ type: Boolean, reflect: true })
  flat = false;

  /** Only problems stand out: the agents at work all but go out, and the sections where traffic flows step back. */
  @property({ type: Boolean, attribute: 'problems-only', reflect: true })
  problemsOnly = false;

  /** `light` or `dark`. Empty follows a local `data-theme` wrapper (not `<html>`), then `paintMode` / host `--ui9000-*`. */
  @property({ type: String, reflect: true })
  theme = '';

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _model: AssetHealthModel = normalizeAssetHealth(null);

  @state()
  private _legendOpen = false;

  @state()
  private _legendAt: { left: number; bottom: number; maxHeight: number } | null = null;

  private _mode: Mode = 'light';
  /** Where the arena rests, so a redraw keeps it as it was turned. */
  private _camera: StageCamera = { ...DEFAULT_CAMERA };
  private _controller: AssetHealthController | null = null;
  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  private _resizeRaf = 0;
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
    super.disconnectedCallback();
  }

  private resolveAppearance(): void {
    const explicit = this.theme === 'dark' || this.theme === 'light' ? this.theme : '';
    this._mode = explicit || themeFromLocalAncestor(this) || this.themeMode();
    if (this.getAttribute('data-mode') !== this._mode) this.setAttribute('data-mode', this._mode);
  }

  override willUpdate(changed: PropertyValues): void {
    this.resolveAppearance();
    if (changed.has('dataJson')) this._model = normalizeAssetHealth(parseJsonAttr(this.dataJson, null));
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('showTooltip') && !this.showTooltip) this.hideTip();
    if (changed.has('flat') && this._controller) this._controller.setPlan(this.flat);
    if (changed.has('problemsOnly') && this._controller) this._controller.setProblemsOnly(this.problemsOnly);
    if (changed.has('dataJson') || changed.has('theme') || !this._controller) this.scheduleDraw();
  }

  protected override onThemeChange(): void {
    this.resolveAppearance();
    super.onThemeChange();
    this.scheduleDraw();
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  /** A resize re-fits the arena; the agents stay seated as they are. */
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

  /** The scene behind the arena: the whole card, dark or light with the page. */
  private sceneLayer(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.ah-scene') as HTMLElement | null) ?? null;
  }

  /** The measured plot, or the design stage where nothing is laid out (tests, detached). */
  private viewport(root: HTMLElement): [number, number] {
    return [root.clientWidth || 744, root.clientHeight || 420];
  }

  /** Draws now. The element schedules draws on a frame; tests call this directly. */
  draw(): void {
    const root = this.chartRoot();
    const canvas = this.canvas();
    if (!root || !canvas) return;
    if (this._controller) this._camera = this._controller.camera();
    this._controller?.destroy();
    this._controller = null;
    if (this._model.empty) {
      canvas.replaceChildren();
      return;
    }
    const palette = scenePalette(this.styleId(), this._mode);
    // the page style's colours for what the stylesheet draws: hairlines, the arc's glow and the glint
    this.style.setProperty('--ah-line', palette.line);
    this.style.setProperty('--ah-arc-glow', palette.arcGlow);
    this.style.setProperty('--ah-glint', palette.glint);
    this.style.setProperty('--ah-glint-stroke', palette.glintStroke);
    this.style.setProperty('--ah-grid', palette.grid);
    this.style.setProperty('--ah-mist', palette.mist);
    this.style.setProperty('--ah-floor-mist', palette.floorMist);
    const [width, height] = this.viewport(root);
    this._controller = renderAssetHealth(canvas, {
      model: this._model,
      width,
      height,
      palette,
      plan: this.flat,
      problemsOnly: this.problemsOnly,
      camera: this._camera,
      sceneLayer: this.sceneLayer(),
      handlers: this.handlers(),
    });
  }

  /** The camera the arena is turned to. */
  get camera(): StageCamera {
    return this._controller?.camera() ?? { ...this._camera };
  }

  /** Back to the resting angle, at 100% and unpanned. */
  resetCamera(): void {
    this._controller?.resetCamera();
  }

  private handlers(): AssetHealthHandlers {
    return {
      onTip: (content, event) => {
        if (this.showTooltip) this.showMarkTip(event, content);
      },
      onLeave: () => this.hideTip(),
      onCamera: (camera) => {
        this._camera = camera;
      },
    };
  }

  /** The line under the title: the goal's code, its status, its agents and how many are held. */
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
    return html`<span class="ah-reading-line" part="reading">${parts.map((part, i) => (i ? html`${divider}${part}` : part))}</span>`;
  }

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

  /** How to read the arena: what the shapes, colours and marks mean. */
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
        <header class="ah-legend-head">${icon(ICON.graph)}<h3>A goal and its asset categories</h3></header>
        <div class="ah-legend-rows">${DIAMOND_HEALTH.map(row)}</div>
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
              <linearGradient id="ah-grid-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="white" stop-opacity="0"></stop>
                <stop offset=".45" stop-color="white" stop-opacity=".55"></stop>
                <stop offset="1" stop-color="white" stop-opacity="1"></stop>
              </linearGradient>
              <radialGradient id="ah-grid-hole" cx=".5" cy=".42" r=".55">
                <stop offset="0" stop-color="black"></stop>
                <stop offset=".55" stop-color="black" stop-opacity=".6"></stop>
                <stop offset="1" stop-color="black" stop-opacity="0"></stop>
              </radialGradient>
              <mask id="ah-grid-mask">
                <rect width="1600" height="712" fill="url(#ah-grid-fade)"></rect>
                <rect width="1600" height="712" fill="url(#ah-grid-hole)"></rect>
              </mask>
            </defs>
            <g mask="url(#ah-grid-mask)" class="ah-grid">
              ${Array.from({ length: 29 }, (_, i) => svg`<line x1="800" y1="250" x2=${-1300 + i * 150} y2="712"></line>`)}
              ${[274.8, 293.5, 323.1, 363.1, 413.3, 473.5, 543.4, 623, 712].map((y) => svg`<line x1="0" y1=${y} x2="1600" y2=${y}></line>`)}
            </g>
          </svg>
          <div class="ah-grain"></div>
        </div>
        ${this.renderShellHeader(title, { aside: this.renderReading() })}
        <div class="widget-body">
          <div class="chart-root" part="chart" ?hidden=${this._model.empty}>
            <div class="ah-canvas"></div>
            ${this.renderControls()}
          </div>
          ${this._model.empty ? html`<div class="empty" part="empty">${dsText('No asset health data', { size: 'md' })}</div>` : nothing}
          ${this.renderShellLabelTooltip()}
        </div>
        ${this.renderLegend()}
      </div>
    `;
  }
}

export function registerAssetHealthOverview(): void {
  if (!customElements.get('ui9000-asset-health-overview')) {
    customElements.define('ui9000-asset-health-overview', Ui9000AssetHealthOverview);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-asset-health-overview': Ui9000AssetHealthOverview;
  }
}
