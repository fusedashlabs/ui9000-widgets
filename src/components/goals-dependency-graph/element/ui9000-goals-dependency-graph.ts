import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { ChartTooltipContent, ChartTooltipRow } from '../../../element/chart-tooltip-portal.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { dsText } from '../../../element/ds-text.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  BOARD,
  DEFAULT_CAMERA,
  formatAgents,
  formatCount,
  formatMultiplier,
  formatPercent,
  normalizeGoalsDependencyGraph,
  resourceStanding,
  type GoalsDependencyGraphModel,
  type GraphEdge,
  type GraphGoal,
  type GraphResource,
  type StageCamera,
} from '../lib/index.js';
import {
  renderGoalsDependencyGraph,
  scenePalette,
  type GoalsDependencyGraphController,
  type GoalsDependencyGraphHandlers,
  type ScenePalette,
} from '../render/index.js';
import { goalsDependencyGraphStyles } from './styles.js';

type Mode = 'light' | 'dark';

/** Phosphor's light icons, on their 256 grid. */
const ICON = {
  shapes:
    'M69.69,62.1a6,6,0,0,0-11.38,0l-40,120A6,6,0,0,0,24,190h80a6,6,0,0,0,5.69-7.9ZM32.32,178,64,83l31.68,95ZM206,76a50,50,0,1,0-50,50A50.06,50.06,0,0,0,206,76Zm-88,0a38,38,0,1,1,38,38A38,38,0,0,1,118,76Zm106,70H136a6,6,0,0,0-6,6v56a6,6,0,0,0,6,6h88a6,6,0,0,0,6-6V152A6,6,0,0,0,224,146Zm-6,56H142V158h76Z',
  path: 'M200,170a30.05,30.05,0,0,0-29.4,24H72a34,34,0,0,1,0-68h96a38,38,0,0,0,0-76H72a6,6,0,0,0,0,12h96a26,26,0,0,1,0,52H72a46,46,0,0,0,0,92h98.6A30,30,0,1,0,200,170Zm0,48a18,18,0,1,1,18-18A18,18,0,0,1,200,218Z',
  graph:
    'M200,154a29.87,29.87,0,0,0-19.5,7.23L154.88,141.3A29.83,29.83,0,0,0,158,128a30.52,30.52,0,0,0-.22-3.6L174,119a30,30,0,1,0-4-15,30.52,30.52,0,0,0,.22,3.6L154,113a29.91,29.91,0,0,0-32.42-14.31l-8.14-18.3a30,30,0,1,0-11,4.88l8.14,18.3A29.92,29.92,0,0,0,102.06,143L74,168a30.08,30.08,0,1,0,8,9L110,152a29.91,29.91,0,0,0,37.47-1.23l25.62,19.93A30,30,0,1,0,200,154Zm0-68a18,18,0,1,1-18,18A18,18,0,0,1,200,86ZM78,56A18,18,0,1,1,96,74,18,18,0,0,1,78,56ZM56,210a18,18,0,1,1,18-18A18,18,0,0,1,56,210Zm72-64a18,18,0,1,1,18-18A18,18,0,0,1,128,146Zm72,56a18,18,0,1,1,18-18A18,18,0,0,1,200,202Z',
} as const;

const icon = (d: string) => html`<svg class="gd-icon" viewBox="0 0 256 256" aria-hidden="true"><path d=${d}></path></svg>`;

/** A mark of the graph, redrawn at legend size: 18 × 18, stroked in the current colour. */
const mark = (body: unknown) => html`<svg class="gd-legend-mark" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${body}</svg>`;

const DIAMOND = 'M9 3.5 14.5 9 9 14.5 3.5 9Z';

