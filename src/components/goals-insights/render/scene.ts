import { nothing, render, svg, type SVGTemplateResult } from 'lit';

import type { ChartTooltipContent } from '../../../element/chart-tooltip-portal.js';
import { STATUS, type ScenePalette } from '../../goals-perimeter/render/scene-palette.js';
import {
  APEX_Y,
  AXIS,
  claimLayout,
  claimRadius,
  columnFlow,
  columnTopology,
  CX,
  cycleSpan,
  DEFAULT_TILT,
  diamondPath,
  GOAL_AT,
  goalLinkPath,
  lineagePath,
  nearness,
  particleSeeds,
  ringMotes,
  STRATA,
  TAIL_CURVE,
  TAIL_Y,
  TILT_RANGE,
  VIEW,
  webPath,
  WRAP_BOTTOM,
  WRAP_OUTLINE,
  WRAP_TOP,
  wrapAngle,
  YAW_STEP,
  ZOOM_RANGE,
  type Claim,
  type ClaimPoint,
  type ColumnTopology,
  type Evidence,
  type GoalsInsightsModel,
  type InsightsGoal,
  type LineageLink,
  type WebLink,
} from '../lib/index.js';
import { createGoalCloud, type GoalCloud } from './cloud.js';
import { createColumnRenderer, KIND, type ClaimKind, type ColumnFrame, type ColumnRenderer, type RGB } from './gl/renderer.js';
import {
  ASIDE_DIAL,
  claimDiamond,
  columnDefs,
  connectedGoalLabel,
  EVIDENCE_COLOR,
  goalBase,
  goalDial,
  MAIN_DIAL,
  mainGoalLabel,
  ring,
  timeLabel,
  type LabelFit,
} from './marks.js';
import { claimTip, connectedGoalTip, mainGoalTip, ringTip, timeTip } from './tips.js';

type Pointer = PointerEvent | FocusEvent;

/** Where the column is seen from: its turn, how far its rings are opened, the zoom and the point of the drawing in the middle. */
export interface ColumnView {
  yaw: number;
  tilt: number;
  zoom: number;
  cx: number;
  cy: number;
}

export const DEFAULT_VIEW: ColumnView = { yaw: 0, tilt: DEFAULT_TILT, zoom: 1, cx: VIEW.width / 2, cy: VIEW.height / 2 };

/** What is picked out: a claim, by its id, and a connected goal, by its id. */
export interface ColumnPicks {
  claim: string | null;
  goal: string | null;
}

/** Callbacks for the element: tooltips and the view live there. */
export interface GoalsInsightsHandlers {
  onTip?: (content: ChartTooltipContent, event: Pointer) => void;
  onLeave?: () => void;
}

/** What paints the column's light; tests stand in their own. */
export type GlowFactory = (canvas: HTMLCanvasElement, palette: ScenePalette, goals: number, against: RGB, disputed: RGB) => ColumnRenderer | null;

export interface RenderGoalsInsightsOptions {
  model: GoalsInsightsModel;
  width: number;
  height: number;
  /** The scene's colours, from the page style's palettes. */
  palette: ScenePalette;
  /** Every ring laid flat: no turning, no tilt. */
  flat?: boolean;
  /** Only the claims that argue against the goal or are disputed stand out. */
  problemsOnly?: boolean;
  view?: ColumnView;
  /** Picked out, kept across a redraw; a pick the new model no longer has is let go. */
  picks?: ColumnPicks;
  /** Off: no turn, no sway, no intro, the picture painted only when something changes. Defaults to the reader's preference. */
  motion?: boolean;
  /** Where the column's light is drawn: a layer behind the plot that may reach past it. */
  sceneLayer?: HTMLElement | null;
  glow?: GlowFactory;
  handlers?: GoalsInsightsHandlers;
}

export interface GoalsInsightsController {
  resize: (width: number, height: number) => void;
  setFlat: (flat: boolean) => void;
  setProblemsOnly: (on: boolean) => void;
  /** Back to the resting angle, at 100%, centred. */
  resetView: () => void;
  view: () => ColumnView;
  picks: () => ColumnPicks;
  /** Whether the column's light is drawn (WebGL 2), or the SVG keeps its own glass and particles. */
  glowing: () => boolean;
  /** Stops every loop and listener, and lets go of the light's GPU memory. */
  destroy: () => void;
}

/** Clockwise turn: one 64th of a turn every 520ms, a full turn in about 33s. */
const SPIN_PER_MS = YAW_STEP / 520;
/** At 100% the drawing is fitted with this much room round it: the column a touch smaller, so the goal over it can be larger. */
const FIT = 1.12;
/** At this zoom and closer every claim has the kind of asset it is about written beside it. */
const DETAIL_ZOOM = 1.45;
/** How far the connected goals stand off the axis, in drawing units: as wide as the room lets their labels run out, within these. */
const ASIDE = { min: 190, max: 400 };
/** What a connected goal's label usually takes beside its sphere, in screen px: the connected goals stand off the axis to leave it. */
const ASIDE_LABEL = 290;
/** What a connected goal's label takes past its sphere, screen px: the leader and the spine, its readout, and the card's margin. */
const LABEL = { lead: 23, readout: 190, margin: 12 };
/** About how wide a name (body md) and a head line (body xs caps) set, per character. */
const CHAR = { name: 6.6, cap: 6 };

