import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Directive, directive, PartType, type ElementPart, type PartInfo } from 'lit/directive.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import type { ChartTooltipContent, ChartTooltipRow } from '../../../element/chart-tooltip-portal.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  BOARD,
  DEFAULT_CAMERA,
  formatAgents,
  formatCount,
  formatHealth,
  formatMultiplier,
  layoutBoard,
  normalizeGoalsPerimeter,
  type AgentState,
  type BoardLayout,
  type ExternalDependency,
  type GoalConnection,
  type GoalsPerimeterModel,
  type PerimeterGoal,
  type ResourceGroup,
  type SceneDims,
  type StageCamera,
} from '../lib/index.js';
import {
  renderGoalsPerimeter,
  scenePalette,
  startMotes,
  type ScenePalette,
  type GoalsPerimeterController,
  type GoalsPerimeterHandlers,
} from '../render/index.js';
import { goalsPerimeterStyles } from './styles.js';
import { dsText } from '../../../element/ds-text.js';

const STATE_NAME: Record<AgentState, string> = {
  healthy: 'Working',
  degraded: 'Degraded',
  awaiting: 'Awaiting',
  blocked: 'Blocked',
  failed: 'Failed',
  idle: 'Idle',
};
const TOOLTIP_STATES: AgentState[] = ['healthy', 'idle', 'awaiting', 'blocked', 'failed', 'degraded'];

/** Phosphor's light icons, on their 256 grid. */
const ICON = {
  shapes:
    'M69.69,62.1a6,6,0,0,0-11.38,0l-40,120A6,6,0,0,0,24,190h80a6,6,0,0,0,5.69-7.9ZM32.32,178,64,83l31.68,95ZM206,76a50,50,0,1,0-50,50A50.06,50.06,0,0,0,206,76Zm-88,0a38,38,0,1,1,38,38A38,38,0,0,1,118,76Zm106,70H136a6,6,0,0,0-6,6v56a6,6,0,0,0,6,6h88a6,6,0,0,0,6-6V152A6,6,0,0,0,224,146Zm-6,56H142V158h76Z',
  path: 'M200,170a30.05,30.05,0,0,0-29.4,24H72a34,34,0,0,1,0-68h96a38,38,0,0,0,0-76H72a6,6,0,0,0,0,12h96a26,26,0,0,1,0,52H72a46,46,0,0,0,0,92h98.6A30,30,0,1,0,200,170Zm0,48a18,18,0,1,1,18-18A18,18,0,0,1,200,218Z',
  graph:
    'M200,154a29.87,29.87,0,0,0-19.5,7.23L154.88,141.3A29.83,29.83,0,0,0,158,128a30.52,30.52,0,0,0-.22-3.6L174,119a30,30,0,1,0-4-15,30.52,30.52,0,0,0,.22,3.6L154,113a29.91,29.91,0,0,0-32.42-14.31l-8.14-18.3a30,30,0,1,0-11,4.88l8.14,18.3A29.92,29.92,0,0,0,102.06,143L74,168a30.08,30.08,0,1,0,8,9L110,152a29.91,29.91,0,0,0,37.47-1.23l25.62,19.93A30,30,0,1,0,200,154Zm0-68a18,18,0,1,1-18,18A18,18,0,0,1,200,86ZM78,56A18,18,0,1,1,96,74,18,18,0,0,1,78,56ZM56,210a18,18,0,1,1,18-18A18,18,0,0,1,56,210Zm72-64a18,18,0,1,1,18-18A18,18,0,0,1,128,146Zm72,56a18,18,0,1,1,18-18A18,18,0,0,1,200,202Z',
} as const;

const icon = (d: string, cls = 'gp-icon') =>
  html`<svg class=${cls} viewBox="0 0 256 256" aria-hidden="true"><path d=${d}></path></svg>`;

const DIAMOND = 'M9 3.5 14.5 9 9 14.5 3.5 9Z';

/** A mark of the board, redrawn at legend size: 18 × 18, stroked in the current colour. */
const mark = (body: unknown) =>
  html`<svg class="gp-legend-mark" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${body}</svg>`;

