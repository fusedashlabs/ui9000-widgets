import { select } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import {
  buildAgentField,
  CALLOUT,
  calloutWidth,
  camPose,
  COMPACT_ABOVE,
  fitScene,
  formatCount,
  ringArc,
  ringTicks,
  sceneView,
  tickStep,
  TINY_ABOVE,
  zoomCamera,
  type Frame,
  type HoldState,
  type PerimeterGoal,
  type SceneGoal,
  type StageCamera,
} from '../../goals-perimeter/lib/index.js';
import {
  calloutMarkup,
  createPainter,
  EXCEPTIONS,
  goalShown,
  healthShown,
  scenePalette,
  type Painter,
  type ScenePalette,
} from '../../goals-perimeter/render/index.js';
import {
  dependencyRank,
  formatAssets,
  formatShort,
  goalRows,
  MARK,
  placeColumns,
  RESOURCE_GAP,
  resourceRows,
  ribbonLanes,
  ribbonPath,
  ribbonWidth,
  runSeconds,
  type BipartiteGraphModel,
  type BipartiteResource,
  type Dependency,
  type ResourceStanding,
} from '../lib/index.js';

type Pointer = MouseEvent | FocusEvent;

/** Callbacks for the element: tooltips and the camera reading live there. */
export interface BipartiteGraphHandlers {
  onGoalHover?: (goal: PerimeterGoal, event: Pointer) => void;
  onResourceHover?: (resource: BipartiteResource, event: Pointer) => void;
  onDependencyHover?: (dependency: Dependency, event: Pointer) => void;
  onLeave?: () => void;
  /** Where the map has been panned and zoomed to, so a redraw keeps it. */
  onCamera?: (camera: StageCamera) => void;
  /** Whether labels have folded their readouts away (the map is drawn under ~90% of its design size). */
  onCompact?: (compact: boolean) => void;
}

export interface RenderBipartiteGraphOptions {
  model: BipartiteGraphModel;
  width: number;
  height: number;
  theme: WidgetTheme;
  handlers?: BipartiteGraphHandlers;
  /** Where the agent picture is drawn: a layer behind the plot that may reach past it (the whole shell). */
  sceneLayer?: HTMLElement | null;
  /** Plot px kept clear at the left of the map window, for the legend button. */
  rail?: number;
  /** The scene's colours, from the page style's palettes. Defaults to the default style's. */
  palette?: ScenePalette;
  /** The pan and zoom to start from: kept by the element across redraws. */
  camera?: StageCamera;
  /** Only what is held stands out: the agents at work all but go out, and whatever has nothing held steps back. */
  problemsOnly?: boolean;
  /** Off: no intro, no lights along the ribbons, the picture painted only when something changes. Defaults to the reader's preference. */
  motion?: boolean;
}

export interface BipartiteGraphController {
  /** Re-fits the map to a new plot size. */
  resize: (width: number, height: number) => void;
  setProblemsOnly: (on: boolean) => void;
  /** Zooms about the view's centre, easing there. */
  zoomBy: (factor: number) => void;
  /** Back to 100%, centred. */
  resetCamera: () => void;
  camera: () => StageCamera;
  compact: () => boolean;
  /** Stops every loop and listener, and lets go of the picture's GPU memory. */
  destroy: () => void;
}

/** The map is a flat plan: the camera never turns it, only pans and zooms. */
export const FLAT_CAMERA: StageCamera = { yaw: 0, pitch: 0, zoom: 1, panX: 0, panY: 0 };

/** Gap between the legend button and the map window. */
export const RAIL = 56;

/** How long the agents take to gather on load. */
const INTRO_MS = 2600;
/** The scene comes up in order: agents gather, the goals' rings and the groups follow, then the ribbons and the labels (ms). */
const ENTER = { goal: 350, resource: 500, ribbon: 900, label: 1000, step: 80 } as const;

/** How quickly the view catches up with where it was panned or zoomed to: the time to close ~63% of the gap. */
const EASE_ZOOM_MS = 110;
const EASE_PAN_MS = 90;
/** How quickly a goal's agents brighten or step back when something is pointed at. */
const EASE_ALPHA_MS = 120;

/** Pointer travel before a press counts as a drag. */
const SLOP = 2;
/** Wheel travel to zoom: a notch is about a hundred units; a pinch arrives as small ones with ctrl held. */
const PER_UNIT = 0.0009;
const PER_PINCH_UNIT = 0.011;
const MOST = 80;
const CATCH_UP = 0.26;

/** The most backing-store pixels the agent canvas may hold. */
const MAX_PIXELS = 9e6;
/** The goals are drawn smaller than on the perimeter: a finer dot keeps their agents apart, and the colours part less. */
const GRAIN = 0.56;
const ABERRATION = 0.4;

/** Something only pointed at leaves the rest readable. */
const ASIDE = 0.5;

/** A held agent's colour, the same in its cloud, on the ribbon that holds it and on its group's diamond. */
const HOLD_COLOR: Record<HoldState, string> = {
  awaiting: 'var(--gp-awaiting)',
  blocked: 'var(--gp-blocked)',
  failed: 'var(--gp-failed)',
};

