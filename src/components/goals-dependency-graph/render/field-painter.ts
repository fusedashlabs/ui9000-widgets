import type { AgentField, PaintOptions } from '../lib/field.js';
import { PIVOT_X, PIVOT_Y } from '../lib/scene.js';
import { createFieldRenderer } from './gl/renderer.js';
import { STATUS, type ScenePalette } from './scene-palette.js';

/**
 * What draws the agents: the WebGL picture where the device has WebGL 2, the
 * plain canvas painter otherwise — the same agents and marks, without the
 * smoke and the lens.
 */
export interface Painter {
  /** Sets the backing store, in canvas px. */
  resize(width: number, height: number): void;
  paint(options: PaintOptions): void;
  dispose(): void;
  readonly canvas: HTMLCanvasElement;
  readonly kind: 'webgl' | 'canvas';
}

type RGB = [number, number, number];

const hex = (value: string): RGB => {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const css = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Held agents keep these on every page; working agents come from the page's palette. */
const HOLD_TINT = {
  idle: hex('#929BA8'),
  awaiting: hex(STATUS.awaiting),
  blocked: hex(STATUS.blocked),
  failed: hex(STATUS.failed),
  degraded: hex(STATUS.warn),
} as const;
const MIST_LIGHT: RGB = [226, 226, 226];

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The map's scale on a large screen, where an agent's dot is drawn at its nominal size. */
const REFERENCE_SCALE = 1.42;

const sprites = new Map<string, HTMLCanvasElement>();
/** A soft round glow in a colour, drawn once and stamped wherever a mark needs to bloom. */
function glow(color: RGB): HTMLCanvasElement {
  const key = color.join();
  let sprite = sprites.get(key);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const ctx = sprite.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, css(color, 1));
      gradient.addColorStop(0.22, css(color, 0.42));
      gradient.addColorStop(0.55, css(color, 0.1));
      gradient.addColorStop(1, css(color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    sprites.set(key, sprite);
  }
  return sprite;
}

const fromLinear = (c: RGB): RGB => c.map((v) => Math.round(Math.pow(Math.min(1, Math.max(0, v)), 1 / 2.2) * 255)) as RGB;

/** Paints one frame onto a 2D canvas: `scale`, `x`, `y` say where design px land. */
function paintAgentField(
  ctx: CanvasRenderingContext2D,
  field: AgentField,
  frame: { scale: number; x: number; y: number },
  opts: PaintOptions,
  palette: ScenePalette,
) {
  // on a light page the field is laid down as ink, not added as light
  const light = palette.mode === 'light';
  const ADD: CanvasRenderingContext2D['globalCompositeOperation'] = light ? 'source-over' : 'lighter';
  const ink = palette.ink.map((v) => Math.round(v * 255)) as RGB;
  const TINT = { ...HOLD_TINT, healthy: light ? ink : fromLinear(palette.agent) };
  const MIST: RGB = light ? ink : MIST_LIGHT;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(frame.scale, 0, 0, frame.scale, frame.x, frame.y);
  ctx.globalCompositeOperation = ADD;

  const { pose, time, unit: u, intro } = opts;
  const live = time != null;
  const t = time ?? 0;
  const cyw = Math.cos(pose.yaw);
  const syw = Math.sin(pose.yaw);
  const cpt = Math.cos(pose.pitch);
  const spt = Math.sin(pose.pitch);
  const F = pose.focal;
  const cue = opts.depthCue ?? 1;

  // scene projection (shared with the SVG overlay's `projector`)
  let k = 0;
  let sx = 0;
  let sy = 0;
  let sz = 0;
  const project = (x: number, y: number, z: number) => {
    const x1 = x * cyw - z * syw;
    const z1 = x * syw + z * cyw;
    const y1 = y * cpt - z1 * spt;
    sz = y * spt + z1 * cpt;
    k = F / (F + sz);
    sx = PIVOT_X + x1 * k;
    sy = PIVOT_Y + y1 * k;
  };

  // the agents gather from a little further out as they settle in
  const grow = 0.74 + 0.26 * intro;
  // dots keep to the map's scale a little: finer when it is drawn small, fuller when zoomed in
  const grain = clamp(Math.sqrt(1 / (REFERENCE_SCALE * u)), 0.62, 1.9) * u * (opts.grain ?? 1);
  const spark = glow(TINT.healthy);

  for (const cloud of field.clouds) {
    const g = cloud.goal;
    const shown = (opts.goalAlpha?.(g.id) ?? 1) * intro;
    if (shown <= 0.01) continue;
    const bx = g.x - PIVOT_X;
    const by = g.y - PIVOT_Y;

    project(bx, by, g.z);
    const cx = sx;
    const cy = sy;
    const cz = sz;
    const R = g.r * k;
    const burn = g.goal.multiplier ?? 1;
    const breath = live ? 0.93 + 0.07 * Math.sin(t * (0.35 + burn * 0.22) + g.x) : 1;

    // the mist the canopy hangs in: bright at the heart, thinning out past its edge
    const reach = R * 2.3;
    const mist = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
    const haze = (light ? 0.06 : 0.12) * breath * shown * (0.35 + 0.65 * opts.healthy);
    mist.addColorStop(0, css(MIST, haze));
    mist.addColorStop(0.22, css(MIST, haze * 0.56));
    mist.addColorStop(0.44, css(MIST, haze * 0.2));
    mist.addColorStop(0.7, css(MIST, haze * 0.07));
    mist.addColorStop(1, css(MIST, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = mist;
    ctx.beginPath();
    ctx.arc(cx, cy, reach, 0, TAU);
    ctx.fill();

    const size = grow * cloud.scale;
    const p = cloud.position;
    const seeds = cloud.seed;
    /** Projects agent `i`; returns how near it is within its goal, 0 (back) – 1 (front). */
    const place = (i: number) => {
      project(bx + p[i * 3]! * size, by + p[i * 3 + 1]! * size, g.z + p[i * 3 + 2]! * size);
      return 0.5 + (clamp(0.5 - (sz - cz) / (2 * g.r), 0, 1) - 0.5) * cue;
    };
    // a tree drawn small keeps its agents apart with a finer dot
    const fine = 0.74 + 0.26 * clamp((cloud.scale - 0.3) / 0.7, 0, 1);

    // working and idle agents: plain dots, brighter and larger towards the camera
    for (const state of ['healthy', 'idle'] as const) {
      const [from, to] = cloud.ranges[state];
      const idle = state === 'idle';
      const level = (idle ? 0.55 : 1) * breath * shown * opts.healthy;
      if (level <= 0.01) continue;
      ctx.fillStyle = css(TINT[state]);
      for (let i = from; i < to; i++) {
        const near = place(i);
        const sd = seeds[i]!;
        // an idle agent is still: it does not catch the light as the working ones do
        const twinkle = live && !idle ? 0.84 + 0.16 * Math.sin(t * (0.5 + sd * 1.4) + sd * 97) : 1;
        const alpha = (0.2 + 0.8 * Math.pow(near, 1.3)) * (0.66 + 0.34 * sd) * twinkle * level;
        const r = (0.55 + 0.62 * near + 0.5 * sd * sd * sd) * grain * k * fine;
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, TAU);
        ctx.fill();
        // a few agents catch the light
        if (sd > 0.9 && !idle) {
          const gr = (4 + 5 * near) * grain * k;
          ctx.globalAlpha = Math.min(1, alpha * 0.42);
          ctx.drawImage(spark, sx - gr, sy - gr, gr * 2, gr * 2);
        }
      }
    }

    // held agents: each wears its state's mark and a little bloom
    for (const state of ['awaiting', 'blocked', 'failed', 'degraded'] as const) {
      const [from, to] = cloud.ranges[state];
      if (from === to) continue;
      const bloom = glow(TINT[state]);
      ctx.fillStyle = ctx.strokeStyle = css(TINT[state]);
      for (let i = from; i < to; i++) {
        const near = place(i);
        const mark = (0.78 + 0.5 * near) * grain * k;
        const alpha = (0.4 + 0.6 * near) * shown;
        const gr = 6 * mark;
        ctx.globalCompositeOperation = ADD;
        ctx.globalAlpha = alpha * 0.13;
        ctx.drawImage(bloom, sx - gr, sy - gr, gr * 2, gr * 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.beginPath();
        if (state === 'blocked') {
          ctx.arc(sx, sy, 1.6 * mark, 0, TAU);
          ctx.fill();
        } else if (state === 'failed') {
          const d = 2 * mark;
          ctx.lineWidth = 1.2 * mark;
          ctx.moveTo(sx - d, sy - d);
          ctx.lineTo(sx + d, sy + d);
          ctx.moveTo(sx + d, sy - d);
          ctx.lineTo(sx - d, sy + d);
          ctx.stroke();
        } else if (state === 'degraded') {
          const d = 2.3 * mark;
          ctx.moveTo(sx, sy - d);
          ctx.lineTo(sx + d * 0.92, sy + d * 0.72);
          ctx.lineTo(sx - d * 0.92, sy + d * 0.72);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.lineWidth = 1.05 * mark;
          ctx.arc(sx, sy, 1.9 * mark, 0, TAU);
          ctx.stroke();
        }
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function canvasPainter(canvas: HTMLCanvasElement, field: AgentField, palette: ScenePalette): Painter | null {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  if (!ctx) return null;
  const context = ctx;
  return {
    canvas,
    kind: 'canvas',
    resize(width, height) {
      canvas.width = width;
      canvas.height = height;
    },
    paint(options) {
      const scale = canvas.width / options.region.w;
      paintAgentField(context, field, { scale, x: -options.region.x * scale, y: -options.region.y * scale }, options, palette);
    },
    dispose() {},
  };
}

/**
 * The painter for a field, on a canvas `fresh()` makes: WebGL first, then —
 * on a canvas of its own, since a canvas keeps the first kind of context it
 * gives — the 2D painter. Null where neither can draw (a test DOM).
 */
export function createPainter(fresh: () => HTMLCanvasElement, field: AgentField, palette: ScenePalette): Painter | null {
  const first = fresh();
  try {
    const gl = createFieldRenderer(first, field, palette);
    if (gl) return { canvas: first, kind: 'webgl', resize: gl.resize, paint: gl.render, dispose: gl.dispose };
  } catch {
    // a driver that will not take the shaders: the plain painter draws instead
    first.remove();
    return canvasPainter(fresh(), field, palette);
  }
  return canvasPainter(first, field, palette);
}
