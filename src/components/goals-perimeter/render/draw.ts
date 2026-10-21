import { select, type Selection } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import { CHART_TYPE } from '../../../utils/chart-theme.js';
import {
  arcPath,
  cloudParticles,
  detailGeometry,
  connectionStrands,
  diamondPath,
  diamondSlots,
  exceptionTickCount,
  fitBoard,
  formatCount,
  formatResourceGroups,
  goalAriaLabel,
  goalFringe,
  goalSummary,
  LABEL_GAP,
  LABEL_LINE,
  markerSpots,
  MAX_DIAMONDS,
  particleScale,
  RING_PAD,
  tickSegments,
  unavailableLine,
  type AgentNode,
  type BoardLayout,
  type ExternalDependency,
  type FitTransform,
  type GoalConnection,
  type GoalException,
  type GoalsPerimeterModel,
  type Particle,
  type PerimeterGoal,
  type ResourceGroup,
  type Strand,
} from '../lib/index.js';
import {
  appendBlockedGlyph,
  appendDegradedGlyph,
  appendFailedGlyph,
  appendResourceGlyph,
} from './icons.js';
import { drawGoalDetail } from './detail.js';
import { perimeterPalette } from './palette.js';

type Svg = Selection<SVGSVGElement, unknown, null, undefined>;
type G = Selection<SVGGElement, unknown, null, undefined>;
type Pointer = MouseEvent | FocusEvent;

/** Callbacks for the element: tooltips and the open event live there. */
export interface GoalsPerimeterHandlers {
  onGoalHover?: (goal: PerimeterGoal, event: Pointer) => void;
  onGroupHover?: (goal: PerimeterGoal, group: ResourceGroup, event: Pointer) => void;
  onMarkerHover?: (goal: PerimeterGoal, exception: GoalException, event: Pointer) => void;
  onAgentHover?: (goal: PerimeterGoal, agent: AgentNode, event: Pointer) => void;
  onConnectionHover?: (connection: GoalConnection, event: Pointer) => void;
  onExternalHover?: (dependency: ExternalDependency, event: Pointer) => void;
  onLeave?: () => void;
  onOpen?: (goal: PerimeterGoal, group?: ResourceGroup) => void;
}

export interface RenderGoalsPerimeterOptions {
  model: GoalsPerimeterModel;
  layout: BoardLayout;
  width: number;
  height: number;
  theme: WidgetTheme;
  themeMode?: 'light' | 'dark';
  handlers?: GoalsPerimeterHandlers;
}

export interface GoalsPerimeterController {
  /** Re-fits the board (and redraws an open goal); the clouds, strands and marks are not rebuilt. */
  resize: (width: number, height: number) => void;
  fit: () => FitTransform;
  /**
   * Opens a goal: the board zooms into its cluster and the goal's detail
   * replaces it. `null` zooms back out to every goal.
   */
  focus: (goalId: string | null, options?: { groupId?: string; animate?: boolean }) => void;
  focused: () => string | null;
}

/** Zoom into or out of a goal. */
export const FOCUS_MS = 380;

/**
 * Below this board scale the full label block no longer fits under its ring:
 * only the title and the exception row stay, and the summary and the
 * resource-group rows move to the tooltip, which already carries them.
 */
export const COMPACT_SCALE = 0.62;
/** At most this many agent-to-agent lines per goal. */
const MAX_AGENT_LINKS = 240;

/** Label type stays readable when the board shrinks, and stops growing past 110%. */
export function labelScale(k: number): number {
  return Math.min(1.1, Math.max(0.75, k));
}

let instanceCount = 0;

function activate(run: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    run();
  };
}

const f = (n: number) => Number(n.toFixed(2));

function quadPoint(s: Strand, t: number): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * s.x0 + 2 * u * t * s.cx + t * t * s.x1,
    y: u * u * s.y0 + 2 * u * t * s.cy + t * t * s.y1,
  };
}

function dashPath(s: Strand, from: number, to: number): string {
  const pts: string[] = [];
  for (let t = from; t <= to + 1e-6; t += 0.01) {
    const p = quadPoint(s, Math.min(t, to));
    pts.push(`${f(p.x)},${f(p.y)}`);
  }
  return `M${pts.join('L')}`;
}