/** The graph's marks, drawn as they are on it. */
const LEGEND_MARKS: { mark: unknown; label: string }[] = [
  {
    mark: mark(
      svg`<path d="M9 16V10M9 10 5 4M9 10l4-5M5 4 3.5 2M13 5l1.5-2" opacity="0.5"></path><circle cx="3.5" cy="2" r="1" class="solid"></circle><circle cx="5" cy="4" r="0.9" class="solid"></circle><circle cx="14.5" cy="3" r="1" class="solid"></circle><circle cx="13" cy="5" r="0.8" class="solid" opacity="0.5"></circle>`,
    ),
    label: 'A goal is a tree rooted on the baseline, and each tip of it is one of its agents — white at work, grey when idle',
  },
  { mark: mark(svg`<circle cx="9" cy="9" r="2.6" class="solid blocked"></circle>`), label: 'A blocked agent' },
  { mark: mark(svg`<path d="M6 6l6 6M12 6l-6 6" class="failed" stroke-width="1.4"></path>`), label: 'A failed agent' },
  { mark: mark(svg`<circle cx="9" cy="9" r="3" class="awaiting" stroke-width="1.3"></circle>`), label: 'An agent awaiting — a person or a slow dependency' },
  { mark: mark(svg`<path d="M9 5 13 12H5Z" class="solid degraded"></path>`), label: 'A degraded agent — slowed, or past its budget' },
  {
    mark: mark(svg`<circle cx="9" cy="9" r="6.5" opacity="0.3"></circle><path d="M9 2.5A6.5 6.5 0 1 1 3.4 12.2" stroke-width="1.4"></path>`),
    label: 'The ring at its root fills with progress to target, on a scale with a longer tick every 10%. The goal at the centre grows its full tree',
  },
  {
    mark: mark(svg`<path d="M4 16C4 8 14 9 14 2" opacity="0.6"></path><path d="M4 16C4 8 14 9 14 2" class="traffic" stroke-width="1.6" stroke-dasharray="1.2 30" stroke-dashoffset="-10"></path>`),
    label: 'A line runs from a goal’s root to each resource group it draws on. Light running up it is the goal’s calls: the more a minute, the quicker',
  },
  {
    mark: mark(svg`<path d="M4 16C4 8 14 9 14 2" class="blocked" stroke-width="1.4"></path>`),
    label: 'A line in a held agent’s colour holds agents of its goal there. The worst line of the goal at the centre is traced, with a callout',
  },
];

/** How the goals fare with a resource group, as its diamond shows it: empty, a dot, solid. */
const DIAMOND_HEALTH: { mark: unknown; label: string }[] = [
  { mark: mark(svg`<path d=${DIAMOND}></path>`), label: 'Traffic flows' },
  {
    mark: mark(svg`<path d=${DIAMOND} class="degraded"></path><circle cx="9" cy="9" r="1.5" class="solid degraded"></circle>`),
    label: 'Some of it slowed',
  },
  {
    mark: mark(svg`<path d=${DIAMOND} class="blocked"></path><path d="M9 6.2 11.8 9 9 11.8 6.2 9Z" class="solid blocked"></path>`),
    label: 'Agents held there, with their count across the goals — orange blocked, red failed, purple awaiting',
  },
];

const LEGEND_TIP: ChartTooltipContent = { title: 'Legend', body: 'What the shapes, colours and marks of the graph mean.', rows: [] };

const HOLD_WORD = { awaiting: 'awaiting', blocked: 'blocked', failed: 'failed' } as const;

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
 * Goals dependency graph, after the Agent operations design's Graph view:
 * every goal a tree rooted on a baseline — one tip an agent, in its state's
 * mark — with a line rising from its root to each resource group it draws
 * on, in the colour of the agents held there. The goal at the centre grows
 * the full tree and has its worst line traced; click a goal to bring it to
 * the centre, a group or a line to trace it. Drag to pan, scroll to zoom,
 * double-click to reset. The legend sits at the bottom left; every mark
 * explains itself on hover.
 *
 * It takes the goals perimeter's payload, so the same goals draw either view.
 * `theme` switches the stage (`light` / `dark`); left empty it follows a
 * local `data-theme` wrapper (not `<html>`), then `paintMode` / host `--ui9000-*`.
 */
@customElement('ui9000-goals-dependency-graph')
export class Ui9000GoalsDependencyGraph extends Ui9000ChartElement {
  static override styles = [goalsDependencyGraphStyles, chartShellStyles];

