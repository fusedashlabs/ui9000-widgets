import { select } from 'd3-selection';

import {
  BASELINE,
  BASELINE_SPAN,
  BOARD,
  capitalize,
  COMPACT_ABOVE,
  DEFAULT_CAMERA,
  dependencyLanes,
  dependencyPath,
  drawOrder,
  fitScene,
  focusSets,
  formatCount,
  formatMultiplier,
  formatPercent,
  formatShort,
  FRONT,
  plantGoals,
  resourcePlaces,
  resourceStanding,
  ringArc,
  RESOURCE_Y,
  ringTicks,
  sceneView,
  sharedByAll,
  sideRoom,
  slotX,
  standCloud,
  tickStep,
  TREE,
  worstHold,
  zoomCamera,
  type AgentField,
  type Frame,
  type GoalsDependencyGraphModel,
  type GraphEdge,
  type GraphGoal,
  type GraphResource,
  type HoldState,
  type SceneView,
  type StageCamera,
} from '../lib/index.js';
import { EXCEPTIONS, goalShown, healthShown } from './exceptions.js';
import { createPainter, type Painter } from './field-painter.js';
import { scenePalette, type ScenePalette } from './scene-palette.js';

type Pointer = MouseEvent | FocusEvent;

/** Callbacks for the element: tooltips and what the graph rests on live there. */
export interface GoalsDependencyGraphHandlers {
  onGoalHover?: (goal: GraphGoal, event: Pointer) => void;
  onResourceHover?: (resource: GraphResource, event: Pointer) => void;
  onEdgeHover?: (edge: GraphEdge, event: Pointer) => void;
  onLeave?: () => void;
  /** Where the camera is going, for the element to keep across redraws. */
  onCamera?: (camera: StageCamera) => void;
  /** The goal brought to the centre. */
  onCenter?: (goal: string) => void;
}

export interface RenderGoalsDependencyGraphOptions {
  model: GoalsDependencyGraphModel;
  width: number;
  height: number;
  handlers?: GoalsDependencyGraphHandlers;
  /** Where the agent picture is drawn: a layer behind the plot that may reach past it (the whole shell). */
  sceneLayer?: HTMLElement | null;
  /** The scene's colours, from the page style's palettes. Defaults to the default style's. */
  palette?: ScenePalette;
  /** The camera and the goal at the centre to start from: kept by the element across redraws. */
  camera?: StageCamera;
  center?: string;
  /** Only what is held stands out: the agents at work all but go out, and whatever has nothing held steps back. */
  problemsOnly?: boolean;
  /** Off: no intro, no glide, the picture painted only when something changes. Defaults to the reader's preference. */
  motion?: boolean;
}

export interface GoalsDependencyGraphController {
  /** Re-fits the graph to a new plot size. */
  resize: (width: number, height: number) => void;
  setProblemsOnly: (on: boolean) => void;
  /** Brings a goal to the centre, as clicking it does. */
  setCenter: (goal: string) => void;
  /** Back to 100%, unpanned. */
  resetCamera: () => void;
  camera: () => StageCamera;
  center: () => string;
  /** Stops every loop and listener, and lets go of the picture's GPU memory. */
  destroy: () => void;
}

/** How long the agents take to gather on load. */
const INTRO_MS = 2600;
/** The scene comes up in order: agents gather on their tips, the roots and trees follow, then the lines and labels (ms). */
const ENTER = { tree: 700, root: 350, resource: 600, line: 900, label: 1000, step: 90 };
/** How long a tree takes to glide to the centre, and grow. */
const GLIDE_MS = 650;

/** How quickly the view catches up with where it was moved to: the time to close ~63% of the gap. */
const EASE_ZOOM_MS = 110;
const EASE_PAN_MS = 90;
/** How quickly a goal's agents brighten or dim with its emphasis. */
const EASE_ALPHA_MS = 140;

/** Pointer travel before a press counts as a drag, so clicks still reach goals. */
const SLOP = 2;
/** Wheel travel to zoom: a notch is about a hundred units; a pinch arrives as small ones with ctrl held. */
const PER_UNIT = 0.0009;
const PER_PINCH_UNIT = 0.011;
const MOST = 80;
const CATCH_UP = 0.26;

/** The most backing-store pixels the agent canvas may hold. */
const MAX_PIXELS = 9e6;

/** Calls a minute assumed for a dependency that gives none. */
const DEFAULT_CALLS = 1000;

/** Anatomy of a goal's root, in screen px. */
const ROOT = {
  /** The ring's radius at the centre, and off it. */
  main: 15,
  side: 11,
  /** The ring's scale starts this far out and runs outwards. */
  scale: 4,
  minor: 2.5,
  major: 5,
  /** Corner brackets shown under the pointer and on the goal in focus. */
  bracket: 16,
  /** From the baseline to the top of the labels: clear of the largest ring. */
  label: 36,
} as const;

/** Anatomy of the marks, in screen px. */
const MARK = {
  /** Half-diagonal of a resource group's diamond. */
  diamond: 6,
  /** How far apart neighbouring dependencies lean where they leave a root or meet a group. */
  lean: 13,
} as const;

/** The traced line's callout: up off the group's mark on a diagonal, level for a moment, then the label's spine (screen px). */
const LEADER = { lift: 13, rise: 18, diagonal: 18, run: 12 };
const CALLOUT = { height: 77, head: 36, pad: 11 };

/**
 * The band the graph is centred on at rest, in screen px: from the groups'
 * marks (`above` their row) to the foot of the goals' labels (`below` the
 * baseline), with the callout's room over the row while the centre goal has a
 * line traced. A trace clicked in passing uses the air there and moves nothing.
 */
const BAND = { above: 8, below: 104, callout: LEADER.lift + LEADER.rise + CALLOUT.height };

/** A held agent's colour, the same on its tree, on the line that holds it and on the group's diamond. */
const HOLD_COLOR: Record<HoldState, string> = {
  awaiting: 'var(--gd-awaiting)',
  blocked: 'var(--gd-blocked)',
  failed: 'var(--gd-failed)',
};
const HOLD_WORD: Record<HoldState, string> = { awaiting: 'Holding', blocked: 'Blocked', failed: 'Failed' };
const STATUS_TONE = { healthy: 'var(--gd-ok)', degraded: 'var(--gd-warn)', critical: 'var(--gd-blocked)' } as const;