/** The board's marks, drawn as they are on it. */
const LEGEND_MARKS: { mark: unknown; label: string }[] = [
  {
    mark: mark(svg`<circle cx="5" cy="7" r="1" class="solid"></circle><circle cx="10" cy="5" r="1.3" class="solid"></circle><circle cx="12.5" cy="11" r="1" class="solid" opacity="0.6"></circle><circle cx="7" cy="12" r="0.8" class="solid" opacity="0.45"></circle>`),
    label: 'A dot is one agent — white at work, grey when idle. A cloud of them is a goal',
  },
  { mark: mark(svg`<circle cx="9" cy="9" r="2.6" class="solid blocked"></circle>`), label: 'A blocked agent' },
  { mark: mark(svg`<path d="M6 6l6 6M12 6l-6 6" class="failed" stroke-width="1.4"></path>`), label: 'A failed agent' },
  {
    mark: mark(svg`<circle cx="9" cy="9" r="3" class="awaiting" stroke-width="1.3"></circle>`),
    label: 'An agent awaiting — a person or a slow dependency',
  },
  { mark: mark(svg`<path d="M9 5 13 12H5Z" class="solid degraded"></path>`), label: 'A degraded agent — slowed, or past its budget' },
  {
    mark: mark(svg`<circle cx="9" cy="9" r="6.5" opacity="0.3"></circle><path d="M9 2.5A6.5 6.5 0 1 1 3.4 12.2" stroke-width="1.4"></path>`),
    label: 'The ring fills with progress to target, on a scale with a longer tick every 10%',
  },
  {
    mark: mark(svg`<path d="M1 9h4M13 9h4" stroke-dasharray="1 2" opacity="0.6"></path><path d="M9 5.5 12.5 9 9 12.5 5.5 9Z"></path>`),
    label: 'A diamond on a goal’s orbit is a resource group it draws on. Sparks running to it from the cloud are its calls; one turned away comes back in colour',
  },
  {
    mark: mark(svg`<path d="M1.5 12C6 6 12 6 16.5 12" opacity="0.7"></path>`),
    label: 'A line joins goals that draw on the same group. A group every goal uses is left unjoined',
  },
  {
    mark: mark(svg`<path d="M1.5 12C6 6 12 6 16.5 12" class="failed"></path>`),
    label: 'A line in a held agent’s colour: the same trouble holds agents at both its ends',
  },
];

/** How a goal fares with a resource group, as its diamond shows it: empty, a dot, solid. */
const DIAMOND_HEALTH: { mark: unknown; label: string }[] = [
  { mark: mark(svg`<path d=${DIAMOND}></path>`), label: 'Traffic flows' },
  {
    mark: mark(svg`<path d=${DIAMOND} class="degraded"></path><circle cx="9" cy="9" r="1.5" class="solid degraded"></circle>`),
    label: 'Some of it slowed',
  },
  {
    mark: mark(svg`<path d=${DIAMOND} class="blocked"></path><path d="M9 6.2 11.8 9 9 11.8 6.2 9Z" class="solid blocked"></path>`),
    label: 'Agents held there — in their colour, with their count',
  },
];

/** What each control says when pointed at, as the Agent operations console words it. */
const CONTROL_TIPS = {
  legend: ['Legend', 'What the shapes, colours and marks on the map mean.'],
} as const;
type ControlTip = keyof typeof CONTROL_TIPS;

/** Pointing must settle this long before a tip appears; moving from one control to the next is instant. */
const TIP_DELAY_MS = 120;

const TIP_EVENTS = ['mouseenter', 'mousemove', 'mouseleave', 'pointerdown', 'focusin', 'focusout'] as const;

/** Gives the element it is placed on a control tip: its pointer and focus events go to the chart. */
class TipDirective extends Directive {
  private key: ControlTip | null = null;

  constructor(part: PartInfo) {
    super(part);
    if (part.type !== PartType.ELEMENT) throw new Error('tip: place it on an element');
  }

  render(_host: Ui9000GoalsPerimeterChart, _key: ControlTip) {
    return nothing;
  }