/** How much of a connected goal's label fits in `room` px between its sphere and the card's edge. */
function labelFit(goal: InsightsGoal, room: number): LabelFit {
  const head = `Connected · ${goal.code} ● ${goal.status?.label ?? ''}`.length * CHAR.cap;
  const name = Math.max(head, goal.name.length * CHAR.name) + LABEL.lead + LABEL.margin;
  if (room >= Math.max(name, LABEL.lead + LABEL.readout + LABEL.margin)) return 'full';
  return room >= name ? 'compact' : 'none';
}
/** How long the column's light takes to come up. */
const INTRO_MS = 1800;
/** The most backing-store pixels the light's canvas may hold. */
const MAX_PIXELS = 5e6;
/** Pointer travel before a press counts as a drag, so clicks still reach claims. */
const SLOP = 3;
/** The floor the column casts its shadow on, under its tail, drawing units: its centre and its reach; seen tilted, it is as deep as the rings are open, never shallower than `ry`. */
const SHADOW = { y: TAIL_Y + 10, rx: 220, ry: 60 };
/** The smoked glass over the shadow, as the asset health arena's floor over its own: a share of the shadow's size, and how far it stands above its centre. */
const SMOKE = { scale: 0.72, lift: 6 };
/** Dots in the main goal's sphere, and in a connected goal's. */
const CLOUD_CAP = { main: 220, aside: 44 };

/** A claim's side, as the light reads it. */
const KIND_OF: Record<Evidence, ClaimKind> = { contradicting: KIND.against, disputed: KIND.disputed, supporting: KIND.for, unverified: KIND.single };

/** A colour as linear light. */
const linear = (hex: string): RGB => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.pow(c / 255, 2.2)) as RGB;
};
const TONE_LIGHT = { ok: linear(STATUS.ok), warn: linear(STATUS.warn), blocked: linear(STATUS.blocked) };

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The problems a reader asked to see: what argues against the goal, and what is disputed. */
const isProblem = (c: Claim) => c.evidence === 'contradicting' || c.evidence === 'disputed';

interface PlacedGoal {
  goal: InsightsGoal;
  x: number;
  y: number;
  main: boolean;
  side: -1 | 1;
}

/** The moving parts the painter positions every frame, found by their tags after each render. */
interface ColumnNodes {
  claims: { el: SVGElement; i: number; caption: SVGElement | null; w: number; d: number }[];
  web: { el: SVGElement; link: WebLink }[];
  webNodes: { el: SVGElement; link: WebLink }[];
  lineage: { el: SVGElement; link: LineageLink }[];
  goalLinks: { el: SVGElement; i: number; gx: number; gy: number; k: number; n: number }[];
}

const all = (root: Element, attr: string) => [...root.querySelectorAll<SVGElement>(`[${attr}]`)];
const num = (el: Element, attr: string) => Number(el.getAttribute(attr));

