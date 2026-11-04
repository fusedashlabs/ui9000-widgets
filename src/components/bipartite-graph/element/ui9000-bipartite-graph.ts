import { html, nothing, svg, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Directive, directive, PartType, type ElementPart, type PartInfo } from 'lit/directive.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import type { ChartTooltipContent, ChartTooltipRow } from '../../../element/chart-tooltip-portal.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { dsText } from '../../../element/ds-text.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import { goalsPerimeterStyles } from '../../goals-perimeter/element/styles.js';
import {
  BOARD,
  formatAgents,
  formatCount,
  formatHealth,
  formatMultiplier,
  type AgentState,
  type PerimeterGoal,
  type StageCamera,
} from '../../goals-perimeter/lib/index.js';
import { scenePalette, startMotes, type ScenePalette } from '../../goals-perimeter/render/index.js';
import {
  formatAssets,
  formatShort,
  normalizeBipartiteGraph,
  type BipartiteGraphModel,
  type BipartiteResource,
  type Dependency,
} from '../lib/index.js';
import {
  FLAT_CAMERA,
  renderBipartiteGraph,
  type BipartiteGraphController,
  type BipartiteGraphHandlers,
} from '../render/index.js';
import { bipartiteGraphStyles } from './styles.js';

const STATE_NAME: Record<AgentState, string> = {
  healthy: 'Working',
  degraded: 'Degraded',
  awaiting: 'Awaiting',
  blocked: 'Blocked',
  failed: 'Failed',
  idle: 'Idle',
};
const TOOLTIP_STATES: AgentState[] = ['healthy', 'idle', 'awaiting', 'blocked', 'failed', 'degraded'];
const HOLD_WORD = { awaiting: 'awaiting', blocked: 'blocked', failed: 'failed' } as const;

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
const S_CURVE = 'M1.5 5C9 5 9 13 16.5 13';

/** A mark of the map, redrawn at legend size: 18 × 18, stroked in the current colour. */
const mark = (body: unknown) =>
  html`<svg class="gp-legend-mark" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${body}</svg>`;

/** The map's marks, drawn as they are on it. */
const LEGEND_MARKS: { mark: unknown; label: string }[] = [
  {
    mark: mark(svg`<circle cx="5" cy="7" r="1" class="solid"></circle><circle cx="10" cy="5" r="1.3" class="solid"></circle><circle cx="12.5" cy="11" r="1" class="solid" opacity="0.6"></circle><circle cx="7" cy="12" r="0.8" class="solid" opacity="0.45"></circle>`),
    label: 'A dot is one agent — white at work, grey when idle. A cloud of them is a goal: the same clouds as on the goals perimeter, lined up',
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
    mark: mark(svg`<path d="M9 5.5 12.5 9 9 12.5 5.5 9Z"></path>`),
    label: 'A diamond on the right is a resource group. Its label says what it is, how many goals draw on it, their calls a minute and the agents held there',
  },
  {
    mark: mark(svg`<path d=${S_CURVE} stroke-width="5" opacity="0.2"></path><path d=${S_CURVE} opacity="0.8"></path>`),
    label: 'A ribbon joins a goal to each group it draws on: the wider, the more calls a minute it makes there. The light running along it is those calls',
  },
  {
    mark: mark(svg`<path d=${S_CURVE} class="blocked" stroke-width="5" opacity="0.25"></path><path d=${S_CURVE} class="blocked"></path>`),
    label: 'A ribbon in a held agent’s colour: agents of that goal are held on that group. A yellow ribbon: some of its traffic there is slowed, and no agent is held',
  },
];

/** What the goals that draw on a group meet there, taken together, as its diamond shows it: empty, a dot, solid. */
const GROUP_HEALTH: { mark: unknown; label: string }[] = [
  { mark: mark(svg`<path d=${DIAMOND}></path>`), label: 'Traffic flows' },
  {
    mark: mark(svg`<path d=${DIAMOND} class="degraded"></path><circle cx="9" cy="9" r="1.5" class="solid degraded"></circle>`),
    label: 'Some of it slowed',
  },
  {
    mark: mark(svg`<path d=${DIAMOND} class="blocked"></path><path d="M9 6.2 11.8 9 9 11.8 6.2 9Z" class="solid blocked"></path>`),
    label: 'Agents held there — in the colour of the worst of it: orange blocked, red failed, purple awaiting',
  },
];

