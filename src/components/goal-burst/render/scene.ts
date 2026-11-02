import { html, render, svg } from 'lit';

import type { ChartTooltipContent } from '../../../element/chart-tooltip-portal.js';
import {
  arenaPoint,
  arenaPose,
  clampPitch,
  createLabelLayout,
  DEFAULT_CAMERA,
  formatAssetHealthCount,
  formatPercent,
  formatShort,
  LABEL,
  labelHeight,
  PIVOT_X,
  PIVOT_Y,
  projector,
  wrapYaw,
  zoomCamera,
  type LabelFrame,
  type Project,
  type StageCamera,
} from '../../asset-health-overview/lib/index.js';
import { groupLabel, type LabelReading } from '../../asset-health-overview/render/label.js';
import { labelLeader } from '../../asset-health-overview/render/marks.js';
import { troubleTip } from '../../asset-health-overview/render/tips.js';
import { buildAgentField, type PerimeterGoal, type ResourceGroup } from '../../goals-perimeter/lib/index.js';
import { createPainter, type Painter, type ScenePalette } from '../../goals-perimeter/render/index.js';
import {
  BURST,
  BURST_GOAL,
  burstExtent,
  burstSectors,
  burstSlots,
  formatSeconds,
  frontAisle,
  type BurstSector,
  type GoalBurstModel,
} from '../lib/index.js';
import { assetBand, coreRing, sectorSpikes, timeScale } from './marks.js';
import { goalTip, sectorTip } from './tips.js';

type Pointer = PointerEvent | FocusEvent;

/** Callbacks for the element: tooltips and the camera live there. */
export interface GoalBurstHandlers {
  onTip?: (content: ChartTooltipContent, event: Pointer) => void;
  onLeave?: () => void;
  /** Where the burst has been turned to, so a redraw keeps it. */
  onCamera?: (camera: StageCamera) => void;
  /** Whether labels have folded their readouts away (the burst is drawn under its design size). */
  onCompact?: (compact: boolean) => void;
}

export interface RenderGoalBurstOptions {
  model: GoalBurstModel;
  width: number;
  height: number;
  /** The scene's colours, from the page style's palettes. */
  palette: ScenePalette;
  /** Seen from straight overhead, without turning. */
  plan?: boolean;
  /** Only what is held stands out: the agents at work and the calls that get through all but go out, and the clean sectors step back. */
  problemsOnly?: boolean;
  camera?: StageCamera;
  /** The sector picked out, by its group's id, so a redraw keeps it; let go when the new model has no such group. */
  picked?: string | null;
  /** Plot px kept clear at the left of the map window, for the legend button. */
  rail?: number;
  /** Off: no drift, no intro, the picture painted only when something changes. Defaults to the reader's preference. */
  motion?: boolean;
  /** Where the agents' picture is drawn: a layer behind the plot that may reach past it. */
  sceneLayer?: HTMLElement | null;
  handlers?: GoalBurstHandlers;
}

export interface GoalBurstController {
  resize: (width: number, height: number) => void;
  setPlan: (plan: boolean) => void;
  setProblemsOnly: (on: boolean) => void;
  /** Back to the resting angle, at 100% and unpanned. */
  resetCamera: () => void;
  camera: () => StageCamera;
  /** The sector picked out, by its group's id, or null. */
  picked: () => string | null;
  compact: () => boolean;
  /** Stops every loop and listener, and lets go of the picture's GPU memory. */
  destroy: () => void;
}

/** Gap between the legend button and the map window. */
export const RAIL = 56;

/** The burst is drawn no larger than this many screen px per design px: past it a bigger card gives it air. */
const MAX_SCALE = 2.1;
const MIN_SCALE = 0.55;
/** Smallest it is drawn once the labels have folded away. */
const LEAST_SCALE = 0.25;
/** Under this scale there is no room beside the burst for whole labels: they keep to their heads. */
const FULL_ABOVE = 0.98;
/** Kept clear over and under the burst inside the map window, screen px. */
const ROOM = { top: 22, bottom: 26 };
/** Kept clear at the top of the map window for the corner's two lines, screen px. */
const CORNER = 30;
/** The scene comes up in order: the cloud, the clock, the calls sector by sector, the bands, then the labels (ms). */
const ENTER = { core: 300, scale: 450, spikes: 560, band: 700, label: 1000, step: 90 };
/** How long the agents take to gather on load. */
const INTRO_MS = 2600;
/** Brightness of working and idle agents when only problems are shown. Kept low: the grade lifts faint light. */
const QUIET_AGENTS = 0.05;
/** The cloud is drawn smaller than on the perimeter: a finer dot keeps its agents apart, and the colours part less. */
const GRAIN = 0.9;
const ABERRATION = 0.6;
/** The slab the burst stands on, as the asset health arena's: its reach past the band, and its thickness. */
const FLOOR = { reach: 14, slab: 7 };