  override update(part: ElementPart, [host, key]: [Ui9000GoalsPerimeterChart, ControlTip]) {
    if (this.key === null) {
      for (const type of TIP_EVENTS) part.element.addEventListener(type, (event) => host.tipEvent(this.key!, event));
    }
    this.key = key;
    return nothing;
  }
}
const tipDirective = directive(TipDirective);

/** A focused control or mark hangs its tip from its top centre, as the other charts do. */
const focusAnchor = (target: Element) => {
  const rect = target.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top, fromFocus: true };
};

const controlTip = (key: ControlTip): ChartTooltipContent => ({
  title: CONTROL_TIPS[key][0],
  body: CONTROL_TIPS[key][1],
  rows: [],
});

/**
 * Goals perimeter (AM-2), after the Agent operations design: the goals as
 * clouds of their agents — one point an agent — each with a progress ring,
 * an orbit of the resource groups it draws on, links to the goals it shares
 * them with and a callout with its readings, all seen through one orbit
 * camera. The legend sits at the bottom left; every mark and control explains
 * itself on hover.
 */
@customElement('ui9000-goals-perimeter')
export class Ui9000GoalsPerimeterChart extends Ui9000ChartElement {
  static override styles = [goalsPerimeterStyles, chartShellStyles];

  /** Shows the legend button at the bottom left. */
  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _model: GoalsPerimeterModel = normalizeGoalsPerimeter(null);

  /** Where the camera rests, so a redraw keeps the board as it was turned. */
  private _camera: StageCamera = { ...DEFAULT_CAMERA };
  private _dims: SceneDims = '3D';

  @state()
  private _legendOpen = false;

  @state()
  private _legendAt: { left: number; bottom: number; maxHeight: number } | null = null;

  private _layout: BoardLayout = layoutBoard([]);
  private _controller: GoalsPerimeterController | null = null;
  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  private _resizeRaf = 0;
  private _stopMotes: (() => void) | null = null;
  /** The motes' colours, so a new page style restarts them in its own. */
  private _motesLights = '';

  /** The tip that shows, on the shared chart tooltip: a camera control's, or a mark's on the board. */
  private _tip: ChartTooltipContent | null = null;

  /** Where the tip hangs from: the pointer, or the top centre of a focused control. */
  private _tipAnchor = { x: 0, y: 0, fromFocus: false };
  private _tipTimer = 0;
  /** A control just pressed: its tip stays quiet until the pointer leaves it. */
  private _tipPressed: ControlTip | null = null;