/** The ribbons by colour, in the order of severity: the key beside the reading under the title. */
const RIBBON_KEY: [color: string, label: string][] = [
  ['var(--gp-line)', 'Flows'],
  ['var(--gp-warn)', 'Slowed'],
  ['var(--gp-awaiting)', 'Holding'],
  ['var(--gp-blocked)', 'Blocked'],
  ['var(--gp-failed)', 'Failed'],
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

  render(_host: Ui9000BipartiteGraph, _key: ControlTip) {
    return nothing;
  }

  override update(part: ElementPart, [host, key]: [Ui9000BipartiteGraph, ControlTip]) {
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
 * Bipartite graph, after the Agent operations design's bipartite layout: the
 * goals perimeter's goals — clouds of their agents, one dot an agent — lined
 * up on the left against the resource groups they draw on, on the right, with
 * a ribbon for each pair: the wider, the more calls a minute; in the colour of
 * the agents held there. The legend sits at the bottom left, the key to the
 * ribbons' colours beside the reading under the title; every mark and control
 * explains itself on hover.
 */
@customElement('ui9000-bipartite-graph')
export class Ui9000BipartiteGraph extends Ui9000ChartElement {
  static override styles = [goalsPerimeterStyles, bipartiteGraphStyles, chartShellStyles];

  /** Shows the legend button at the bottom left. */
  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  /** Only problems stand out: the agents at work all but go out, and whatever has nothing held steps back. */
  @property({ type: Boolean, attribute: 'problems-only', reflect: true })
  problemsOnly = false;

  @state()
  private _model: BipartiteGraphModel = normalizeBipartiteGraph(null);

  /** Where the map rests, so a redraw keeps it as it was panned and zoomed. */
  private _camera: StageCamera = { ...FLAT_CAMERA };

  @state()
  private _legendOpen = false;

  @state()
  private _legendAt: { left: number; bottom: number; maxHeight: number } | null = null;

  private _controller: BipartiteGraphController | null = null;
  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  private _resizeRaf = 0;
  private _stopMotes: (() => void) | null = null;
  /** The motes' colours, so a new page style restarts them in its own. */
  private _motesLights = '';

  /** The tip that shows, on the shared chart tooltip: a control's, or a mark's on the map. */
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
    if (changed.has('dataJson')) this._model = normalizeBipartiteGraph(parseJsonAttr(this.dataJson, null));
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('showTooltip') && !this.showTooltip) this.hideTip();
    if (changed.has('problemsOnly') && this._controller) this._controller.setProblemsOnly(this.problemsOnly);
    if (this.shouldRedraw(changed)) this.scheduleDraw();
  }

  /** The legend and the tooltip are shell chrome, and Problems only only re-weights the map; toggling them leaves the plot alone. */
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
    super.onThemeChange();
    this.scheduleDraw();
  }

  private scheduleDraw(): void {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.draw());
  }

  /** A resize re-fits the map; the clouds and marks stay as they are. */
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

  /** The plot box: sized by the shell, measured for the map. */
  private chartRoot(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null) ?? null;
  }

  /** Where D3 draws, inside the plot box. */
  private canvas(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.chart-root > .gp-canvas') as HTMLElement | null) ?? null;
  }

  /** The scene behind the map: the whole card, dark or light with the page. */
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
    this._controller = renderBipartiteGraph(canvas, {
      model: this._model,
      width,
      height,
      theme: readThemeFromElement(this),
      handlers: this.handlers(),
      sceneLayer: this.sceneLayer(),
      palette,
      camera: this._camera,
      problemsOnly: this.problemsOnly,
    });
  }

  /** The page style's colours for what the stylesheet draws: hairlines, the arc's glow, the floor, the mist and the traffic. */
  private paintScene(palette: ScenePalette): void {
    const vars: Record<string, string> = {
      '--gp-line': palette.line,
      '--gp-arc-glow': palette.arcGlow,
      '--gp-glint': palette.glint,
      '--gp-glint-stroke': palette.glintStroke,
      '--gp-grid': palette.grid,
      '--gp-mist': palette.mist,
      '--gp-floor-mist': palette.floorMist,
      '--bp-traffic': palette.trafficCss,
      '--bp-traffic-glow': palette.mode === 'dark' ? palette.trafficCss : palette.arcGlow,
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
    // the right edge carries the groups' labels: fewer there
    this._stopMotes = startMotes(motes, [0.7, 0.45, 0.35, 0.9], still, palette.motes, palette.mode);
  }

  /** Where the map has been panned and zoomed to. */
  get camera(): StageCamera {
    return { ...this._camera };
  }

  /** Zooms about the map's centre: 1.25 in, 0.8 out. */
  zoomBy(factor: number): void {
    this._controller?.zoomBy(factor);
  }

  /** Back to 100%, centred. */
  resetCamera(): void {
    this._controller?.resetCamera();
  }

  private handlers(): BipartiteGraphHandlers {
    const tip = (event: MouseEvent | FocusEvent, content: ChartTooltipContent) => {
      if (this.showTooltip) this.showMarkTip(event, content);
    };
    return {
      onGoalHover: (goal, event) => tip(event, this.goalTooltip(goal)),
      onResourceHover: (resource, event) => tip(event, this.resourceTooltip(resource)),
      onDependencyHover: (dependency, event) => tip(event, this.dependencyTooltip(dependency)),
      onLeave: () => this.hideTip(),
      onCamera: (camera) => {
        this._camera = camera;
      },
      onCompact: (compact) => this.toggleAttribute('data-compact', compact),
    };
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
      body: 'Each dot is one agent. The ring fills with progress to target; the ribbons leaving it run to the resource groups it draws on.',
      rows,
    };
  }

  /** The group as a whole, and what each goal that draws on it meets there. */
  private resourceTooltip(resource: BipartiteResource): ChartTooltipContent {
    const standing = this._model.standing.get(resource.key)!;
    const edges = this._model.dependencies.filter((d) => d.resource === resource);
    const body = standing.held
      ? `${formatAgents(standing.held)} ${standing.held === 1 ? 'is' : 'are'} held here, across ${edges.filter((d) => d.held).length} of the ${standing.goals} ${standing.goals === 1 ? 'goal' : 'goals'} that draw on it.`
      : standing.health === 'degraded'
        ? 'Some of the traffic here is slowed or turned away; no agent is held.'
        : 'Traffic here flows.';
    const rows: ChartTooltipRow[] = edges.map((d) => ({
      label: d.goal.name,
      value: d.hold ? `${d.held ? `${formatCount(d.held)} ` : ''}${HOLD_WORD[d.hold]}` : d.health === 'degraded' ? 'slowed' : 'flows',
    }));
    rows.push({ label: 'Calls', value: `${formatShort(standing.calls)} a minute` });
    const whole = this.wholeGroup(resource);
    if (whole) rows.push({ label: 'Whole group', value: whole });
    const assets = formatAssets(resource);
    return { title: assets ? `${resource.name} · ${assets}` : resource.name, body, rows };
  }

  /** How a goal fares with one of its groups — its own experience of it, not the group's health overall. */
  private dependencyTooltip(d: Dependency): ChartTooltipContent {
    const goal = d.goal.name;
    const why = d.group.detail ? ` — ${d.group.detail}` : '';
    const body = d.hold
      ? `${d.held ? formatAgents(d.held) : 'Agents'} of ${goal} ${d.held === 1 ? 'is' : 'are'} ${HOLD_WORD[d.hold]} here${why}.`
      : d.health === 'degraded'
        ? `Some of ${goal}’s traffic here is slowed${why}. No agent is held.`
        : `A resource group ${goal} draws on. Its traffic here flows.`;
    const rows: ChartTooltipRow[] = [];
    if (d.held > 0) rows.push({ label: 'Held', value: formatCount(d.held) });
    rows.push({ label: 'Calls', value: `${formatCount(d.calls)} a minute` });
    if (d.group.agents !== null) rows.push({ label: 'Used by', value: formatAgents(d.group.agents) });
    const whole = this.wholeGroup(d.resource);
    if (whole) rows.push({ label: 'Whole group', value: whole });
    const others = this._model.standing.get(d.resource.key)!.goals - 1;
    rows.push({
      label: 'Shared with',
      value:
        others === 0
          ? 'no other goal'
          : others === this._model.goals.length - 1
            ? 'every goal'
            : `${others} other ${others === 1 ? 'goal' : 'goals'}`,
    });
    return { title: `${goal} → ${d.resource.name}`, body, rows };
  }

  /** `30,892 healthy · 287 degraded · 25 impaired`, when the catalog says. */
  private wholeGroup(resource: BipartiteResource): string {
    const parts: string[] = [];
    if (resource.healthy !== null) parts.push(`${formatCount(resource.healthy)} healthy`);
    if (resource.degraded) parts.push(`${formatCount(resource.degraded)} degraded`);
    if (resource.impaired) parts.push(`${formatCount(resource.impaired)} impaired`);
    return parts.join(' · ');
  }

  /** The line under the title: what the map holds — goals, agents, and how many are held — and the key to the ribbons' colours. */
  private renderReading() {
    if (this._model.empty) return undefined;
    const divider = html`<span class="gp-divider" aria-hidden="true"></span>`;
    const held = this._model.exceptionCount;
    const goals = this._model.goals.length;
    const agents = this._model.goals.reduce((sum, goal) => sum + goal.agents.total, 0);
    return html`<div class="bp-aside">
      <span class="gp-reading-line" part="reading">
        <span>${formatCount(goals)} ${goals === 1 ? 'goal' : 'goals'} on map</span>${divider}<span>${formatCount(agents)} agents</span>${divider}<span
          class=${held > 0 ? 'gp-held' : ''}
          >${formatCount(held)} held</span
        >
      </span>
      <span class="bp-key" part="key">
        <span class="bp-key-caption">Ribbon to a group · wider = more calls</span>
        ${RIBBON_KEY.map(
          ([color, label]) =>
            html`<span class="bp-key-entry"><span class="bp-key-swatch" style="background:${color}" aria-hidden="true"></span>${label}</span>`,
        )}
      </span>
    </div>`;
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

  /**
   * To the right of its button, its foot level with the button's — placed in
   * the chart's shell, not the window, so it stays put under a scaled or
   * scrolled ancestor (as on the Storybook docs page).
   */
  private placeLegend(): void {
    const button = this.shadowRoot?.querySelector('.gp-legend-button');
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
        <header class="gp-legend-head">${icon(ICON.graph)}<h3>A resource group, for all goals</h3></header>
        <div class="gp-legend-rows">${GROUP_HEALTH.map(row)}</div>
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
              <linearGradient id="bp-grid-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="white" stop-opacity="0"></stop>
                <stop offset=".45" stop-color="white" stop-opacity=".55"></stop>
                <stop offset="1" stop-color="white" stop-opacity="1"></stop>
              </linearGradient>
              <radialGradient id="bp-grid-hole" cx=".5" cy=".42" r=".55">
                <stop offset="0" stop-color="black"></stop>
                <stop offset=".55" stop-color="black" stop-opacity=".6"></stop>
                <stop offset="1" stop-color="black" stop-opacity="0"></stop>
              </radialGradient>
              <mask id="bp-grid-mask">
                <rect width="1600" height="712" fill="url(#bp-grid-fade)"></rect>
                <rect width="1600" height="712" fill="url(#bp-grid-hole)"></rect>
              </mask>
            </defs>
            <g mask="url(#bp-grid-mask)" class="gp-grid">
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
    'ui9000-bipartite-graph': Ui9000BipartiteGraph;
  }
}

export function registerBipartiteGraph(): void {
  if (!customElements.get('ui9000-bipartite-graph')) {
    customElements.define('ui9000-bipartite-graph', Ui9000BipartiteGraph);
  }
}

registerBipartiteGraph();