let instanceCount = 0;

const f1 = (n: number) => n.toFixed(1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const diamondD = (x: number, y: number, d: number) => `M${f1(x)} ${f1(y - d)}L${f1(x + d)} ${f1(y)}L${f1(x)} ${f1(y + d)}L${f1(x - d)} ${f1(y)}Z`;
const esc = (value: string) => value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/** The ring's radius for a tree drawn at `scale`: it grows with its tree as a goal comes to the centre. */
const rootRadius = (scale: number) => ROOT.side + (ROOT.main - ROOT.side) * clamp01((scale - TREE.side) / (1 - TREE.side));

/** Seconds a light takes to run a dependency: the more calls a minute, the quicker. */
const runSeconds = (calls: number) => Math.max(2.6, Math.min(8, 9.4 - Math.log10(Math.max(10, calls)) * 1.65));

/** Ease-in-out cubic. */
const easeGlide = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** What the graph's callout reads out about the line or group it traces. */
interface Trace {
  /** Resource group the callout hangs over. */
  resource: string;
  /** Stable while the callout says the same thing: it comes up again when this changes. */
  key: string;
  /** Where it is: "G-007 → SYSTEM". */
  where: string;
  /** How it stands, in a word, and that state's colour. */
  status: string;
  color: string;
  title: string;
  /** The readout under the title: caption, value (markup), and its column's class. */
  readings: { caption: string; value: string; cls: string }[];
  /** What its tip explains: the line, or the group. */
  edge: GraphEdge | null;
}

/** Where a goal's tree stands on the baseline, and how large it is drawn: 1 at the centre. */
interface Stand {
  x: number;
  scale: number;
}

/**
 * Goals dependency graph, after the Agent operations design's Graph view:
 * every goal a tree rooted on the baseline — a tip of the tree for each of
 * its agents, drawn by the goals perimeter's painter in the same smoke — with
 * a line rising from its root to each resource group it draws on, in the
 * colour of the agents held there. The goal at the centre grows the full
 * tree; the dependency that holds most of its agents is traced bright, with a
 * callout over the group it runs to.
 *
 * Clicking a goal glides it to the centre; clicking a group or a line traces
 * it. Pointing at a group or a goal lights what it is tied to. Drag to pan,
 * scroll to zoom, double-click to reset.
 */
export function renderGoalsDependencyGraph(container: HTMLElement, options: RenderGoalsDependencyGraphOptions): GoalsDependencyGraphController | null {
  container.replaceChildren();
  const { model, handlers: on = {} } = options;
  if (model.empty || options.width <= 0 || options.height <= 0) return null;

  const instance = ++instanceCount;
  const motion = options.motion ?? !reducedMotion();
  let size = { width: options.width, height: options.height };
  let problemsOnly = options.problemsOnly ?? false;
  let target: StageCamera = { ...(options.camera ?? DEFAULT_CAMERA) };
  let eased: StageCamera = { ...target };
  const goalById = new Map(model.goals.map((g) => [g.id, g]));
  const resourceById = new Map(model.resources.map((r) => [r.id, r]));
  let center = options.center && goalById.has(options.center) ? options.center : model.center || model.goals[0]!.id;
  /** The goal clicked: in focus, with its brackets; it stays at the centre after focus clears. */
  let focus: string | null = null;
  /** The group clicked, traced. */
  let resource: string | null = null;
  /** The line clicked, traced. */
  let tracedEdge: number | null = null;
  let hover: string | null = null;
  let pointed: string | null = null;
  let over: number | null = null;
  let compact = false;
  let destroyed = false;

  const places = resourcePlaces(model);
  const shared = sharedByAll(model);
  const order = drawOrder(model.edges);
  const standings = new Map(model.resources.map((r) => [r.id, resourceStanding(model, r.id)]));
  const planted = plantGoals(model.goals);
  const field: AgentField = { clouds: model.goals.map((g) => planted[g.id]!.cloud) };

  // ── DOM ──
  const stage = document.createElement('div');
  stage.className = 'gd-stage';
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', model.title || 'Goals dependency graph');
  container.append(stage);

  const sceneHost = options.sceneLayer ?? stage;
  const fieldHost = document.createElement('div');
  fieldHost.className = 'gd-field';
  sceneHost.append(fieldHost);

  const svg = select(stage).append('svg').attr('class', 'gd-overlay').attr('width', '100%').attr('height', '100%').attr('aria-hidden', 'true');
  const defs = svg.append('defs');
  const glassId = `gd-glass-${instance}`;
  const glass = defs.append('radialGradient').attr('id', glassId).attr('fx', 0.44).attr('fy', 0.58);
  glass.append('stop').attr('offset', 0.5).attr('stop-color', 'white').attr('stop-opacity', 0);
  glass.append('stop').attr('offset', 0.88).attr('stop-color', 'white').attr('stop-opacity', 0.04);
  glass.append('stop').attr('offset', 1).attr('stop-color', 'white').attr('stop-opacity', 0.1);
  const fadeId = `gd-baseline-${instance}`;
  const fade = defs.append('linearGradient').attr('id', fadeId).attr('class', 'gd-baseline-fade');
  for (const [offset, opacity] of [
    [0, 0],
    [0.1, 1],
    [0.9, 1],
    [1, 0],
  ] as const)
    fade.append('stop').attr('offset', offset).attr('stop-color', 'currentColor').attr('stop-opacity', opacity);

  const baseline = svg.append('rect').attr('class', 'gd-baseline gd-appear').attr('fill', `url(#${fadeId})`);
  const treeLayer = svg.append('g').attr('class', 'gd-trees');
  const edgeLayer = svg.append('g').attr('class', 'gd-edges gd-appear').style('animation-delay', `${ENTER.line}ms`);
  const resourceLayer = svg.append('g').attr('class', 'gd-resources');
  const rootLayer = svg.append('g').attr('class', 'gd-roots');
  const leaderLayer = svg.append('g').attr('class', 'gd-leaders');
  const labels = select(stage).append('div').attr('class', 'gd-labels');

  // ── the map window and the picture's place ──
  const mapFrame = (): Frame => ({ x0: 0, y0: 0, x1: size.width, y1: size.height });
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
    canvas.className = 'gd-field-canvas';
    fieldHost.append(canvas);
    return canvas;
  };
  try {
    painter = createPainter(freshCanvas, field, options.palette ?? scenePalette('default'));
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

  // ── the trees' places: one clock, so a tree gliding to the centre never comes apart from its agents ──
  const glide = { from: {} as Record<string, Stand>, to: {} as Record<string, Stand>, room: { from: 0, to: 0 }, start: 0, duration: 0 };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
  const glidedAt = (at: number) => (at >= glide.start + glide.duration ? 1 : easeGlide(Math.max(0, (at - glide.start) / glide.duration)));
  const standAt = (id: string, at: number): Stand => {
    const to = glide.to[id]!;
    const e = glidedAt(at);
    if (e === 1) return to;
    const from = glide.from[id] ?? to;
    return { x: from.x + (to.x - from.x) * e, scale: from.scale + (to.scale - from.scale) * e };
  };
  /** The callout's room over the row, gliding with the trees. */
  const roomAt = (at: number) => glide.room.from + (glide.room.to - glide.room.from) * glidedAt(at);
  /** The goals in their slots: the centre first, then the others in the payload's order. */
  const slotOrder = () => [center, ...model.goals.map((g) => g.id).filter((id) => id !== center)];
  const slotTargets = () => {
    const xs = slotX(model.goals.length);
    return Object.fromEntries(slotOrder().map((id, i): [string, Stand] => [id, { x: xs[i]!, scale: i === 0 ? 1 : TREE.side }]));
  };
  const standTo = (duration: number) => {
    const at = now();
    const targets = slotTargets();
    glide.from = Object.fromEntries(Object.keys(targets).map((id) => [id, glide.to[id] ? standAt(id, at) : targets[id]!]));
    glide.to = targets;
    const room = worstHold(model, center) ? BAND.callout : 0;
    glide.room = { from: roomAt(at), to: room };
    glide.start = at;
    glide.duration = duration;
  };
  standTo(0);
  const gliding = (at: number) => at < glide.start + glide.duration;

  // each goal's agents follow its emphasis, eased
  const alpha: Record<string, number> = Object.fromEntries(model.goals.map((g) => [g.id, 1]));
  let alphaTarget: Record<string, number> = { ...alpha };

  // ── one frame of the graph ──
  const drawFrame = (at: number, overlay: boolean) => {
    if (destroyed) return;
    const frame = mapFrame();
    const fit = fitScene(size, frame);
    // the band from the groups to the goals' labels sits in the middle of the window
    const band = { top: (RESOURCE_Y - BOARD.height / 2) * fit.scale - BAND.above - roomAt(at), bottom: (BASELINE - BOARD.height / 2) * fit.scale + BAND.below };
    const view = sceneView({ ...fit, cy: fit.cy - (band.top + band.bottom) / 2 }, eased);
    const u = view.unit;
    const stands = Object.fromEntries(model.goals.map((g) => [g.id, standAt(g.id, at)]));
    for (const g of model.goals) standCloud(planted[g.id]!, stands[g.id]!.x, stands[g.id]!.scale);

    // the picture
    if (painter) {
      const rect = fieldRect();
      fitPainter(rect);
      const region = { x: view.fromX(rect.left), y: view.fromY(rect.top), w: rect.width * u, h: rect.height * u };
      if (!started) started = at;
      const settle = motion ? Math.min(1, (at - started) / INTRO_MS) : 1;
      try {
        painter.paint({
          pose: FRONT,
          unit: u,
          healthy: problemsOnly ? EXCEPTIONS.healthy : 1,
          goalAlpha: (id) => alpha[id] ?? 1,
          focus: null,
          region,
          zoom: eased.zoom,
          // agents on a tree are read alike, front and back; dense marks stand at its edges
          depthCue: 0.85,
          grain: 0.9,
          aberration: 0.3,
          time: motion ? (at - started) / 1000 : null,
          intro: 1 - Math.pow(1 - settle, 3),
        });
      } catch {
        // a lost or broken context: the instruments still draw
      }
    }

    if (!overlay) return;
    drawOverlay(view, stands);
  };

  const drawOverlay = (view: SceneView, stands: Record<string, Stand>) => {
    const u = view.unit;
    compact = u > COMPACT_ABOVE;
    stage.toggleAttribute('data-compact', compact);

    // what is lit: the goal under the pointer or in focus, the group pointed at or traced
    const sets = focusSets(model, hover ?? focus, pointed ?? resource);
    // a goal only pointed at leaves the others readable; one in focus or a traced group sets them back
    const aside = focus || resource || tracedEdge !== null ? 0.22 : 0.5;
    const goalDim = (g: GraphGoal) =>
      (!sets.active || sets.lit.has(`g:${g.id}`) ? 1 : sets.soft.has(`g:${g.id}`) ? 0.62 : aside) * goalShown(g, problemsOnly);
    const resourceDim = (id: string) =>
      (!sets.active || sets.lit.has(`r:${id}`) ? 1 : aside + 0.1) * (pointed === id ? 1 : healthShown(standings.get(id)!.health, problemsOnly));
    alphaTarget = Object.fromEntries(model.goals.map((g) => [g.id, goalDim(g)]));

    // the traced line: the one clicked, else the traced group, else what holds most of the centre goal's agents
    const worst = worstHold(model, center);
    const worstIndex = worst ? model.edges.indexOf(worst) : -1;
    const traced = new Set<number>(tracedEdge !== null ? [tracedEdge] : !resource && worstIndex >= 0 ? [worstIndex] : []);
    const trace: Trace | null =
      tracedEdge !== null
        ? edgeTrace(model.edges[tracedEdge]!)
        : resource
          ? groupTrace(resourceById.get(resource)!)
          : worst
            ? edgeTrace(worst)
            : null;

    const toScreen = (x: number, y: number) => ({ x: view.toX(x), y: view.toY(y) });
    const baseY = view.toY(BASELINE);
    const roots = slotOrder().map((id, slot) => {
      const goal = goalById.get(id)!;
      const stand = stands[id]!;
      return { goal, slot, main: slot === 0, x: view.toX(stand.x), scale: stand.scale, radius: rootRadius(stand.scale), dim: goalDim(goal) };
    });
    const rootOf = new Map(roots.map((root) => [root.goal.id, root]));

    // the baseline every goal roots on
    baseline
      .attr('x', f1(view.toX(BASELINE_SPAN.x0)))
      .attr('y', f1(baseY - 0.5))
      .attr('width', f1((BASELINE_SPAN.x1 - BASELINE_SPAN.x0) * view.scale))
      .attr('height', 1);

    drawTrees(roots, view);
    drawEdges(rootOf, toScreen, traced, sets, aside, baseY);
    drawResources(toScreen, resourceDim);
    drawRoots(roots, baseY);
    drawTrace(trace, toScreen);
    drawLabels(roots, baseY, u);
  };

  // ── drawing ──
  type Root = { goal: GraphGoal; slot: number; main: boolean; x: number; scale: number; radius: number; dim: number };

  /** The trees: branches down to the tips the agents stand on. Their paths are drawn once; a frame only moves and sizes them. */
  const drawTrees = (roots: Root[], view: SceneView) => {
    treeLayer
      .selectAll<SVGGElement, Root>('g.gd-tree')
      .data(roots, (d) => d.goal.id)
      .join((enter) => {
        const g = enter.append('g').attr('class', 'gd-tree');
        const body = g
          .append('g')
          .attr('class', 'gd-tree-body gd-appear')
          .style('animation-delay', (d) => `${ENTER.tree + d.slot * ENTER.step}ms`);
        body
          .append('path')
          .attr('class', 'gd-limbs')
          .attr('d', (d) => planted[d.goal.id]!.tree.limbs);
        body
          .append('path')
          .attr('class', 'gd-twigs')
          .attr('d', (d) => planted[d.goal.id]!.tree.twigs);
        return g;
      })
      .each(function (d) {
        const g = select(this);
        // off the centre a tree is small: its finest branches sit back, and the agents carry it
        const grown = clamp01((d.scale - TREE.side) / (1 - TREE.side));
        g.attr('opacity', d.dim * (problemsOnly ? 0.45 : 1));
        g.select('.gd-tree-body').attr('transform', `translate(${f1(d.x)} ${f1(view.toY(BASELINE))}) scale(${(d.scale * view.scale).toFixed(4)})`);
        g.select('.gd-limbs').attr('opacity', 0.2 + 0.06 * grown);
        g.select('.gd-twigs').attr('opacity', 0.07 + 0.09 * grown);
      });
  };

  type Drawn = { e: GraphEdge; i: number; d: string; bright: boolean; lit: boolean; opacity: number; color: string };
  const drawEdges = (
    rootOf: Map<string, Root>,
    toScreen: (x: number, y: number) => { x: number; y: number },
    traced: Set<number>,
    sets: ReturnType<typeof focusSets>,
    aside: number,
    baseY: number,
  ) => {
    const lanes = dependencyLanes(model.edges, slotTargetsX(), Object.fromEntries(model.resources.map((r) => [r.id, places[r.id]!.x])));
    const drawn: Drawn[] = order.map((i) => {
      const e = model.edges[i]!;
      const root = rootOf.get(e.goal)!;
      const at = toScreen(places[e.resource]!.x, places[e.resource]!.y);
      const d = dependencyPath(
        root.x,
        baseY - (root.radius + ROOT.scale + ROOT.major + 3),
        at.x,
        at.y + MARK.diamond + 5,
        lanes[i]!.root * MARK.lean,
        lanes[i]!.resource * MARK.lean,
      );
      const bright = traced.has(i);
      const lit = bright || over === i || sets.edges.has(i);
      const soft = sets.softEdges.has(i);
      const emphasis = (!sets.active || lit ? 1 : soft ? 0.6 : aside) * healthShown(e.health, problemsOnly);
      // a group every goal draws on ties nothing together: its flowing lines sit back until something lights them
      const strength = e.hold
        ? lit
          ? 1
          : 0.7
        : e.health === 'degraded'
          ? lit
            ? 0.85
            : 0.46
          : (lit && sets.active) || over === i
            ? 0.62
            : shared.has(e.resource)
              ? 0.1
              : 0.19;
      const color = e.hold ? HOLD_COLOR[e.hold] : e.health === 'degraded' ? 'var(--gd-warn)' : 'var(--gd-line)';
      return { e, i, d, bright, lit, opacity: strength * emphasis, color };
    });

    // one fixed order, the lines that hold agents over the rest: a line re-inserted while the pointer is on it would lose the pointer
    edgeLayer
      .selectAll<SVGGElement, Drawn>('g.gd-edge')
      .data(drawn, (d) => String(d.i))
      .join((enter) => {
        const g = enter.append('g').attr('class', 'gd-edge').attr('data-edge', (d) => String(d.i));
        g.append('path').attr('class', 'gd-edge-hit');
        g.append('path').attr('class', 'gd-edge-line');
        if (motion)
          g.append('path')
            .attr('class', 'gd-edge-run')
            .attr('pathLength', 1)
            .style('animation-duration', (d) => `${runSeconds(d.e.calls ?? DEFAULT_CALLS).toFixed(2)}s`)
            .style('animation-delay', (d) => `${(-((d.i * 0.37) % 1) * runSeconds(d.e.calls ?? DEFAULT_CALLS)).toFixed(2)}s`);
        g.on('mouseenter', (event: MouseEvent, d) => {
          over = d.i;
          requestOverlay();
          on.onEdgeHover?.(d.e, event);
        })
          .on('mouseleave', () => {
            over = null;
            requestOverlay();
            on.onLeave?.();
          })
          .on('click', (_event: MouseEvent, d) => traceEdge(d.i));
        return g;
      })
      .each(function (d) {
        const g = select(this).attr('opacity', d.opacity);
        g.select('.gd-edge-hit').attr('d', d.d);
        g.select('.gd-edge-line')
          .attr('d', d.d)
          .attr('stroke', d.color)
          .classed('is-bright', d.bright)
          .style('--gd-edge-color', d.color);
        // light along the line is the goal's calls to the group: the more a minute, the quicker it runs
        g.select('.gd-edge-run')
          .attr('d', d.d)
          .attr('stroke', d.e.hold ? d.color : 'var(--gd-traffic)')
          .attr('stroke-width', d.bright || d.lit ? 2 : 1.6)
          .attr('opacity', d.e.hold || d.lit ? 1 : 0.8)
          .style('--gd-edge-color', d.e.hold ? d.color : 'var(--gd-traffic)');
      });
  };
  /** Root places as their slots have them, not mid-glide: lanes are ordered by where goals stand, and keep still while they move. */
  const slotTargetsX = () => Object.fromEntries(Object.entries(glide.to).map(([id, stand]) => [id, stand.x]));

  /** Resource groups, in a row over the trees. How full a diamond is says what the goals meet there: empty, a dot, solid. */
  const drawResources = (toScreen: (x: number, y: number) => { x: number; y: number }, resourceDim: (id: string) => number) => {
    type Mark = { r: GraphResource; index: number };
    resourceLayer
      .selectAll<SVGGElement, Mark>('g.gd-resource')
      .data(
        model.resources.map((r, index) => ({ r, index })),
        (d) => d.r.id,
      )
      .join((enter) => {
        const g = enter
          .append('g')
          .attr('class', 'gd-resource gd-appear')
          .attr('data-resource', (d) => d.r.id)
          .style('animation-delay', (d) => `${ENTER.resource + d.index * 60}ms`);
        g.append('rect').attr('class', 'gd-hit');
        g.append('path').attr('class', 'gd-diamond-edge');
        g.append('circle').attr('class', 'gd-diamond-dot').attr('r', 1.5);
        g.append('path').attr('class', 'gd-diamond-core');
        g.append('path').attr('class', 'gd-diamond-trace');
        const label = g.append('text').attr('class', 'gd-resource-name');
        label.append('tspan').attr('class', 'gd-name');
        label.append('tspan').attr('class', 'gd-count');
        g.on('mouseenter', (event: MouseEvent, d) => {
          pointed = d.r.id;
          requestOverlay();
          on.onResourceHover?.(d.r, event);
        })
          .on('mouseleave', () => {
            pointed = null;
            requestOverlay();
            on.onLeave?.();
          })
          .on('click', (_event: MouseEvent, d) => traceResource(d.r.id));
        return g;
      })
      .each(function ({ r }) {
        const g = select(this).attr('opacity', resourceDim(r.id));
        const { x, y } = toScreen(places[r.id]!.x, places[r.id]!.y);
        const standing = standings.get(r.id)!;
        const color = standing.hold ? HOLD_COLOR[standing.hold] : standing.health === 'degraded' ? 'var(--gd-warn)' : 'var(--gd-line)';
        const isOn = pointed === r.id || resource === r.id;
        const d = MARK.diamond;
        g.select('.gd-hit')
          .attr('x', f1(x - 14))
          .attr('y', f1(y - 14))
          .attr('width', 28 + r.name.length * 6.5 + (standing.held ? 26 : 0))
          .attr('height', 28);
        g.select('.gd-diamond-edge').attr('d', diamondD(x, y, d)).attr('stroke', color);
        g.select('.gd-diamond-dot')
          .attr('cx', f1(x))
          .attr('cy', f1(y))
          .attr('fill', color)
          .attr('display', !standing.hold && standing.health === 'degraded' ? null : 'none');
        g.select('.gd-diamond-core')
          .attr('d', diamondD(x, y, d * 0.5))
          .attr('fill', color)
          .attr('display', standing.hold ? null : 'none');
        g.select('.gd-diamond-trace')
          .attr('d', diamondD(x, y, d + 4.5))
          .attr('display', isOn ? null : 'none');
        const label = g
          .select('.gd-resource-name')
          .attr('x', f1(x + d + 8))
          .attr('y', f1(y + 3.5))
          .classed('is-lit', isOn);
        label.select('.gd-name').text(r.name);
        label.select('.gd-count').text(standing.held > 0 ? ` ${formatCount(standing.held)}` : '');
      });
  };

  /** Goal roots on the baseline: a disc of glass, the ring filled to its progress, and the scale it is read on. */
  const drawRoots = (roots: Root[], baseY: number) => {
    rootLayer
      .selectAll<SVGGElement, Root>('g.gd-root')
      .data(roots, (d) => d.goal.id)
      .join((enter) => {
        const outer = enter.append('g').attr('class', 'gd-root').attr('data-goal', (d) => d.goal.id);
        const g = outer
          .append('g')
          .attr('class', 'gd-root-mark gd-appear')
          .style('animation-delay', (d) => `${ENTER.root + d.slot * ENTER.step}ms`);
        g.append('circle').attr('class', 'gd-hit');
        g.append('circle').attr('class', 'gd-disc');
        g.append('circle').attr('class', 'gd-glass').attr('fill', `url(#${glassId})`);
        g.append('path').attr('class', 'gd-ticks on');
        g.append('path').attr('class', 'gd-ticks off');
        g.append('path').attr('class', 'gd-rest');
        g.append('path').attr('class', 'gd-progress');
        g.append('path').attr('class', 'gd-needle');
        g.append('path').attr('class', 'gd-brackets');
        g.on('mouseenter', (event: MouseEvent, d) => {
          setHover(d.goal.id);
          on.onGoalHover?.(d.goal, event);
        })
          .on('mouseleave', () => {
            setHover(null);
            on.onLeave?.();
          })
          .on('click', (_event: MouseEvent, d) => clickGoal(d.goal.id));
        return outer;
      })
      .each(function (d) {
        const { goal: g, x, radius } = d;
        const y = baseY;
        const lit = hover === g.id;
        const selected = focus === g.id;
        const progress = g.progress;
        const outer = select(this).attr('opacity', Math.max(0.35, d.dim));
        const ring = radius;
        const scale = radius + ROOT.scale;
        const step = tickStep(Math.PI * 2 * scale, 5);
        const end = -Math.PI / 2 + progress * Math.PI * 2;
        const h = radius + ROOT.bracket;
        const arm = 7;
        outer.select('.gd-hit').attr('cx', f1(x)).attr('cy', f1(y)).attr('r', f1(h + 2));
        outer.select('.gd-disc').attr('cx', f1(x)).attr('cy', f1(y)).attr('r', f1(ring));
        outer.select('.gd-glass').attr('cx', f1(x)).attr('cy', f1(y)).attr('r', f1(ring));
        outer.select('.gd-ticks.on').attr('d', ringTicks(x, y, scale, ROOT.minor, ROOT.major, step, 0, progress)).attr('opacity', lit ? 0.7 : 0.5);
        outer
          .select('.gd-ticks.off')
          .attr('d', ringTicks(x, y, scale, ROOT.minor, ROOT.major, step, progress + 1e-4, 1))
          .attr('opacity', lit ? 0.28 : 0.18);
        outer.select('.gd-rest').attr('d', ringArc(x, y, ring, progress, 1)).attr('opacity', lit ? 0.3 : 0.2);
        outer.select('.gd-progress').attr('d', ringArc(x, y, ring, 0, progress));
        outer
          .select('.gd-needle')
          .attr(
            'd',
            `M${f1(x + Math.cos(end) * (ring - 3))} ${f1(y + Math.sin(end) * (ring - 3))}L${f1(x + Math.cos(end) * (ring + 8))} ${f1(y + Math.sin(end) * (ring + 8))}`,
          );
        const brackets = [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]
          .map(([sx, sy]) => `M${f1(x + sx! * h)} ${f1(y + sy! * (h - arm))}L${f1(x + sx! * h)} ${f1(y + sy! * h)}L${f1(x + sx! * (h - arm))} ${f1(y + sy! * h)}`)
          .join('');
        outer
          .select('.gd-brackets')
          .attr('d', brackets)
          .attr('opacity', selected ? 0.9 : lit ? 0.7 : 0);
      });
  };

  /** Where the callout's parts fall for a group at (x, y) on screen: the label stands over the row of groups, to the side with more room. */
  const calloutPlace = (resourceId: string, x: number, y: number) => {
    const side = places[resourceId]!.x > 1280 * 0.62 ? -1 : 1;
    const ay = y - LEADER.lift;
    const ey = ay - LEADER.rise;
    const ex = x + side * LEADER.diagonal;
    const hx = ex + side * LEADER.run;
    return { side, ay, ex, ey, hx, top: ey - CALLOUT.height };
  };

  /** The line from a traced group up to its label: a diagonal, a level run, the label's spine and a bright bar beside its head. */
  const drawTrace = (trace: Trace | null, toScreen: (x: number, y: number) => { x: number; y: number }) => {
    const entries = trace ? [trace] : [];
    leaderLayer
      .selectAll<SVGGElement, Trace>('g.gd-leader')
      .data(entries, (t) => t.key)
      .join((enter) => {
        const g = enter.append('g').attr('class', 'gd-leader gd-appear');
        g.append('path').attr('class', 'gd-leader-line');
        g.append('rect').attr('class', 'gd-leader-end').attr('width', 3).attr('height', 3);
        g.append('line').attr('class', 'gd-spine');
        g.append('rect')
          .attr('class', 'gd-bar')
          .attr('width', 2)
          .attr('height', CALLOUT.head - 4);
        return g;
      })
      .each(function (t) {
        const { x, y } = toScreen(places[t.resource]!.x, places[t.resource]!.y);
        const p = calloutPlace(t.resource, x, y);
        const g = select(this);
        g.select('.gd-leader-line').attr('d', `M${f1(x)} ${f1(p.ay)}L${f1(p.ex)} ${f1(p.ey)}L${f1(p.hx)} ${f1(p.ey)}`);
        g.select('.gd-leader-end')
          .attr('x', f1(x - 1.5))
          .attr('y', f1(p.ay - 1.5));
        g.select('.gd-spine').attr('x1', f1(p.hx)).attr('x2', f1(p.hx)).attr('y1', f1(p.top)).attr('y2', f1(p.ey));
        g.select('.gd-bar')
          .attr('x', f1(p.hx - 1))
          .attr('y', f1(p.top + 2))
          .attr('fill', t.color);
      });

    labels
      .selectAll<HTMLDivElement, Trace>('div.gd-trace')
      .data(entries, (t) => t.key)
      .join((enter) => {
        const div = enter.append('div').attr('class', 'gd-trace');
        const label = div
          .append('div')
          .attr('class', 'gd-trace-label gd-rise')
          .attr('role', 'note');
        label.each(function (t) {
          this.innerHTML = traceMarkup(t);
        });
        label
          .on('mouseenter', (event: MouseEvent, t) => {
            if (t.edge) on.onEdgeHover?.(t.edge, event);
            else on.onResourceHover?.(resourceById.get(t.resource)!, event);
          })
          .on('mouseleave', () => on.onLeave?.());
        return div;
      })
      .each(function (t) {
        const { x, y } = toScreen(places[t.resource]!.x, places[t.resource]!.y);
        const p = calloutPlace(t.resource, x, y);
        select(this)
          .classed('is-left', p.side < 0)
          .style('left', `${f1(p.hx + p.side * CALLOUT.pad)}px`)
          .style('top', `${f1(p.top)}px`);
      });
  };

  /** Each goal's label under its root: its code and status, its name, and its readings. It is the goal's button. */
  const drawLabels = (roots: Root[], baseY: number, u: number) => {
    const sideWidth = Math.max(96, sideRoom(model.goals.length) / u - 14);
    labels
      .selectAll<HTMLButtonElement, Root>('button.gd-label')
      .data(roots, (d) => d.goal.id)
      .join((enter) => {
        const button = enter
          .append('button')
          .attr('type', 'button')
          .attr('class', 'gd-label gd-rise')
          .attr('data-goal', (d) => d.goal.id)
          .style('animation-delay', (d) => `${ENTER.label + d.slot * ENTER.step}ms`);
        button.each(function (d) {
          this.innerHTML = labelMarkup(d.goal);
        });
        button
          .on('mouseenter', (event: MouseEvent, d) => {
            setHover(d.goal.id);
            on.onGoalHover?.(d.goal, event);
          })
          .on('mouseleave', () => {
            setHover(null);
            on.onLeave?.();
          })
          .on('focus', (event: FocusEvent, d) => {
            setHover(d.goal.id);
            on.onGoalHover?.(d.goal, event);
          })
          .on('blur', () => {
            setHover(null);
            on.onLeave?.();
          })
          .on('click', (_event: MouseEvent, d) => clickGoal(d.goal.id));
        return button;
      })
      .each(function (d) {
        select(this)
          .classed('is-main', d.main)
          .classed('is-lit', hover === d.goal.id)
          .classed('is-selected', focus === d.goal.id)
          // drawn small, the centre's readout would run into its neighbours' labels: it folds to one line too
          .classed('is-folded', compact && d.main)
          .classed('is-compact', compact && !d.main)
          .attr('aria-pressed', focus === d.goal.id ? 'true' : 'false')
          .style('left', `${f1(d.x)}px`)
          .style('top', `${f1(baseY + ROOT.label)}px`)
          .style('width', `${d.main ? 232 : f1(sideWidth)}px`)
          .style('opacity', Math.max(0.35, d.dim));
      });
  };

  // ── what the callout reads ──

  /** The callout for a line: what holds agents on it, or how its group stands. */
  const edgeTrace = (e: GraphEdge): Trace => {
    if (!e.hold) return { ...groupTrace(resourceById.get(e.resource)!), edge: e };
    const goal = goalById.get(e.goal)!;
    const group = resourceById.get(e.resource)!;
    const standing = standings.get(e.resource)!;
    const color = HOLD_COLOR[e.hold];
    const held = e.held < standing.held ? `${formatCount(e.held)} <span class="gd-quiet">of ${formatCount(standing.held)}</span>` : formatCount(e.held);
    const readings: Trace['readings'] = [{ caption: 'Held', value: `<span class="gd-held-mark" style="background:${color}"></span>${held}`, cls: 'held' }];
    if (e.since) readings.push({ caption: 'For', value: esc(e.since), cls: 'for' });
    if (e.rule) readings.push({ caption: 'Rule', value: esc(e.rule), cls: 'rule' });
    if (e.owner) readings.push({ caption: 'Owner', value: esc(e.owner), cls: 'owner' });
    if (!e.since && !e.rule && !e.owner && e.calls !== null) readings.push({ caption: 'Calls /min', value: formatShort(e.calls), cls: 'calls' });
    return {
      resource: e.resource,
      key: `edge:${e.goal}:${e.resource}`,
      where: `${goal.code || goal.name} → ${group.name}`,
      status: HOLD_WORD[e.hold],
      color,
      title: capitalize(e.cause || e.detail) || `${HOLD_WORD[e.hold]} on ${group.name}`,
      readings,
      edge: e,
    };
  };

  /** The callout for a group: what the goals that draw on it meet there. */
  const groupTrace = (group: GraphResource): Trace => {
    const standing = standings.get(group.id)!;
    const color = standing.hold ? HOLD_COLOR[standing.hold] : standing.health === 'degraded' ? 'var(--gd-warn)' : 'var(--gd-ink-2)';
    const readings: Trace['readings'] = [
      { caption: 'Goals', value: formatCount(standing.goals), cls: 'goals' },
      {
        caption: 'Held',
        value: standing.held > 0 ? `<span class="gd-held-mark" style="background:${color}"></span>${formatCount(standing.held)}` : '<span class="gd-quiet">0</span>',
        cls: 'held',
      },
    ];
    if (standing.calls > 0) readings.push({ caption: 'Calls /min', value: formatShort(standing.calls), cls: 'calls' });
    if (group.degraded !== null || group.impaired !== null)
      readings.push({ caption: 'Degraded', value: formatCount((group.degraded ?? 0) + (group.impaired ?? 0)), cls: 'degraded' });
    return {
      resource: group.id,
      key: `group:${group.id}`,
      where: group.kind && group.kind.toLowerCase() !== group.name.toLowerCase() ? group.kind : 'Resource group',
      status: standing.hold ? HOLD_WORD[standing.hold] : standing.health === 'degraded' ? 'Slowed' : 'Flowing',
      color,
      title: group.count !== null ? `${group.name} · ${formatCount(group.count)}` : group.name,
      readings,
      edge: null,
    };
  };

  // ── what a click does ──

  /** A goal glides to the centre and stays there; clicking the goal in focus lets go of it. */
  const clickGoal = (id: string) => {
    tracedEdge = null;
    resource = null;
    if (focus === id) {
      focus = null;
      requestOverlay();
      return;
    }
    focus = id;
    moveCenter(id);
    setCamera({ ...DEFAULT_CAMERA });
  };
  const moveCenter = (id: string) => {
    if (id === center || !goalById.has(id)) return requestOverlay();
    center = id;
    standTo(motion ? GLIDE_MS : 0);
    on.onCenter?.(center);
    requestOverlay();
  };
  /** A line is traced from its goal: its goal comes to the centre, in focus. */
  const traceEdge = (i: number) => {
    const e = model.edges[i]!;
    resource = null;
    if (tracedEdge === i) {
      tracedEdge = null;
      return requestOverlay();
    }
    tracedEdge = i;
    focus = e.goal;
    moveCenter(e.goal);
  };
  const traceResource = (id: string) => {
    tracedEdge = null;
    resource = resource === id ? null : id;
    requestOverlay();
  };
  /** A click on bare ground lets go of whatever is in focus. */
  const clearFocus = () => {
    if (!focus && !resource && tracedEdge === null) return;
    focus = null;
    resource = null;
    tracedEdge = null;
    requestOverlay();
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
    if (hover === id) return;
    hover = id;
    requestOverlay();
  };
  let last = 0;
  let wasMoving = false;
  const tick = (at: number) => {
    raf = 0;
    if (destroyed) return;
    if (!last) last = at;
    const dt = Math.min(64, at - last);
    last = at;
    // the view follows the camera with a little weight
    const gap = { zoom: Math.log(target.zoom / eased.zoom), panX: target.panX - eased.panX, panY: target.panY - eased.panY };
    const chasing = Math.abs(gap.zoom) > 1e-3 || Math.abs(gap.panX) > 0.3 || Math.abs(gap.panY) > 0.3;
    if (chasing && motion) {
      const scale = 1 - Math.exp(-dt / EASE_ZOOM_MS);
      const slide = 1 - Math.exp(-dt / EASE_PAN_MS);
      eased = { zoom: eased.zoom * Math.exp(gap.zoom * scale), panX: eased.panX + gap.panX * slide, panY: eased.panY + gap.panY * slide };
    } else eased = { ...target };
    // the agents follow their goal's emphasis
    let fading = false;
    const k = motion ? 1 - Math.exp(-dt / EASE_ALPHA_MS) : 1;
    for (const id of Object.keys(alpha)) {
      const want = alphaTarget[id] ?? 1;
      const next = alpha[id]! + (want - alpha[id]!) * k;
      alpha[id] = Math.abs(want - next) < 0.003 ? want : next;
      if (alpha[id] !== want) fading = true;
    }

    const moving = gliding(at) || chasing;
    // the frame that lands a glide or a camera move draws the instruments where they come to rest
    const overlay = overlayWanted || moving || wasMoving;
    wasMoving = moving;
    overlayWanted = false;
    drawFrame(at, overlay);
    if ((motion && visible) || moving || fading) raf = requestAnimationFrame(tick);
  };
  const request = () => {
    if (!raf && !destroyed) raf = requestAnimationFrame(tick);
  };

  // pause while the graph is off screen or the tab is hidden
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
  let swallowClick = false;
  const isControl = (event: Event) => event.target instanceof Element && !!event.target.closest('button');
  const onMark = (event: Event) => event.target instanceof Element && !!event.target.closest('.gd-edge, .gd-resource, .gd-root, .gd-trace-label, button');
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || isControl(event)) return;
    swallowClick = false;
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
    if (drag?.moved) swallowClick = true;
    drag = null;
    stage.classList.remove('is-dragging');
  };
  const onClickCapture = (event: MouseEvent) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.stopPropagation();
    event.preventDefault();
  };
  const onClick = (event: MouseEvent) => {
    if (!onMark(event)) clearFocus();
  };
  let asked: number | null = null;
  let zoomRaf = 0;
  const zoomGlide = () => {
    zoomRaf = 0;
    if (asked == null) return;
    const zoomGap = Math.log(asked / target.zoom);
    if (Math.abs(zoomGap) < 0.003 || !motion) {
      setCamera(zoomCamera(target, asked / target.zoom));
      asked = null;
      return;
    }
    setCamera(zoomCamera(target, Math.exp(zoomGap * CATCH_UP)));
    zoomRaf = requestAnimationFrame(zoomGlide);
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    // lines and pages, where a browser reports them, as px
    const px = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
    const travel = Math.max(-MOST, Math.min(MOST, px));
    asked = zoomCamera({ ...target, zoom: asked ?? target.zoom }, Math.exp(-travel * (event.ctrlKey ? PER_PINCH_UNIT : PER_UNIT))).zoom;
    if (!zoomRaf) zoomRaf = requestAnimationFrame(zoomGlide);
  };
  const onDoubleClick = (event: MouseEvent) => {
    if (isControl(event)) return;
    asked = null;
    setCamera({ ...DEFAULT_CAMERA });
  };
  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('click', onClickCapture, true);
  stage.addEventListener('click', onClick);
  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('dblclick', onDoubleClick);

  // first frame
  stage.toggleAttribute('data-motion', motion);
  drawFrame(now(), true);
  request();

  return {
    resize(width, height) {
      size = { width, height };
      requestOverlay();
      if (!motion) drawFrame(now(), true);
    },
    setProblemsOnly(next) {
      if (next === problemsOnly) return;
      problemsOnly = next;
      requestOverlay();
      if (!motion) drawFrame(now(), true);
    },
    setCenter(id) {
      moveCenter(id);
      if (!motion) drawFrame(now(), true);
    },
    resetCamera() {
      asked = null;
      setCamera({ ...DEFAULT_CAMERA });
    },
    camera: () => ({ ...target }),
    center: () => center,
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

/**
 * A goal's label, set at one size whatever the graph's scale: its code and
 * status, its name, and a readout — the full one for the goal at the centre
 * (agents, progress, burn against baseline, agents held); for the others one
 * line, agents and how many are held (their progress is on the ring).
 */
function labelMarkup(goal: GraphGoal): string {
  const held = goal.held;
  const heldMark = held > 0 ? '<span class="gd-held-mark" aria-hidden="true"></span>' : '';
  const reading = (caption: string, cls: string, value: string) =>
    `<span class="gd-reading ${cls}"><span class="gd-caption">${caption}</span><span class="gd-value">${value}</span></span>`;
  return [
    `<span class="gd-label-head">`,
    goal.code ? `<span class="gd-code">${esc(goal.code)}</span>` : '',
    `<span class="gd-status-dot" style="background:${STATUS_TONE[goal.status]}" aria-hidden="true"></span>`,
    `<span class="gd-status">${esc(goal.statusLabel)}</span>`,
    `</span>`,
    `<span class="gd-label-name">${esc(goal.name)}</span>`,
    `<span class="gd-readout">`,
    reading('Agents', 'agents', formatCount(goal.agents.total)),
    reading('Progress', 'progress', formatPercent(goal.progress)),
    goal.multiplier !== null ? reading(esc(goal.multiplierLabel), 'burn', formatMultiplier(goal.multiplier)) : '',
    reading('Held', 'held', `${heldMark}<span class="${held > 0 ? '' : 'gd-quiet'}">${formatCount(held)}</span>`),
    `</span>`,
    `<span class="gd-readout-line">`,
    `<span>${formatCount(goal.agents.total)} agents</span><span class="gd-sep">·</span>${heldMark}<span class="${held > 0 ? 'gd-strong' : ''}">${formatCount(held)} held</span>`,
    `</span>`,
  ].join('');
}

/** The traced line's label: where it is and how it stands, what is wrong, and a readout. */
function traceMarkup(trace: Trace): string {
  return [
    `<span class="gd-label-head">`,
    `<span class="gd-code">${esc(trace.where)}</span>`,
    `<span class="gd-status-dot" style="background:${trace.color}" aria-hidden="true"></span>`,
    `<span class="gd-status">${esc(trace.status)}</span>`,
    `</span>`,
    `<span class="gd-trace-title">${esc(trace.title)}</span>`,
    `<span class="gd-readout">`,
    ...trace.readings.map(
      (r) => `<span class="gd-reading ${r.cls}"><span class="gd-caption">${esc(r.caption)}</span><span class="gd-value">${r.value}</span></span>`,
    ),
    `</span>`,
  ].join('');
}