const HOLD_WORD: Record<HoldState, string> = { awaiting: 'Holding', blocked: 'Blocked', failed: 'Failed' };

let instanceCount = 0;

const f1 = (n: number) => n.toFixed(1);
const diamondD = (x: number, y: number, d: number) =>
  `M${f1(x)} ${f1(y - d)}L${f1(x + d)} ${f1(y)}L${f1(x)} ${f1(y + d)}L${f1(x - d)} ${f1(y)}Z`;
const esc = (text: string) => text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A ribbon or a diamond's colour: what holds agents there, amber where traffic is only slowed, else the scene's ink. */
const toneOf = (d: Pick<Dependency, 'hold' | 'health'>) =>
  d.hold ? HOLD_COLOR[d.hold] : d.health === 'degraded' ? 'var(--gp-warn)' : 'var(--gp-line)';

/** The status beside a group's name, and its dot. */
const statusOf = (s: ResourceStanding) =>
  s.hold
    ? { word: HOLD_WORD[s.hold], color: HOLD_COLOR[s.hold] }
    : s.health === 'degraded'
      ? { word: 'Slowed', color: 'var(--gp-warn)' }
      : { word: 'Flows', color: 'var(--gp-ok)' };

/** The corner of the map window: which of the fleet's groups these are. */
export function cornerCaption(model: Pick<BipartiteGraphModel, 'resources' | 'resourceTotal'>): string {
  const n = model.resources.length;
  const groups = `resource ${model.resourceTotal === 1 ? 'group' : 'groups'}`;
  const of = model.resourceTotal > n ? `${formatCount(n)} of ${formatCount(model.resourceTotal)} ${groups}` : `${formatCount(n)} ${groups}`;
  return `${of} — the ${n === 1 ? 'one' : 'ones'} these goals draw on`;
}

/**
 * Bipartite graph, after the Agent operations design's bipartite layout: the
 * goals perimeter's goals — the same clouds of agents, one dot an agent,
 * drawn by the same painter — lined up on the left against the resource
 * groups they draw on, on the right. A ribbon joins a goal to each of its
 * groups: the wider, the more calls a minute it makes there; in the colour of
 * the agents held there, amber where traffic is only slowed. Light running
 * along a ribbon is those calls.
 *
 * Pointing at a goal or a group lights what it is tied to. A flat plan:
 * dragging pans, scrolling zooms, a double-click resets.
 */
