import { html, render, svg } from 'lit';

import type { ChartTooltipContent } from '../../../element/chart-tooltip-portal.js';
import {
  arcPath,
  ARENA,
  arenaExtent,
  arenaField,
  arenaPoint,
  arenaPose,
  arenaSectors,
  clampPitch,
  createLabelLayout,
  DAY_MINUTES,
  DEFAULT_CAMERA,
  LABEL,
  labelHeight,
  patchPath,
  PIVOT_X,
  PIVOT_Y,
  projector,
  resampleDay,
  wallBins,
  wrapYaw,
  zoomCamera,
  type AssetHealthDayBin,
  type AssetHealthModel,
  type CallSlot,
  type LabelFrame,
  type Project,
  type Sector,
  type StageCamera,
} from '../lib/index.js';
import { createPainter, type Painter } from './field-painter.js';
import { groupLabel } from './label.js';
import { hubMarks, labelLeader, sectorMarks } from './marks.js';
import type { ScenePalette } from './scene-palette.js';
import { assetTip, benchTip, hubTip, sectionTip, troubleTip, wallTip } from './tips.js';

type Pointer = PointerEvent | FocusEvent;

/** Callbacks for the element: tooltips and the camera live there. */
export interface AssetHealthHandlers {
  onTip?: (content: ChartTooltipContent, event: Pointer) => void;
  onLeave?: () => void;
  /** Where the arena has been turned to, so a redraw keeps it. */
  onCamera?: (camera: StageCamera) => void;
}

export interface RenderAssetHealthOptions {
  model: AssetHealthModel;
  width: number;
  height: number;
  palette: ScenePalette;
  /** Seen from straight overhead, without turning. */
  plan?: boolean;
  /** Only what is held stands out: the agents at work all but go out, and the clean sections step back. */
  problemsOnly?: boolean;
  camera?: StageCamera;
  /** Off: no drift, no intro, the picture painted only when something changes. Defaults to the reader's preference. */
  motion?: boolean;
  /** Where the agents' picture is drawn: a layer behind the plot that may reach past it. */
  sceneLayer?: HTMLElement | null;
  handlers?: AssetHealthHandlers;
}

export interface AssetHealthController {
  resize: (width: number, height: number) => void;
  setPlan: (plan: boolean) => void;
  setProblemsOnly: (on: boolean) => void;
  /** Back to the resting angle, at 100% and unpanned. */
  resetCamera: () => void;
  camera: () => StageCamera;
  /** Stops every loop and listener, and lets go of the picture's GPU memory. */
  destroy: () => void;
}

/** The arena is drawn no larger than this many screen px per design px: past it a bigger card gives it air. */
const MAX_SCALE = 2.3;
const MIN_SCALE = 0.4;
/** Under this scale of the tilted arena there is no room beside it for whole labels: they keep to their heads, in plan too. */
const FULL_ABOVE = 1.12;
/** Kept clear over and under the arena, screen px. */
const ROOM = { top: 26, bottom: 30 };
/** The scene comes up in order: agents take their seats, the hub and the sections follow, then the labels (ms). */
const ENTER = { hub: 350, sector: 520, label: 1000, step: 90 };
/** How long the agents take to settle on load. */
const INTRO_MS = 2600;
/** Brightness of working and idle agents when only problems are shown. Kept low: the grade lifts faint light. */
const QUIET_AGENTS = 0.05;

/** How quickly the view catches up with where it was turned to: the time to close ~63% of the gap. */
const EASE_MS = 190;
/** Zoom and pan are held closer to the hand. */
const EASE_ZOOM_MS = 110;
const EASE_PAN_MS = 90;
/** How far the idle camera wanders either way, radians. */
const DRIFT = { yaw: 0.034, pitch: 0.016 };
/** The drift is far too slow to need every frame for the instruments; the chase is not. */
const DRIFT_FRAME_MS = 1000 / 30;

