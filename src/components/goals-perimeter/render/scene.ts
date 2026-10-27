import { select, type Selection } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import {
  CALLOUT,
  calloutWidth,
  camPose,
  clampPitch,
  COMPACT_ABOVE,
  standingCallouts,
  TINY_ABOVE,
  createCalloutLayout,
  createSatelliteNamer,
  DEFAULT_CALLS,
  DEFAULT_CAMERA,
  deriveConnections,
  fitScene,
  formatCount,
  formatHealth,
  formatMultiplier,
  goalOrbits,
  goalSatellites,
  LINK_SAMPLES,
  linkPoints,
  MARK,
  orbitItems,
  orbitPaths,
  projector,
  ringArc,
  ringTicks,
  satelliteRect,
  sceneGoals,
  sceneLinks,
  sceneView,
  tickStep,
  wrapYaw,
  zoomCamera,
  buildAgentField,
  type BoardLayout,
  type Callout,
  type CallSlot,
  type ExternalDependency,
  type Frame,
  type GoalConnection,
  type GoalsPerimeterModel,
  type HoldState,
  type LinkTrack,
  type Orbits,
  type PerimeterGoal,
  type Projected,
  type ResourceGroup,
  type Satellite,
  type SceneDims,
  type SceneGoal,
  type SceneLink,
  type StageCamera,
} from '../lib/index.js';
import { EXCEPTIONS, goalShown, healthShown } from './exceptions.js';
import { createPainter, type Painter } from './field-painter.js';
import { scenePalette, type ScenePalette } from './scene-palette.js';

type Pointer = MouseEvent | FocusEvent;

/** Callbacks for the element: tooltips and the camera reading live there. */
export interface GoalsPerimeterHandlers {
  onGoalHover?: (goal: PerimeterGoal, event: Pointer) => void;
  onGroupHover?: (goal: PerimeterGoal, group: ResourceGroup, event: Pointer) => void;
  onConnectionHover?: (connection: GoalConnection, event: Pointer) => void;
  onExternalHover?: (dependency: ExternalDependency, event: Pointer) => void;
  onLeave?: () => void;
  /** The camera the board is turning to, and whether it is flat: for the zoom reading and the 3D / 2D switch. */
  onCamera?: (camera: StageCamera, dims: SceneDims) => void;
  /** Whether callouts have folded their readouts away (the board is drawn under ~90% of its design size). */
  onCompact?: (compact: boolean) => void;
}

export interface RenderGoalsPerimeterOptions {
  model: GoalsPerimeterModel;
  layout: BoardLayout;
  width: number;
  height: number;
  theme: WidgetTheme;
  handlers?: GoalsPerimeterHandlers;
  /** Where the agent picture is drawn: a layer behind the plot that may reach past it (the whole shell, in dark mode). */
  sceneLayer?: HTMLElement | null;
  /** Plot px kept clear at the left of the map window, for the camera controls. */
  rail?: number;
  /** The scene's colours, from the page style's palettes. Defaults to the default style's. */
  palette?: ScenePalette;
  /** The camera and the view to start from: kept by the element across redraws. */
  camera?: StageCamera;
  dims?: SceneDims;
  /** Only what is held stands out: the agents at work all but go out, and whatever has nothing held steps back. */
  problemsOnly?: boolean;
  /** Off: no drift, no intro, the picture painted only when something changes. Defaults to the reader's preference. */
  motion?: boolean;
}

export interface GoalsPerimeterController {
  /** Re-fits the board to a new plot size. */
  resize: (width: number, height: number) => void;
  setDims: (dims: SceneDims) => void;
  setProblemsOnly: (on: boolean) => void;
  /** Zooms about the view's centre, easing there. */
  zoomBy: (factor: number) => void;
  /** Back to 100% and the resting angle. */
  resetCamera: () => void;
  camera: () => StageCamera;
  dims: () => SceneDims;
  compact: () => boolean;
  /** Stops every loop and listener, and lets go of the picture's GPU memory. */
  destroy: () => void;
}

export const FOCUS_MS = 380;

/** Gap between the camera controls and the map window, and the controls' own width. */
export const RAIL = 56;

/** How long the agents take to gather on load. */
const INTRO_MS = 2600;
/** The scene comes up in order on load: instruments goal by goal, then the links, then the callouts (ms). */
const ENTER = { mark: 350, links: 900, callout: 1000, step: 90 };

/** How quickly the view catches up with where it was turned to: the time to close ~63% of the gap. */
const EASE_MS = 190;
const EASE_ZOOM_MS = 110;
const EASE_PAN_MS = 90;
/** How far the idle camera wanders either way, radians. */
const DRIFT = { yaw: 0.034, pitch: 0.016 };
/** The drift is far too slow to need every frame for the instruments; the chase is not. */
const DRIFT_FRAME_MS = 1000 / 30;