/** Rendered width when layout exists, an estimate otherwise (jsdom, detached). */
function measure(node: SVGTextElement, size: number, spacingEm: number): number {
  try {
    const width = node.getComputedTextLength();
    if (width > 0) return width;
  } catch {
    /* no layout */
  }
  const text = node.textContent ?? '';
  return text.length * size * (0.55 + spacingEm);
}

function truncate(text: string, maxWidth: number, size: number): string {
  const fits = Math.floor(maxWidth / (size * 0.56));
  if (text.length <= fits) return text;
  return `${text.slice(0, Math.max(1, fits - 1)).trimEnd()}…`;
}

type LabelRow = 'title' | 'summary' | 'impure' | 'groups';

const ROW_FONT: Record<LabelRow, { size: number; spacing: number }> = {
  title: { size: CHART_TYPE.title, spacing: 0 },
  summary: { size: CHART_TYPE.label, spacing: 0 },
  impure: { size: CHART_TYPE.label, spacing: 0.12 },
  groups: { size: CHART_TYPE.label, spacing: 0.1 },
};

/**
 * The label block under one ring, in label units (screen px at 100%). Rows
 * are centred on 0. Returns the widest row and how many rows show.
 */
function drawLabel(
  group: G,
  goal: PerimeterGoal,
  compact: boolean,
  compactWidth: number,
): { width: number; rows: number } {
  const rows: LabelRow[] = compact
    ? ['title', ...(goal.impure > 0 ? (['impure'] as const) : [])]
    : ['title', 'summary', ...(goal.impure > 0 ? (['impure'] as const) : []), 'groups'];
  let widest = 0;
  rows.forEach((row, i) => {
    const { size, spacing } = ROW_FONT[row];
    const baseline = i * LABEL_LINE + 17;
    const line = group.append('g').attr('class', `row ${row}`);
    const chip = row === 'impure' ? null : line.append('rect').attr('class', 'chip');
    const text = line.append('text').attr('y', baseline).style('font-size', `${size}px`);
    if (spacing) text.style('letter-spacing', `${spacing}em`);

    if (row === 'title') {
      text.text(compact ? truncate(goal.name, compactWidth, size) : goal.name);
    } else if (row === 'summary') {
      text.text(goalSummary(goal));
    } else if (row === 'impure') {
      text.text(`IMPURE · ${formatCount(goal.impure)}`);
    } else if (goal.resourceGroupCount > 0) {
      text.append('tspan').attr('class', 'groups-count').text(formatResourceGroups(goal.resourceGroupCount));
      text.append('tspan').attr('class', 'groups-open').text('  ·  click to open');
    } else {
      text.append('tspan').attr('class', 'groups-open').text('click to open');
    }

    const width = measure(text.node()!, size, spacing);
    const icon = row === 'impure' ? size * 0.8 + 8 : 0;
    const left = -(width + icon) / 2;
    text.attr('x', f(left + icon));
    if (row === 'impure') {
      const mark = line
        .append('g')
        .attr('class', 'impure-mark')
        .attr('transform', `translate(${f(left + size * 0.4)} ${f(baseline - size * 0.36)})`);
      appendBlockedGlyph(mark, size * 0.29);
    }
    const counted = row !== 'groups' || goal.resourceGroupCount > 0;
    if (chip && counted) {
      let chipWidth = width;
      if (row === 'groups') {
        const counted = text.select<SVGTSpanElement>('tspan.groups-count').node();
        try {
          chipWidth = counted?.getComputedTextLength() || width * 0.55;
        } catch {
          chipWidth = width * 0.55;
        }
      }
      chip
        .attr('x', f(left + icon - 3))
        .attr('y', f(baseline - size * 0.95))
        .attr('width', f(chipWidth + 6))
        .attr('height', f(size * 1.25))
        .attr('rx', 2);
    }
    widest = Math.max(widest, width + icon);
  });
  return { width: widest, rows: rows.length };
}

