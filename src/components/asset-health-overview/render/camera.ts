/** Scene canvas in SVG user units; the element scales it with the viewBox. */
export const VIEW_W = 1000;
export const VIEW_H = 640;
export const CENTER_X = 500;
export const CENTER_Y = 330;

export interface Orbit {
  yaw: number;
  pitch: number;
}

export const DEFAULT_ORBIT: Orbit = { yaw: -0.34, pitch: 0.26 };

export interface Projected {
  x: number;
  y: number;
  /** Depth: negative is the far side of the bowl. */
  d: number;
}

export interface Projection {
  yaw: number;
  /** sin / cos of the tilt that squashes the ground plane. */
  st: number;
  ct: number;
  /** Polar (radius, angle, height) → screen. */
  pr: (r: number, a: number, z?: number) => Projected;
  pts: (points: Projected[]) => string;
  ringD: (r: number, z: number, a0?: number, a1?: number, n?: number) => string;
  annD: (r0: number, r1: number, z: number) => string;
  sideD: (r: number, z0: number, z1: number) => string;
}

/** Drag by (dx, dy) screen pixels from `start`; yaw wraps, pitch is clamped. */
export function orbitBy(start: Orbit, dx: number, dy: number): Orbit {
  const raw = start.yaw + dx * 0.006;
  return {
    yaw: raw - Math.PI * 2 * Math.floor((raw + Math.PI) / (Math.PI * 2)),
    pitch: Math.max(-1.05, Math.min(1.05, start.pitch + dy * 0.005)),
  };
}

const f1 = (n: number) => n.toFixed(1);

/** `flat` looks straight down with no orbit; otherwise the bowl is tilted by `orbit`. */
export function createProjection(orbit: Orbit, flat: boolean): Projection {
  const yaw = flat ? 0 : orbit.yaw + 0.34;
  const tilt = flat ? Math.PI / 2 : Math.max(0.32, Math.min(1.3, 0.62 + orbit.pitch * 0.9 - 0.23));
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);

  const pr = (r: number, a: number, z = 0): Projected => ({
    x: CENTER_X + r * Math.cos(a + yaw),
    y: CENTER_Y + r * Math.sin(a + yaw) * st - z * ct,
    d: Math.sin(a + yaw),
  });
  const pts = (points: Projected[]) => points.map((p) => `${f1(p.x)},${f1(p.y)}`).join(' ');

  const ringD = (r: number, z: number, a0 = 0, a1 = Math.PI * 2, n = 90) => {
    let d = '';
    for (let i = 0; i <= n; i++) {
      const q = pr(r, a0 + ((a1 - a0) * i) / n, z);
      d += `${i ? ' L ' : 'M '}${f1(q.x)} ${f1(q.y)}`;
    }
    return d;
  };
  const annD = (r0: number, r1: number, z: number) =>
    `${ringD(r0, z)} Z${r1 > 0 ? ` ${ringD(r1, z)} Z` : ''}`;
  const sideD = (r: number, z0: number, z1: number) => {
    const a0 = -yaw;
    const a1 = Math.PI - yaw;
    const n = 48;
    const top: Projected[] = [];
    const bottom: Projected[] = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      top.push(pr(r, a, z1));
      bottom.push(pr(r, a, z0));
    }
    return `M ${top
      .concat(bottom.reverse())
      .map((q) => `${f1(q.x)} ${f1(q.y)}`)
      .join(' L ')} Z`;
  };

  return { yaw, st, ct, pr, pts, ringD, annD, sideD };
}