/** How quickly the view catches up with where it was turned to: the time to close ~63% of the gap. */
const EASE_MS = 190;
/** Zoom and pan are held closer to the hand. */
const EASE_ZOOM_MS = 110;
const EASE_PAN_MS = 90;
/** How far the idle camera wanders either way, radians. */
const DRIFT = { yaw: 0.034, pitch: 0.016 };
/** The drift is far too slow to need every frame for the instruments; the chase is not. */
const DRIFT_FRAME_MS = 1000 / 30;

/** Pointer travel before a press counts as a drag, so clicks still reach sectors. */
const SLOP = 2;
const YAW_PER_PX = 0.006;
const PITCH_PER_PX = 0.005;
/** After a flick the burst keeps turning, slowing to a stop. */
const COAST_MS = 260;
const COAST_SHARE = 0.5;
const COAST_MAX = 0.0022;
/** A pointer that rested this long before letting go was placing the burst, not throwing it. */
const REST_MS = 90;

/** Wheel travel to zoom: a notch is about a hundred units; a pinch arrives as small ones with ctrl held. */
const PER_UNIT = 0.0009;
const PER_PINCH_UNIT = 0.011;
const MOST = 80;
const CATCH_UP = 0.26;

/** The most backing-store pixels the agent canvas may hold. */
const MAX_PIXELS = 9e6;

const esc = (text: string) => text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The corner of the map window: how much of the fleet's resources the goal draws on, its assets there and its calls a minute. */
export function cornerLines(model: Pick<GoalBurstModel, 'groups' | 'groupTotal'>): [string, string] {
  const n = model.groups.length;
  const groups = `resource ${model.groupTotal === 1 ? 'group' : 'groups'}`;
  const assets = model.groups.reduce((sum, g) => sum + g.section.assets, 0);
  const calls = model.groups.reduce((sum, g) => sum + (g.section.calls ?? 0), 0);
  return [
    model.groupTotal > n ? `${formatAssetHealthCount(n)} of ${formatAssetHealthCount(model.groupTotal)} ${groups}` : `${formatAssetHealthCount(n)} ${groups}`,
    `${formatAssetHealthCount(assets)} ${assets === 1 ? 'asset' : 'assets'} · ${formatShort(calls)} calls /min`,
  ];
}

/** The goal as the perimeter's painter knows it: its agents by state, and its calls to its groups. */
function cloudGoal(model: GoalBurstModel): PerimeterGoal {
  const g = model.goal;
  const resourceGroups: ResourceGroup[] = model.groups.map(({ section: s }) => ({
    id: s.id,
    shareKey: s.id,
    name: s.name,
    kind: '',
    icon: 'generic',
    state: 'healthy',
    agents: null,
    held: 0,
    calls: s.calls,
    detail: '',
  }));
  return {
    id: BURST_GOAL,
    code: g.code,
    name: g.name,
    agents: { total: g.total, healthy: g.working, degraded: g.overBudget, awaiting: g.awaiting, blocked: g.blocked, failed: g.failed, idle: g.idle },
    health: g.progress ?? 0,
    status: g.status?.tone === 'blocked' ? 'critical' : g.status?.tone === 'warn' ? 'degraded' : 'healthy',
    statusLabel: g.status?.label.toUpperCase() ?? '',
    multiplier: g.burn,
    multiplierLabel: 'Burn',
    impure: g.held,
    exceptions: [],
    resourceGroups,
    resourceGroupCount: resourceGroups.length,
    position: null,
  };
}

/**
 * A goal drawn as its traffic, after the Agent operations design's goal
 * burst. Its agents — one dot each, by the perimeter's painter, in the same
 * glass — are a cloud in the middle, the progress ring round it. Out of the
 * cloud its calls are thrown as spikes, into one sector per resource group,
 * as long as they took to be answered on the time scale the floor carries,
 * in the colour of what happened to them; the calls that do not get through
 * run on to the asset that stops them, and fan into it. Round each sector its
 * group's assets, a tick each. A label beside the burst reads each sector.
 *
 * Drag turns it (shift-drag, or any drag in plan, pans), the wheel zooms,
 * double-click sets it back; pointing at a sector lights it, clicking picks
 * it out.
 */