  private readonly _onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this._legendOpen) return;
    event.stopPropagation();
    this._legendOpen = false;
  };

  /** Every tip travels with the pointer, not only from where it first appeared. */
  private readonly _onPointerMove = (event: PointerEvent): void => {
    this._tipAnchor = { x: event.clientX, y: event.clientY, fromFocus: false };
    if (this._tip) this.presentTip();
  };

  /** A press outside the legend closes it. */
  private readonly _onDocumentPointer = (event: PointerEvent): void => {
    if (!this._legendOpen) return;
    const path = event.composedPath();
    const popover = this.shadowRoot?.querySelector('.gp-legend');
    const button = this.shadowRoot?.querySelector('.gp-legend-button');
    if ((popover && path.includes(popover)) || (button && path.includes(button))) return;
    this._legendOpen = false;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this._resizeObserver.observe(this);
    this.addEventListener('keydown', this._onKeydown);
    this.addEventListener('pointermove', this._onPointerMove);
    document.addEventListener('pointerdown', this._onDocumentPointer, true);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this._onKeydown);
    this.removeEventListener('pointermove', this._onPointerMove);
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
    if (changed.has('dataJson')) {
      this._model = normalizeGoalsPerimeter(parseJsonAttr(this.dataJson, null));
      this._layout = layoutBoard(this._model.goals);
    }
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('showTooltip') && !this.showTooltip) this.hideTip();
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

  /** A resize re-fits the board; the clouds and marks stay as they are. */
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

  /** The plot box: sized by the shell, measured for the board. */
  private chartRoot(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null) ?? null;
  }

  /** Where D3 draws, inside the plot box and under the open goal's way back. */
  private canvas(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.chart-root > .gp-canvas') as HTMLElement | null) ?? null;
  }

  /** The scene behind the board: the whole card, dark or light with the page. */
  private sceneLayer(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.gp-scene') as HTMLElement | null) ?? null;
  }

  /** The measured plot, or the design board where nothing is laid out (tests, detached). */
  private viewport(root: HTMLElement): [number, number] {
    return [root.clientWidth || BOARD.width, root.clientHeight || BOARD.height];
  }

  /** Draws now. The element schedules draws on a frame; tests call this directly. */
  draw(): void {
    const root = this.chartRoot();
    const canvas = this.canvas();
    if (!root || !canvas) return;
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
    this._controller = renderGoalsPerimeter(canvas, {
      model: this._model,
      layout: this._layout,
      width,
      height,
      theme: readThemeFromElement(this),
      handlers: this.handlers(),
      sceneLayer: this.sceneLayer(),
      palette,
      camera: this._camera,
      dims: this._dims,
    });
  }

  /** The page style's colours for what the stylesheet draws: hairlines, the arc's glow, the floor and the mist. */
  private paintScene(palette: ScenePalette): void {
    const vars: Record<string, string> = {
      '--gp-line': palette.line,
      '--gp-arc-glow': palette.arcGlow,
      '--gp-glint': palette.glint,
      '--gp-glint-stroke': palette.glintStroke,
      '--gp-grid': palette.grid,
      '--gp-mist': palette.mist,
      '--gp-floor-mist': palette.floorMist,
    };
    for (const [name, value] of Object.entries(vars)) this.style.setProperty(name, value);
  }

  private startMotes(palette: ScenePalette): void {
    const lights = `${palette.mode}:${palette.motes.join('|')}`;
    if (this._stopMotes && lights === this._motesLights) return;
    this._stopMotes?.();
    this._stopMotes = null;
    this._motesLights = lights;
    const motes = this.shadowRoot?.querySelector('.gp-motes') as HTMLCanvasElement | null;
    if (!motes) return;
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // the right and bottom edges carry the callouts' far ends: fewer there
    this._stopMotes = startMotes(motes, [0.7, 0.6, 0.35, 0.9], still, palette.motes, palette.mode);
  }

  /** The camera the board is turned to. */
  get camera(): StageCamera {
    return { ...this._camera };
  }

  /** `3D` orbits; `2D` is the flat plan view. */
  get dims(): SceneDims {
    return this._dims;
  }

  set dims(value: SceneDims) {
    this._dims = value;
    this._controller?.setDims(value);
  }

  /** Zooms about the board's centre: 1.25 in, 0.8 out. */
  zoomBy(factor: number): void {
    this._controller?.zoomBy(factor);
  }

  /** Back to 100% and the resting angle. */
  resetCamera(): void {
    this._controller?.resetCamera();
  }

  private handlers(): GoalsPerimeterHandlers {
    const tip = (event: MouseEvent | FocusEvent, content: ChartTooltipContent) => {
      if (this.showTooltip) this.showMarkTip(event, content);
    };
    return {
      onGoalHover: (goal, event) => tip(event, this.goalTooltip(goal)),
      onGroupHover: (goal, group, event) => tip(event, this.groupTooltip(goal, group)),
      onConnectionHover: (connection, event) => tip(event, this.connectionTooltip(connection)),
      onExternalHover: (dependency, event) => tip(event, this.externalTooltip(dependency)),
      onLeave: () => this.hideTip(),
      onCamera: (camera, dims) => {
        this._camera = camera;
        this._dims = dims;
      },
      onCompact: (compact) => this.toggleAttribute('data-compact', compact),
    };
  }

  private goalName(id: string): string {
    return this._model.goals.find((goal) => goal.id === id)?.name ?? id;
  }

  private goalTooltip(goal: PerimeterGoal): ChartTooltipContent {
    const { agents } = goal;
    const rows: ChartTooltipRow[] = [{ label: 'Status', value: goal.statusLabel }];
    for (const state of TOOLTIP_STATES) {
      if (state === 'healthy' || agents[state] > 0) rows.push({ label: STATE_NAME[state], value: formatCount(agents[state]) });
    }
    rows.push({ label: 'Progress', value: formatHealth(goal.health) });
    if (goal.multiplier !== null) rows.push({ label: goal.multiplierLabel, value: formatMultiplier(goal.multiplier) });
    rows.push({ label: 'Held', value: formatCount(goal.impure) });
    return {
      title: goal.code ? `${goal.code} · ${goal.name}` : goal.name,
      body: 'Each dot is one agent. The ring fills with progress to target; the diamonds on its orbit are the resource groups it draws on.',
      rows,
    };
  }

  /** How the goal fares with one of its groups — its own experience of it, not the group's health overall. */
  private groupTooltip(goal: PerimeterGoal, group: ResourceGroup): ChartTooltipContent {
    const word = { awaiting: 'awaiting', blocked: 'blocked', failed: 'failed' } as const;
    const why = group.detail ? ` — ${group.detail}` : '';
    const body =
      group.state === 'awaiting' || group.state === 'blocked' || group.state === 'failed'
        ? `${group.held ? formatAgents(group.held) : 'Agents'} of ${goal.name} ${group.held === 1 ? 'is' : 'are'} ${word[group.state]} here${why}.`
        : group.state === 'degraded'
          ? `Some of ${goal.name}’s traffic here is slowed${why}. No agent is held.`
          : `A resource group ${goal.name} draws on. Its traffic here flows.`;
    const rows: ChartTooltipRow[] = [];
    if (group.kind && group.kind.toLowerCase() !== group.name.toLowerCase()) rows.push({ label: 'Kind', value: group.kind });
    if (group.held > 0) rows.push({ label: 'Held', value: formatCount(group.held) });
    if (group.calls !== null) rows.push({ label: 'Calls', value: `${formatCount(group.calls)} a minute` });
    if (group.agents !== null) rows.push({ label: 'Used by', value: formatAgents(group.agents) });
    const others = this._model.goals.filter((g) => g !== goal && g.resourceGroups.some((r) => r.shareKey === group.shareKey)).length;
    rows.push({ label: 'Shared with', value: others === 0 ? 'no other goal' : `${others} other ${others === 1 ? 'goal' : 'goals'}` });
    return { title: group.name, body, rows };
  }

  private connectionTooltip(connection: GoalConnection): ChartTooltipContent {
    const group = connection.label || connection.via;
    const said = [connection.reason, connection.impact].filter(Boolean).join(' — ');
    const body = connection.via
      ? connection.hold
        ? `Both draw on ${group}, and the same trouble holds agents of both there.`
        : `Both draw on ${group}, so trouble there can reach both. Light along the line is their calls to it.`
      : said || connection.label || undefined;
    const rows: ChartTooltipRow[] = [];
    if (connection.hold) rows.push({ label: 'At both ends', value: `Agents ${connection.hold}` });
    if (connection.status !== 'active') rows.push({ label: 'Status', value: connection.status === 'unavailable' ? 'Down' : 'Degraded' });
    if (connection.via && said) rows.push({ label: 'Reason', value: said });
    return { title: `${this.goalName(connection.source)} ↔ ${this.goalName(connection.target)}`, body, rows };
  }

  private externalTooltip(dependency: ExternalDependency): ChartTooltipContent {
    const rows: ChartTooltipRow[] = [
      { label: 'Used by', value: this.goalName(dependency.goalId) },
      {
        label: 'Status',
        value: dependency.status === 'unavailable' ? 'Unavailable' : dependency.status === 'degraded' ? 'Degraded' : 'Connected',
      },
    ];
    if (dependency.links > 1) rows.push({ label: 'Links', value: formatCount(dependency.links) });
    const said = [dependency.reason, dependency.impact].filter(Boolean).join(' — ');
    return { title: dependency.label, body: said || undefined, rows };
  }

  /** The line under the title: what the board holds — goals, agents, and how many are held. */
  private renderReading() {
    if (this._model.empty) return undefined;
    const divider = html`<span class="gp-divider" aria-hidden="true"></span>`;
    const held = (count: number) => html`<span class=${count > 0 ? 'gp-held' : ''}>${formatCount(count)} held</span>`;
    const goals = this._model.goals.length;
    const agents = this._model.goals.reduce((sum, goal) => sum + goal.agents.total, 0);
    return html`<span class="gp-reading-line" part="reading">
      <span>${formatCount(goals)} ${goals === 1 ? 'goal' : 'goals'} on map</span>${divider}<span>${formatCount(agents)} agents</span>${divider}${held(this._model.exceptionCount)}
    </span>`;
  }

  /** The legend button at the bottom left. */
  private renderControls() {
    if (this._model.empty) return nothing;
    return html`<div class="gp-controls" part="controls">
      ${this.showLegend
        ? html`<button
            type="button"
            class="gp-well gp-legend-button"
            aria-label="Legend"
            aria-expanded=${this._legendOpen ? 'true' : 'false'}
            ${this.tipFor('legend')}
            @click=${() => this.toggleLegend()}
          >
            ${icon(ICON.shapes)}
          </button>`
        : nothing}
    </div>`;
  }

  /** The listeners that give a control its tip. */
  private tipFor(key: ControlTip) {
    return tipDirective(this, key);
  }

  /** @internal A control's pointer or focus event, from its tip directive. */
  tipEvent(key: ControlTip, event: Event): void {
    const pointer = event as MouseEvent;
    switch (event.type) {
      case 'mouseenter':
        this._tipAnchor = { x: pointer.clientX, y: pointer.clientY, fromFocus: false };
        if (this._tipPressed !== key) this.showTip(controlTip(key));
        break;
      case 'mousemove':
        this._tipAnchor = { x: pointer.clientX, y: pointer.clientY, fromFocus: false };
        if (this._tip) this.presentTip();
        break;
      case 'mouseleave':
        if (this._tipPressed === key) this._tipPressed = null;
        if (!this._tipAnchor.fromFocus) this.hideTip();
        break;
      // pressing a control answers the question its tip was answering
      case 'pointerdown':
        this._tipPressed = key;
        this.hideTip();
        break;
      // keyboard: the tip hangs from the focused control
      case 'focusin': {
        const target = event.target as Element | null;
        if (!target?.matches(':focus-visible')) return;
        this._tipAnchor = focusAnchor(event.currentTarget as Element);
        this.showTip(controlTip(key), true);
        break;
      }
      case 'focusout':
        if (this._tipAnchor.fromFocus) this.hideTip();
        break;
    }
  }

  /**
   * Shows a tip: after the pointer settles, or at once when a tip already
   * shows (moving from one mark to the next) or for keyboard focus.
   */
  private showTip(content: ChartTooltipContent, immediately = false): void {
    window.clearTimeout(this._tipTimer);
    const show = () => {
      this._tip = content;
      this.presentTip();
    };
    if (this._tip || immediately) show();
    else this._tipTimer = window.setTimeout(show, TIP_DELAY_MS);
  }

  /** A mark's tip: at the pointer, or at the mark when it has keyboard focus. */
  private showMarkTip(event: MouseEvent | FocusEvent, content: ChartTooltipContent): void {
    if (event instanceof MouseEvent) {
      this._tipAnchor = { x: event.clientX, y: event.clientY, fromFocus: false };
      this.showTip(content);
      return;
    }
    const target = event.currentTarget as Element | null;
    if (target) this._tipAnchor = focusAnchor(target);
    this.showTip(content, true);
  }

  private hideTip(): void {
    window.clearTimeout(this._tipTimer);
    this._tip = null;
    this.closeTooltip();
  }

  /** Puts the tip on the shared chart tooltip, at its anchor; the tooltip flips at the viewport's edges. */
  private presentTip(): void {
    if (!this._tip) return;
    const { x, y } = this._tipAnchor;
    this.openTooltip({ clientX: x, clientY: y, pageX: x + window.scrollX, pageY: y + window.scrollY } as MouseEvent, this._tip);
  }

  private toggleLegend(): void {
    this._legendOpen = !this._legendOpen;
    if (this._legendOpen) this.placeLegend();
  }

  /** To the right of its button, its foot level with the button's. */
  private placeLegend(): void {
    const button = this.shadowRoot?.querySelector('.gp-legend-button');
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right + 16, window.innerWidth - width - 12));
    const bottom = Math.max(12, window.innerHeight - rect.bottom);
    this._legendAt = { left, bottom, maxHeight: Math.max(160, rect.bottom - 12) };
  }

  /** How to read the map: what the shapes, colours and marks mean. */
  private renderLegend() {
    if (!this._legendOpen || !this.showLegend) return nothing;
    const at = this._legendAt ?? { left: 72, bottom: 24, maxHeight: 480 };
    const row = (entry: { mark: unknown; label: string }) =>
      html`<div class="gp-legend-row">${entry.mark}<span>${entry.label}</span></div>`;
    return html`<div
      class="gp-legend"
      part="legend"
      role="dialog"
      aria-label="Reading the map"
      style="left:${at.left}px;bottom:${at.bottom}px;max-height:${at.maxHeight}px"
    >
      <header class="gp-legend-head">${icon(ICON.shapes)}<h2>Reading the map</h2></header>
      <section class="gp-legend-well">
        <header class="gp-legend-head">${icon(ICON.path)}<h3>Marks</h3></header>
        <div class="gp-legend-rows">${LEGEND_MARKS.map(row)}</div>
      </section>
      <section class="gp-legend-well">
        <header class="gp-legend-head">${icon(ICON.graph)}<h3>A goal and its resource groups</h3></header>
        <div class="gp-legend-rows">${DIAMOND_HEALTH.map(row)}</div>
      </section>
    </div>`;
  }

  override render() {
    const title = this.headerTitle() || (this.showHeader ? this._model.title : '');
    return html`
      <div class="widget-shell" part="shell">
        <div class="gp-scene" aria-hidden="true" ?hidden=${this._model.empty}>
          <div class="gp-backdrop"></div>
          <svg class="gp-floor" viewBox="0 0 1600 712" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="gp-grid-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="white" stop-opacity="0"></stop>
                <stop offset=".45" stop-color="white" stop-opacity=".55"></stop>
                <stop offset="1" stop-color="white" stop-opacity="1"></stop>
              </linearGradient>
              <radialGradient id="gp-grid-hole" cx=".5" cy=".42" r=".55">
                <stop offset="0" stop-color="black"></stop>
                <stop offset=".55" stop-color="black" stop-opacity=".6"></stop>
                <stop offset="1" stop-color="black" stop-opacity="0"></stop>
              </radialGradient>
              <mask id="gp-grid-mask">
                <rect width="1600" height="712" fill="url(#gp-grid-fade)"></rect>
                <rect width="1600" height="712" fill="url(#gp-grid-hole)"></rect>
              </mask>
            </defs>
            <g mask="url(#gp-grid-mask)" class="gp-grid">
              ${Array.from({ length: 29 }, (_, i) => svg`<line x1="800" y1="250" x2=${-1300 + i * 150} y2="712"></line>`)}
              ${[274.8, 293.5, 323.1, 363.1, 413.3, 473.5, 543.4, 623, 712].map((y) => svg`<line x1="0" y1=${y} x2="1600" y2=${y}></line>`)}
            </g>
          </svg>
          <div class="gp-grain"></div>
          <canvas class="gp-motes"></canvas>
        </div>
        ${this.renderShellHeader(title, { aside: this.renderReading() })}
        <div class="widget-body">
          <div class="chart-root" part="chart" ?hidden=${this._model.empty}>
            <div class="gp-canvas"></div>
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
    'ui9000-goals-perimeter': Ui9000GoalsPerimeterChart;
  }
}

export function registerGoalsPerimeterChart(): void {
  if (!customElements.get('ui9000-goals-perimeter')) {
    customElements.define('ui9000-goals-perimeter', Ui9000GoalsPerimeterChart);
  }
}

registerGoalsPerimeterChart();