  /** Shows the legend button at the bottom left. */
  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  /** Only problems stand out: the agents at work all but go out, and whatever has nothing held steps back. */
  @property({ type: Boolean, attribute: 'problems-only', reflect: true })
  problemsOnly = false;

  /** `light` or `dark`. Empty follows a local `data-theme` wrapper (not `<html>`), then `paintMode` / host `--ui9000-*`. */
  @property({ type: String, reflect: true })
  theme = '';

  @state()
  private _model: GoalsDependencyGraphModel = normalizeGoalsDependencyGraph(null);

  @state()
  private _legendOpen = false;

  @state()
  private _legendAt: { left: number; bottom: number; maxHeight: number } | null = null;

  private _mode: Mode = 'light';
  /** Where the camera rests and which goal is at the centre, so a redraw keeps the graph as it was. */
  private _camera: StageCamera = { ...DEFAULT_CAMERA };
  private _center = '';
  private _controller: GoalsDependencyGraphController | null = null;
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

  /** Every tip travels with the pointer, not only from where it first appeared. */
  private readonly _onPointerMove = (event: PointerEvent): void => {
    this._tipAt = { x: event.clientX, y: event.clientY };
    if (this._tip) this.presentTip();
  };

  /** A press outside the legend closes it. */
  private readonly _onDocumentPointer = (event: PointerEvent): void => {
    if (!this._legendOpen) return;
    const path = event.composedPath();
    const popover = this.shadowRoot?.querySelector('.gd-legend');
    const button = this.shadowRoot?.querySelector('.gd-legend-button');
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
    super.disconnectedCallback();
  }

  private resolveAppearance(): void {
    const explicit = this.theme === 'dark' || this.theme === 'light' ? this.theme : '';
    this._mode = explicit || themeFromLocalAncestor(this) || this.themeMode();
    if (this.getAttribute('data-mode') !== this._mode) this.setAttribute('data-mode', this._mode);
  }