function collectNodes(root: Element, topology: ColumnTopology): ColumnNodes {
  return {
    claims: all(root, 'data-claim').map((el) => {
      const caption = el.querySelector<SVGElement>('[data-kind]');
      return { el, i: num(el, 'data-claim'), caption, w: caption ? num(caption, 'data-kind-w') : 0, d: caption ? num(caption, 'data-kind-d') : 0 };
    }),
    web: all(root, 'data-web').map((el) => ({ el, link: topology.web[num(el, 'data-web')]! })),
    webNodes: all(root, 'data-web-node').map((el) => ({ el, link: topology.web[num(el, 'data-web-node')]! })),
    lineage: all(root, 'data-lineage').map((el) => ({ el, link: topology.lineage[num(el, 'data-lineage')]! })),
    goalLinks: all(root, 'data-goal-link').map((el) => ({
      el,
      i: num(el, 'data-goal-link'),
      gx: num(el, 'data-gx'),
      gy: num(el, 'data-gy'),
      // a strand of the line's bundle: which, of how many (a line without a bundle is strand 0 of 1)
      k: el.hasAttribute('data-strand-k') ? num(el, 'data-strand-k') : 0,
      n: el.hasAttribute('data-strand-n') ? num(el, 'data-strand-n') : 1,
    })),
  };
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
/** The time labels at the rings' right ends: captions keep off them. */
const TIME_LABELS: Box[] = STRATA.filter((s) => s.labelled).map((s) => ({ x0: CX + s.rx + 2, y0: s.y - 9, x1: CX + s.rx + 58, y1: s.y + 9 }));

/**
 * Positions the moving parts straight on the DOM, every frame: the claims
 * (and their depth), the web and the lineage between them, and the strands
 * into the goals, which sway slowly, each at its own pace. Zoomed in, the
 * claims nearest the viewer write their asset beside them where it clears
 * the captions already shown, the time labels and every other claim.
 */
function paintNodes(nodes: ColumnNodes, pts: ClaimPoint[], t: number) {
  for (const { el, i } of nodes.claims) {
    const p = pts[i];
    if (!p) continue;
    el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    el.setAttribute('opacity', nearness(p.depth).toFixed(3));
  }
  const marks: Box[] = nodes.claims.map(({ i, d }) => ({ x0: pts[i]!.x - (d || 5), y0: pts[i]!.y - (d || 5), x1: pts[i]!.x + (d || 5), y1: pts[i]!.y + (d || 5) }));
  const placed: Box[] = [...TIME_LABELS];
  const order = nodes.claims
    .map((c, k) => ({ c, k }))
    .filter(({ c }) => c.caption)
    .sort((a, b) => pts[b.c.i]!.depth - pts[a.c.i]!.depth);
  for (const { c, k } of order) {
    const p = pts[c.i]!;
    const box = { x0: p.x + c.d + 5, y0: p.y - 6, x1: p.x + c.d + 6 + c.w, y1: p.y + 6 };
    const clear = p.depth > -0.2 && !placed.some((b) => overlaps(b, box)) && !marks.some((m, j) => j !== k && overlaps(m, box));
    c.caption!.style.opacity = clear ? '1' : '0';
    if (clear) placed.push(box);
  }
  for (const { el, link } of nodes.web) el.setAttribute('d', webPath(pts[link.a]!, pts[link.b]!, link.bend));
  for (const { el, link } of nodes.webNodes) {
    const a = pts[link.a]!;
    const b = pts[link.b]!;
    el.setAttribute('cx', ((a.x + b.x) / 2).toFixed(1));
    el.setAttribute('cy', ((a.y + b.y) / 2 + link.bend).toFixed(1));
  }
  for (const { el, link } of nodes.lineage) el.setAttribute('d', lineagePath(pts[link.a]!, pts[link.b]!, link.bend));
  for (const { el, i, gx, gy, k, n } of nodes.goalLinks) {
    // the strands of one bundle part and meet again, each on its own phase, gathered where they leave the claim and enter the goal
    const off = k - (n - 1) / 2;
    const sway = Math.sin(t * 0.55 + i * 1.7) * 16 + off * 7 + Math.sin(t * 0.9 + i + k * 1.9) * 6 * Math.min(1, n - 1);
    const swing = Math.cos(t * 0.42 + i * 2.3) * 22 + off * 9 + Math.cos(t * 0.75 + k * 2.4 + i) * 8 * Math.min(1, n - 1);
    el.setAttribute('d', goalLinkPath(pts[i]!, gx, gy, sway, swing));
  }
}

/** Particles riding the axis in SVG, one for each colour given, where the column's light is not running. */
function svgParticles(seed: number, colors: string[], spread: number, seconds: number): SVGTemplateResult[] {
  return particleSeeds(seed, colors.length, spread, seconds).map((p, i) => {
    const dur = `${p.dur.toFixed(2)}s`;
    const begin = `${(-p.phase).toFixed(2)}s`;
    return svg`<circle cx=${p.jx.toFixed(1)} cy=${p.jy.toFixed(1)} r=${p.size.toFixed(2)} fill=${colors[i]!} opacity="0">
      <animateMotion dur=${dur} begin=${begin} repeatCount="indefinite" path=${AXIS}></animateMotion>
      <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.12;0.86;1" dur=${dur} begin=${begin} repeatCount="indefinite"></animate>
    </circle>`;
  });
}

/**
 * The evidence column, after the Goals & insights design: the goal over the
 * apex of a column of rings, one ring every two hours with now at the top;
 * the claims its agents filed as diamonds on the ring of the hour each was
 * filed, round the column by subject, nearer the axis the more they move the
 * goal; the goals it shares evidence with beside it, the claims with three or
 * more sources running up to the goal they were filed under. Under the SVG
 * the column's light is drawn with WebGL.
 *
 * It turns slowly on its own and holds still under the pointer. Drag to turn
 * it and to open or close its rings, scroll to zoom towards the pointer,
 * double-click to set it back; click a claim or a connected goal to pick it
 * out.
 */
export function renderGoalsInsights(container: HTMLElement, options: RenderGoalsInsightsOptions): GoalsInsightsController {
  const { model, palette } = options;
  const on = options.handlers ?? {};
  const motion = options.motion ?? !reducedMotion();
  let flat = !!options.flat;
  let problemsOnly = !!options.problemsOnly;
  let size = { width: options.width, height: options.height };

  // where the column is seen from, now and where it is easing to
  const start = options.view ?? DEFAULT_VIEW;
  const now = { ...start };
  const aim = { ...start };
  let shown = { ...start };

  const claims = model.claims;
  const ids = new Set(claims.map((c) => c.id));
  const goalIds = new Set(model.connected.map((g) => g.id));
  let pickedClaim = options.picks?.claim && ids.has(options.picks.claim) ? options.picks.claim : null;
  let pickedGoal = options.picks?.goal && goalIds.has(options.picks.goal) ? options.picks.goal : null;
  let hoverClaim: number | null = null;
  let hoverGoal: string | null = null;
  let holding = false;
  let dragging = false;

  const topology = columnTopology(claims);
  const own = claims.slice(0, model.counted);
  const flow = columnFlow(own);
  const against = own.filter((c) => c.evidence === 'contradicting').length;
  const mine = (i: number) => i < model.counted;
  const shared = (id: string) => claims.filter((c) => (c.goal === model.goal.id && c.also.includes(id)) || (c.goal === id && c.also.includes(model.goal.id))).length;

  // ── the stage: the column's SVG, its goals' agents over it, and their glass and labels over those ──
  container.replaceChildren();
  const stage = document.createElement('div');
  stage.className = 'gi-stage';
  const column = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  column.setAttribute('class', 'gi-column');
  const cloudLayer = document.createElement('div');
  cloudLayer.className = 'gi-clouds';
  const goalsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  goalsLayer.setAttribute('class', 'gi-goals');
  stage.append(column, cloudLayer, goalsLayer);
  container.append(stage);

  // the light, behind the whole card so it has no edge to stop at
  const glowHost = options.sceneLayer ?? container;
  // the shadow under the column, as the asset health arena casts one under its floor: blurred in screen px, so as soft at every
  // zoom, and in the layer behind the whole card, so the plot's edge does not cut it off
  const shadow = document.createElement('div');
  shadow.className = 'gi-shadow';
  shadow.setAttribute('aria-hidden', 'true');
  // over it, a pool of smoked glass in the floor's mist, so the shadow carries the room's light rather than being only dark
  const smoke = document.createElement('div');
  smoke.className = 'gi-shadow-smoke';
  smoke.setAttribute('aria-hidden', 'true');
  const glowCanvas = document.createElement('canvas');
  glowCanvas.className = 'gi-glow';
  glowCanvas.setAttribute('aria-hidden', 'true');
  glowHost.append(shadow, smoke, glowCanvas);
  let glow: ColumnRenderer | null = (options.glow ?? createColumnRenderer)(glowCanvas, palette, 1 + model.connected.length, linear(STATUS.blocked), linear(STATUS.warn));
  if (!glow) glowCanvas.remove();

  // the goals: the main one over the apex, its connected goals either side, as far out as the room leaves their labels
  let goals: PlacedGoal[] = [];
  let fits = new Map<string, LabelFit>();
  const clouds = new Map<string, GoalCloud>();
  const cloudFor = (g: PlacedGoal) => {
    let cloud = clouds.get(g.goal.id);
    if (!cloud) {
      cloud = createGoalCloud(cloudLayer, g.goal.id, g.goal.agents, g.main ? CLOUD_CAP.main : CLOUD_CAP.aside, palette);
      clouds.set(g.goal.id, cloud);
    }
    return cloud;
  };

  // the plot in screen px, and the card the light covers round it
  let unitHome = 1;
  let offset = { x: 0, y: 0, width: size.width, height: size.height };
  const measure = () => {
    unitHome = Math.max((VIEW.width * FIT) / Math.max(1, size.width), (VIEW.height * FIT) / Math.max(1, size.height));
    const spread = Math.round(Math.min(ASIDE.max, Math.max(ASIDE.min, (size.width / 2 - ASIDE_LABEL) * unitHome)));
    // the room between a connected goal and the card's edge, which its label runs out into
    const room = size.width / 2 - spread / unitHome;
    fits = new Map(model.connected.map((g) => [g.id, labelFit(g, room)]));
    goals = [
      { goal: model.goal, ...GOAL_AT.main, main: true, side: 1 },
      ...model.connected.map((goal, k): PlacedGoal => ({ goal, x: CX + (k === 0 ? -spread : spread), y: GOAL_AT.aside[k]!.y, main: false, side: k === 0 ? -1 : 1 })),
    ];
    if (glowHost !== container && glowHost.isConnected) {
      const box = glowHost.getBoundingClientRect();
      const plot = container.getBoundingClientRect();
      // an ancestor's transform scales what the rects measure, not the layer's own px
      const k = glowHost.offsetWidth && box.width ? box.width / glowHost.offsetWidth : 1;
      offset = { x: (plot.left - box.left) / k, y: (plot.top - box.top) / k, width: glowHost.offsetWidth || size.width, height: glowHost.offsetHeight || size.height };
    } else offset = { x: 0, y: 0, width: size.width, height: size.height };
  };
  measure();

  /** Drawing units per screen px, at the view shown. */
  const unitAt = (v: ColumnView) => unitHome / v.zoom;
  const viewBox = (v: ColumnView) => {
    const u = unitAt(v);
    return { x: v.cx - (size.width * u) / 2, y: v.cy - (size.height * u) / 2, w: size.width * u, h: size.height * u, u };
  };

  // ── the column's SVG, rendered when what it shows changes ──
  const tipKeyOf = (el: Element | null) => el?.closest('[data-tip]')?.getAttribute('data-tip') ?? null;

  const strandTone = (c: Claim) => (c.polarity === 'contradicting' ? 'var(--ah-blocked)' : 'var(--ah-ink)');
  const glowOf = (c: Claim) =>
    c.polarity === 'contradicting' ? 'filter: drop-shadow(0 0 3px color-mix(in srgb, var(--ah-blocked) 80%, transparent))' : 'filter: drop-shadow(0 0 3px var(--ah-glint))';

  const columnTemplate = (v: ColumnView, lit: boolean): SVGTemplateResult => {
    const tilt = flat ? 0 : v.tilt;
    const flatNow = tilt < 0.012;
    const detail = v.zoom >= DETAIL_ZOOM;
    const k = unitAt(v);
    const goalAt = (id: string) => goals.find((g) => g.goal.id === id);
    const pop = pickedClaim ? claims.findIndex((c) => c.id === pickedClaim) : -1;
    const touches = (a: number, b: number) => hoverClaim !== null && (a === hoverClaim || b === hoverClaim);
    const fade = (a: number, b: number) => (mine(a) || mine(b) ? 1 : 0.3);
    const red = (a: number, b: number) => claims[a]!.polarity === 'contradicting' || claims[b]!.polarity === 'contradicting';
    const kept = (c: Claim) => !problemsOnly || isProblem(c);
    const sharedShown = (c: Claim) => c.goal === model.goal.id || pickedGoal === null || pickedGoal === c.goal;
    const freshColors = flow.sources.filter((m) => m.fresh).map((m) => (m.evidence === 'supporting' ? 'var(--ah-ink)' : EVIDENCE_COLOR[m.evidence]));
    const oldColors = flow.sources.filter((m) => !m.fresh).map((m) => (m.evidence === 'supporting' ? 'var(--gi-cool)' : EVIDENCE_COLOR[m.evidence]));

    return svg`
      ${columnDefs(VIEW, APEX_Y, { top: WRAP_TOP, bottom: WRAP_BOTTOM })}
      <g class="gi-strata">
        ${STRATA.map((s) => svg`${ring(s, tilt, flatNow, s.opacity, lit ? 0 : (flow.dust[s.cycle] ?? 0))}${s.labelled ? timeLabel(s, k) : nothing}`)}
        ${lit ? nothing : svg`<path d=${WRAP_OUTLINE} fill="url(#gi-wrap-glass)" pointer-events="none"></path>`}
        <path d=${WRAP_OUTLINE} fill="none" stroke="url(#gi-wrap-rim)" stroke-width="0.75" pointer-events="none"></path>
      </g>
      ${
        motion && !lit
          ? svg`<g pointer-events="none" mask="url(#gi-apex-mask)">
            ${svgParticles(51, freshColors, 10, 9)}
            ${svgParticles(52, oldColors, 22, 12)}
          </g>`
          : nothing
      }
      <g class="gi-links">
        ${topology.web.map(
          (l, i) => svg`<path data-web=${i} fill="none" stroke=${red(l.a, l.b) ? 'var(--ah-blocked)' : 'var(--ah-ink)'} stroke-width=${touches(l.a, l.b) ? 0.9 : 0.5}
              opacity=${touches(l.a, l.b) ? 0.7 : (red(l.a, l.b) ? 0.14 : 0.1) * fade(l.a, l.b) * 0.3} class="ah-fade"></path>
            ${l.node ? svg`<circle data-web-node=${i} r="1.1" fill=${red(l.a, l.b) ? 'var(--ah-blocked)' : 'var(--ah-ink)'} opacity=${(touches(l.a, l.b) ? 0.9 : 0.35 * 0.35) * fade(l.a, l.b)}></circle>` : nothing}`,
        )}
        ${topology.lineage.map(
          (l, i) => svg`<path data-lineage=${i} fill="none" stroke=${red(l.a, l.b) ? 'var(--ah-blocked)' : 'var(--ah-ink)'} stroke-width=${touches(l.a, l.b) ? 0.9 : 0.45}
            opacity=${touches(l.a, l.b) ? 0.65 : (red(l.a, l.b) ? 0.13 : 0.08) * fade(l.a, l.b) * 0.3} class="ah-fade"></path>`,
        )}
        ${
          pop >= 0
            ? claims[pop]!.also.map((id) => {
                const g = goalAt(id);
                return g
                  ? svg`<path data-goal-link=${pop} data-gx=${g.x} data-gy=${g.y} fill="none" stroke="var(--ah-ink)" stroke-width="1.25" opacity="0.85"
                      class="gi-pop" style="filter: drop-shadow(0 0 3px var(--ah-arc-glow))"></path>`
                  : nothing;
              })
            : nothing
        }
        ${claims.map((c, i) => {
          const g = goalAt(c.goal);
          if (!g || c.sources < 3 || !sharedShown(c)) return nothing;
          const hot = hoverGoal === c.goal;
          const away = c.goal !== model.goal.id && !hot;
          const n = Math.min(5, c.sources);
          // a connected goal's own claims, which don't bear on this goal, stay a trace until that goal is under the pointer
          const opacity = Math.min(1, (0.16 + c.weight * 0.3) * (hot ? 2.4 : 1)) * (kept(c) ? 1 : 0.06) * (away ? (mine(i) ? 0.75 : 0.25) : 1);
          return svg`<g style=${glowOf(c)} class="gi-strand">
            ${Array.from(
              { length: n },
              (_, s) => svg`<path id=${s === 0 ? `gi-link-${i}` : nothing} data-goal-link=${i} data-strand-k=${s} data-strand-n=${n} data-gx=${g.x}
                data-gy=${g.main ? g.y + 13 : g.y} fill="none" stroke=${strandTone(c)} stroke-linecap="round"
                stroke-width=${(0.35 + c.weight * 0.5) * (hot ? 1.4 : 1)} opacity=${opacity * (s === 0 ? 1 : 0.7)}></path>`,
            )}
          </g>`;
        })}
      </g>
      ${
        motion
          ? svg`<g pointer-events="none">
            ${claims.map((c, i) => {
              const g = goalAt(c.goal);
              // the goal's own evidence only — a connected goal's other claims carry no lights unless that goal is under the pointer
              if (!g || g.main || c.sources < 3 || !sharedShown(c) || !kept(c) || (!mine(i) && hoverGoal !== c.goal)) return nothing;
              const color = c.polarity === 'contradicting' ? 'var(--ah-blocked)' : 'var(--ah-glint-stroke)';
              return particleSeeds(900 + i, Math.min(4, c.sources), 0, 3.4).map(
                (p) => svg`<circle r=${0.6 + p.size * 0.9} fill=${color} opacity="0" style=${glowOf(c)}>
                  <animateMotion dur=${`${p.dur.toFixed(2)}s`} begin=${`${(-p.phase).toFixed(2)}s`} repeatCount="indefinite"><mpath href=${`#gi-link-${i}`}></mpath></animateMotion>
                  <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.15;0.85;1" dur=${`${p.dur.toFixed(2)}s`} begin=${`${(-p.phase).toFixed(2)}s`} repeatCount="indefinite"></animate>
                </circle>`,
              );
            })}
          </g>`
          : nothing
      }
      <g class="gi-claims">
        ${claims.map((c, i) => {
          const d = claimRadius(c.records);
          const selected = c.id === pickedClaim;
          const dim = (mine(i) ? 1 : 0.28) * (kept(c) ? 1 : 0.06);
          const emphasis = selected ? 1 : c.state === 'new' ? 0.95 : 0.72;
          return svg`<g data-claim=${i}>
            <g opacity=${dim * emphasis} data-tip=${`claim:${c.id}`} class="gi-claim">
              ${
                c.age < 1 && motion
                  ? svg`<circle r=${d + 2} fill="none" stroke=${EVIDENCE_COLOR[c.evidence]} stroke-width="0.8" opacity="0" pointer-events="none">
                    <animate attributeName="r" values=${`${d + 2};${d + 15}`} dur="2.8s" begin=${`${-(i % 7) * 0.4}s`} repeatCount="indefinite"></animate>
                    <animate attributeName="opacity" values="0.75;0" dur="2.8s" begin=${`${-(i % 7) * 0.4}s`} repeatCount="indefinite"></animate>
                  </circle>`
                  : nothing
              }
              ${claimDiamond(c.evidence, d, detail && mine(i) && c.asset ? c.asset : undefined)}
              ${selected ? svg`<path d=${diamondPath(d + 4.5)} fill="none" stroke="var(--ah-ink)" stroke-width="1" stroke-dasharray="2 2.5" class="gi-picked"></path>` : nothing}
            </g>
          </g>`;
        })}
      </g>
      <path d=${TAIL_CURVE} fill="none" stroke="var(--ah-ink)" stroke-width="0.75" opacity="0.22"></path>
      <circle cx=${CX} cy=${TAIL_Y - 6} r="2.6" fill="var(--ah-glint-stroke)" opacity="0.9" style="filter: drop-shadow(0 0 4px var(--ah-glint))"></circle>
      ${goals.map((g) => svg`<g transform=${`translate(${g.x} ${g.y})`} opacity=${goalOpacity(g)}>${goalBase(g.main ? MAIN_DIAL : ASIDE_DIAL, g.main ? 110 : 40, g.main ? 1 : 0.7)}</g>`)}
    `;
  };

  const goalOpacity = (g: PlacedGoal) => (g.main || pickedGoal === null || pickedGoal === g.goal.id ? 1 : 0.35);

  const goalsTemplate = (v: ColumnView): SVGTemplateResult => {
    const k = unitAt(v);
    return svg`${goals.map((g) =>
      g.main
        ? svg`<g transform=${`translate(${g.x} ${g.y})`} data-tip="main" class="gi-goal gi-hit">
            <circle r=${MAIN_DIAL.r + MAIN_DIAL.gap} fill="transparent"></circle>
            ${goalDial({ ...MAIN_DIAL, progress: g.goal.confidence })}
            ${mainGoalLabel(g.goal, k)}
          </g>`
        : svg`<g transform=${`translate(${g.x} ${g.y})`} data-tip=${`goal:${g.goal.id}`} data-goal=${g.goal.id} role="button" tabindex="0"
            aria-label=${`Pick out ${g.goal.name}`} aria-pressed=${pickedGoal === g.goal.id ? 'true' : 'false'} opacity=${goalOpacity(g)} class="gi-goal gi-hit">
            <circle r="24" fill="transparent"></circle>
            ${goalDial({ ...ASIDE_DIAL, progress: g.goal.confidence })}
            ${connectedGoalLabel(g.goal, g.side, hoverGoal === g.goal.id, fits.get(g.goal.id) ?? 'none', k)}
          </g>`,
    )}`;
  };

  let nodes: ColumnNodes | null = null;
  const renderOverlay = (v: ColumnView) => {
    const box = viewBox(v);
    const vb = `${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.w.toFixed(2)} ${box.h.toFixed(2)}`;
    column.setAttribute('viewBox', vb);
    goalsLayer.setAttribute('viewBox', vb);
    render(columnTemplate(v, !!glow), column as unknown as HTMLElement);
    render(goalsTemplate(v), goalsLayer as unknown as HTMLElement);
    nodes = collectNodes(column, topology);
    // laid flat, the floor is seen from above, so the shadow under it is fainter
    const tilt = flat ? 0 : v.tilt;
    shadow.classList.toggle('is-flat', tilt < 0.012);
    smoke.classList.toggle('is-flat', tilt < 0.012);
    const rx = SHADOW.rx / box.u;
    const ry = Math.max(SHADOW.ry, SHADOW.rx * tilt) / box.u;
    const place = (el: HTMLElement, k: number, y: number) => {
      el.style.width = `${(rx * k * 2).toFixed(1)}px`;
      el.style.height = `${(ry * k * 2).toFixed(1)}px`;
      el.style.transform = `translate(${(offset.x + (CX - box.x) / box.u - rx * k).toFixed(1)}px, ${(offset.y + (y - box.y) / box.u - ry * k).toFixed(1)}px)`;
    };
    place(shadow, 1, SHADOW.y);
    place(smoke, SMOKE.scale, SHADOW.y - SMOKE.lift);
  };

  // ── the column's light: where everything stands, as the SVG draws it ──
  const particles = (() => {
    const fresh = flow.sources.filter((m) => m.fresh);
    const old = flow.sources.filter((m) => !m.fresh);
    const lightOf = (evidence: Evidence, isFresh: boolean): RGB =>
      evidence === 'supporting'
        ? isFresh
          ? palette.agent
          : palette.light
        : evidence === 'contradicting'
          ? linear(STATUS.blocked)
          : evidence === 'disputed'
            ? linear(STATUS.warn)
            : [0.3, 0.33, 0.37];
    const ride = (seed: number, spread: number, seconds: number, colors: RGB[]) =>
      particleSeeds(seed, colors.length, spread, seconds).map((p, k) => ({ ...p, color: colors[k]! }));
    return [...ride(51, 10, 9, fresh.map((m) => lightOf(m.evidence, true))), ...ride(52, 22, 12, old.map((m) => lightOf(m.evidence, false)))];
  })();
  const dust = STRATA.flatMap((s) =>
    ringMotes(s.cycle, flow.dust[s.cycle] ?? 0).map((m) => ({ ring: s.cycle, ux: m.ux, uy: m.uy, size: m.r, opacity: m.opacity * (s.old ? 0.45 : 1) })),
  );
  const glowKey = `${model.goal.id}:${claims.length}`;

  /** One frame of the light, read off the current state: nothing eases here, so a still column paints what it shows. */
  const glowFrame = (v: ColumnView, pts: ClaimPoint[], time: number | null, intro: number): ColumnFrame => {
    const box = viewBox(v);
    return {
      region: { x: box.x - offset.x * box.u, y: box.y - offset.y * box.u, w: offset.width * box.u, h: offset.height * box.u },
      tilt: flat ? 0 : v.tilt,
      yaw: v.yaw,
      flat: flat || v.tilt < 0.012,
      time,
      intro,
      claims: claims.map((c, i) => ({
        x: pts[i]?.x ?? 0,
        y: pts[i]?.y ?? 0,
        depth: pts[i]?.depth ?? 0,
        r: claimRadius(c.records),
        kind: KIND_OF[c.evidence],
        fresh: c.age < 24,
        alpha: (mine(i) ? 1 : 0.28) * (!problemsOnly || isProblem(c) ? 1 : 0.06),
      })),
      goals: goals.map((g) => ({
        x: g.x,
        y: g.y,
        r: g.main ? 36 : 12.5,
        strength: g.main ? 1 : (pickedGoal === null || pickedGoal === g.goal.id ? 0.5 : 0.2) * (hoverGoal === g.goal.id ? 1.6 : 1),
        tone: g.goal.status ? TONE_LIGHT[g.goal.status.tone] : palette.light,
      })),
      rings: STRATA.map((s) => ({ y: s.y, rx: s.rx, major: s.labelled, shown: s.old ? 0.45 : 1 })),
      key: glowKey,
      particles,
      dust,
    };
  };

  let sized = '';
  const sizeGlow = () => {
    if (!glow) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const within = Math.min(1, Math.sqrt(MAX_PIXELS / Math.max(1, offset.width * offset.height * dpr * dpr)));
    const w = Math.max(8, Math.round((offset.width * dpr * within) / 8) * 8);
    const h = Math.max(8, Math.round((offset.height * dpr * within) / 8) * 8);
    if (`${w}x${h}` !== sized) {
      sized = `${w}x${h}`;
      glow.resize(w, h);
    }
  };

  // ── one clock for the turn, the glide and the light ──
  let raf = 0;
  let last = 0;
  let began = 0;
  let destroyed = false;
  let visible = true;
  let dirty = true;
  const moving = () =>
    Math.abs(aim.yaw - now.yaw) > 1e-5 ||
    Math.abs(aim.tilt - now.tilt) > 0.0008 ||
    Math.abs(aim.zoom - now.zoom) > 0.0015 ||
    Math.abs(aim.cx - now.cx) > 0.05 ||
    Math.abs(aim.cy - now.cy) > 0.05;

  const frame = (ts: number) => {
    raf = 0;
    if (destroyed) return;
    if (!began) began = ts;
    // frames stop while the card is hidden; cap the gap so the column doesn't leap on return
    const dt = last ? Math.min(64, ts - last) : 16;
    last = ts;
    const spinning = motion && !flat && !dragging && !holding && visible;
    if (spinning) aim.yaw += dt * SPIN_PER_MS;
    if (motion) {
      const ease = 1 - Math.exp(-dt / 110);
      const glide = 1 - Math.exp(-dt / 90);
      now.yaw += (aim.yaw - now.yaw) * ease;
      now.tilt = Math.abs(aim.tilt - now.tilt) > 0.0008 ? now.tilt + (aim.tilt - now.tilt) * ease : aim.tilt;
      now.zoom = Math.abs(aim.zoom - now.zoom) > 0.0015 ? now.zoom + (aim.zoom - now.zoom) * glide : aim.zoom;
      now.cx = Math.abs(aim.cx - now.cx) > 0.05 ? now.cx + (aim.cx - now.cx) * glide : aim.cx;
      now.cy = Math.abs(aim.cy - now.cy) > 0.05 ? now.cy + (aim.cy - now.cy) * glide : aim.cy;
    } else Object.assign(now, aim);
    if (Math.abs(now.yaw) > Math.PI * 4) {
      const wrapped = wrapAngle(now.yaw);
      aim.yaw += wrapped - now.yaw;
      now.yaw = wrapped;
    }
    // the SVG is laid out again only when what it shows changes; the turn alone moves its parts
    if (dirty || now.tilt !== shown.tilt || now.zoom !== shown.zoom || now.cx !== shown.cx || now.cy !== shown.cy) {
      renderOverlay(now);
      for (const g of goals) {
        const box = viewBox(now);
        const r = g.main ? MAIN_DIAL.r : ASIDE_DIAL.r;
        cloudFor(g).place((g.x - box.x) / box.u, (g.y - box.y) / box.u, (r * 2) / box.u);
      }
    }
    shown = { ...now };
    const tilt = flat ? 0 : now.tilt;
    const pts = claimLayout(claims, now.yaw, tilt);
    const t = motion ? ts / 1000 : 0;
    if (nodes) paintNodes(nodes, pts, t);
    for (const cloud of clouds.values()) cloud.paint(motion ? ts : null);
    if (glow) {
      sizeGlow();
      const intro = motion ? 1 - Math.pow(1 - Math.min(1, (ts - began) / INTRO_MS), 3) : 1;
      glow.render(glowFrame(now, pts, motion ? (ts - began) / 1000 : null, intro));
    }
    dirty = false;
    // the strands sway and the light breathes while motion is on; with it off a frame is painted only when asked for
    const introducing = motion && ts - began < INTRO_MS;
    if ((motion && visible) || moving() || introducing) raf = requestAnimationFrame(frame);
  };
  /** Paints what changed on the next frame, whether or not the column is moving. */
  const invalidate = () => {
    dirty = true;
    if (!raf && !destroyed) raf = requestAnimationFrame(frame);
  };
  invalidate();

  const intersect =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          visible = entries.some((e) => e.isIntersecting) && document.visibilityState !== 'hidden';
          if (visible) invalidate();
        })
      : null;
  intersect?.observe(stage);
  const updateVisible = () => {
    visible = document.visibilityState !== 'hidden';
    if (visible) invalidate();
  };
  document.addEventListener('visibilitychange', updateVisible);

  // ── pointing ──
  const tipFor = (key: string): ChartTooltipContent | null => {
    const [kind, ...rest] = key.split(':');
    const id = rest.join(':');
    if (kind === 'ring') return ringTip(Number(id));
    if (kind === 'time') return timeTip(Number(id));
    if (kind === 'main') return mainGoalTip(model.goal, against);
    if (kind === 'goal') {
      const g = model.connected.find((c) => c.id === id);
      return g ? connectedGoalTip(model.goal, g, shared(g.id)) : null;
    }
    if (kind === 'claim') {
      const c = claims.find((x) => x.id === id);
      return c ? claimTip(model, c) : null;
    }
    return null;
  };
  let tipKey: string | null = null;
  const point = (event: Pointer) => {
    const target = event.target instanceof Element ? event.target : null;
    const claimEl = target?.closest('[data-claim]');
    const goalEl = target?.closest('[data-goal]');
    const nextClaim = claimEl ? Number(claimEl.getAttribute('data-claim')) : null;
    const nextGoal = goalEl?.getAttribute('data-goal') ?? null;
    const key = tipKeyOf(target);
    // the column holds still under the pointer, so a claim can be read and clicked
    holding = key !== null;
    if (nextClaim !== hoverClaim || nextGoal !== hoverGoal) {
      hoverClaim = nextClaim;
      hoverGoal = nextGoal;
      invalidate();
    }
    if (key === tipKey) return;
    tipKey = key;
    const content = key ? tipFor(key) : null;
    if (content) on.onTip?.(content, event);
    else on.onLeave?.();
  };

  interface Drag {
    x: number;
    y: number;
    yaw: number;
    tilt: number;
    pointer: number;
    moved: boolean;
  }
  let drag: Drag | null = null;
  let swallowClick = false;
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || flat) return;
    drag = { x: event.clientX, y: event.clientY, yaw: aim.yaw, tilt: aim.tilt, pointer: event.pointerId, moved: false };
  };
  const onPointerMove = (event: PointerEvent) => {
    const d = drag;
    if (!d) {
      point(event);
      return;
    }
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.moved) {
      // a press that doesn't travel stays a click on the claim underneath
      if (Math.hypot(dx, dy) < SLOP) return;
      d.moved = true;
      try {
        stage.setPointerCapture(event.pointerId);
      } catch {
        // a synthetic pointer: nothing to capture
      }
      dragging = true;
      stage.classList.add('is-dragging');
      tipKey = null;
      on.onLeave?.();
    }
    aim.yaw = d.yaw + dx * 0.006;
    aim.tilt = Math.max(TILT_RANGE[0], Math.min(TILT_RANGE[1], d.tilt + dy * 0.0012));
    invalidate();
  };
  const endDrag = () => {
    const d = drag;
    drag = null;
    dragging = false;
    stage.classList.remove('is-dragging');
    if (d?.moved) swallowClick = true;
    invalidate();
  };
  const onLeave = () => {
    if (drag) return;
    holding = false;
    if (hoverClaim !== null || hoverGoal !== null) {
      hoverClaim = null;
      hoverGoal = null;
      invalidate();
    }
    tipKey = null;
    on.onLeave?.();
  };
  /** A click picks a claim or a connected goal out, or lets it go; a click on the empty room lets go of both. */
  const pickAt = (target: Element | null) => {
    const claimEl = target?.closest('[data-claim]');
    const goalEl = target?.closest('[data-goal]');
    if (claimEl) {
      const id = claims[Number(claimEl.getAttribute('data-claim'))]?.id ?? null;
      pickedClaim = pickedClaim === id ? null : id;
    } else if (goalEl) {
      const id = goalEl.getAttribute('data-goal');
      pickedGoal = pickedGoal === id ? null : id;
    } else {
      pickedClaim = null;
      pickedGoal = null;
    }
    invalidate();
  };
  const onClick = (event: MouseEvent) => {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    pickAt(event.target instanceof Element ? event.target : null);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const goalEl = event.target instanceof Element ? event.target.closest('[data-goal]') : null;
    if (!goalEl) return;
    event.preventDefault();
    pickAt(goalEl);
  };
  const home = () => ({ cx: VIEW.width / 2, cy: VIEW.height / 2 });
  const resetView = () => {
    aim.yaw = Math.round(now.yaw / (Math.PI * 2)) * Math.PI * 2;
    aim.tilt = DEFAULT_TILT;
    aim.zoom = 1;
    Object.assign(aim, home());
    invalidate();
  };
  // the wheel zooms in proportion to how far it turns, about 7% a notch, towards the point under the pointer
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const from = aim.zoom;
    const px = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
    const to = Math.min(ZOOM_RANGE[1], Math.max(ZOOM_RANGE[0], from * Math.exp(-px * 0.0014)));
    if (to === from) return;
    const rect = stage.getBoundingClientRect();
    const u = unitHome / from;
    const p = { x: aim.cx + (event.clientX - rect.left - rect.width / 2) * u, y: aim.cy + (event.clientY - rect.top - rect.height / 2) * u };
    const keep = from / to;
    aim.zoom = to;
    if (to <= 1.001) Object.assign(aim, home());
    else {
      aim.cx = Math.min(VIEW.width, Math.max(0, p.x - (p.x - aim.cx) * keep));
      aim.cy = Math.min(VIEW.height, Math.max(0, p.y - (p.y - aim.cy) * keep));
    }
    invalidate();
  };

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', onLeave);
  stage.addEventListener('click', onClick);
  stage.addEventListener('dblclick', resetView);
  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('keydown', onKey);
  stage.addEventListener('focusin', point);
  stage.addEventListener('focusout', onLeave);

  return {
    resize(width, height) {
      if (width <= 0 || height <= 0) return;
      size = { width, height };
      measure();
      invalidate();
    },
    setFlat(next) {
      if (next === flat) return;
      flat = next;
      if (flat) endDrag();
      invalidate();
    },
    setProblemsOnly(next) {
      if (next === problemsOnly) return;
      problemsOnly = next;
      invalidate();
    },
    resetView,
    view: () => ({ ...aim }),
    picks: () => ({ claim: pickedClaim, goal: pickedGoal }),
    glowing: () => glow !== null,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      intersect?.disconnect();
      document.removeEventListener('visibilitychange', updateVisible);
      glow?.dispose();
      glow = null;
      glowCanvas.remove();
      shadow.remove();
      smoke.remove();
      container.replaceChildren();
    },
  };
}

/** The column's time scale, as the reading under the title says it. */
export const RING_CAPTION = `${cycleSpan(0)[1]}h a ring · now at the top`;