/** Pointer travel before a press counts as a drag, so clicks still reach goals. */
const SLOP = 2;
const YAW_PER_PX = 0.006;
const PITCH_PER_PX = 0.005;
/** After a flick the map keeps turning, slowing to a stop. */
const COAST_MS = 260;
const COAST_SHARE = 0.5;
const COAST_MAX = 0.0022;
/** A pointer that rested this long before letting go was placing the map, not throwing it. */
const REST_MS = 90;

/** Wheel travel to zoom: a notch is about a hundred units; a pinch arrives as small ones with ctrl held. */
const PER_UNIT = 0.0009;
const PER_PINCH_UNIT = 0.011;
const MOST = 80;
const CATCH_UP = 0.26;

/** The most backing-store pixels the agent canvas may hold. */
const MAX_PIXELS = 9e6;

/** A held agent's colour, the same in its cloud, on the diamond that holds it and on a link both ends of which it holds. */
const HOLD_COLOR: Record<HoldState, string> = {
  awaiting: 'var(--gp-awaiting)',
  blocked: 'var(--gp-blocked)',
  failed: 'var(--gp-failed)',
};

const STATUS_TONE = { healthy: 'var(--gp-ok)', degraded: 'var(--gp-warn)', critical: 'var(--gp-blocked)' } as const;

let instanceCount = 0;

const f1 = (n: number) => n.toFixed(1);
const diamondD = (x: number, y: number, d: number) =>
  `M${f1(x)} ${f1(y - d)}L${f1(x + d)} ${f1(y)}L${f1(x)} ${f1(y + d)}L${f1(x - d)} ${f1(y)}Z`;

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A link's line on screen, stopping short of the diamond at either end. */
function linkPath(points: { x: number; y: number }[]): string {
  const gap = 9;
  const trim = (end: number, next: number) => {
    const p = points[end]!;
    const q = points[next]!;
    const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const k = Math.min(1, gap / length);
    return `${f1(p.x + (q.x - p.x) * k)} ${f1(p.y + (q.y - p.y) * k)}`;
  };
  let d = '';
  for (let i = 0; i <= LINK_SAMPLES; i++) {
    const at = i === 0 ? trim(0, 1) : i === LINK_SAMPLES ? trim(LINK_SAMPLES, LINK_SAMPLES - 1) : `${f1(points[i]!.x)} ${f1(points[i]!.y)}`;
    d += `${i === 0 ? 'M' : 'L'}${at}`;
  }
  return d;
}

/** Calls a minute two goals make to the group a link runs through. */
function linkCalls(link: SceneLink): number {
  const calls = (g: SceneGoal) => g.goal.resourceGroups.find((r) => r.shareKey === link.connection.via)?.calls ?? DEFAULT_CALLS;
  return link.connection.via ? calls(link.a) + calls(link.b) : DEFAULT_CALLS;
}

/** What a link's line is drawn in: the hold at both ends, a link that is down or slowed, else the scene's ink. */
function linkColor(connection: GoalConnection): string | null {
  if (connection.hold) return HOLD_COLOR[connection.hold];
  if (connection.status === 'unavailable') return 'var(--gp-failed)';
  if (connection.status === 'degraded') return 'var(--gp-warn)';
  return null;
}

/**
 * Goals perimeter, after the Agent operations design: the live goals as
 * clouds of their agents — one point an agent — under an overlay of
 * instruments: each goal's progress ring and the orbit of resource groups it
 * draws on, the links between goals that share one, and a callout per goal
 * with its readings. Everything is seen through one orbit camera: drag to
 * turn it (shift-drag, or 2D, pans), scroll to zoom, double-click to reset.
 *
 * Pointing at a resource group traces it: every goal that draws on it lights
 * its diamond, and the line through them brightens.
 */