/** Pointer travel before a press counts as a drag, so clicks still reach sections. */
const SLOP = 2;
const YAW_PER_PX = 0.006;
const PITCH_PER_PX = 0.005;
/** After a flick the arena keeps turning, slowing to a stop. */
const COAST_MS = 260;
const COAST_SHARE = 0.5;
const COAST_MAX = 0.0022;
/** A pointer that rested this long before letting go was placing the arena, not throwing it. */
const REST_MS = 90;

/**
 * How much one unit of wheel travel zooms. A mouse wheel arrives in notches of
 * about a hundred units; a trackpad in a stream of small ones; a pinch as a
 * wheel with ctrl held and smaller ones still, so it weighs more.
 */
const PER_UNIT = 0.0009;
const PER_PINCH_UNIT = 0.011;
/** The most one event may count for, so a coarse wheel cannot jump: about 7% a notch. */
const MOST = 80;
/** Share of the way to the zoom asked for that is covered each frame. */
const CATCH_UP = 0.26;

/** The most backing-store pixels the agent canvas may hold. */
const MAX_PIXELS = 9e6;

const TROUBLE_POOLS = ['blocked', 'failed', 'awaiting', 'slowed'] as const;
const POOL_TONE = { blocked: 'var(--ah-blocked)', failed: 'var(--ah-failed)', awaiting: 'var(--ah-awaiting)', slowed: 'var(--ah-warn)' } as const;

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The goal opened as an arena, after the Agent operations design: its
 * agents — one dot each — seated in rows, each in the section of the asset
 * category its work is with, the held ones in the front rows against that
 * category's gate. Behind each gate stand the category's assets, a cell
 * each, and behind them the wall of its last 24 hours; in the middle of the
 * floor, the goal's progress — and under it all the floor itself, a slab of
 * smoked glass. A label beside the arena reads each section.
 *
 * Drag turns it (shift-drag, or any drag in plan, pans), the wheel zooms,
 * double-click sets it back; pointing at a section lights it, clicking picks
 * it out.
 */
