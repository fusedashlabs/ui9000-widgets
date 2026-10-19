import { html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { readThemeFromElement } from '../../../context/widget-context.js';
import { renderChartLegend, type ChartLegendEntry } from '../../../element/chart-legend-render.js';
import type { ChartTooltipContent, ChartTooltipRow } from '../../../element/chart-tooltip-portal.js';
import { chartShellStyles, Ui9000ChartElement } from '../../../element/ui9000-chart-base.js';
import { parseJsonAttr } from '../../../utils/chart-helpers.js';
import { chartPropsChanged } from '../../../utils/lit-draw.js';
import {
  BOARD,
  exceptionTitle,
  formatAgents,
  formatBlocker,
  formatCount,
  formatHealth,
  formatMultiplier,
  layoutBoard,
  normalizeGoalsPerimeter,
  type AgentNode,
  type AgentState,
  type BoardLayout,
  type ExternalDependency,
  type GoalConnection,
  type GoalException,
  type GoalsPerimeterModel,
  type PerimeterGoal,
  type ResourceGroup,
} from '../lib/index.js';
import {
  renderGoalsPerimeter,
  stateColor,
  type GoalsPerimeterController,
  type GoalsPerimeterHandlers,
} from '../render/index.js';
import { goalsPerimeterStyles } from './styles.js';

const STATE_NAME: Record<AgentState, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  blocked: 'Blocked',
  failed: 'Failed',
  idle: 'Idle',
};
const LEGEND_STATES: AgentState[] = ['healthy', 'degraded', 'blocked', 'failed', 'idle'];
const RESOURCE_STATE_NAME = { healthy: 'Healthy', degraded: 'Degraded', failed: 'Failed' } as const;

export interface GoalOpenDetail {
  goalId: string;
  goalName: string;
  /** Set when a resource-group diamond was clicked. */
  resourceGroupId?: string;
}

/** Tooltip anchor for keyboard focus: the top centre of the focused mark. */
function anchorOf(event: MouseEvent | FocusEvent): MouseEvent {
  if (event instanceof MouseEvent) return event;
  const target = event.currentTarget as Element | null;
  const rect = target?.getBoundingClientRect();
  const clientX = rect ? rect.left + rect.width / 2 : 0;
  const clientY = rect ? rect.top : 0;
  return {
    clientX,
    clientY,
    pageX: clientX + window.scrollX,
    pageY: clientY + window.scrollY,
  } as MouseEvent;
}

/**
 * Goals perimeter (AM-1): agents arranged around shared goals. Each goal is a
 * cloud of its agents inside a perimeter whose arc is the goal's health;
 * healthy, degraded, blocked and failed agents are told apart by colour and
 * marker, and lines join goals, agents and external dependencies. The legend
 * and the exception summary sit in the shell, not on the plot; every mark
 * explains itself on hover, and a goal opens on click.
 */
@customElement('ui9000-goals-perimeter')
export class Ui9000GoalsPerimeterChart extends Ui9000ChartElement {
  static override styles = [goalsPerimeterStyles, chartShellStyles];

  @property({ type: Boolean, attribute: 'show-legend' })
  showLegend = true;

  @property({ type: Boolean, attribute: 'show-tooltip' })
  showTooltip = true;

  @state()
  private _model: GoalsPerimeterModel = normalizeGoalsPerimeter(null);

  /** The open goal, or null for the board of every goal. */
  @state()
  private _focus: string | null = null;

  private _layout: BoardLayout = layoutBoard([]);
  private _controller: GoalsPerimeterController | null = null;
  private _resizeObserver?: ResizeObserver;
  private _raf = 0;
  private _resizeRaf = 0;