/**
 * Goals perimeter: each goal is a cloud of its agents held by a perimeter
 * whose arc is the goal's health. Resource-group diamonds sit at the centre,
 * status markers flag failed, blocked and degraded agents, ticks outside the
 * ring grow with the exception count, and lines join goals, agents and
 * external dependencies, red with a ⊘ where a connection is down.
 */
export function renderGoalsPerimeter(
  container: HTMLElement,
  options: RenderGoalsPerimeterOptions,
): GoalsPerimeterController | null {
  container.replaceChildren();
  const { model, layout, theme, themeMode = 'light', handlers: on = {} } = options;
  if (model.empty || options.width <= 0 || options.height <= 0) return null;

  const palette = perimeterPalette(themeMode);
  const instance = ++instanceCount;
  const goalById = new Map(model.goals.map((goal) => [goal.id, goal]));
  const agentById = new Map(model.agents.map((agent) => [agent.id, agent]));

  const svg: Svg = select(container)
    .append('svg')
    .attr('class', 'gp-svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('role', 'group')
    .attr('aria-label', model.title || 'Goals perimeter')
    .style('display', 'block')
    .style('font-family', theme.fontFamily);

  const defs = svg.append('defs');
  for (const [name, color] of [
    ['healthy', palette.glowHealthy],
    ['impure', palette.glowImpure],
  ] as const) {
    const gradient = defs.append('radialGradient').attr('id', `gp-glow-${name}-${instance}`);
    gradient.append('stop').attr('offset', '0%').attr('stop-color', color);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);
  }

  const board = svg.append('g').attr('class', 'gp-board');
  const world = board.append('g').attr('class', 'world');
  const boxLayer = world.append('g').attr('class', 'goal-boxes');
  const strandLayer = world.append('g').attr('class', 'strands');
  const agentLinkLayer = world.append('g').attr('class', 'agent-links');
  const fringeLayer = world.append('g').attr('class', 'fringe');
  const cloudLayer = world.append('g').attr('class', 'clouds');
  const externalLayer = world.append('g').attr('class', 'externals');
  const downLayer = world.append('g').attr('class', 'links-down');
  const markLayer = world.append('g').attr('class', 'marks');
  const labelLayer = world.append('g').attr('class', 'labels');

  let hovered: string | null = null;
  const setHover = (goalId: string | null) => {
    if (goalId === hovered) return;
    hovered = goalId;
    boxLayer.selectAll<SVGGElement, unknown>('g.goal').classed('is-hover', function () {
      return this.getAttribute('data-goal') === goalId;
    });
    labelLayer.selectAll<SVGGElement, unknown>('g.goal-label').classed('is-hover', function () {
      return this.getAttribute('data-goal') === goalId;
    });
  };
  const leave = () => {
    setHover(null);
    on.onLeave?.();
  };

  // Strands between goals.
  for (const connection of model.connections) {
    const s = layout.byId.get(connection.source);
    const t = layout.byId.get(connection.target);
    if (!s || !t) continue;
    for (const strand of connectionStrands(connection, s, t)) {
      const path = strandLayer
        .append('path')
        .attr('class', `strand ${strand.tone}`)
        .attr('d', `M${f(strand.x0)},${f(strand.y0)}Q${f(strand.cx)},${f(strand.cy)} ${f(strand.x1)},${f(strand.y1)}`);
      if (strand.tone === 'exception') path.style('stroke', palette.strandException);
      for (const [from, to] of strand.dashes) {
        strandLayer.append('path').attr('class', 'strand-dash').attr('d', dashPath(strand, from, to));
      }
    }
  }

  // Clouds, fringe and per-agent specks.
  const scale = particleScale(model.goals);
  const agentAt = new Map<string, Particle>();
  for (const goal of model.goals) {
    const p = layout.byId.get(goal.id);
    if (!p) continue;
    const fringe = goalFringe(goal, p);
    const fg = fringeLayer.append('g').attr('data-goal', goal.id);
    fg.append('path')
      .attr('class', 'fringe-links')
      .attr('d', fringe.links.map((l) => `M${f(l.x0)},${f(l.y0)}L${f(l.x1)},${f(l.y1)}`).join(''));
    fg.selectAll('circle')
      .data(fringe.nodes)
      .join('circle')
      .attr('cx', (n) => f(n.x))
      .attr('cy', (n) => f(n.y))
      .attr('r', (n) => f(n.size))
      .attr('fill', (n) => palette.fringe[n.tone]);

    const impureGlow =
      goal.status === 'critical' || goal.impure / Math.max(1, goal.agents.total) >= 0.1;
    const cg = cloudLayer.append('g').attr('class', 'cloud').attr('data-goal', goal.id);
    cg.append('circle')
      .attr('class', 'glow')
      .attr('cx', f(p.x))
      .attr('cy', f(p.y))
      .attr('r', f(p.r * 1.25))
      .attr('fill', `url(#gp-glow-${impureGlow ? 'impure' : 'healthy'}-${instance})`);
    const nodes = model.agents.filter((agent) => agent.goalId === goal.id);
    const specks = cloudParticles(goal, p, nodes, scale);
    for (const speck of specks) if (speck.agentId) agentAt.set(speck.agentId, speck);
    cg.selectAll<SVGRectElement, Particle>('rect')
      .data(specks)
      .join('rect')
      .attr('class', (s) => (s.agentId ? `speck agent ${s.tone}` : `speck ${s.tone}`))
      .attr('x', (s) => f(s.x - s.size / 2))
      .attr('y', (s) => f(s.y - s.size / 2))
      .attr('width', (s) => f(s.size))
      .attr('height', (s) => f(s.size))
      .attr('fill', (s) => palette.particles[s.tone][s.shade]!)
      .attr('fill-opacity', (s) => f(s.alpha));
    if (nodes.length) {
      const hover = (event: MouseEvent) => {
        const datum = select<Element, Particle | undefined>(event.target as Element).datum();
        const agent = datum?.agentId ? agentById.get(datum.agentId) : undefined;
        if (!agent) return;
        setHover(goal.id);
        on.onAgentHover?.(goal, agent, event);
      };
      cg.on('pointerover', hover).on('pointermove', hover).on('pointerout', leave);
    }
  }

  // Agent-to-agent lines, drawn between the specks that stand for them.
  const perGoal = new Map<string, number>();
  for (const link of model.agentLinks) {
    const a = agentAt.get(link.source);
    const b = agentAt.get(link.target);
    const drawn = perGoal.get(link.goalId) ?? 0;
    if (!a || !b || drawn >= MAX_AGENT_LINKS) continue;
    perGoal.set(link.goalId, drawn + 1);
    agentLinkLayer
      .append('line')
      .attr('class', `agent-link ${link.status}`)
      .attr('x1', f(a.x))
      .attr('y1', f(a.y))
      .attr('x2', f(b.x))
      .attr('y2', f(b.y));
  }

  // External dependencies beside their goal.
  for (const dependency of model.externals) {
    const p = layout.byId.get(dependency.goalId);
    const at = layout.externals.get(dependency.id);
    if (!p || !at) continue;
    const d = Math.max(1, Math.hypot(at.x - p.x, at.y - p.y));
    const ux = (at.x - p.x) / d;
    const uy = (at.y - p.y) / d;
    externalLayer
      .append('line')
      .attr('class', `ext-line ${dependency.status}`)
      .attr('x1', f(p.x + ux * p.r))
      .attr('y1', f(p.y + uy * p.r))
      .attr('x2', f(at.x - ux * 7))
      .attr('y2', f(at.y - uy * 7));
    const hover = (event: Pointer) => {
      setHover(null);
      on.onExternalHover?.(dependency, event);
    };
    const node = externalLayer
      .append('g')
      .attr('class', `ext-node ${dependency.status}`)
      .attr('data-external', dependency.id)
      .attr('transform', `translate(${f(at.x)} ${f(at.y)})`)
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', `${dependency.label}, external dependency of ${goalById.get(dependency.goalId)?.name ?? ''}${dependency.status === 'unavailable' ? ', unavailable' : ''}`)
      .on('pointerenter', hover)
      .on('pointermove', hover)
      .on('pointerleave', leave)
      .on('focus', hover)
      .on('blur', leave);
    node.append('circle').attr('class', 'hit').attr('r', 12);
    if (dependency.status === 'unavailable') appendBlockedGlyph(node, 7);
    else node.append('circle').attr('class', 'ext-dot').attr('r', 6);
  }

  // Goal-to-goal connections that are down.
  for (const connection of model.connections) {
    if (connection.status !== 'unavailable') continue;
    const s = layout.byId.get(connection.source);
    const t = layout.byId.get(connection.target);
    if (!s || !t) continue;
    const line = unavailableLine(s, t);
    const hover = (event: Pointer) => {
      setHover(null);
      on.onConnectionHover?.(connection, event);
    };
    const g = downLayer.append('g').attr('class', 'link-down').attr('data-connection', connection.id);
    g.append('path').attr('class', 'link-line').attr('d', line.d);
    const mark = g
      .append('g')
      .attr('class', 'link-mark')
      .attr('transform', `translate(${line.mid.x} ${line.mid.y})`)
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', `Connection unavailable${connection.reason ? `: ${connection.reason}` : ''}`)
      .on('pointerenter', hover)
      .on('pointermove', hover)
      .on('pointerleave', leave)
      .on('focus', hover)
      .on('blur', leave);
    appendBlockedGlyph(mark, 12);
  }

  // Perimeters, ticks, resource groups and status markers.
  for (const goal of model.goals) {
    const p = layout.byId.get(goal.id);
    if (!p) continue;
    const g = markLayer.append('g').attr('class', 'goal-marks').attr('data-goal', goal.id);
    g.append('path').attr('class', `ring ${goal.status}`).attr('d', arcPath(p.x, p.y, p.r, goal.health));
    const ticks = tickSegments(p, exceptionTickCount(goal.impure));
    if (ticks.length) {
      g.append('g')
        .attr('class', 'ticks')
        .selectAll('line')
        .data(ticks)
        .join('line')
        .attr('x1', (t) => t.x1)
        .attr('y1', (t) => t.y1)
        .attr('x2', (t) => t.x2)
        .attr('y2', (t) => t.y2);
    }

    const slots = diamondSlots(p, goal.resourceGroups.length);
    slots.forEach((slot, i) => {
      const group = goal.resourceGroups[i]!;
      const hover = (event: Pointer) => {
        setHover(goal.id);
        on.onGroupHover?.(goal, group, event);
      };
      const open = () => on.onOpen?.(goal, group);
      const rg = g
        .append('g')
        .attr('class', `rg ${group.state}`)
        .attr('data-group', group.id)
        .attr('transform', `translate(${slot.x} ${slot.y})`)
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', `${group.name}, ${group.state}. Open ${goal.name}.`)
        .on('pointerenter', hover)
        .on('pointermove', hover)
        .on('pointerleave', leave)
        .on('focus', hover)
        .on('blur', leave)
        .on('click', open)
        .on('keydown', activate(open));
      rg.append('path').attr('class', 'rg-base').attr('d', diamondPath(slot.e));
      rg.append('path').attr('class', 'rg-shape').attr('d', diamondPath(slot.e));
      appendResourceGlyph(rg, group.icon, slot.e);
    });
    const extra = goal.resourceGroups.length - MAX_DIAMONDS;
    if (extra > 0 && slots.length) {
      g.append('text')
        .attr('class', 'rg-more')
        .attr('x', f(slots[slots.length - 1]!.x + slots[0]!.e * 1.6))
        .attr('y', f(p.y))
        .attr('dy', '0.35em')
        .text(`+${extra}`);
    }

    const size = Math.max(4.5, p.r * 0.05);
    for (const spot of markerSpots(goal, p)) {
      const exception = goal.exceptions[spot.exception]!;
      const hover = (event: Pointer) => {
        setHover(goal.id);
        on.onMarkerHover?.(goal, exception, event);
      };
      const marker = g
        .append('g')
        .attr('class', `marker ${spot.state}`)
        .attr('transform', `translate(${spot.x} ${spot.y})`)
        .attr('tabindex', 0)
        .attr('role', 'img')
        .attr(
          'aria-label',
          `${exception.count} ${spot.state} in ${goal.name}${exception.reason ? `: ${exception.reason}` : ''}`,
        )
        .on('pointerenter', hover)
        .on('pointermove', hover)
        .on('pointerleave', leave)
        .on('focus', hover)
        .on('blur', leave)
        .on('click', () => on.onOpen?.(goal));
      marker.append('circle').attr('class', 'hit').attr('r', f(size + 5));
      if (spot.state === 'failed') appendFailedGlyph(marker, size);
      else if (spot.state === 'blocked') appendBlockedGlyph(marker, size);
      else appendDegradedGlyph(marker, size);
    }
  }

  // Goal boxes: the hover box and the click target behind each goal.
  for (const goal of model.goals) {
    const hover = (event: Pointer) => {
      setHover(goal.id);
      on.onGoalHover?.(goal, event);
    };
    const open = () => on.onOpen?.(goal);
    boxLayer
      .append('g')
      .attr('class', `goal ${goal.status}`)
      .attr('data-goal', goal.id)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', goalAriaLabel(goal))
      .on('pointerenter', hover)
      .on('pointermove', hover)
      .on('pointerleave', leave)
      .on('focus', hover)
      .on('blur', leave)
      .on('click', open)
      .on('keydown', activate(open))
      .append('rect')
      .attr('class', 'goal-box');
  }

  let current: FitTransform = { k: 1, tx: 0, ty: 0 };
  let size = { width: options.width, height: options.height };
  let focused: { goalId: string; groupId?: string } | null = null;
  let frame = 0;
  const detailRoot = svg.append('g').attr('class', 'gp-detail-root').style('display', 'none');

  const setWorld = (t: FitTransform) =>
    world.attr('transform', `translate(${f(t.tx)} ${f(t.ty)}) scale(${t.k.toFixed(4)})`);

  /** The board transform that puts the goal's ring where the detail draws it. */
  const zoomFor = (goalId: string): FitTransform => {
    const p = layout.byId.get(goalId);
    if (!p) return current;
    const geo = detailGeometry(size.width, size.height);
    const k = geo.r / p.r;
    return { k, tx: geo.cx - p.x * k, ty: geo.cy - p.y * k };
  };

  const buildDetail = () => {
    detailRoot.selectAll('*').remove();
    const goal = focused ? goalById.get(focused.goalId) : undefined;
    if (!goal) return;
    const impureGlow = goal.status === 'critical' || goal.impure / Math.max(1, goal.agents.total) >= 0.1;
    drawGoalDetail(detailRoot, {
      model,
      layout,
      goal,
      width: size.width,
      height: size.height,
      themeMode,
      glowId: `gp-glow-${impureGlow ? 'impure' : 'healthy'}-${instance}`,
      groupId: focused?.groupId,
      handlers: on,
    });
  };

  const reducedMotion = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** rAF tween with an ease-in-out; `step` gets 0–1. A new tween cancels the last. */
  const tween = (animate: boolean, step: (t: number) => void, done: () => void) => {
    cancelAnimationFrame(frame);
    if (!animate || reducedMotion()) {
      step(1);
      done();
      return;
    }
    const start = performance.now();
    // performance.now(), not the frame timestamp: some hosts stamp frames on another clock.
    const tick = () => {
      const raw = Math.min(1, Math.max(0, (performance.now() - start) / FOCUS_MS));
      step(raw < 0.5 ? 4 * raw ** 3 : 1 - (-2 * raw + 2) ** 3 / 2);
      if (raw < 1) frame = requestAnimationFrame(tick);
      else done();
    };
    frame = requestAnimationFrame(tick);
  };

  const lerp = (a: FitTransform, b: FitTransform, t: number): FitTransform => ({
    k: a.k + (b.k - a.k) * t,
    tx: a.tx + (b.tx - a.tx) * t,
    ty: a.ty + (b.ty - a.ty) * t,
  });
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const scaleDetail = (s: number) => {
    const geo = detailGeometry(size.width, size.height);
    detailRoot.attr(
      'transform',
      `translate(${f(geo.cx)} ${f(geo.cy)}) scale(${s.toFixed(4)}) translate(${f(-geo.cx)} ${f(-geo.cy)})`,
    );
  };

  const focus: GoalsPerimeterController['focus'] = (goalId, focusOptions = {}) => {
    const animate = focusOptions.animate ?? true;
    if (goalId === null || !goalById.has(goalId)) {
      if (!focused) return;
      const from = zoomFor(focused.goalId);
      focused = null;
      board.style('display', null).style('pointer-events', 'none');
      detailRoot.style('pointer-events', 'none');
      tween(
        animate,
        (t) => {
          setWorld(lerp(from, current, t));
          board.style('opacity', clamp01((t - 0.2) / 0.8));
          detailRoot.style('opacity', 1 - clamp01(t / 0.5));
          scaleDetail(1 - 0.08 * t);
        },
        () => {
          detailRoot.selectAll('*').remove();
          detailRoot.style('display', 'none').style('opacity', null).attr('transform', null);
          board.style('opacity', null).style('pointer-events', null);
          setWorld(current);
        },
      );
      return;
    }

    const switching = focused !== null;
    focused = { goalId, groupId: focusOptions.groupId };
    setHover(null);
    buildDetail();
    detailRoot.style('display', null).style('pointer-events', 'none');
    if (switching) {
      // Goal to goal inside the detail: no zoom, the new goal fades in.
      tween(
        animate,
        (t) => detailRoot.style('opacity', t),
        () => detailRoot.style('opacity', null).style('pointer-events', null),
      );
      return;
    }
    const to = zoomFor(goalId);
    board.style('pointer-events', 'none');
    tween(
      animate,
      (t) => {
        setWorld(lerp(current, to, t));
        board.style('opacity', 1 - clamp01((t - 0.3) / 0.7));
        detailRoot.style('opacity', clamp01((t - 0.5) / 0.5));
        scaleDetail(0.9 + 0.1 * t);
      },
      () => {
        board.style('display', 'none');
        detailRoot.style('opacity', null).style('pointer-events', null).attr('transform', null);
      },
    );
  };

  /** Fits the world to the viewport, then lays the label blocks and the boxes out at that scale. */
  const applyFit = (width: number, height: number) => {
    size = { width, height };
    current = fitBoard(layout.bounds, width, height);
    const { k } = current;
    setWorld(current);
    const fs = labelScale(k);
    const compact = k < COMPACT_SCALE;
    labelLayer.selectAll('*').remove();
    for (const goal of model.goals) {
      const p = layout.byId.get(goal.id);
      if (!p) continue;
      const ringHalf = p.r + RING_PAD + 40;
      const top = p.y + p.r + LABEL_GAP;
      const label = labelLayer
        .append('g')
        .attr('class', 'goal-label')
        .classed('is-hover', hovered === goal.id)
        .attr('data-goal', goal.id)
        .attr('aria-hidden', 'true')
        .attr('transform', `translate(${f(p.x)} ${f(top)}) scale(${(fs / k).toFixed(4)})`);
      const { width: labelWidth, rows } = drawLabel(label, goal, compact, (ringHalf * 2 * k) / fs - 8);
      const half = compact ? ringHalf : Math.max(ringHalf, ((labelWidth * fs) / k) / 2 + 12 / k);
      const bottom = top + (rows * LABEL_LINE * fs + 10) / k;
      boxLayer
        .select<SVGGElement>(`g.goal[data-goal="${goal.id}"]`)
        .select('rect')
        .attr('x', f(p.x - half))
        .attr('y', f(p.y - p.r - RING_PAD))
        .attr('width', f(half * 2))
        .attr('height', f(bottom - (p.y - p.r - RING_PAD)));
    }
  };

  applyFit(options.width, options.height);

  return {
    resize: (width, height) => {
      if (width <= 0 || height <= 0) return;
      applyFit(width, height);
      if (focused) {
        setWorld(zoomFor(focused.goalId));
        buildDetail();
      }
    },
    fit: () => current,
    focus,
    focused: () => focused?.goalId ?? null,
  };
}