export function renderGoalsPerimeter(container: HTMLElement, options: RenderGoalsPerimeterOptions): GoalsPerimeterController | null {
  container.replaceChildren();
  const { model, layout, theme, handlers: on = {} } = options;
  if (model.empty || options.width <= 0 || options.height <= 0) return null;

  const instance = ++instanceCount;
  const motion = options.motion ?? !reducedMotion();
  const rail = options.rail ?? RAIL;
  let size = { width: options.width, height: options.height };
  let dims: SceneDims = options.dims ?? '3D';
  let problemsOnly = options.problemsOnly ?? false;
  let target: StageCamera = { ...(options.camera ?? DEFAULT_CAMERA) };
  let eased: StageCamera = { ...target };
  let drift = { yaw: 0, pitch: 0 };
  let hovered: string | null = null;
  let pointed: string | null = null;
  let compact = false;
  let tiny = false;
  let destroyed = false;

  const connections = deriveConnections(model, layout);
  const goals = sceneGoals(model, layout);
  const goalById = new Map(goals.map((g) => [g.id, g.goal]));
  const links = sceneLinks(goals, connections);
  const items = orbitItems(goals, links, model.externals);
  const orbitsFor: Record<SceneDims, Orbits> = {
    '3D': goalOrbits(goals, links, items, false),
    '2D': goalOrbits(goals, links, items, true),
  };
  const field = buildAgentField(goals);
  const namer = createSatelliteNamer();
  const callouts = createCalloutLayout();

  // ── DOM ──
  const stage = document.createElement('div');
  stage.className = 'gp-stage';
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', model.title || 'Goals perimeter');
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
  const glassId = `gp-glass-${instance}`;
  const glass = svg.append('defs').append('radialGradient').attr('id', glassId).attr('fx', 0.44).attr('fy', 0.58);
  glass.append('stop').attr('offset', 0.58).attr('stop-color', 'white').attr('stop-opacity', 0);
  glass.append('stop').attr('offset', 0.9).attr('stop-color', 'white').attr('stop-opacity', 0.03);
  glass.append('stop').attr('offset', 1).attr('stop-color', 'white').attr('stop-opacity', 0.085);
  const linkLayer = svg.append('g').attr('class', 'gp-links');
  const markLayer = svg.append('g').attr('class', 'gp-marks');
  const leaderLayer = svg.append('g').attr('class', 'gp-leaders');
  const labels = select(stage).append('div').attr('class', 'gp-labels');

  // the map window, framed like a viewfinder
  const frameEl = document.createElement('div');
  frameEl.className = 'gp-frame';
  frameEl.setAttribute('aria-hidden', 'true');
  frameEl.innerHTML = `<span class="gp-crop tl"></span><span class="gp-crop tr"></span><span class="gp-crop bl"></span><span class="gp-crop br"></span>`;
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

  // ── one frame of the board ──
  let lastOverlay = 0;

  const tooltipFor = (s: Satellite, goal: PerimeterGoal, event: Pointer) => {
    if (s.group) on.onGroupHover?.(goal, s.group, event);
    else if (s.external) on.onExternalHover?.(s.external, event);
  };

  const drawFrame = (now: number, overlay: boolean) => {
    if (destroyed) return;
    const frame = mapFrame();
    const fit = fitScene(size, frame);
    const view = sceneView(fit, eased);
    const u = view.unit;
    const flat = dims === '2D';
    const pose = camPose(dims, { yaw: eased.yaw + drift.yaw, pitch: eased.pitch + drift.pitch });
    const P = projector(pose);
    const toScreen = (x: number, y: number) => ({ x: view.toX(x), y: view.toY(y) });
    const screenOf = (p: Projected) => ({ x: view.toX(p.x), y: view.toY(p.y), k: p.k, z: p.z });
    const orbits = orbitsFor[dims];
    const traced = new Set([pointed].filter((key): key is string => !!key));

    // links run between the diamonds of what goals share
    const drawn = links.map((link, seed) => {
      const world = linkPoints(link, orbits, MARK.orbit * u, (MARK.scale + MARK.major + 14) * u, flat);
      return {
        link,
        world,
        seed,
        points: world.map((p) => screenOf(P(...p))),
        lit: hovered === link.a.id || hovered === link.b.id || traced.has(link.aSlot),
      };
    });

    const placed = goals.map((g, index) => {
      const c = P(g.x, g.y, g.z);
      const at = toScreen(c.x, c.y);
      const R = g.r * c.k * view.scale;
      return { g, index, c, at, R, satellites: [] as Satellite[] };
    });

    // the picture
    if (painter) {
      const rect = fieldRect();
      fitPainter(rect);
      const region = { x: view.fromX(rect.left), y: view.fromY(rect.top), w: rect.width * u, h: rect.height * u };
      const slots: CallSlot[] = goals.flatMap((g) =>
        (orbits[g.id] ?? []).flatMap((slot) => {
          if (!slot.group) return [];
          const state = slot.group.state;
          const hold = state === 'awaiting' || state === 'blocked' || state === 'failed' ? state : undefined;
          const share = hold ? 0.3 : state === 'degraded' ? 0.12 : 0;
          return [{ goal: g.id, angle: slot.angle, calls: slot.group.calls ?? DEFAULT_CALLS, trouble: share, ...(hold ? { hold } : {}) }];
        }),
      );
      const tracks: LinkTrack[] = drawn.map(({ link, world, seed }) => ({
        points: world,
        calls: linkCalls(link),
        seed,
        alpha: Math.min(goalShown(link.a.goal, problemsOnly), goalShown(link.b.goal, problemsOnly)),
        ...(link.connection.hold ? { hold: link.connection.hold } : {}),
      }));
      if (!started) started = now;
      const settle = motion ? Math.min(1, (now - started) / INTRO_MS) : 1;
      try {
        painter.paint({
          pose,
          unit: u,
          healthy: problemsOnly ? EXCEPTIONS.healthy : 1,
          goalAlpha: (id) => {
            const goal = goalById.get(id);
            return goal ? goalShown(goal, problemsOnly) : 1;
          },
          links: tracks,
          orbit: MARK.orbit * u,
          flat,
          slots,
          focus: hovered,
          region,
          zoom: eased.zoom,
          time: motion ? (now - started) / 1000 : null,
          intro: 1 - Math.pow(1 - settle, 3),
        });
      } catch {
        // a lost or broken context: the instruments still draw
      }
    }

    if (!overlay) return;
    lastOverlay = now;

    // which ways links leave each diamond, so its name can keep off them
    const leaving: Record<string, Record<string, { x: number; y: number }[]>> = {};
    for (const { link, points } of drawn) {
      const ends = [
        [link.a.id, link.aSlot, points[0]!, points[2]!],
        [link.b.id, link.bSlot, points[LINK_SAMPLES]!, points[LINK_SAMPLES - 2]!],
      ] as const;
      for (const [goalId, key, from, to] of ends) {
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        ((leaving[goalId] ??= {})[key] ??= []).push({ x: (to.x - from.x) / length, y: (to.y - from.y) / length });
      }
    }
    for (const p of placed) {
      p.satellites = goalSatellites(p.g, orbits[p.g.id] ?? [], P, flat, u, toScreen);
    }
    const hold = [dims, eased.yaw.toFixed(4), eased.pitch.toFixed(4), u.toFixed(4), frame.x0, frame.y0, frame.x1.toFixed(0), frame.y1.toFixed(0)].join();
    namer(
      placed.map((p) => ({ id: p.g.id, x: p.at.x, y: p.at.y, r: p.R, satellites: p.satellites })),
      leaving,
      hold,
    );

    // callouts keep clear of the goals, the names on their orbits, the links and each other
    const nextCompact = u > COMPACT_ABOVE;
    if (nextCompact !== compact) {
      compact = nextCompact;
      on.onCompact?.(compact);
    }
    tiny = u > TINY_ABOVE;
    stage.toggleAttribute('data-compact', compact);
    stage.toggleAttribute('data-tiny', tiny);
    const placedCallouts = callouts.layout(
      placed.map((p) => ({ id: p.g.id, x: p.at.x, y: p.at.y, r: p.R, width: calloutWidth(p.g.goal, compact) })),
      {
        circles: placed.map((p) => ({ id: p.g.id, x: p.at.x, y: p.at.y, r: p.R + MARK.scale + MARK.major + 3 })),
        rects: placed.flatMap((p) => p.satellites.map(satelliteRect)),
        points: drawn.flatMap((d) => d.points),
        frame,
      },
      compact ? CALLOUT.compactHeight : CALLOUT.height,
      hold,
      motion,
    );
    const standing = tiny
      ? standingCallouts(
          placedCallouts,
          placed.map((p) => ({ id: p.g.id, x: p.at.x, y: p.at.y, r: p.R + MARK.scale })),
          [...placed].sort((a, b) => b.g.goal.agents.total - a.g.goal.agents.total).map((p) => p.g.id),
          frame,
        )
      : null;
    const calloutOf = new Map(placedCallouts.filter((c) => !standing || standing.has(c.id)).map((c) => [c.id, c]));

    drawLinks(drawn);
    drawMarks(placed, traced, flat, P, u, toScreen);
    drawCallouts(placed, calloutOf);
  };

  // ── drawing ──
  type Drawn = { link: SceneLink; points: { x: number; y: number }[]; lit: boolean };
  const drawLinks = (drawn: Drawn[]) => {
    linkLayer
      .selectAll<SVGGElement, Drawn>('g.gp-link')
      .data(drawn, (d) => d.link.key)
      .join((enter) => {
        const g = enter
          .append('g')
          .attr('class', (d) => `gp-link gp-appear${d.link.connection.hold || d.link.connection.status !== 'active' ? ' is-held' : ''}`)
          .attr('data-link', (d) => d.link.key)
          .style('animation-delay', `${ENTER.links}ms`);
        g.append('path').attr('class', 'gp-link-hit');
        g.append('path').attr('class', 'gp-link-line');
        g.on('mouseenter', (event: MouseEvent, d) => on.onConnectionHover?.(d.link.connection, event)).on('mouseleave', () => on.onLeave?.());
        return g;
      })
      .each(function (d) {
        const path = linkPath(d.points);
        const g = select(this);
        g.select('.gp-link-hit').attr('d', path);
        const color = linkColor(d.link.connection);
        const shown = Math.min(goalShown(d.link.a.goal, problemsOnly), goalShown(d.link.b.goal, problemsOnly));
        g.attr('opacity', shown * healthShown(d.link.connection.hold ? 'held' : 'clean', problemsOnly));
        g.select('.gp-link-line')
          .attr('d', path)
          .attr('stroke', color ?? 'var(--gp-line)')
          .attr('opacity', color ? (d.lit ? 1 : 0.72) : d.lit ? 0.62 : 0.3);
      });
  };

  type Placed = { g: SceneGoal; index: number; c: Projected; at: { x: number; y: number }; R: number; satellites: Satellite[] };
  const drawMarks = (
    placed: Placed[],
    traced: Set<string>,
    flat: boolean,
    P: ReturnType<typeof projector>,
    u: number,
    toScreen: (x: number, y: number) => { x: number; y: number },
  ) => {
    markLayer
      .selectAll<SVGGElement, Placed>('g.gp-goal')
      .data(placed, (d) => d.g.id)
      .join((enter) => {
        const outer = enter.append('g').attr('class', 'gp-goal').attr('data-goal', (d) => d.g.id);
        const g = outer
          .append('g')
          .attr('class', 'gp-goal-mark gp-appear')
          .style('animation-delay', (d) => `${ENTER.mark + d.index * ENTER.step}ms`);
        g.append('circle').attr('class', 'gp-hit');
        g.append('path').attr('class', 'gp-orbit far');
        g.append('circle').attr('class', 'gp-glass').attr('fill', `url(#${glassId})`);
        g.append('path').attr('class', 'gp-ticks on');
        g.append('path').attr('class', 'gp-ticks off');
        g.append('path').attr('class', 'gp-rest');
        g.append('path')
          .attr('class', 'gp-progress gp-draw')
          .attr('pathLength', 1)
          .style('animation-delay', (d) => `${ENTER.mark + d.index * ENTER.step + 150}ms`);
        g.append('path')
          .attr('class', 'gp-glint')
          .attr('pathLength', 1)
          .style('animation-delay', (d) => `${(ENTER.mark + d.index * ENTER.step) * 4 + 2600}ms`);
        g.append('path').attr('class', 'gp-needle');
        g.append('path').attr('class', 'gp-orbit near');
        g.append('g').attr('class', 'gp-satellites');
        g.append('path').attr('class', 'gp-brackets');
        g.on('mouseenter', (event: MouseEvent, d) => {
            setHover(d.g.id);
            on.onGoalHover?.(d.g.goal, event);
          })
          .on('mouseleave', () => {
            setHover(null);
            on.onLeave?.();
          });
        return outer;
      })
      .each(function (d) {
        const { g, c, at, R } = d;
        const lit = hovered === g.id;
        const progress = g.goal.health;
        const outer = select(this);
        // goals further from the camera sit back a little
        outer.attr('opacity', goalShown(g.goal, problemsOnly) * Math.max(0.74, Math.min(1, 1 - c.z / 1500)));
        const mark = outer.select('.gp-goal-mark');
        mark.classed('is-lit', lit);
        const ring = R + MARK.ring;
        const scale = R + MARK.scale;
        const step = tickStep(Math.PI * 2 * scale);
        mark.select('.gp-hit').attr('cx', f1(at.x)).attr('cy', f1(at.y)).attr('r', f1(R + 16));
        const orbit = orbitPaths(g, g.r + MARK.orbit * u, flat, P);
        const segments = (list: Projected[][]) =>
          list
            .map(([p, q]) => {
              const a = toScreen(p!.x, p!.y);
              const b = toScreen(q!.x, q!.y);
              return `M${f1(a.x)} ${f1(a.y)}L${f1(b.x)} ${f1(b.y)}`;
            })
            .join('');
        mark.select('.gp-orbit.far').attr('d', segments(orbit.far));
        mark.select('.gp-orbit.near').attr('d', segments(orbit.near)).attr('opacity', lit ? 0.5 : 0.34);
        mark.select('.gp-glass').attr('cx', f1(at.x)).attr('cy', f1(at.y)).attr('r', f1(ring));
        mark.select('.gp-ticks.on').attr('d', ringTicks(at.x, at.y, scale, MARK.minor, MARK.major, step, 0, progress)).attr('opacity', lit ? 0.7 : 0.5);
        mark
          .select('.gp-ticks.off')
          .attr('d', ringTicks(at.x, at.y, scale, MARK.minor, MARK.major, step, progress + 1e-4, 1))
          .attr('opacity', lit ? 0.28 : 0.18);
        mark.select('.gp-rest').attr('d', ringArc(at.x, at.y, ring, progress, 1)).attr('opacity', lit ? 0.3 : 0.18);
        const arc = ringArc(at.x, at.y, ring, 0, progress);
        mark.select('.gp-progress').attr('d', arc);
        mark.select('.gp-glint').attr('d', arc);
        // the needle: where progress has got to
        const end = -Math.PI / 2 + progress * Math.PI * 2;
        const needle = (from: number, to: number) =>
          `M${f1(at.x + Math.cos(end) * (ring + from))} ${f1(at.y + Math.sin(end) * (ring + from))}L${f1(at.x + Math.cos(end) * (ring + to))} ${f1(at.y + Math.sin(end) * (ring + to))}`;
        mark.select('.gp-needle').attr('d', needle(-4, 11));
        const h = R + MARK.bracket;
        const arm = 9;
        const brackets = [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]
          .map(([sx, sy]) => `M${f1(at.x + sx! * h)} ${f1(at.y + sy! * (h - arm))}L${f1(at.x + sx! * h)} ${f1(at.y + sy! * h)}L${f1(at.x + sx! * (h - arm))} ${f1(at.y + sy! * h)}`)
          .join('');
        mark.select('.gp-brackets').attr('d', brackets).attr('opacity', lit ? 0.75 : 0);

        drawSatellites(mark.select<SVGGElement>('.gp-satellites'), d, lit, traced);
      });
  };

  const drawSatellites = (layer: Selection<SVGGElement, unknown, null, undefined>, d: Placed, lit: boolean, traced: Set<string>) => {
    const goal = d.g.goal;
    layer
      .selectAll<SVGGElement, Satellite>('g.gp-satellite')
      .data(d.satellites, (s) => s.key)
      .join((enter) => {
        const g = enter.append('g').attr('class', 'gp-satellite').attr('data-slot', (s) => s.key);
        g.append('circle').attr('class', 'gp-hit').attr('r', 12);
        const body = g.append('g').attr('class', 'gp-diamond');
        body.append('path').attr('class', 'gp-diamond-edge');
        body.append('circle').attr('class', 'gp-diamond-dot').attr('r', 1.4);
        body.append('path').attr('class', 'gp-diamond-core');
        g.append('path').attr('class', 'gp-diamond-trace');
        const text = g.append('text').attr('class', 'gp-satellite-name');
        text.append('tspan').attr('class', 'gp-name');
        text.append('tspan').attr('class', 'gp-count');
        g.on('mouseenter', (event: MouseEvent, s) => {
          pointed = s.key;
          requestOverlay();
          tooltipFor(s, goal, event);
        })
          .on('mouseleave', () => {
            pointed = null;
            requestOverlay();
            on.onLeave?.();
          });
        return g;
      })
      .each(function (s) {
        const g = select(this);
        const color = s.hold ? HOLD_COLOR[s.hold] : s.health === 'degraded' ? 'var(--gp-warn)' : 'var(--gp-line)';
        const isOn = traced.has(s.key);
        const dd = MARK.diamond;
        g.select('.gp-hit').attr('cx', f1(s.x)).attr('cy', f1(s.y));
        // behind the goal the diamond sits back; its name stays readable
        g.select('.gp-diamond').attr('opacity', (s.front ? 1 : 0.6) * healthShown(s.health, problemsOnly));
        g.select('.gp-diamond-edge').attr('d', diamondD(s.x, s.y, dd)).attr('stroke', color);
        g.select('.gp-diamond-dot')
          .attr('cx', f1(s.x))
          .attr('cy', f1(s.y))
          .attr('fill', color)
          .attr('display', s.health === 'degraded' ? null : 'none');
        g.select('.gp-diamond-core')
          .attr('d', diamondD(s.x, s.y, dd * 0.5))
          .attr('fill', color)
          .attr('display', s.hold ? null : 'none');
        g.select('.gp-diamond-trace')
          .attr('d', diamondD(s.x, s.y, dd + 4.5))
          .attr('display', isOn ? null : 'none');
        const text = g
          .select('.gp-satellite-name')
          .attr('x', f1(s.labelX))
          .attr('y', f1(s.labelY + 3.5))
          .attr('text-anchor', s.anchor)
          .attr('opacity', (tiny || (compact && s.health === 'clean')) && !lit && !isOn ? 0 : healthShown(s.health, problemsOnly && !lit && !isOn))
          .classed('is-lit', isOn || lit);
        text.select('.gp-name').text(s.name);
        text.select('.gp-count').text(s.held ? ` ${s.held}` : '');
      });
  };

  const drawCallouts = (placed: Placed[], calloutOf: Map<string, Callout>) => {
    type Entry = { p: Placed; callout: Callout; ghost: boolean };
    const entries: Entry[] = placed.flatMap((p) => {
      const callout = calloutOf.get(p.g.id);
      if (!callout) return [];
      const list: Entry[] = [{ p, callout, ghost: false }];
      if (callout.leaving) list.push({ p, callout: callout.leaving, ghost: true });
      return list;
    });
    const keyOf = (e: Entry) => `${e.p.g.id}${e.ghost ? ':leaving' : ''}`;

    leaderLayer
      .selectAll<SVGGElement, Entry>('g.gp-leader')
      .data(entries, keyOf)
      .join((enter) => {
        const g = enter
          .append('g')
          .attr('class', (e) => `gp-leader${e.ghost ? '' : ' gp-appear'}`)
          .attr('data-goal', (e) => e.p.g.id)
          .style('animation-delay', (e) => (e.ghost ? null : `${ENTER.callout + e.p.index * ENTER.step}ms`));
        g.append('path').attr('class', 'gp-leader-line');
        g.append('rect').attr('class', 'gp-leader-end').attr('width', 3).attr('height', 3);
        g.append('line').attr('class', 'gp-spine');
        g.append('rect').attr('class', 'gp-bar').attr('width', 2).attr('height', CALLOUT.head - 4);
        return g;
      })
      .each(function (e) {
        const c = e.callout;
        const lit = !e.ghost && hovered === e.p.g.id;
        const g = select(this).attr('opacity', c.fade * goalShown(e.p.g.goal, problemsOnly));
        g.select('.gp-leader-line')
          .attr('d', `M${f1(c.ax)} ${f1(c.ay)}L${f1(c.ex)} ${f1(c.ey)}L${f1(c.hx)} ${f1(c.hy)}`)
          .attr('opacity', lit ? 0.85 : 0.42);
        g.select('.gp-leader-end').attr('x', f1(c.ax - 1.5)).attr('y', f1(c.ay - 1.5));
        g.select('.gp-spine').attr('x1', f1(c.hx)).attr('x2', f1(c.hx)).attr('y1', f1(c.rect.y0)).attr('y2', f1(c.rect.y1));
        g.select('.gp-bar').attr('x', f1(c.hx - 1)).attr('y', f1(c.rect.y0 + 2));
      });

    labels
      .selectAll<HTMLDivElement, Entry>('div.gp-callout')
      .data(entries, keyOf)
      .join((enter) => {
        const div = enter
          .append('div')
          .attr('class', 'gp-callout')
          .attr('data-goal', (e) => e.p.g.id)
          .classed('is-ghost', (e) => e.ghost);
        const label = div
          .append('div')
          .attr('class', (e) => `gp-callout-label${e.ghost ? '' : ' gp-rise'}`)
          .attr('aria-hidden', (e) => (e.ghost ? 'true' : null))
          .style('animation-delay', (e) => (e.ghost ? null : `${ENTER.callout + 80 + e.p.index * ENTER.step}ms`));
        label.each(function (e) {
          this.innerHTML = calloutMarkup(e.p.g.goal);
        });
        label
          .on('mouseenter', (event: MouseEvent, e) => {
            setHover(e.p.g.id);
            on.onGoalHover?.(e.p.g.goal, event);
          })
          .on('mouseleave', () => {
            setHover(null);
            on.onLeave?.();
          });
        return div;
      })
      .each(function (e) {
        const c = e.callout;
        const right = c.side > 0;
        const div = select(this)
          .classed('is-left', !right)
          .classed('is-lit', !e.ghost && hovered === e.p.g.id)
          .style('left', `${f1(right ? c.rect.x0 : c.rect.x1)}px`)
          .style('top', `${f1(c.rect.y0)}px`)
          .style('opacity', c.fade * goalShown(e.p.g.goal, problemsOnly));
        div.select('.gp-callout-label').classed('is-compact', compact);
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
  let last = 0;
  let clockStart = 0;
  const tick = (now: number) => {
    raf = 0;
    if (destroyed) return;
    if (!clockStart) clockStart = last = now;
    const dt = Math.min(64, now - last);
    last = now;
    // the view follows the camera with a little weight
    const gap = {
      yaw: wrapYaw(target.yaw - eased.yaw),
      pitch: target.pitch - eased.pitch,
      zoom: Math.log(target.zoom / eased.zoom),
      panX: target.panX - eased.panX,
      panY: target.panY - eased.panY,
    };
    const chasing =
      Math.abs(gap.yaw) > 2e-4 || Math.abs(gap.pitch) > 2e-4 || Math.abs(gap.zoom) > 1e-3 || Math.abs(gap.panX) > 0.3 || Math.abs(gap.panY) > 0.3;
    if (chasing && motion) {
      const turn = 1 - Math.exp(-dt / EASE_MS);
      const scale = 1 - Math.exp(-dt / EASE_ZOOM_MS);
      const slide = 1 - Math.exp(-dt / EASE_PAN_MS);
      eased = {
        yaw: wrapYaw(eased.yaw + gap.yaw * turn),
        pitch: eased.pitch + gap.pitch * turn,
        zoom: eased.zoom * Math.exp(gap.zoom * scale),
        panX: eased.panX + gap.panX * slide,
        panY: eased.panY + gap.panY * slide,
      };
    } else {
      eased = { ...target };
    }
    // left alone it drifts a degree or two, back and forth, never quite repeating
    if (motion && dims === '3D') {
      const t = (now - clockStart) / 1000;
      const ease = Math.min(1, t / 6);
      drift = {
        yaw: ease * DRIFT.yaw * (Math.sin(t * 0.11) * 0.72 + Math.sin(t * 0.047 + 1.3) * 0.28),
        pitch: ease * DRIFT.pitch * (Math.sin(t * 0.083 + 2.1) * 0.7 + Math.sin(t * 0.19) * 0.3),
      };
    } else drift = { yaw: 0, pitch: 0 };

    const overlay = overlayWanted || chasing || callouts.changing() || (motion && dims === '3D' && now - lastOverlay >= DRIFT_FRAME_MS);
    overlayWanted = false;
    drawFrame(now, overlay);
    if (motion && visible) raf = requestAnimationFrame(tick);
    else if (chasing || callouts.changing()) raf = requestAnimationFrame(tick);
  };
  const request = () => {
    if (!raf && !destroyed) raf = requestAnimationFrame(tick);
  };

  // pause while the board is off screen or the tab is hidden
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
    on.onCamera?.({ ...target }, dims);
    requestOverlay();
  };

  // ── input: drag to turn, shift-drag or 2D to pan, wheel to zoom, double-click to reset ──
  let drag: {
    pointer: number;
    x: number;
    y: number;
    start: StageCamera;
    pan: boolean;
    moved: boolean;
    at: { x: number; y: number; time: number };
    speed: { x: number; y: number };
  } | null = null;
  let coast = 0;
  let swallowClick = false;
  const throwOn = (speed: { yaw: number; pitch: number }) => {
    let lastStep = 0;
    const step = (ts: number) => {
      const dt = lastStep ? Math.min(48, ts - lastStep) : 16;
      lastStep = ts;
      const fade = Math.exp(-dt / COAST_MS);
      speed.yaw *= fade;
      speed.pitch *= fade;
      if (Math.hypot(speed.yaw, speed.pitch) < 2e-5) return;
      setCamera({ yaw: wrapYaw(target.yaw + speed.yaw * dt), pitch: clampPitch(target.pitch + speed.pitch * dt) });
      coast = requestAnimationFrame(step);
    };
    coast = requestAnimationFrame(step);
  };
  const isControl = (event: Event) => event.target instanceof Element && !!event.target.closest('button');
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || isControl(event)) return;
    cancelAnimationFrame(coast);
    swallowClick = false;
    drag = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      start: { ...target },
      pan: event.shiftKey || dims === '2D',
      moved: false,
      at: { x: event.clientX, y: event.clientY, time: event.timeStamp },
      speed: { x: 0, y: 0 },
    };
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
    const dt = event.timeStamp - d.at.time;
    if (dt > 0) {
      d.speed = { x: d.speed.x * 0.6 + ((event.clientX - d.at.x) / dt) * 0.4, y: d.speed.y * 0.6 + ((event.clientY - d.at.y) / dt) * 0.4 };
      d.at = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    }
    setCamera(
      d.pan
        ? { panX: d.start.panX + dx, panY: d.start.panY + dy }
        : { yaw: wrapYaw(d.start.yaw + dx * YAW_PER_PX), pitch: clampPitch(d.start.pitch + dy * PITCH_PER_PX) },
    );
  };
  const onPointerUp = (event: PointerEvent) => {
    const d = drag;
    if (d?.moved) {
      swallowClick = true;
      if (!d.pan && motion && event.timeStamp - d.at.time < REST_MS) {
        const cap = (v: number) => Math.max(-COAST_MAX, Math.min(COAST_MAX, v * COAST_SHARE));
        throwOn({ yaw: cap(d.speed.x * YAW_PER_PX), pitch: cap(d.speed.y * PITCH_PER_PX) });
      }
    }
    drag = null;
    stage.classList.remove('is-dragging');
  };
  const onClickCapture = (event: MouseEvent) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.stopPropagation();
    event.preventDefault();
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
  const onDoubleClick = (event: MouseEvent) => {
    if (isControl(event)) return;
    asked = null;
    cancelAnimationFrame(coast);
    setCamera({ ...DEFAULT_CAMERA });
  };
  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('click', onClickCapture, true);
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
    setDims(next) {
      if (next === dims) return;
      dims = next;
      on.onCamera?.({ ...target }, dims);
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
    resetCamera() {
      asked = null;
      cancelAnimationFrame(coast);
      setCamera({ ...DEFAULT_CAMERA });
    },
    camera: () => ({ ...target }),
    dims: () => dims,
    compact: () => compact,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(coast);
      cancelAnimationFrame(zoomRaf);
      intersect?.disconnect();
      document.removeEventListener('visibilitychange', updateVisible);
      painter?.dispose();
      fieldHost.remove();
    },
  };
}