export function renderGoalBurst(container: HTMLElement, options: RenderGoalBurstOptions): GoalBurstController | null {
  container.replaceChildren();
  const { model, handlers: on = {} } = options;
  if (model.empty || options.width <= 0 || options.height <= 0) return null;

  const motion = options.motion ?? !reducedMotion();
  const rail = options.rail ?? RAIL;
  const goal = model.goal;
  const sectors = burstSectors(model);
  const slots = burstSlots(sectors);
  const sectorOf = new Map(sectors.map((s) => [s.group.section.id, s]));
  const field = buildAgentField([{ id: BURST_GOAL, goal: cloudGoal(model), x: PIVOT_X, y: PIVOT_Y, z: 0, r: BURST.core }]);
  const layoutLabels = createLabelLayout();

  let size = { width: options.width, height: options.height };
  let plan = options.plan ?? false;
  let problemsOnly = options.problemsOnly ?? false;
  let target: StageCamera = { ...(options.camera ?? DEFAULT_CAMERA) };
  let eased: StageCamera = { ...target };
  let drift = { yaw: 0, pitch: 0 };
  let hovered: string | null = null;
  let pointed: string | null = null;
  let picked: string | null = options.picked && sectorOf.has(options.picked) ? options.picked : null;
  let compact = false;
  let tipKey: string | null = null;
  let destroyed = false;
  let dirty = true;

  // ── DOM ──
  const stage = document.createElement('div');
  stage.className = 'ah-stage gb-stage';
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', goal.name ? `Goal burst: ${goal.name}` : 'Goal burst');
  container.append(stage);

  const sceneHost = options.sceneLayer ?? stage;
  const fieldHost = document.createElement('div');
  fieldHost.className = 'ah-field';
  sceneHost.append(fieldHost);
  // the floor: a round slab of glass — seen tilted, an ellipse — under the painter's canvas, its shadow lifting the burst off the room
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

  // the map window, framed like a viewfinder; its corner reads what the goal draws on
  const frameEl = document.createElement('div');
  frameEl.className = 'gb-frame';
  frameEl.setAttribute('aria-hidden', 'true');
  frameEl.innerHTML = `<span class="gb-crop tl"></span><span class="gb-crop tr"></span><span class="gb-crop bl"></span><span class="gb-crop br"></span><span class="gb-corner">${cornerLines(model)
    .map((line) => `<span>${esc(line)}</span>`)
    .join('')}</span>`;
  stage.append(overlay, labels, frameEl);

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
    painter = createPainter(freshCanvas, field, options.palette, { links: 0, slots: slots.length });
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

  /** How strongly a sector shows: the others step back when one is picked, and the clean ones when only problems are shown. */
  const alphaOf = (sector: BurstSector) => {
    const id = sector.group.section.id;
    const focus = picked ?? hovered;
    if (focus) return focus === id ? 1 : picked ? 0.3 : 0.62;
    return problemsOnly && sector.group.section.health === 'clean' ? 0.3 : 1;
  };

  /** A label reads the sector's calls: how many a minute, how quickly nineteen in twenty are answered, and the share held up. */
  const readings = (sector: BurstSector): LabelReading[] => {
    const s = sector.group.section;
    return [
      { caption: 'Calls /min', value: s.calls === null ? '—' : formatShort(s.calls), cls: 'w-calls', quiet: s.calls === null },
      { caption: '95% within', value: sector.p95 === null ? '—' : formatSeconds(sector.p95), cls: 'w-p95', quiet: sector.p95 === null },
      { caption: 'Held up', value: formatPercent(s.slowed), cls: 'w-held', quiet: s.slowed < 0.005 },
    ];
  };
  const aisle = () => frontAisle(sectors, plan);

  // ── one frame ──
  const drawFrame = (now: number, withOverlay: boolean) => {
    if (destroyed) return;
    const { width: W, height: H } = size;
    const x0 = Math.min(rail, W * 0.2);
    const extent = burstExtent(plan);
    // as large as its labels leave room for: whole, folded to their heads, or — with no room beside it at all — gone, the tips telling all
    const across = (label: number, leader: number) => (W - x0 - 2 * (label + LABEL.pad + leader + 8)) / (2 * extent.half);
    const down = (H - ROOM.top - ROOM.bottom) / (extent.up + extent.down);
    const full = Math.min(MAX_SCALE, across(LABEL.width, LABEL.leader), down);
    const nextCompact = full < FULL_ABOVE;
    const tiny = across(LABEL.compactWidth, LABEL.compactLeader) < MIN_SCALE;
    const scale = tiny
      ? Math.max(LEAST_SCALE, Math.min(MAX_SCALE, across(0, 0), down))
      : Math.max(MIN_SCALE, nextCompact ? Math.min(MAX_SCALE, across(LABEL.compactWidth, LABEL.compactLeader), down) : full);
    if (nextCompact !== compact) {
      compact = nextCompact;
      on.onCompact?.(compact);
    }
    stage.toggleAttribute('data-compact', compact);
    stage.toggleAttribute('data-tiny', tiny);

    // zoomed, the burst grows about the window's middle; marks and labels keep their size on screen
    const total = scale * eased.zoom;
    const u = 1 / total;
    // the burst's own middle — tilted, it reaches further one way than the other — goes to the window's, then the pan moves it
    const cx = (x0 + W) / 2 + eased.panX;
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
      if (!started) started = now;
      const settle = motion ? Math.min(1, (now - started) / INTRO_MS) : 1;
      try {
        painter.paint({
          pose,
          unit: u,
          healthy: problemsOnly ? QUIET_AGENTS : 1,
          links: [],
          // a call leaves the cloud for its sector's band, or for the asset that holds it
          orbit: BURST.band - BURST.core,
          flat: false,
          slots,
          focus: null,
          region: { x: fromX(fieldRect.left), y: fromY(fieldRect.top), w: fieldRect.width * u, h: fieldRect.height * u },
          zoom: 1,
          time: motion ? (now - started) / 1000 : null,
          intro: 1 - Math.pow(1 - settle, 3),
          grain: GRAIN,
          aberration: ABERRATION,
        });
      } catch {
        // a lost or broken context: the instruments still draw
      }
    }

    // the floor, under the canvas, reaching just past the band
    const rim = Array.from({ length: 48 }, (_, i) => P(...arenaPoint(BURST.band + FLOOR.reach, (i / 48) * Math.PI * 2)));
    const xs = rim.map((p) => X(p.x) - fieldRect.left);
    const ys = rim.map((p) => Y(p.y) - fieldRect.top);
    const floor = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    // how much of the slab's thickness shows: none from straight overhead
    const slab = plan ? 0 : FLOOR.slab * Math.cos(pose.pitch) * total;
    const disc = (el: HTMLElement, drop: number) => {
      el.style.left = `${floor.x.toFixed(1)}px`;
      el.style.top = `${(floor.y + drop).toFixed(1)}px`;
      el.style.width = `${floor.w.toFixed(1)}px`;
      el.style.height = `${floor.h.toFixed(1)}px`;
    };
    disc(floorEdge, slab);
    disc(floorTop, 0);

    if (!withOverlay) return;
    drawOverlay({ P, u, total, compact, tiny, X, Y, fromX, fromY, x0, extent });
  };

  interface Frame {
    P: Project;
    u: number;
    /** Screen px per design px, as zoomed. */
    total: number;
    compact: boolean;
    tiny: boolean;
    X: (x: number) => number;
    Y: (y: number) => number;
    fromX: (x: number) => number;
    fromY: (y: number) => number;
    x0: number;
    extent: ReturnType<typeof burstExtent>;
  }

  const drawOverlay = ({ P, u, total, compact, tiny, X, Y, fromX, fromY, x0, extent }: Frame) => {
    const { width: W, height: H } = size;

    // labels are placed for the view as turned, and keep their places while it only drifts
    const rest = projector(arenaPose(eased, plan));
    const labelWidth = compact ? LABEL.compactWidth : LABEL.width;
    const leader = compact ? LABEL.compactLeader : LABEL.leader;
    const labelFrame: LabelFrame = {
      centre: PIVOT_X,
      left: Math.max(PIVOT_X - extent.half - leader * u, fromX(x0) + (LABEL.pad + labelWidth + 8) * u),
      right: Math.min(PIVOT_X + extent.half + leader * u, fromX(W) - (LABEL.pad + labelWidth + 8) * u),
      top: fromY(CORNER),
      bottom: fromY(H),
    };
    const hold = [plan, compact, eased.yaw.toFixed(3), eased.pitch.toFixed(3), u.toFixed(4), labelFrame.left.toFixed(0), labelFrame.right.toFixed(0), labelFrame.top.toFixed(0), labelFrame.bottom.toFixed(0)].join();
    // a leader leaves from just outside the band's ticks
    const anchor = (project: Project, mid: number) => project(...arenaPoint(BURST.band + (BURST.named + BURST.anchor) * u, mid));
    const placed = tiny
      ? []
      : layoutLabels(
          sectors.map((s) => {
            const a = anchor(rest, s.mid);
            return { id: s.group.section.id, x: a.x, y: a.y, height: labelHeight(s.group.section.troubles.length, compact) };
          }),
          labelFrame,
          u,
          hold,
          motion,
        );
    const labelOf = new Map(placed.map((label) => [label.id, label]));

    const shift = `translate(${X(0).toFixed(2)} ${Y(0).toFixed(2)}) scale(${total.toFixed(5)})`;
    render(
      svg`<g transform=${shift}>
        ${timeScale(P, u, aisle(), ENTER.scale)}
        ${sectors.map((sector, i) => {
          const id = sector.group.section.id;
          return sectorSpikes({
            sector,
            P,
            u,
            alpha: alphaOf(sector),
            lit: hovered === id || picked === id,
            pointed,
            quiet: problemsOnly,
            enter: ENTER.spikes + i * ENTER.step,
          });
        })}
        ${coreRing(goal, P, u, ENTER.core)}
        ${sectors.map((sector, i) => {
          const id = sector.group.section.id;
          return assetBand({ sector, P, u, alpha: alphaOf(sector), lit: hovered === id, picked: picked === id, pointed, enter: ENTER.band + i * ENTER.step });
        })}
        ${sectors.map((sector, i) => {
          const id = sector.group.section.id;
          const label = labelOf.get(id);
          if (!label) return null;
          const a = anchor(P, sector.mid);
          // a label that changes sides fades out where it was; its leader goes at once, not swung across the burst
          return svg`<g class="ah-fade" style=${`opacity:${Math.max(0.45, alphaOf(sector))}`}>${labelLeader(a.x, a.y, label, u, hovered === id || picked === id, ENTER.label + i * ENTER.step)}</g>`;
        })}
      </g>`,
      overlay,
    );

    render(
      html`${sectors.flatMap((sector, i) => {
        const id = sector.group.section.id;
        const label = labelOf.get(id);
        if (!label) return [];
        const shared = {
          sector: { section: sector.group.section, a0: sector.a0, a1: sector.a1, mid: sector.mid },
          compact,
          picked: picked === id,
          pointed,
          opacity: Math.max(0.45, alphaOf(sector)),
          readings: readings(sector),
        };
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
    if (kind === 'goal') return goalTip(goal);
    if (kind === 'trouble') {
      const troubleKey = [id, ...more].join(':');
      const section = model.groups.map((g) => g.section).find((s) => s.troubles.some((t) => t.key === troubleKey));
      const trouble = section?.troubles.find((t) => t.key === troubleKey);
      if (!section || !trouble) return null;
      // the arena names what it stands in a category; here it is a resource group
      const tip = troubleTip(section, trouble);
      return { ...tip, rows: tip.rows.map((row) => (row.label === 'Category' ? { ...row, label: 'Group' } : row)) };
    }
    const sector = sectorOf.get(id);
    if (kind === 'section' && sector) return sectorTip(goal, sector);
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
  // the first frame now, so the burst is there before the next paint
  stage.toggleAttribute('data-motion', motion);
  drawFrame(typeof performance !== 'undefined' ? performance.now() : 0, true);
  dirty = false;
  request();

  // stop painting while the burst is off screen or the tab is hidden
  let onScreen = true;
  const updateVisible = () => {
    visible = onScreen && document.visibilityState === 'visible';
    if (visible) request();
  };
  const intersect =
    typeof IntersectionObserver !== 'undefined'
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
    if (!d.pan && motion && event.timeStamp - d.at.time < REST_MS) {
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
  /** A click picks a sector out, or lets it go; a click on the empty floor lets go of what is picked. */
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
   * glides to it over the next frames.
   */
  let asked: number | null = null;
  let glide = 0;
  const glideZoom = () => {
    glide = 0;
    if (asked == null || destroyed) return;
    const gap = Math.log(asked / target.zoom);
    if (Math.abs(gap) < 0.003 || !motion) {
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
    picked: () => picked,
    compact: () => compact,
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