  private readonly _onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this._focus) {
      event.stopPropagation();
      this.closeGoal();
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this._resizeObserver.observe(this);
    this.addEventListener('keydown', this._onKeydown);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this._onKeydown);
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    cancelAnimationFrame(this._resizeRaf);
    super.disconnectedCallback();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('dataJson')) {
      this._model = normalizeGoalsPerimeter(parseJsonAttr(this.dataJson, null));
      this._layout = layoutBoard(this._model.goals, this._model.externals);
      this._focus = null;
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

  /** A resize re-fits the board; the clouds and marks stay as they are. */
  private scheduleResize(): void {
    cancelAnimationFrame(this._resizeRaf);
    this._resizeRaf = requestAnimationFrame(() => {
      const root = this.chartRoot();
      if (!root) return;
      if (this._controller) this._controller.resize(...this.viewport(root));
      else this.draw();
    });
  }

  /** The plot box: sized by the shell, measured for the board. */
  private chartRoot(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.chart-root') as HTMLElement | null) ?? null;
  }

  /** Where D3 draws, inside the plot box and under the open goal's overlay. */
  private canvas(): HTMLElement | null {
    return (this.shadowRoot?.querySelector('.chart-root > .gp-canvas') as HTMLElement | null) ?? null;
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
    if (this._model.empty) {
      canvas.replaceChildren();
      this._controller = null;
      return;
    }
    const [width, height] = this.viewport(root);
    this._controller = renderGoalsPerimeter(canvas, {
      model: this._model,
      layout: this._layout,
      width,
      height,
      theme: readThemeFromElement(this),
      themeMode: this.themeMode(),
      handlers: this.handlers(),
    });
    // A redraw (data, theme) keeps the open goal open, without the zoom.
    if (this._focus) this._controller?.focus(this._focus, { animate: false });
  }

  /** The goal that is open, if any. */
  get openGoal(): string | null {
    return this._focus;
  }

  /**
   * Opens a goal: its cluster expands to fill the plot with its agents by
   * state, its exceptions, its resource groups and what it is joined to.
   */
  openGoalById(goalId: string, groupId?: string): void {
    const goal = this._model.goals.find((item) => item.id === goalId);
    if (goal) this.open(goal, goal.resourceGroups.find((group) => group.id === groupId));
  }

  /** Back to the board of every goal. */
  closeGoal(): void {
    const goalId = this._focus;
    if (!goalId) return;
    this._focus = null;
    this.closeTooltip();
    this._controller?.focus(null);
    this.dispatchEvent(new CustomEvent<{ goalId: string }>('goal-close', { detail: { goalId }, bubbles: true, composed: true }));
  }

  private handlers(): GoalsPerimeterHandlers {
    const tip = (event: MouseEvent | FocusEvent, content: ChartTooltipContent) => {
      if (this.showTooltip) this.openTooltip(anchorOf(event), content);
    };
    return {
      onGoalHover: (goal, event) => tip(event, this.goalTooltip(goal)),
      onGroupHover: (goal, group, event) => tip(event, this.groupTooltip(goal, group)),
      onMarkerHover: (goal, exception, event) => tip(event, this.exceptionTooltip(goal, exception)),
      onAgentHover: (goal, agent, event) => tip(event, this.agentTooltip(goal, agent)),
      onConnectionHover: (connection, event) => tip(event, this.connectionTooltip(connection)),
      onExternalHover: (dependency, event) => tip(event, this.externalTooltip(dependency)),
      onLeave: () => this.closeTooltip(),
      onOpen: (goal, group) => this.open(goal, group),
    };
  }

  private open(goal: PerimeterGoal, group?: ResourceGroup): void {
    this._focus = goal.id;
    this.closeTooltip();
    this._controller?.focus(goal.id, { groupId: group?.id });
    const detail: GoalOpenDetail = { goalId: goal.id, goalName: goal.name };
    if (group) detail.resourceGroupId = group.id;
    this.dispatchEvent(
      new CustomEvent<GoalOpenDetail>('goal-open', { detail, bubbles: true, composed: true }),
    );
  }

  private goalName(id: string): string {
    return this._model.goals.find((goal) => goal.id === id)?.name ?? id;
  }

  private goalTooltip(goal: PerimeterGoal): ChartTooltipContent {
    const { agents } = goal;
    const rows: ChartTooltipRow[] = [
      { label: 'Agents', value: formatCount(agents.total) },
      { label: 'Health', value: formatHealth(goal.health) },
    ];
    if (goal.multiplier !== null) {
      rows.push({ label: goal.multiplierLabel, value: formatMultiplier(goal.multiplier) });
    }
    for (const state of LEGEND_STATES) {
      if (state === 'healthy' || agents[state] > 0) {
        rows.push({ label: STATE_NAME[state], value: formatCount(agents[state]) });
      }
    }
    rows.push({ label: 'Exceptions', value: formatCount(goal.impure) });
    rows.push({ label: 'Resource groups', value: formatCount(goal.resourceGroupCount) });
    return { title: goal.name, rows };
  }

  private groupTooltip(goal: PerimeterGoal, group: ResourceGroup): ChartTooltipContent {
    const rows: ChartTooltipRow[] = [{ label: 'State', value: RESOURCE_STATE_NAME[group.state] }];
    if (group.kind) rows.unshift({ label: 'Kind', value: group.kind });
    if (group.agents !== null) rows.push({ label: 'Used by', value: formatAgents(group.agents) });
    if (group.detail) rows.push({ label: 'Detail', value: group.detail });
    rows.push({ label: 'Goal', value: goal.name });
    return { title: group.name, rows };
  }

  private exceptionTooltip(goal: PerimeterGoal, exception: GoalException): ChartTooltipContent {
    const rows: ChartTooltipRow[] = [];
    if (exception.reason) {
      rows.push({
        label: exception.state === 'blocked' ? 'Blocked by' : 'Reason',
        value: exception.reason,
      });
    }
    if (exception.blocker) rows.push({ label: 'Blocker', value: formatBlocker(exception.blocker) });
    rows.push({ label: 'Goal', value: goal.name });
    return { title: exceptionTitle(exception.state, exception.count), rows };
  }

  private agentTooltip(goal: PerimeterGoal, agent: AgentNode): ChartTooltipContent {
    const rows: ChartTooltipRow[] = [{ label: 'State', value: STATE_NAME[agent.state] }];
    if (agent.reason) rows.push({ label: 'Reason', value: agent.reason });
    if (agent.blocker) rows.push({ label: 'Blocker', value: formatBlocker(agent.blocker) });
    rows.push({ label: 'Goal', value: goal.name });
    return { title: agent.label, rows };
  }

  private connectionTooltip(connection: GoalConnection): ChartTooltipContent {
    const rows: ChartTooltipRow[] = [
      { label: 'From', value: this.goalName(connection.source) },
      { label: 'To', value: this.goalName(connection.target) },
    ];
    if (connection.label) rows.push({ label: 'Link', value: connection.label });
    if (connection.reason) rows.push({ label: 'Reason', value: connection.reason });
    if (connection.impact) rows.push({ label: 'Impact', value: connection.impact });
    return { title: 'Connection unavailable', rows };
  }

  private externalTooltip(dependency: ExternalDependency): ChartTooltipContent {
    const rows: ChartTooltipRow[] = [
      { label: 'Used by', value: this.goalName(dependency.goalId) },
      {
        label: 'Status',
        value:
          dependency.status === 'unavailable'
            ? 'Unavailable'
            : dependency.status === 'degraded'
              ? 'Degraded'
              : 'Connected',
      },
    ];
    if (dependency.links > 1) rows.push({ label: 'Links', value: formatCount(dependency.links) });
    if (dependency.reason) rows.push({ label: 'Reason', value: dependency.reason });
    if (dependency.impact) rows.push({ label: 'Impact', value: dependency.impact });
    return { title: dependency.label, rows };
  }

  private focusedGoal(): PerimeterGoal | undefined {
    return this._focus ? this._model.goals.find((goal) => goal.id === this._focus) : undefined;
  }

  /**
   * One swatch per state that has agents on the board, with its count: across
   * the board, or in the open goal. The swatches stay the same when a goal
   * opens (a state the goal lacks reads 0), so the row never changes height.
   */
  private renderLegend() {
    if (!this.showLegend || this._model.empty) return nothing;
    const mode = this.themeMode();
    const entries: ChartLegendEntry[] = [];
    const open = this.focusedGoal();
    for (const state of LEGEND_STATES) {
      const onBoard = this._model.goals.reduce((sum, goal) => sum + goal.agents[state], 0);
      if (onBoard <= 0) continue;
      const total = open ? open.agents[state] : onBoard;
      entries.push({
        label: `${STATE_NAME[state]} ${formatCount(total)}`,
        swatch: { kind: 'swatch', color: stateColor(mode, state) },
      });
    }
    return renderChartLegend(entries, 'Agents');
  }

  /** Agents needing attention, and connections that are down, beside the title. */
  private renderExceptionSummary() {
    const { connections, externals, empty } = this._model;
    if (empty) return undefined;
    const open = this.focusedGoal();
    const exceptionCount = open ? open.impure : this._model.exceptionCount;
    const touches = (ids: string[]) => !open || ids.includes(open.id);
    const down =
      connections.filter((c) => c.status === 'unavailable' && touches([c.source, c.target])).length +
      externals.filter((d) => d.status === 'unavailable' && touches([d.goalId])).length;
    return html`<span class="exception-summary" part="exceptions">
      <span class="exception-count ${exceptionCount > 0 ? 'has-exceptions' : ''}">
        <svg viewBox="-6 -6 12 12" aria-hidden="true"><circle r="4.6"></circle><path d="M-3.2,3.2L3.2,-3.2"></path></svg>
        <strong>${formatCount(exceptionCount)}</strong>
        ${exceptionCount === 1 ? 'exception' : 'exceptions'}
      </span>
      ${down
        ? html`<span class="down-count">· ${formatCount(down)} ${down === 1 ? 'connection' : 'connections'} down</span>`
        : nothing}
    </span>`;
  }

  /**
   * Shown while a goal is open: the way back, and which goal this is. It
   * floats over the plot's top-left corner (the open goal leaves that band
   * clear), so opening a goal moves nothing in the shell.
   */
  private renderCrumbs() {
    const open = this.focusedGoal();
    if (!open) return nothing;
    return html`<div class="gp-crumbs" part="crumbs">
      <button type="button" class="gp-back" @click=${() => this.closeGoal()} aria-label="Back to all goals">
        <span aria-hidden="true">←</span> All goals
      </button>
      <span class="gp-crumb-goal" title=${open.name}>${open.name}</span>
    </div>`;
  }

  override render() {
    const title = this.headerTitle() || (this.showHeader ? this._model.title : '');
    return html`
      <div class="widget-shell" part="shell">
        ${this.renderShellHeader(title, { aside: this.renderExceptionSummary() })}
        <div class="widget-body">
          ${this.renderLegend()}
          <div class="chart-root" part="chart" ?hidden=${this._model.empty}>
            <div class="gp-canvas"></div>
            ${this.renderCrumbs()}
          </div>
          ${this._model.empty ? html`<div class="empty" part="empty">No goal data</div>` : nothing}
          ${this.renderShellLabelTooltip()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui9000-goals-perimeter': Ui9000GoalsPerimeterChart;
  }
  interface HTMLElementEventMap {
    'goal-open': CustomEvent<GoalOpenDetail>;
    'goal-close': CustomEvent<{ goalId: string }>;
  }
}

export function registerGoalsPerimeterChart(): void {
  if (!customElements.get('ui9000-goals-perimeter')) {
    customElements.define('ui9000-goals-perimeter', Ui9000GoalsPerimeterChart);
  }
}

registerGoalsPerimeterChart();
