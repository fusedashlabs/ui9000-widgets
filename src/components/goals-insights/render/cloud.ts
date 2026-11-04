import { hashString, rng } from '../../goals-perimeter/lib/random.js';
import { STATUS, statusCss, type ScenePalette } from '../../goals-perimeter/render/scene-palette.js';
import type { GoalAgents } from '../lib/types.js';

type State = 'working' | 'idle' | 'awaiting' | 'blocked' | 'failed' | 'overBudget';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/** A full turn, in ms: drift, not spin. */
const TURN = 72_000;
const TILT = 0.45;
/** The idle grey of the map's agents. */
const IDLE = '#929ba8';

/**
 * The goal's agents as dots: one a dot up to `cap` of them, then one dot for
 * several, every state that holds any keeping at least one so none is lost.
 */
export function sampleAgents(id: string, agents: GoalAgents, cap: number): State[] {
  const counts: [State, number][] = [
    ['working', agents.working],
    ['idle', agents.idle],
    ['awaiting', agents.awaiting],
    ['blocked', agents.blocked],
    ['failed', agents.failed],
    ['overBudget', agents.overBudget],
  ];
  const per = Math.max(1, agents.total / cap);
  const out: State[] = [];
  for (const [state, n] of counts) {
    const dots = n === 0 ? 0 : Math.max(1, Math.round(n / per));
    for (let i = 0; i < dots; i++) out.push(state);
  }
  // scatter the held through the rest
  const random = rng(hashString(id) + agents.total);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export interface GoalCloud {
  readonly canvas: HTMLCanvasElement;
  /** Stands it at `x`, `y` (its centre, plot px), `size` px across. */
  place(x: number, y: number, size: number): void;
  /** Paints it as it turns at `now` (ms), or still for null. */
  paint(now: number | null): void;
}

/**
 * A goal as the map draws it, small: its agents a cloud of dots inside its
 * glass sphere, slowly turning — at work in the page's agent colour, idle
 * grey, the ones held lit in their state's colour. A canvas of its own over
 * the column's SVG, kept sharp at whatever size the column is drawn.
 */
export function createGoalCloud(host: HTMLElement, id: string, agents: GoalAgents, cap: number, palette: ScenePalette): GoalCloud {
  const canvas = document.createElement('canvas');
  canvas.className = 'gi-cloud';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = canvas.getContext('2d');
  } catch {
    context = null;
  }
  const light = palette.mode === 'light';
  const held = light ? statusCss('light') : STATUS;
  const look: Record<State, { color: string; size: number; glow: number }> = {
    working: { color: palette.agentCss, size: 1.15, glow: 0 },
    idle: { color: IDLE, size: 1, glow: 0 },
    awaiting: { color: held.awaiting, size: 1.7, glow: 6 },
    blocked: { color: held.blocked, size: 1.8, glow: 6 },
    failed: { color: held.failed, size: 1.8, glow: 6 },
    overBudget: { color: held.warn, size: 1.6, glow: 5 },
  };
  const motes = sampleAgents(id, agents, cap);
  const random = rng(motes.length * 31 + 7);
  const points = motes.map((_, slot) => {
    const y = 1 - (2 * (slot + 0.5)) / motes.length;
    const ring = Math.sqrt(1 - y * y);
    const theta = slot * GOLDEN;
    // a cloud, not a shell: filled evenly through the sphere's volume
    const depth = Math.cbrt(random());
    return { x: Math.cos(theta) * ring * depth, y: y * depth, z: Math.sin(theta) * ring * depth, twinkle: random() * Math.PI * 2 };
  });
  const cosT = Math.cos(TILT);
  const sinT = Math.sin(TILT);
  let size = 0;
  let res = 0;

  return {
    canvas,
    place(x, y, next) {
      canvas.style.transform = `translate(${(x - next / 2).toFixed(2)}px, ${(y - next / 2).toFixed(2)}px)`;
      if (Math.abs(next - size) < 0.05) return;
      size = next;
      canvas.style.width = `${next}px`;
      canvas.style.height = `${next}px`;
      // the backing store follows the size it is shown at, so the dots stay sharp however large the column is drawn
      const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
      const want = Math.min(8, Math.max(1, dpr));
      if (Math.abs(want - res) > 0.05 || canvas.width !== Math.round(next * want)) {
        res = want;
        canvas.width = Math.max(1, Math.round(next * res));
        canvas.height = Math.max(1, Math.round(next * res));
      }
    },
    paint(now) {
      if (!context || size < 4) return;
      const yaw = now === null ? 0.6 : (now / TURN) * Math.PI * 2;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const radius = size / 2;
      context.setTransform(res, 0, 0, res, 0, 0);
      context.clearRect(0, 0, size, size);
      // light added on the dark room; ink laid on the pale one
      context.globalCompositeOperation = light ? 'source-over' : 'lighter';
      const seen = points
        .map((p, i) => {
          const x = p.x * cosY + p.z * sinY;
          const z0 = -p.x * sinY + p.z * cosY;
          return { i, x, y: p.y * cosT - z0 * sinT, z: p.y * sinT + z0 * cosT };
        })
        .sort((a, b) => a.z - b.z);
      // the dots are drawn at the sphere's scale: a small goal's agents are finer
      const grain = Math.max(0.55, Math.min(1.6, size / 52));
      for (const { i, x, y, z } of seen) {
        const state = motes[i]!;
        const l = look[state];
        const near = (z + 1) / 2;
        const twinkle = now === null ? 1 : 0.85 + 0.15 * Math.sin(now / 800 + points[i]!.twinkle);
        const strength = (0.3 + 0.7 * near) * twinkle;
        const px = radius + x * (radius - 3);
        const py = radius + y * (radius - 3);
        if (l.glow && !light) {
          const reach = l.glow * grain;
          const halo = context.createRadialGradient(px, py, 0, px, py, reach);
          halo.addColorStop(0, withAlpha(l.color, 0.45 * strength));
          halo.addColorStop(1, withAlpha(l.color, 0));
          context.fillStyle = halo;
          context.beginPath();
          context.arc(px, py, reach, 0, Math.PI * 2);
          context.fill();
        }
        context.fillStyle = withAlpha(l.color, (state === 'idle' ? 0.55 : 0.92) * strength);
        context.beginPath();
        context.arc(px, py, l.size * grain * (0.7 + 0.45 * near), 0, Math.PI * 2);
        context.fill();
      }
    },
  };
}

/** A CSS colour (`#rrggbb` or `rgb(r g b)` / `rgb(r,g,b)`) with an alpha. */
function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha)).toFixed(3);
  if (color.startsWith('#')) {
    const n = Number.parseInt(color.slice(1, 7), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const [r = 0, g = 0, b = 0] = (color.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return `rgba(${r},${g},${b},${a})`;
}