/**
 * A goal's label, set at one size whatever the board's scale: its code and
 * status, its name, and a readout — agents, progress, burn against baseline,
 * agents held. Compact, the readout shows as one line under the pointer.
 */
function calloutMarkup(goal: PerimeterGoal): string {
  const esc = (text: string) => text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const held = goal.impure;
  const burn = goal.multiplier !== null ? formatMultiplier(goal.multiplier) : '';
  const heldMark = held > 0 ? '<span class="gp-held-mark" aria-hidden="true"></span>' : '';
  const reading = (caption: string, cls: string, value: string) =>
    `<span class="gp-reading ${cls}"><span class="gp-caption">${caption}</span><span class="gp-value">${value}</span></span>`;
  return [
    `<span class="gp-callout-head">`,
    goal.code ? `<span class="gp-code">${esc(goal.code)}</span>` : '',
    `<span class="gp-status-dot" style="background:${STATUS_TONE[goal.status]}" aria-hidden="true"></span>`,
    `<span class="gp-status">${esc(goal.statusLabel)}</span>`,
    `</span>`,
    `<span class="gp-callout-name">${esc(goal.name)}</span>`,
    `<span class="gp-readout">`,
    reading('Agents', 'agents', formatCount(goal.agents.total)),
    reading('Progress', 'progress', formatHealth(goal.health)),
    burn ? reading(esc(goal.multiplierLabel), 'burn', burn) : '',
    reading('Held', 'held', `${heldMark}<span class="${held > 0 ? '' : 'gp-quiet'}">${formatCount(held)}</span>`),
    `</span>`,
    `<span class="gp-readout-line">`,
    `<span>${formatCount(goal.agents.total)} agents</span><span class="gp-sep">·</span><span>${formatHealth(goal.health)}</span><span class="gp-sep">·</span>${heldMark}<span>${formatCount(held)} held</span>`,
    `</span>`,
  ].join('');
}