export function renderAssetHealth(container: HTMLElement, options: RenderAssetHealthOptions): AssetHealthController | null {
  container.replaceChildren();
  const { model, handlers: on = {} } = options;
  if (model.empty || options.width <= 0 || options.height <= 0) return null;

  const motion = options.motion ?? !reducedMotion();
  const goal = model.goal;
  const sectors = arenaSectors(model.sections);
  const seated = arenaField(goal, sectors);
  const sectorOf = new Map(sectors.map((s) => [s.section.id, s]));
  const layoutLabels = createLabelLayout();

  let size = { width: options.width, height: options.height };
  let plan = options.plan ?? false;
  let problemsOnly = options.problemsOnly ?? false;
  let target: StageCamera = { ...(options.camera ?? DEFAULT_CAMERA) };
  let eased: StageCamera = { ...target };
  let drift = { yaw: 0, pitch: 0 };
  let hovered: string | null = null;
  let pointed: string | null = null;
  let picked: string | null = null;
  let tipKey: string | null = null;
  let destroyed = false;
  let dirty = true;
  /** Each section's day as its wall last drew it, for the wall's tip. */
  let days = new Map<string, AssetHealthDayBin[]>();

  // ── DOM ──
  const stage = document.createElement('div');
  stage.className = 'ah-stage';
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', goal.name ? `Asset health: ${goal.name}` : 'Asset health');
  container.append(stage);

  const sceneHost = options.sceneLayer ?? stage;
  const fieldHost = document.createElement('div');
  fieldHost.className = 'ah-field';
  sceneHost.append(fieldHost);
  // the floor: a round slab of glass — seen tilted, an ellipse — under the painter's canvas, so the agents are light on it
  const floorEdge = document.createElement('div');
  floorEdge.className = 'ah-floor ah-floor-edge';
  const floorTop = document.createElement('div');
  floorTop.className = 'ah-floor ah-floor-top';
  fieldHost.append(floorEdge, floorTop);

  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlay.setAttribute('class', 'ah-overlay');
  overlay.setAttribute('aria-hidden', 'true');
  const labels = document.createElement('div');
  labels.className = 'ah-labels';
  stage.append(overlay, labels);

  // ── the picture ──
  let painter: Painter | null = null;
  let paintedFor = '';
  let started = 0;
  const freshCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.className = 'ah-field-canvas';
    fieldHost.append(canvas);
    return canvas;
  };
  try {
    painter = createPainter(freshCanvas, seated.field, options.palette);
  } catch {
    painter = null;
  }

  /** Where the picture's layer sits, in plot px: over the plot, or over the layer behind it, which may reach past it. */
  let fieldRect = { left: 0, top: 0, width: size.width, height: size.height };
  const measure = () => {
    if (sceneHost === stage) {
      fieldRect = { left: 0, top: 0, width: size.width, height: size.height };
      return;
    }
    const host = fieldHost.getBoundingClientRect();
    const plot = stage.getBoundingClientRect();
    // an ancestor's transform (the docs page's zoom) scales what the rects measure, not the plot's own px
    const k = stage.offsetWidth ? plot.width / stage.offsetWidth : 1;
    fieldRect = host.width && host.height ? { left: (host.left - plot.left) / k, top: (host.top - plot.top) / k, width: host.width / k, height: host.height / k } : { left: 0, top: 0, width: size.width, height: size.height };
  };
  measure();

  const fitPainter = () => {
    if (!painter) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = fieldRect.width * dpr;
    const height = fieldRect.height * dpr;
    const within = Math.min(1, Math.sqrt(MAX_PIXELS / Math.max(1, width * height)));
    // in steps, so a hair's difference in the arithmetic never re-makes it
    const w = Math.max(8, Math.round((width * within) / 8) * 8);
    const h = Math.max(8, Math.round((height * within) / 8) * 8);
    if (`${w}x${h}` === paintedFor) return;
    paintedFor = `${w}x${h}`;
    painter.resize(w, h);
  };

  /** How a section shows: the others step back when one is picked, and the clean ones when only problems are shown. */
  const alphaOf = (sector: Sector) => {
    const id = sector.section.id;
    const focus = picked ?? hovered;
    if (focus) return focus === id ? 1 : picked ? 0.3 : 0.62;
    return problemsOnly && sector.section.health === 'clean' ? 0.3 : 1;
  };

  // ── one frame ──
  const drawFrame = (now: number, withOverlay: boolean) => {
    if (destroyed) return;
    const { width: W, height: H } = size;
    const extent = arenaExtent(plan);
    // as large as its labels leave room for
    const fit = (label: number, leader: number, { half, up, down } = extent) =>
      Math.min((W - 2 * (label + LABEL.pad + leader + 8)) / (2 * half), (H - ROOM.top - ROOM.bottom) / (up + down));
    // the labels take the room the tilted arena leaves them: in plan the arena stands taller, but they need no more
    const compact = fit(LABEL.width, LABEL.leader, arenaExtent(false)) < FULL_ABOVE;
    const scale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, compact ? fit(LABEL.compactWidth, LABEL.compactLeader) : fit(LABEL.width, LABEL.leader)),
    );
    // zoomed, the arena grows about the stage's middle; marks and labels keep their size on screen
    const total = scale * eased.zoom;
    const u = 1 / total;
    // the arena's own middle — tilted, it reaches further one way than the other — goes to the stage's, then the pan moves it
    const cx = W / 2 + eased.panX;
    const cy = (ROOM.top + H - ROOM.bottom) / 2 + eased.panY;
    const middle = PIVOT_Y + (extent.down - extent.up) / 2;
    const X = (x: number) => cx + (x - PIVOT_X) * total;
    const Y = (y: number) => cy + (y - middle) * total;
    const fromX = (x: number) => PIVOT_X + (x - cx) * u;
    const fromY = (y: number) => middle + (y - cy) * u;

    // the view follows the camera with a little weight, and left alone it drifts
    const pose = arenaPose({ yaw: eased.yaw + drift.yaw, pitch: eased.pitch + drift.pitch }, plan);
    const P = projector(pose);

    if (painter) {
      fitPainter();
      const slots: CallSlot[] = sectors.map(({ section: s, mid }) => ({
        goal: seated.field.clouds[0]!.goal.id,
        angle: mid,
        calls: s.calls ?? 0,
        trouble: s.slowed,
        ...(s.crew.held && s.hold ? { hold: s.hold } : {}),
        agents: seated.crews[s.id],
      }));
      if (!started) started = now;
      const settle = motion ? Math.min(1, (now - started) / INTRO_MS) : 1;
      try {
        painter.paint({
          pose,
          unit: u,
          healthy: problemsOnly ? QUIET_AGENTS : 1,
          // a call leaves its agent's seat for the diamond in its own section's gate
          orbit: ARENA.gate - ARENA.stands,
          flat: false,
          slots,
          region: { x: fromX(fieldRect.left), y: fromY(fieldRect.top), w: fieldRect.width * u, h: fieldRect.height * u },
          // seated, an agent keeps its place, and the back rows are to be read as well as the front
          drift: 0.2,
          grain: 1.1,
          depthCue: 0.3,
          time: motion ? (now - started) / 1000 : null,
          intro: 1 - Math.pow(1 - settle, 3),
        });
      } catch {
        // a lost or broken context: the instruments still draw
      }
    }

    // the floor, under the canvas; seen from overhead the wall's bars are laid outwards, and the slab reaches out under them
    const floorRadius = ARENA.wall + (plan ? ARENA.wallHeight : 0) + ARENA.floor;
    const rim = Array.from({ length: 48 }, (_, i) => P(...arenaPoint(floorRadius, (i / 48) * Math.PI * 2)));
    const xs = rim.map((p) => X(p.x) - fieldRect.left);
    const ys = rim.map((p) => Y(p.y) - fieldRect.top);
    const floor = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    // how much of the slab's thickness shows: none from straight overhead
    const slab = plan ? 0 : ARENA.slab * Math.cos(pose.pitch) * total;
    const disc = (el: HTMLElement, drop: number) => {
      el.style.left = `${floor.x.toFixed(1)}px`;
      el.style.top = `${(floor.y + drop).toFixed(1)}px`;
      el.style.width = `${floor.w.toFixed(1)}px`;
      el.style.height = `${floor.h.toFixed(1)}px`;
    };
    disc(floorEdge, slab);
    disc(floorTop, 0);

    if (!withOverlay) return;
    drawOverlay({ P, u, scale, total, compact, X, Y, fromX, fromY, floorRadius, extent });
  };

  interface Frame {
    P: Project;
    u: number;
    /** Screen px per design px as fitted, and as zoomed. */
    scale: number;
    total: number;
    compact: boolean;
    X: (x: number) => number;
    Y: (y: number) => number;
    fromX: (x: number) => number;
    fromY: (y: number) => number;
    floorRadius: number;
    extent: ReturnType<typeof arenaExtent>;
  }

  const drawOverlay = ({ P, u, scale, total, compact, X, Y, fromX, fromY, floorRadius, extent }: Frame) => {
    const { width: W, height: H } = size;
    const frame = { x0: fromX(0), y0: fromY(0), x1: fromX(W), y1: fromY(H) };

    // every wall is cut to the stretches that fit it, and all of them stand on one scale: the busiest stretch on any is the tallest bar
    const cut = sectors.map((sector) => resampleDay(sector.section.day, wallBins(sector, scale)));
    days = new Map(sectors.map((sector, i) => [sector.section.id, cut[i]!]));
    const peak = Math.max(1, ...cut.flatMap((day) => day.map((bin) => bin.calls / (DAY_MINUTES / day.length))));

    // labels are placed for the view as turned, and keep their places while it only drifts
    const rest = projector(arenaPose(eased, plan));
    const labelWidth = compact ? LABEL.compactWidth : LABEL.width;
    const leader = compact ? LABEL.compactLeader : LABEL.leader;
    const labelFrame: LabelFrame = {
      centre: PIVOT_X,
      left: Math.max(PIVOT_X - extent.half - leader * u, frame.x0 + (LABEL.pad + labelWidth + 8) * u),
      right: Math.min(PIVOT_X + extent.half + leader * u, frame.x1 - (LABEL.pad + labelWidth + 8) * u),
      top: frame.y0,
      bottom: frame.y1,
    };
    const hold = [plan, compact, eased.yaw.toFixed(3), eased.pitch.toFixed(3), u.toFixed(4), labelFrame.left.toFixed(0), labelFrame.right.toFixed(0), frame.y0.toFixed(0), frame.y1.toFixed(0)].join();
    // a leader leaves from just outside the section's wall
    const anchor = (project: Project, mid: number) => project(...arenaPoint(ARENA.wall + (plan ? ARENA.wallHeight : 0) + ARENA.anchor * u, mid));
    const placed = layoutLabels(
      sectors.map((s) => {
        const a = anchor(rest, s.mid);
        return { id: s.section.id, x: a.x, y: a.y, height: labelHeight(s.section.troubles.length, compact) };
      }),
      labelFrame,
      u,
      hold,
      motion,
    );
    const labelOf = new Map(placed.map((label) => [label.id, label]));

    const shift = `translate(${X(0).toFixed(2)} ${Y(0).toFixed(2)}) scale(${total.toFixed(5)})`;
    render(
      svg`<defs>
          <clipPath id="ah-floor"><path d=${`${arcPath(P, floorRadius, 0, Math.PI * 2)}Z`}></path></clipPath>
          <radialGradient id="ah-hub">
            <stop offset="0" style="stop-color:var(--ah-hub);stop-opacity:0.1"></stop>
            <stop offset="0.7" style="stop-color:var(--ah-hub);stop-opacity:0.035"></stop>
            <stop offset="1" style="stop-color:var(--ah-hub);stop-opacity:0.06"></stop>
          </radialGradient>
          ${TROUBLE_POOLS.map(
            (state) => svg`<radialGradient id=${`ah-pool-${state}`}>
              <stop offset="0" style=${`stop-color:${POOL_TONE[state]};stop-opacity:0.34`}></stop>
              <stop offset="0.45" style=${`stop-color:${POOL_TONE[state]};stop-opacity:0.1`}></stop>
              <stop offset="1" style=${`stop-color:${POOL_TONE[state]};stop-opacity:0`}></stop>
            </radialGradient>`,
          )}
        </defs>
        <g transform=${shift}>
          ${
            plan
              ? null
              : svg`<path d=${arcPath(P, floorRadius, 0.14 * Math.PI, 0.86 * Math.PI)} fill="none" stroke="var(--ah-ink)" stroke-width=${1.25 * u} stroke-linecap="round" opacity="0.3" class="ah-appear" style="animation-delay:200ms"></path>`
          }
          <g fill="none" stroke="var(--ah-ink)" stroke-width=${u} stroke-dasharray=${`${u} ${3.5 * u}`} class="ah-appear" style=${`animation-delay:${ENTER.hub}ms`}>
            <path d=${arcPath(P, ARENA.gate, 0, Math.PI * 2)} opacity="0.3"></path>
            <path d=${arcPath(P, ARENA.stands + 4, 0, Math.PI * 2)} opacity="0.12"></path>
          </g>
          ${sectors.map(
            (sector) =>
              svg`<path d=${patchPath(P, seated.depth[sector.section.id]! - 2, ARENA.stands + 2, sector.a0 - 0.02, sector.a1 + 0.02)} fill="var(--ah-scene)" class="ah-fade" pointer-events="none" style=${`opacity:${(1 - alphaOf(sector)) * 0.3}`}></path>`,
          )}
          ${hubMarks(goal, P, u, seated.pitch, ENTER.hub)}
          ${sectors.map((sector, i) => {
            const id = sector.section.id;
            return sectorMarks({
              sector,
              P,
              plan,
              u,
              depth: seated.depth[id]!,
              pitch: seated.pitch,
              day: cut[i]!,
              peak,
              lit: hovered === id,
              picked: picked === id,
              alpha: alphaOf(sector),
              pointed,
              enter: ENTER.sector + i * ENTER.step,
            });
          })}
          ${sectors.map((sector, i) => {
            const id = sector.section.id;
            const a = anchor(P, sector.mid);
            // a label that changes sides fades out where it was; its leader goes at once, not swung across the arena
            return svg`<g class="ah-fade" style=${`opacity:${Math.max(0.45, alphaOf(sector))}`}>${labelLeader(a.x, a.y, labelOf.get(id)!, u, hovered === id || picked === id, ENTER.label + i * ENTER.step)}</g>`;
          })}
        </g>`,
      overlay,
    );

    render(
      html`${sectors.flatMap((sector, i) => {
        const id = sector.section.id;
        const label = labelOf.get(id)!;
        const shared = { sector, compact, picked: picked === id, pointed, opacity: Math.max(0.45, alphaOf(sector)) };
        const at = (l: typeof label) => ({ x: X(l.hx + l.side * LABEL.pad * u), y: Y(l.y0) });
        return [
          groupLabel({ ...shared, label, ...at(label), lit: hovered === id, enter: ENTER.label + 80 + i * ENTER.step }),
          label.leaving ? groupLabel({ ...shared, label: label.leaving, ...at(label.leaving), lit: false, enter: 0, ghost: true }) : null,
        ];
      })}`,
      labels,
    );
  };

  // ── what a mark says ──
  const tipFor = (key: string): ChartTooltipContent | null => {
    const [kind, id = '', ...more] = key.split(':');
    if (kind === 'hub') return hubTip(goal);
    if (kind === 'bench') return benchTip(goal);
    if (kind === 'trouble') {
      const troubleKey = [id, ...more].join(':');
      const section = model.sections.find((s) => s.troubles.some((t) => t.key === troubleKey));
      const trouble = section?.troubles.find((t) => t.key === troubleKey);
      return section && trouble ? troubleTip(section, trouble) : null;
    }
    const section = sectorOf.get(id)?.section;
    if (!section) return null;
    if (kind === 'section') return sectionTip(goal, section);
    if (kind === 'wall') return wallTip(section, days.get(id) ?? []);
    if (kind === 'asset') {
      const asset = section.named.find((n) => String(n.tick) === more[0]);
      return asset ? assetTip(section, asset.name) : null;
    }
    return null;
  };

  // ── the loop ──
  let raf = 0;
  let last = 0;
  let lastOverlay = 0;
  let born = 0;
  let visible = true;
  const chase = (dt: number) => {
    const gap = {
      yaw: wrapYaw(target.yaw - eased.yaw),
      pitch: target.pitch - eased.pitch,
      zoom: Math.log(target.zoom / eased.zoom),
      panX: target.panX - eased.panX,
      panY: target.panY - eased.panY,
    };
    if (Math.abs(gap.yaw) <= 2e-4 && Math.abs(gap.pitch) <= 2e-4 && Math.abs(gap.zoom) <= 1e-3 && Math.abs(gap.panX) <= 0.3 && Math.abs(gap.panY) <= 0.3) {
      eased = { ...target };
      return false;
    }
    const turn = 1 - Math.exp(-dt / EASE_MS);
    const grow = 1 - Math.exp(-dt / EASE_ZOOM_MS);
    const slide = 1 - Math.exp(-dt / EASE_PAN_MS);
    eased = {
      yaw: wrapYaw(eased.yaw + gap.yaw * turn),
      pitch: eased.pitch + gap.pitch * turn,
      zoom: eased.zoom * Math.exp(gap.zoom * grow),
      panX: eased.panX + gap.panX * slide,
      panY: eased.panY + gap.panY * slide,
    };
    return true;
  };
  const tick = (now: number) => {
    raf = 0;
    if (destroyed) return;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    if (!born) born = now;
    const chasing = motion ? chase(dt) : ((eased = { ...target }), false);
    if (motion && !plan) {
      // left alone it drifts a degree or two, back and forth, never quite repeating — easing in from rest
      const t = (now - born) / 1000;
      const ease = Math.min(1, t / 6);
      drift = {
        yaw: ease * DRIFT.yaw * (Math.sin(t * 0.11) * 0.72 + Math.sin(t * 0.047 + 1.3) * 0.28),
        pitch: ease * DRIFT.pitch * (Math.sin(t * 0.083 + 2.1) * 0.7 + Math.sin(t * 0.19) * 0.3),
      };
    } else drift = { yaw: 0, pitch: 0 };
    const due = dirty || chasing || !motion || now - lastOverlay >= DRIFT_FRAME_MS;
    if (due) lastOverlay = now;
    drawFrame(now, due);
    dirty = false;
    if ((motion && visible) || chasing) raf = requestAnimationFrame(tick);
  };
  const request = () => {
    if (!raf && !destroyed) raf = requestAnimationFrame(tick);
  };
  const redraw = () => {
    dirty = true;
    request();
  };
  // the first frame now, so the arena is there before the next paint
  drawFrame(typeof performance !== 'undefined' ? performance.now() : 0, true);
  dirty = false;
  request();

  // stop painting while the arena is off screen or the tab is hidden
  let onScreen = true;
  const updateVisible = () => {
    visible = onScreen && document.visibilityState === 'visible';
    if (visible) request();
  };
  const intersect = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(([entry]) => {
        onScreen = !!entry?.isIntersecting;
        updateVisible();
      })
    : null;
  intersect?.observe(stage);
  document.addEventListener('visibilitychange', updateVisible);

  // ── the pointer ──
  interface Drag {
    pointer: number;
    x: number;
    y: number;
    start: StageCamera;
    /** Shift-drag, or any drag in plan, pans rather than turns. */
    pan: boolean;
    moved: boolean;
    at: { x: number; y: number; time: number };
    speed: { x: number; y: number };
  }
  let drag: Drag | null = null;
  let coast = 0;
  let swallowClick = false;

  const setCamera = (next: StageCamera) => {
    target = next;
    on.onCamera?.({ ...target });
    request();
  };
  const throwOn = (speed: { yaw: number; pitch: number }) => {
    let prev = 0;
    const step = (ts: number) => {
      const dt = prev ? Math.min(48, ts - prev) : 16;
      prev = ts;
      const fade = Math.exp(-dt / COAST_MS);
      speed.yaw *= fade;
      speed.pitch *= fade;
      if (Math.hypot(speed.yaw, speed.pitch) < 2e-5 || destroyed) return;
      setCamera({ ...target, yaw: wrapYaw(target.yaw + speed.yaw * dt), pitch: clampPitch(target.pitch + speed.pitch * dt) });
      coast = requestAnimationFrame(step);
    };
    coast = requestAnimationFrame(step);
  };

  const closest = (event: Event, attr: string) => {
    const el = event.target instanceof Element ? event.target.closest(`[${attr}]`) : null;
    return el?.getAttribute(attr) ?? null;
  };
  const point = (event: Pointer) => {
    const section = closest(event, 'data-section');
    const trouble = closest(event, 'data-trouble');
    if (section !== hovered || trouble !== pointed) {
      hovered = section;
      pointed = trouble;
      redraw();
    }
    const key = closest(event, 'data-tip');
    const content = key ? tipFor(key) : null;
    if (content) {
      tipKey = key;
      on.onTip?.(content, event);
    } else if (tipKey) {
      tipKey = null;
      on.onLeave?.();
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    cancelAnimationFrame(coast);
    swallowClick = false;
    drag = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      start: { ...target },
      pan: event.shiftKey || plan,
      moved: false,
      at: { x: event.clientX, y: event.clientY, time: event.timeStamp },
      speed: { x: 0, y: 0 },
    };
  };
  const onPointerMove = (event: PointerEvent) => {
    const d = drag;
    if (!d || d.pointer !== event.pointerId) {
      point(event);
      return;
    }
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.moved) {
      if (Math.abs(dx) <= SLOP && Math.abs(dy) <= SLOP) return;
      d.moved = true;
      try {
        stage.setPointerCapture(event.pointerId);
      } catch {
        // a synthetic pointer: nothing to capture
      }
      stage.classList.add('is-dragging');
      tipKey = null;
      on.onLeave?.();
    }
    const dt = event.timeStamp - d.at.time;
    if (dt > 0) {
      d.speed = { x: d.speed.x * 0.6 + ((event.clientX - d.at.x) / dt) * 0.4, y: d.speed.y * 0.6 + ((event.clientY - d.at.y) / dt) * 0.4 };
      d.at = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    }
    setCamera(
      d.pan
        ? { ...target, panX: d.start.panX + dx, panY: d.start.panY + dy }
        : { ...target, yaw: wrapYaw(d.start.yaw + dx * YAW_PER_PX), pitch: clampPitch(d.start.pitch + dy * PITCH_PER_PX) },
    );
  };
  const endDrag = (event: PointerEvent) => {
    const d = drag;
    drag = null;
    stage.classList.remove('is-dragging');
    if (!d?.moved) return;
    swallowClick = true;
    if (!d.pan && event.timeStamp - d.at.time < REST_MS) {
      const cap = (v: number) => Math.max(-COAST_MAX, Math.min(COAST_MAX, v * COAST_SHARE));
      throwOn({ yaw: cap(d.speed.x * YAW_PER_PX), pitch: cap(d.speed.y * PITCH_PER_PX) });
    }
  };
  const onLeave = () => {
    if (drag) return;
    if (hovered || pointed) {
      hovered = null;
      pointed = null;
      redraw();
    }
    tipKey = null;
    on.onLeave?.();
  };
  /** A click picks a section out, or lets it go; a click on the empty floor lets go of what is picked. */
  const onClick = (event: MouseEvent) => {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    const section = closest(event, 'data-section');
    picked = section && picked !== section ? section : null;
    redraw();
  };
  /**
   * The wheel does not set the zoom, it asks for one: each event moves the
   * zoom asked for in proportion to how far the wheel travelled, and the view
   * glides to it over the next frames. So a notched wheel and a trackpad both
   * zoom evenly, without steps.
   */
  let asked: number | null = null;
  let glide = 0;
  const glideZoom = () => {
    glide = 0;
    if (asked == null || destroyed) return;
    const gap = Math.log(asked / target.zoom);
    if (Math.abs(gap) < 0.003) {
      setCamera(zoomCamera(target, asked / target.zoom));
      asked = null;
      return;
    }
    setCamera(zoomCamera(target, Math.exp(gap * CATCH_UP)));
    glide = requestAnimationFrame(glideZoom);
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    // lines and pages, where a browser reports them, as px
    const px = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
    const travel = Math.max(-MOST, Math.min(MOST, px));
    // zoomCamera keeps the result within the zoom's limits
    asked = zoomCamera({ ...target, zoom: asked ?? target.zoom }, Math.exp(-travel * (event.ctrlKey ? PER_PINCH_UNIT : PER_UNIT))).zoom;
    if (!glide) glide = requestAnimationFrame(glideZoom);
  };
  const onDoubleClick = () => {
    cancelAnimationFrame(coast);
    cancelAnimationFrame(glide);
    glide = 0;
    asked = null;
    setCamera({ ...DEFAULT_CAMERA });
  };

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', onLeave);
  stage.addEventListener('click', onClick);
  stage.addEventListener('dblclick', onDoubleClick);
  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('focusin', point);
  stage.addEventListener('focusout', onLeave);

  return {
    resize(width, height) {
      if (width <= 0 || height <= 0) return;
      size = { width, height };
      measure();
      redraw();
    },
    setPlan(next) {
      if (next === plan) return;
      plan = next;
      redraw();
    },
    setProblemsOnly(next) {
      if (next === problemsOnly) return;
      problemsOnly = next;
      redraw();
    },
    resetCamera() {
      onDoubleClick();
    },
    camera: () => ({ ...target }),
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(coast);
      cancelAnimationFrame(glide);
      intersect?.disconnect();
      document.removeEventListener('visibilitychange', updateVisible);
      painter?.dispose();
      painter = null;
      fieldHost.remove();
      container.replaceChildren();
    },
  };
}