  override willUpdate(changed: PropertyValues): void {
    this.resolveAppearance();
    // new data keeps the goal at the centre while it is still there
    if (changed.has('dataJson')) this._model = normalizeGoalsDependencyGraph(parseJsonAttr(this.dataJson, null));
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('showTooltip') && !this.showTooltip) this.hideTip();
    if (changed.has('problemsOnly') && this._controller) this._controller.setProblemsOnly(this.problemsOnly);
    if (this.shouldRedraw(changed) || !this._controller) this.scheduleDraw();
  }

  /** The legend and the tooltip are shell chrome, and Problems only only re-weights the graph; toggling them leaves the plot alone. */
  private shouldRedraw(changed: PropertyValues): boolean {
    if (!chartPropsChanged(changed)) return false;
    for (const key of changed.keys()) {
      if (typeof key !== 'string' || key.startsWith('_')) continue;
      if (key === 'showLegend' || key === 'showTooltip' || key === 'problemsOnly') continue;
      return true;
    }
    return false;
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

  /** A resize re-fits the graph; the trees and marks stay as they are. */
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
    return (this.shadowRoot?.querySelector('.chart-root > .gd-canvas') as HTMLElement | null) ?? null;
  }

  /** The scene behind the graph: the whole card, dark or light with the page. */
  private sceneLayer(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.gd-scene') as HTMLElement | null) ?? null;
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
    if (this._controller) {
      this._camera = this._controller.camera();
      this._center = this._controller.center();
    }
    this._controller?.destroy();
    this._controller = null;
    if (this._model.empty) {
      canvas.replaceChildren();
      return;
    }
    const palette = scenePalette(this.styleId(), this._mode);
    this.paintScene(palette);
    const [width, height] = this.viewport(root);
    this._controller = renderGoalsDependencyGraph(canvas, {
      model: this._model,
      width,
      height,
      handlers: this.handlers(),
      sceneLayer: this.sceneLayer(),
      palette,
      camera: this._camera,
      center: this._center || undefined,
      problemsOnly: this.problemsOnly,
    });
  }

  /** The page style's colours for what the stylesheet draws: hairlines, traffic, the arc's glow, the floor and the mist. */
  private paintScene(palette: ScenePalette): void {
    const vars: Record<string, string> = {
      '--gd-line': palette.line,
      '--gd-traffic': palette.trafficCss,
      '--gd-arc-glow': palette.arcGlow,
      '--gd-grid': palette.grid,
      '--gd-mist': palette.mist,
      '--gd-floor-mist': palette.floorMist,
    };
    for (const [name, value] of Object.entries(vars)) this.style.setProperty(name, value);
  }

  /** The camera the graph rests on. */
  get camera(): StageCamera {
    return this._controller?.camera() ?? { ...this._camera };
  }

  /** The goal at the centre, by id. Setting it glides that goal there. */
  get center(): string {
    return this._controller?.center() ?? (this._center || this._model.center);
  }

  set center(id: string) {
    this._center = id;
    this._controller?.setCenter(id);
  }

  /** Back to 100%, unpanned. */
  resetCamera(): void {
    this._controller?.resetCamera();
  }

  private handlers(): GoalsDependencyGraphHandlers {
    const tip = (event: MouseEvent | FocusEvent, content: ChartTooltipContent) => {
      if (this.showTooltip) this.showMarkTip(event, content);
    };
    return {
      onGoalHover: (goal, event) => tip(event, this.goalTooltip(goal)),
      onResourceHover: (resource, event) => tip(event, this.resourceTooltip(resource)),
      onEdgeHover: (edge, event) => tip(event, this.edgeTooltip(edge)),
      onLeave: () => this.hideTip(),
      onCamera: (camera) => {
        this._camera = camera;
      },
      onCenter: (goal) => {
        this._center = goal;
      },
    };
  }

  private goalOf(id: string): GraphGoal | undefined {
    return this._model.goals.find((goal) => goal.id === id);
  }

  private resourceOf(id: string): GraphResource | undefined {
    return this._model.resources.find((resource) => resource.id === id);
  }

  private goalTooltip(goal: GraphGoal): ChartTooltipContent {
    const { agents } = goal;
    const rows: ChartTooltipRow[] = [{ label: 'Status', value: goal.statusLabel }, { label: 'Working', value: formatCount(agents.healthy) }];
    for (const [label, n] of [
      ['Idle', agents.idle],
      ['Awaiting', agents.awaiting],
      ['Blocked', agents.blocked],
      ['Failed', agents.failed],
      ['Degraded', agents.degraded],
    ] as const)
      if (n > 0) rows.push({ label, value: formatCount(n) });
    rows.push({ label: 'Progress', value: formatPercent(goal.progress) });
    if (goal.multiplier !== null) rows.push({ label: goal.multiplierLabel, value: formatMultiplier(goal.multiplier) });
    rows.push({ label: 'Held', value: formatCount(goal.held) });
    const at = this.center === goal.id;
    return {
      title: goal.code ? `${goal.code} · ${goal.name}` : goal.name,
      body: `Every tip of its tree is one agent. The ring fills with progress to target; the lines rising from it run to the resource groups it draws on.${at ? '' : ' Click to bring it to the centre.'}`,
      rows,
    };
  }

  /** A group as a whole: what the goals that draw on it meet there. */
  private resourceTooltip(resource: GraphResource): ChartTooltipContent {
    const standing = resourceStanding(this._model, resource.id);
    const edges = this._model.edges.filter((e) => e.resource === resource.id);
    const why = resource.detail ? ` ${resource.detail}.` : '';
    const body = standing.held
      ? `${formatAgents(standing.held)} ${standing.held === 1 ? 'is' : 'are'} held here across ${edges.filter((e) => e.held).length} of the ${standing.goals} goals that draw on it.${why} Click to trace the group.`
      : standing.health === 'degraded'
        ? `Some of the traffic here is slowed or turned away; no agent is held.${why} Click to trace the group.`
        : `Traffic here flows.${why} Click to trace the group.`;
    const rows: ChartTooltipRow[] = edges.map((e) => ({
      label: this.goalOf(e.goal)?.name ?? e.goal,
      value: e.hold ? `${formatCount(e.held)} ${HOLD_WORD[e.hold]}` : e.health === 'degraded' ? 'slowed' : 'flows',
    }));
    const whole = [
      resource.healthy !== null ? `${formatCount(resource.healthy)} healthy` : '',
      resource.degraded ? `${formatCount(resource.degraded)} degraded` : '',
      resource.impaired ? `${formatCount(resource.impaired)} impaired` : '',
    ].filter(Boolean);
    if (whole.length) rows.push({ label: 'Whole group', value: whole.join(' · ') });
    return { title: resource.count !== null ? `${resource.name} · ${formatCount(resource.count)}` : resource.name, body, rows };
  }

  /** How one goal fares with one of its groups — its own experience of it, not the group's health overall. */
  private edgeTooltip(edge: GraphEdge): ChartTooltipContent {
    const goal = this.goalOf(edge.goal);
    const resource = this.resourceOf(edge.resource);
    const goalName = goal?.name ?? edge.goal;
    const why = edge.detail ? ` — ${edge.detail}` : '';
    const body = edge.hold
      ? `${edge.held ? formatAgents(edge.held) : 'Agents'} of ${goalName} ${edge.held === 1 ? 'is' : 'are'} ${HOLD_WORD[edge.hold]} here${why}. Click to trace the line.`
      : edge.health === 'degraded'
        ? `Some of ${goalName}’s traffic here is slowed${why}. No agent is held. Click to trace the line.`
        : `A resource group ${goalName} draws on. Its traffic here flows. Click to trace the line.`;
    const rows: ChartTooltipRow[] = [];
    if (edge.cause) rows.push({ label: 'Cause', value: edge.cause });
    if (edge.held > 0) rows.push({ label: 'Held', value: formatCount(edge.held) });
    if (edge.since) rows.push({ label: 'For', value: edge.since });
    if (edge.rule) rows.push({ label: 'Rule', value: edge.rule });
    if (edge.owner) rows.push({ label: 'Owner', value: edge.owner });
    if (edge.calls !== null) rows.push({ label: 'Calls', value: `${formatCount(edge.calls)} a minute` });
    const others = this._model.edges.filter((e) => e.resource === edge.resource && e.goal !== edge.goal).length;
    rows.push({
      label: 'Shared with',
      value: others === this._model.goals.length - 1 && others > 0 ? 'every goal' : others === 0 ? 'no other goal' : `${others} other ${others === 1 ? 'goal' : 'goals'}`,
    });
    return { title: `${goalName} → ${resource?.name ?? edge.resource}`, body, rows };
  }

  /** The line under the title: what the graph holds — goals, agents, and how many are held. */
  private renderReading() {
    if (this._model.empty) return undefined;
    const divider = html`<span class="gd-divider" aria-hidden="true"></span>`;
    const goals = this._model.goals.length;
    const agents = this._model.goals.reduce((sum, goal) => sum + goal.agents.total, 0);
    const groups = this._model.resources.length;
    return html`<span class="gd-reading-line" part="reading">
      <span>${formatCount(goals)} ${goals === 1 ? 'goal' : 'goals'}</span>${divider}<span>${formatCount(groups)} resource ${groups === 1 ? 'group' : 'groups'}</span>${divider}<span>${formatCount(agents)} agents</span>${divider}<span
        class=${this._model.held > 0 ? 'gd-held' : ''}
        >${formatCount(this._model.held)} held</span
      >
    </span>`;
  }

  /** The legend button at the bottom left. */
  private renderControls() {
    if (this._model.empty || !this.showLegend) return nothing;
    return html`<div class="gd-controls" part="controls">
      <button
        type="button"
        class="gd-well gd-legend-button"
        aria-label="Legend"
        aria-expanded=${this._legendOpen ? 'true' : 'false'}
        @mouseenter=${(event: MouseEvent) => this.showMarkTip(event, LEGEND_TIP)}
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
    else if (event.currentTarget instanceof Element || event.target instanceof Element) {
      const rect = ((event.currentTarget as Element | null) ?? (event.target as Element)).getBoundingClientRect();
      this._tipAt = { x: rect.left + rect.width / 2, y: rect.top };
    }
    const show = () => {
      this._tip = content;
      this.presentTip();
    };
    if (this._tip || !(event instanceof MouseEvent)) show();
    else this._tipTimer = window.setTimeout(show, TIP_DELAY_MS);
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
    const button = this.shadowRoot?.querySelector('.gd-legend-button');
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

  /** How to read the graph: what the shapes, colours and marks mean. */
  private renderLegend() {
    if (!this._legendOpen || !this.showLegend) return nothing;
    const at = this._legendAt ?? { left: 72, bottom: 24, maxHeight: 480 };
    const row = (entry: { mark: unknown; label: string }) => html`<div class="gd-legend-row">${entry.mark}<span>${entry.label}</span></div>`;
    return html`<div
      class="gd-legend"
      part="legend"
      role="dialog"
      aria-label="Reading the graph"
      style="left:${at.left}px;bottom:${at.bottom}px;max-height:${at.maxHeight}px"
    >
      <header class="gd-legend-head">${icon(ICON.shapes)}<h2>Reading the graph</h2></header>
      <section class="gd-legend-well">
        <header class="gd-legend-head">${icon(ICON.path)}<h3>Marks</h3></header>
        <div class="gd-legend-rows">${LEGEND_MARKS.map(row)}</div>
      </section>
      <section class="gd-legend-well">
        <header class="gd-legend-head">${icon(ICON.graph)}<h3>Goals and their resource groups</h3></header>
        <div class="gd-legend-rows">${DIAMOND_HEALTH.map(row)}</div>
      </section>
    </div>`;
  }

  override render() {
    const title = this.headerTitle() || (this.showHeader ? this._model.title : '');
    return html`
      <div class="widget-shell" part="shell">
        <div class="gd-scene" aria-hidden="true" ?hidden=${this._model.empty}>
          <div class="gd-backdrop"></div>
          <svg class="gd-floor" viewBox="0 0 1600 712" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="gd-grid-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="white" stop-opacity="0"></stop>
                <stop offset=".45" stop-color="white" stop-opacity=".55"></stop>
                <stop offset="1" stop-color="white" stop-opacity="1"></stop>
              </linearGradient>
              <radialGradient id="gd-grid-hole" cx=".5" cy=".42" r=".55">
                <stop offset="0" stop-color="black"></stop>
                <stop offset=".55" stop-color="black" stop-opacity=".6"></stop>
                <stop offset="1" stop-color="black" stop-opacity="0"></stop>
              </radialGradient>
              <mask id="gd-grid-mask">
                <rect width="1600" height="712" fill="url(#gd-grid-fade)"></rect>
                <rect width="1600" height="712" fill="url(#gd-grid-hole)"></rect>
              </mask>
            </defs>
            <g mask="url(#gd-grid-mask)" class="gd-grid">
              ${Array.from({ length: 29 }, (_, i) => svg`<line x1="800" y1="250" x2=${-1300 + i * 150} y2="712"></line>`)}
              ${[274.8, 293.5, 323.1, 363.1, 413.3, 473.5, 543.4, 623, 712].map((y) => svg`<line x1="0" y1=${y} x2="1600" y2=${y}></line>`)}
            </g>
          </svg>
          <div class="gd-grain"></div>
        </div>
        ${this.renderShellHeader(title, { aside: this.renderReading() })}
        <div class="widget-body">
          <div class="chart-root" part="chart" ?hidden=${this._model.empty}>
            <div class="gd-canvas"></div>
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

export function registerGoalsDependencyGraph(): void {
  if (!customElements.get('ui9000-goals-dependency-graph')) {
    customElements.define('ui9000-goals-dependency-graph', Ui9000GoalsDependencyGraph);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-goals-dependency-graph': Ui9000GoalsDependencyGraph;
  }
}