export function renderBipartiteGraph(container: HTMLElement, options: RenderBipartiteGraphOptions): BipartiteGraphController | null {
  container.replaceChildren();
  const { model, theme, handlers: on = {} } = options;
  if (model.empty || options.width <= 0 || options.height <= 0) return null;

  const instance = ++instanceCount;
  const motion = options.motion ?? !reducedMotion();
  const rail = options.rail ?? RAIL;
  let size = { width: options.width, height: options.height };
  let problemsOnly = options.problemsOnly ?? false;
  let target: StageCamera = { ...FLAT_CAMERA, zoom: options.camera?.zoom ?? 1, panX: options.camera?.panX ?? 0, panY: options.camera?.panY ?? 0 };
  let eased: StageCamera = { ...target };
  let hovered: string | null = null;
  let pointed: string | null = null;
  let over: string | null = null;
  let compact = false;
  let tiny = false;
  let destroyed = false;

  // ── the columns ──
  const rows = goalRows(model.goals);
  const goals: SceneGoal[] = model.goals.map((goal, i) => ({ id: goal.id, goal, x: 0, y: rows[i]!.y, z: 0, r: rows[i]!.r }));
  const resourceY = resourceRows(model.resources);
  const goalIndex = new Map(model.goals.map((g, i) => [g.id, i]));
  const resourceIndex = new Map(model.resources.map((r, i) => [r.key, i]));
  const largest = Math.max(...goals.map((g) => g.r));
  const busiest = Math.max(1, ...model.dependencies.map((d) => d.calls));
  const lanes = ribbonLanes(model.dependencies, goalIndex, resourceIndex);
  // ribbons are drawn in one fixed order, those that hold agents over the rest: a ribbon re-inserted under the pointer would lose it
  const drawOrder = model.dependencies
    .map((d, i) => ({ d, i }))
    .sort((a, b) => dependencyRank(a.d) - dependencyRank(b.d) || a.d.held - b.d.held);
  const field = buildAgentField(goals);

  // ── DOM ──
  const stage = document.createElement('div');
  stage.className = 'gp-stage bp-stage';
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', model.title || 'Bipartite graph');
  stage.style.fontFamily = theme.fontFamily;
  container.append(stage);

  const sceneHost = options.sceneLayer ?? stage;
  const fieldHost = document.createElement('div');
  fieldHost.className = 'gp-field';
  sceneHost.append(fieldHost);

  const svg = select(stage)
    .append('svg')
    .attr('class', 'gp-overlay')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('aria-hidden', 'true');
  const glassId = `bp-glass-${instance}`;
  const glass = svg.append('defs').append('radialGradient').attr('id', glassId).attr('fx', 0.44).attr('fy', 0.58);
  glass.append('stop').attr('offset', 0.58).attr('stop-color', 'white').attr('stop-opacity', 0);
  glass.append('stop').attr('offset', 0.9).attr('stop-color', 'white').attr('stop-opacity', 0.03);
  glass.append('stop').attr('offset', 1).attr('stop-color', 'white').attr('stop-opacity', 0.085);
  const ribbonLayer = svg.append('g').attr('class', 'bp-ribbons gp-appear').style('animation-delay', `${ENTER.ribbon}ms`);
  const markLayer = svg.append('g').attr('class', 'gp-marks');
  const resourceLayer = svg.append('g').attr('class', 'bp-resources');
  const leaderLayer = svg.append('g').attr('class', 'gp-leaders');
  const labels = select(stage).append('div').attr('class', 'gp-labels');

  // the map window, framed like a viewfinder; the corner says which of the fleet's groups these are
  const frameEl = document.createElement('div');
  frameEl.className = 'gp-frame';
  frameEl.setAttribute('aria-hidden', 'true');
  frameEl.innerHTML = `<span class="gp-crop tl"></span><span class="gp-crop tr"></span><span class="gp-crop bl"></span><span class="gp-crop br"></span><span class="bp-corner">${esc(cornerCaption(model))}</span>`;
  stage.append(frameEl);

  // ── the map window and the picture's place ──
  const mapFrame = (): Frame => ({ x0: Math.min(rail, size.width * 0.2), y0: 0, x1: size.width, y1: size.height });
  /** Where the picture's canvas sits, in plot px: over its layer, which may reach past the plot. */
  const fieldRect = () => {
    if (sceneHost === stage) return { left: 0, top: 0, width: size.width, height: size.height };
    const host = fieldHost.getBoundingClientRect();
    const plot = stage.getBoundingClientRect();
    if (!host.width || !host.height) return { left: 0, top: 0, width: size.width, height: size.height };
    // an ancestor's transform (the docs page's zoom) scales what the rects measure, not the plot's own px
    const k = stage.offsetWidth ? plot.width / stage.offsetWidth : 1;
    return { left: (host.left - plot.left) / k, top: (host.top - plot.top) / k, width: host.width / k, height: host.height / k };
  };

  // ── the picture ──
  let painter: Painter | null = null;
  let paintedFor = '';
  let started = 0;
  const freshCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.className = 'gp-field-canvas';
    fieldHost.append(canvas);
    return canvas;
  };
  try {
    painter = createPainter(freshCanvas, field, options.palette ?? scenePalette('default'), { links: 0, slots: 0 });
  } catch {
    painter = null;
  }
  const fitPainter = (rect: { width: number; height: number }) => {
    if (!painter) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = rect.width * dpr;
    const height = rect.height * dpr;
    const within = Math.min(1, Math.sqrt(MAX_PIXELS / Math.max(1, width * height)));
    // in steps, so a hair's difference in the arithmetic never re-makes it
    const w = Math.max(8, Math.round((width * within) / 8) * 8);
    const h = Math.max(8, Math.round((height * within) / 8) * 8);
    if (`${w}x${h}` === paintedFor) return;
    paintedFor = `${w}x${h}`;
    painter.resize(w, h);
  };

  // ── what is lit ──
  /** The ribbons of the goal or the group under the pointer, and what they join. */
  const lighting = () => {
    const edges = new Set<string>();
    const goalsLit = new Set<string>();
    const resourcesLit = new Set<string>();
    for (const d of model.dependencies) {
      if (d.goal.id !== hovered && d.resource.key !== pointed) continue;
      edges.add(d.key);
      goalsLit.add(d.goal.id);
      resourcesLit.add(d.resource.key);
    }
    if (hovered) goalsLit.add(hovered);
    if (pointed) resourcesLit.add(pointed);
    return { edges, goals: goalsLit, resources: resourcesLit, active: goalsLit.size + resourcesLit.size > 0 };
  };
  type Lighting = ReturnType<typeof lighting>;
  const goalDim = (goal: PerimeterGoal, lit: Lighting) => (!lit.active || lit.goals.has(goal.id) ? 1 : ASIDE) * goalShown(goal, problemsOnly);
  const resourceDim = (resource: BipartiteResource, lit: Lighting) =>
    (!lit.active || lit.resources.has(resource.key) ? 1 : ASIDE) *
    (pointed === resource.key ? 1 : healthShown(model.standing.get(resource.key)!.health, problemsOnly));

  /** Each goal's agents as bright as its instruments, easing there. */
  const goalAlpha = new Map(model.goals.map((g) => [g.id, goalShown(g, problemsOnly)]));
  const easeAlpha = (dt: number) => {
    const lit = lighting();
    const k = motion ? 1 - Math.exp(-dt / EASE_ALPHA_MS) : 1;
    let moving = false;
    for (const goal of model.goals) {
      const now = goalAlpha.get(goal.id)!;
      const to = goalDim(goal, lit);
      const next = Math.abs(to - now) < 0.004 ? to : now + (to - now) * k;
      if (next !== now) moving = true;
      goalAlpha.set(goal.id, next);
    }
    return moving;
  };

  // ── one frame of the map ──
  const drawFrame = (now: number, overlay: boolean) => {
    if (destroyed) return;
    const frame = mapFrame();
    const fit = fitScene(size, frame);
    const view = sceneView(fit, eased);
    const u = view.unit;
    const nextCompact = u > COMPACT_ABOVE;
    if (nextCompact !== compact) {
      compact = nextCompact;
      on.onCompact?.(compact);
    }
    // drawn under ~45% of its design size the labels no longer fit beside the columns: they fold away, and the tips tell all
    tiny = u > TINY_ABOVE;
    // the columns are set for the plot, not for the zoom: zooming in must not slide them
    const at = placeColumns(1 / fit.scale, largest, tiny ? 0 : Math.max(...model.goals.map((g) => calloutWidth(g, compact))));
    // the painter draws each goal's agents where the column stands
    for (const g of goals) g.x = at.goals;

    if (painter) {
      const rect = fieldRect();
      fitPainter(rect);
      if (!started) started = now;
      const settle = motion ? Math.min(1, (now - started) / INTRO_MS) : 1;
      try {
        painter.paint({
          pose: camPose('2D', eased),
          unit: u,
          healthy: problemsOnly ? EXCEPTIONS.healthy : 1,
          goalAlpha: (id) => goalAlpha.get(id) ?? 1,
          links: [],
          orbit: 0,
          flat: true,
          slots: [],
          focus: hovered,
          region: { x: view.fromX(rect.left), y: view.fromY(rect.top), w: rect.width * u, h: rect.height * u },
          zoom: eased.zoom,
          time: motion ? (now - started) / 1000 : null,
          intro: 1 - Math.pow(1 - settle, 3),
          grain: GRAIN,
          aberration: ABERRATION,
        });
      } catch {
        // a lost or broken context: the instruments still draw
      }
    }

    if (!overlay) return;
    stage.toggleAttribute('data-compact', compact);
    stage.toggleAttribute('data-tiny', tiny);

    const lit = lighting();
    const placed = goals.map((g, index) => ({ g, index, x: view.toX(g.x), y: view.toY(g.y), R: g.r * view.scale }));
    const placedAt = new Map(placed.map((p) => [p.g.id, p]));
    const resources = model.resources.map((resource, index) => ({
      resource,
      index,
      x: view.toX(at.resources),
      y: view.toY(resourceY[index]!),
      standing: model.standing.get(resource.key)!,
    }));
    const resourceAt = new Map(resources.map((r) => [r.resource.key, r]));

    const ribbons = drawOrder.map(({ d, i }) => {
      const g = placedAt.get(d.goal.id)!;
      const r = resourceAt.get(d.resource.key)!;
      const lane = lanes[i]!;
      // ribbons leave a goal spread down its side, and meet at the group's diamond
      const x0 = g.x + g.R + MARK.clear;
      const y0 = g.y + lane.goal * Math.min(9, (g.R * 1.3) / lane.of);
      const x1 = r.x - (MARK.diamond + 6);
      const y1 = r.y + lane.resource * 3;
      const isLit = over === d.key || lit.edges.has(d.key);
      return {
        d,
        i,
        path: ribbonPath(x0, y0, x1, y1),
        lit: isLit,
        emphasis: (!lit.active || isLit ? 1 : ASIDE) * healthShown(d.health, problemsOnly),
        width: ribbonWidth(d.calls, busiest),
      };
    });

    // every goal's label hangs on one spine, left of the column, with a level leader from the goal's ring
    const spine = view.toX(at.goals) - largest * view.scale - MARK.spine;
    const height = compact ? CALLOUT.compactHeight : CALLOUT.height;
    const callouts = placed.map((p) => {
      const y0 = p.y - CALLOUT.head / 2;
      const x1 = spine - CALLOUT.pad;
      const ax = p.x - p.R - MARK.clear;
      return { p, ax, ay: p.y, hx: spine, rect: { x0: x1 - calloutWidth(p.g.goal, compact), x1, y0, y1: y0 + height } };
    });

    drawRibbons(ribbons);
    drawGoals(placed, lit);
    drawResources(resources, lit);
    drawCallouts(callouts, lit);
    drawResourceLabels(resources, lit);
  };

  // ── drawing ──
  type Ribbon = { d: Dependency; i: number; path: string; lit: boolean; emphasis: number; width: number };
  const drawRibbons = (ribbons: Ribbon[]) => {
    ribbonLayer
      .selectAll<SVGGElement, Ribbon>('g.bp-ribbon')
      .data(ribbons, (r) => r.d.key)
      .join((enter) => {
        const g = enter
          .append('g')
          .attr('class', 'bp-ribbon')
          .attr('data-dependency', (r) => r.d.key);
        g.append('path').attr('class', 'bp-ribbon-hit');
        g.append('path').attr('class', 'bp-ribbon-band');
        g.append('path').attr('class', 'bp-ribbon-line');
        // light along the ribbon is the goal's calls to the group: the more a minute, the quicker it runs
        if (motion)
          g.append('path')
            .attr('class', 'bp-ribbon-run')
            .attr('pathLength', 1)
            .style('animation-duration', (r) => `${runSeconds(r.d.calls).toFixed(2)}s`)
            .style('animation-delay', (r) => `${(-((r.i * 0.37) % 1) * runSeconds(r.d.calls)).toFixed(2)}s`);
        g.on('mouseenter', (event: MouseEvent, r) => {
          setOver(r.d.key);
          on.onDependencyHover?.(r.d, event);
        }).on('mouseleave', () => {
          setOver(null);
          on.onLeave?.();
        });
        return g;
      })
      .each(function (r) {
        const g = select(this).attr('opacity', r.emphasis).classed('is-held', !!r.d.hold);
        const color = toneOf(r.d);
        const band = r.d.hold ? (r.lit ? 0.24 : 0.15) : r.d.health === 'degraded' ? (r.lit ? 0.18 : 0.1) : r.lit ? 0.14 : 0.07;
        const line = r.d.hold ? (r.lit ? 1 : 0.78) : r.d.health === 'degraded' ? (r.lit ? 0.9 : 0.55) : r.lit ? 0.7 : 0.3;
        g.select('.bp-ribbon-hit').attr('d', r.path).attr('stroke-width', Math.max(12, r.width + 6));
        // the band is as wide as the calls; the line down its middle says how the goal fares there
        g.select('.bp-ribbon-band').attr('d', r.path).attr('stroke', color).attr('stroke-width', f1(r.width)).attr('opacity', band);
        g.select('.bp-ribbon-line').attr('d', r.path).attr('stroke', color).attr('opacity', line);
        g.select('.bp-ribbon-run')
          .attr('d', r.path)
          .attr('stroke', r.d.hold ? color : 'var(--bp-traffic)')
          .attr('stroke-width', r.lit ? 2 : 1.6)
          .attr('opacity', r.d.hold || r.lit ? 1 : 0.8)
          .style('--bp-glow', r.d.hold ? color : 'var(--bp-traffic-glow)');
      });
  };

  type Placed = { g: SceneGoal; index: number; x: number; y: number; R: number };
  /** A goal's instruments, as on the perimeter but close in: the progress ring with its scale, and corner brackets under the pointer. The cloud is the painter's. */
  const drawGoals = (placed: Placed[], lit: Lighting) => {
    markLayer
      .selectAll<SVGGElement, Placed>('g.gp-goal')
      .data(placed, (p) => p.g.id)
      .join((enter) => {
        const outer = enter.append('g').attr('class', 'gp-goal').attr('data-goal', (p) => p.g.id);
        const g = outer
          .append('g')
          .attr('class', 'gp-goal-mark gp-appear')
          .style('animation-delay', (p) => `${ENTER.goal + p.index * ENTER.step}ms`);
        g.append('circle').attr('class', 'gp-hit');
        g.append('circle').attr('class', 'gp-glass').attr('fill', `url(#${glassId})`);
        g.append('path').attr('class', 'gp-ticks on');
        g.append('path').attr('class', 'gp-ticks off');
        g.append('path').attr('class', 'gp-rest');
        g.append('path')
          .attr('class', 'gp-progress gp-draw')
          .attr('pathLength', 1)
          .style('animation-delay', (p) => `${ENTER.goal + p.index * ENTER.step + 150}ms`);
        g.append('path').attr('class', 'gp-needle');
        g.append('path').attr('class', 'gp-brackets');
        g.on('mouseenter', (event: MouseEvent, p) => {
          setHover(p.g.id);
          on.onGoalHover?.(p.g.goal, event);
        }).on('mouseleave', () => {
          setHover(null);
          on.onLeave?.();
        });
        return outer;
      })
      .each(function (p) {
        const { x, y, R } = p;
        const isLit = hovered === p.g.id;
        const progress = p.g.goal.health;
        const outer = select(this).attr('opacity', Math.max(0.3, goalDim(p.g.goal, lit)));
        const mark = outer.select('.gp-goal-mark').classed('is-lit', isLit);
        const ring = R + MARK.ring;
        const scale = R + MARK.scale;
        const step = tickStep(Math.PI * 2 * scale);
        mark.select('.gp-hit').attr('cx', f1(x)).attr('cy', f1(y)).attr('r', f1(R + 14));
        mark.select('.gp-glass').attr('cx', f1(x)).attr('cy', f1(y)).attr('r', f1(ring));
        mark.select('.gp-ticks.on').attr('d', ringTicks(x, y, scale, MARK.minor, MARK.major, step, 0, progress)).attr('opacity', isLit ? 0.7 : 0.5);
        mark
          .select('.gp-ticks.off')
          .attr('d', ringTicks(x, y, scale, MARK.minor, MARK.major, step, progress + 1e-4, 1))
          .attr('opacity', isLit ? 0.28 : 0.18);
        mark.select('.gp-rest').attr('d', ringArc(x, y, ring, progress, 1)).attr('opacity', isLit ? 0.3 : 0.18);
        mark.select('.gp-progress').attr('d', ringArc(x, y, ring, 0, progress));
        // the needle: where progress has got to
        const end = -Math.PI / 2 + progress * Math.PI * 2;
        const at = (r: number) => `${f1(x + Math.cos(end) * r)} ${f1(y + Math.sin(end) * r)}`;
        mark.select('.gp-needle').attr('d', `M${at(ring - 3)}L${at(ring + 9)}`);
        const h = R + MARK.bracket;
        const arm = 8;
        const brackets = [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]
          .map(([sx, sy]) => `M${f1(x + sx! * h)} ${f1(y + sy! * (h - arm))}L${f1(x + sx! * h)} ${f1(y + sy! * h)}L${f1(x + sx! * (h - arm))} ${f1(y + sy! * h)}`)
          .join('');
        mark.select('.gp-brackets').attr('d', brackets).attr('opacity', isLit ? 0.75 : 0);
      });
  };

  type PlacedResource = { resource: BipartiteResource; index: number; x: number; y: number; standing: ResourceStanding };
  /** A group's diamond: how full it is says what the goals meet there — empty, a dot, solid. */
  const drawResources = (resources: PlacedResource[], lit: Lighting) => {
    resourceLayer
      .selectAll<SVGGElement, PlacedResource>('g.bp-resource')
      .data(resources, (r) => r.resource.key)
      .join((enter) => {
        const g = enter
          .append('g')
          .attr('class', 'bp-resource gp-appear')
          .attr('data-resource', (r) => r.resource.key)
          .style('animation-delay', (r) => `${ENTER.resource + r.index * 60}ms`);
        g.append('circle').attr('class', 'gp-hit').attr('r', 14);
        g.append('path').attr('class', 'gp-diamond-edge');
        g.append('circle').attr('class', 'gp-diamond-dot').attr('r', 1.5);
        g.append('path').attr('class', 'gp-diamond-core');
        g.append('path').attr('class', 'gp-diamond-trace');
        g.on('mouseenter', (event: MouseEvent, r) => {
          setPointed(r.resource.key);
          on.onResourceHover?.(r.resource, event);
        }).on('mouseleave', () => {
          setPointed(null);
          on.onLeave?.();
        });
        return g;
      })
      .each(function (r) {
        const { x, y, standing } = r;
        const color = toneOf(standing);
        const g = select(this).attr('opacity', resourceDim(r.resource, lit));
        g.select('.gp-hit').attr('cx', f1(x)).attr('cy', f1(y));
        g.select('.gp-diamond-edge').attr('d', diamondD(x, y, MARK.diamond)).attr('stroke', color);
        g.select('.gp-diamond-dot')
          .attr('cx', f1(x))
          .attr('cy', f1(y))
          .attr('fill', color)
          .attr('display', !standing.hold && standing.health === 'degraded' ? null : 'none');
        g.select('.gp-diamond-core')
          .attr('d', diamondD(x, y, MARK.diamond * 0.5))
          .attr('fill', color)
          .attr('display', standing.hold ? null : 'none');
        g.select('.gp-diamond-trace')
          .attr('d', diamondD(x, y, MARK.diamond + 4.5))
          .attr('display', pointed === r.resource.key ? null : 'none');
      });
  };

  type PlacedCallout = { p: Placed; ax: number; ay: number; hx: number; rect: { x0: number; x1: number; y0: number; y1: number } };
  const drawCallouts = (callouts: PlacedCallout[], lit: Lighting) => {
    leaderLayer
      .selectAll<SVGGElement, PlacedCallout>('g.gp-leader')
      .data(callouts, (c) => c.p.g.id)
      .join((enter) => {
        const g = enter
          .append('g')
          .attr('class', 'gp-leader gp-appear')
          .attr('data-goal', (c) => c.p.g.id)
          .style('animation-delay', (c) => `${ENTER.label + c.p.index * ENTER.step}ms`);
        g.append('path').attr('class', 'gp-leader-line');
        g.append('rect').attr('class', 'gp-leader-end').attr('width', 3).attr('height', 3);
        g.append('line').attr('class', 'gp-spine');
        g.append('rect').attr('class', 'gp-bar').attr('width', 2).attr('height', CALLOUT.head - 4);
        return g;
      })
      .each(function (c) {
        const isLit = hovered === c.p.g.id;
        const g = select(this).attr('opacity', Math.max(0.3, goalDim(c.p.g.goal, lit)));
        g.select('.gp-leader-line')
          .attr('d', `M${f1(c.ax)} ${f1(c.ay)}L${f1(c.hx)} ${f1(c.ay)}`)
          .attr('opacity', isLit ? 0.85 : 0.42);
        g.select('.gp-leader-end').attr('x', f1(c.ax - 1.5)).attr('y', f1(c.ay - 1.5));
        g.select('.gp-spine').attr('x1', f1(c.hx)).attr('x2', f1(c.hx)).attr('y1', f1(c.rect.y0)).attr('y2', f1(c.rect.y1));
        g.select('.gp-bar').attr('x', f1(c.hx - 1)).attr('y', f1(c.rect.y0 + 2));
      });

    labels
      .selectAll<HTMLDivElement, PlacedCallout>('div.gp-callout')
      .data(callouts, (c) => c.p.g.id)
      .join((enter) => {
        const div = enter
          .append('div')
          .attr('class', 'gp-callout is-left')
          .attr('data-goal', (c) => c.p.g.id);
        const label = div
          .append('div')
          .attr('class', 'gp-callout-label gp-rise')
          .style('animation-delay', (c) => `${ENTER.label + 80 + c.p.index * ENTER.step}ms`);
        label.each(function (c) {
          this.innerHTML = calloutMarkup(c.p.g.goal);
        });
        label
          .on('mouseenter', (event: MouseEvent, c) => {
            setHover(c.p.g.id);
            on.onGoalHover?.(c.p.g.goal, event);
          })
          .on('mouseleave', () => {
            setHover(null);
            on.onLeave?.();
          });
        return div;
      })
      .each(function (c) {
        const div = select(this)
          .classed('is-lit', hovered === c.p.g.id)
          .style('left', `${f1(c.rect.x1)}px`)
          .style('top', `${f1(c.rect.y0)}px`)
          .style('opacity', Math.max(0.35, goalDim(c.p.g.goal, lit)));
        div.select('.gp-callout-label').classed('is-compact', compact);
      });
  };

  /**
   * A group's label, to the right of its diamond, in the goals' own anatomy:
   * its name and how the goals fare with it, what it is, and one line of
   * readings — how many goals draw on it, their calls a minute, and the agents
   * held there. Compact, the readings show under the pointer.
   */
  const drawResourceLabels = (resources: PlacedResource[], lit: Lighting) => {
    labels
      .selectAll<HTMLDivElement, PlacedResource>('div.bp-resource-callout')
      .data(resources, (r) => r.resource.key)
      .join((enter) => {
        const div = enter
          .append('div')
          .attr('class', 'bp-resource-callout')
          .attr('data-resource', (r) => r.resource.key);
        const label = div
          .append('div')
          .attr('class', 'bp-resource-label gp-rise')
          .style('animation-delay', (r) => `${ENTER.label + 80 + r.index * 60}ms`);
        label.each(function (r) {
          this.innerHTML = resourceMarkup(r.resource, r.standing);
        });
        label
          .on('mouseenter', (event: MouseEvent, r) => {
            setPointed(r.resource.key);
            on.onResourceHover?.(r.resource, event);
          })
          .on('mouseleave', () => {
            setPointed(null);
            on.onLeave?.();
          });
        return div;
      })
      .each(function (r) {
        const div = select(this)
          .classed('is-lit', pointed === r.resource.key)
          .style('left', `${f1(r.x + MARK.diamond + RESOURCE_GAP)}px`)
          .style('top', `${f1(r.y - CALLOUT.head / 2)}px`)
          .style('opacity', resourceDim(r.resource, lit));
        div.select('.bp-resource-label').classed('is-compact', compact);
      });
  };

  // ── the loop ──
  let raf = 0;
  let visible = true;
  let overlayWanted = true;
  const requestOverlay = () => {
    overlayWanted = true;
    request();
  };
  const setHover = (id: string | null) => {
    if (hovered === id) return;
    hovered = id;
    requestOverlay();
  };
  const setPointed = (key: string | null) => {
    if (pointed === key) return;
    pointed = key;
    requestOverlay();
  };
  const setOver = (key: string | null) => {
    if (over === key) return;
    over = key;
    requestOverlay();
  };
  let last = 0;
  const tick = (now: number) => {
    raf = 0;
    if (destroyed) return;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    // the view follows the camera with a little weight
    const gap = { zoom: Math.log(target.zoom / eased.zoom), panX: target.panX - eased.panX, panY: target.panY - eased.panY };
    const chasing = Math.abs(gap.zoom) > 1e-3 || Math.abs(gap.panX) > 0.3 || Math.abs(gap.panY) > 0.3;
    if (chasing && motion) {
      const scale = 1 - Math.exp(-dt / EASE_ZOOM_MS);
      const slide = 1 - Math.exp(-dt / EASE_PAN_MS);
      eased = {
        ...eased,
        zoom: eased.zoom * Math.exp(gap.zoom * scale),
        panX: eased.panX + gap.panX * slide,
        panY: eased.panY + gap.panY * slide,
      };
    } else {
      eased = { ...target };
    }
    const fading = easeAlpha(dt);
    const overlay = overlayWanted || chasing;
    overlayWanted = false;
    drawFrame(now, overlay);
    if (motion && visible) raf = requestAnimationFrame(tick);
    else if (chasing || fading) raf = requestAnimationFrame(tick);
  };
  const request = () => {
    if (!raf && !destroyed) raf = requestAnimationFrame(tick);
  };

  // pause while the map is off screen or the tab is hidden
  let onScreen = true;
  const updateVisible = () => {
    visible = onScreen && (typeof document === 'undefined' || document.visibilityState === 'visible');
    if (visible) request();
  };
  const intersect =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(([entry]) => {
          onScreen = entry?.isIntersecting ?? true;
          updateVisible();
        })
      : null;
  intersect?.observe(stage);
  document.addEventListener('visibilitychange', updateVisible);

  const setCamera = (next: Partial<StageCamera>) => {
    target = { ...target, ...next };
    on.onCamera?.({ ...target });
    requestOverlay();
  };

  // ── input: drag to pan, wheel to zoom, double-click to reset ──
  let drag: { pointer: number; x: number; y: number; start: StageCamera; moved: boolean } | null = null;
  const isControl = (event: Event) => event.target instanceof Element && !!event.target.closest('button');
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || isControl(event)) return;
    drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, start: { ...target }, moved: false };
  };
  const onPointerMove = (event: PointerEvent) => {
    const d = drag;
    if (!d || d.pointer !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.moved) {
      if (Math.abs(dx) <= SLOP && Math.abs(dy) <= SLOP) return;
      d.moved = true;
      try {
        stage.setPointerCapture(event.pointerId);
      } catch {
        /* the pointer is gone */
      }
      stage.classList.add('is-dragging');
      on.onLeave?.();
    }
    setCamera({ panX: d.start.panX + dx, panY: d.start.panY + dy });
  };
  const onPointerUp = () => {
    drag = null;
    stage.classList.remove('is-dragging');
  };
  let asked: number | null = null;
  let zoomRaf = 0;
  const glide = () => {
    zoomRaf = 0;
    if (asked == null) return;
    const zoomGap = Math.log(asked / target.zoom);
    if (Math.abs(zoomGap) < 0.003 || !motion) {
      setCamera(zoomCamera(target, asked / target.zoom));
      asked = null;
      return;
    }
    setCamera(zoomCamera(target, Math.exp(zoomGap * CATCH_UP)));
    zoomRaf = requestAnimationFrame(glide);
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    // lines and pages, where a browser reports them, as px
    const px = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
    const travel = Math.max(-MOST, Math.min(MOST, px));
    asked = zoomCamera({ ...target, zoom: asked ?? target.zoom }, Math.exp(-travel * (event.ctrlKey ? PER_PINCH_UNIT : PER_UNIT))).zoom;
    if (!zoomRaf) zoomRaf = requestAnimationFrame(glide);
  };
  const reset = () => {
    asked = null;
    setCamera({ ...FLAT_CAMERA });
  };
  const onDoubleClick = (event: MouseEvent) => {
    if (!isControl(event)) reset();
  };
  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('dblclick', onDoubleClick);

  // first frame
  stage.toggleAttribute('data-motion', motion);
  drawFrame(typeof performance !== 'undefined' ? performance.now() : 0, true);
  request();

  return {
    resize(width, height) {
      size = { width, height };
      requestOverlay();
      if (!motion) drawFrame(performance.now(), true);
    },
    setProblemsOnly(next) {
      if (next === problemsOnly) return;
      problemsOnly = next;
      requestOverlay();
      if (!motion) drawFrame(performance.now(), true);
    },
    zoomBy(factor) {
      setCamera(zoomCamera(target, factor));
    },
    resetCamera: reset,
    camera: () => ({ ...target }),
    compact: () => compact,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(zoomRaf);
      intersect?.disconnect();
      document.removeEventListener('visibilitychange', updateVisible);
      painter?.dispose();
      fieldHost.remove();
    },
  };
}

/** A group's label: its name, status and what it is, and a readout — goals, calls a minute, agents held. */
export function resourceMarkup(resource: BipartiteResource, standing: ResourceStanding): string {
  const status = statusOf(standing);
  const held = standing.held
    ? `<span class="gp-sep">·</span><span class="gp-held-mark" style="background:${status.color}" aria-hidden="true"></span><span class="bp-strong">${formatCount(standing.held)} held</span>`
    : '';
  return [
    `<span class="gp-callout-head">`,
    `<span class="gp-code">${esc(resource.name)}</span>`,
    `<span class="gp-status-dot" style="background:${status.color}" aria-hidden="true"></span>`,
    `<span class="gp-status">${status.word}</span>`,
    `</span>`,
    `<span class="bp-resource-name">${esc(formatAssets(resource) ?? resource.name)}</span>`,
    `<span class="bp-resource-line">`,
    `<span>${formatCount(standing.goals)} ${standing.goals === 1 ? 'goal' : 'goals'}</span><span class="gp-sep">·</span><span>${formatShort(standing.calls)} calls /min</span>${held}`,
    `</span>`,
  ].join('');
}
