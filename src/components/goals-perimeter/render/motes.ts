/**
 * Motes of light along the edges of the scene: fine specks drifting slowly
 * up through the smoke, twinkling, and a few out-of-focus droplets of light
 * floating by — soft bokeh without a rim. Decoration, not data: they keep to
 * the scene's light (`lights`, as `r,g,b`), live only near the edges —
 * the middle of the board, where the picture is, stays clear — and fade out
 * as they drift inwards.
 *
 * `edges` weighs each side (left, top, right, bottom). Returns a stop.
 */
export function startMotes(
  canvas: HTMLCanvasElement,
  edges: [number, number, number, number],
  still: boolean,
  lights: string[],
  /** On a light page the motes are specks of ink, fainter, laid on rather than added. */
  mode: 'light' | 'dark' = 'dark',
): () => void {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  if (!ctx) return () => {};
  const context = ctx;

  let seed = 0x2f6e1;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const LIGHT = lights.length ? lights : ['186,208,255'];
  const LIGHT_W = [0.42, 0.26, 0.18, 0.14];
  const pickLight = () => {
    let u = rnd();
    for (let i = 0; i < LIGHT.length; i++) if ((u -= LIGHT_W[i]!) <= 0) return LIGHT[i]!;
    return LIGHT[0]!;
  };

  /** How much of the edge a point is in, 0 in the middle of the room, 1 at a weighted edge. */
  const edgeAt = (x: number, y: number, w: number, h: number) => {
    const [l, t, r, b] = edges;
    const dl = x / (w * 0.22);
    const dr = (w - x) / (w * 0.22);
    const dt = y / (h * 0.3);
    const db = (h - y) / (h * 0.3);
    const side = (d: number, k: number) => k * Math.max(0, 1 - d) ** 1.4;
    return Math.min(1, side(dl, l) + side(dr, r) + side(dt, t) + side(db, b));
  };

  interface Mote {
    x: number;
    y: number;
    size: number;
    alpha: number;
    twinkle: number;
    phase: number;
    drift: number;
    light: string;
    /** Droplets are large, soft and few. */
    drop: boolean;
  }
  let motes: Mote[] = [];
  let W = 0;
  let H = 0;

  const spawn = (drop: boolean): Mote => {
    // rejection sampling: tried places are kept as often as the edge weighs there
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 40; tries++) {
      x = rnd() * W;
      y = rnd() * H;
      if (rnd() < edgeAt(x, y, W, H)) break;
    }
    return {
      x,
      y,
      size: drop ? 6 + rnd() * 11 : 0.6 + rnd() * rnd() * 1.6,
      alpha: drop ? 0.08 + rnd() * 0.1 : 0.4 + rnd() * 0.55,
      twinkle: 0.4 + rnd() * 1.6,
      phase: rnd() * 6.28,
      drift: drop ? 3 + rnd() * 4 : 5 + rnd() * 9,
      light: pickLight(),
      drop,
    };
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    const specks = Math.round((W * H) / 8000);
    const drops = Math.round((W * H) / 90000);
    motes = [...Array.from({ length: specks }, () => spawn(false)), ...Array.from({ length: drops }, () => spawn(true))];
  };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  resize();

  const start = performance.now();
  let last = start;
  let raf = 0;
  const frame = (now: number) => {
    raf = still ? 0 : requestAnimationFrame(frame);
    if (!W || !H) return;
    const dt = still ? 0 : Math.min(64, now - last) / 1000;
    last = now;
    const t = (now - start) / 1000;
    const dpr = canvas.width / W;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.globalCompositeOperation = mode === 'light' ? 'source-over' : 'lighter';

    for (let i = 0; i < motes.length; i++) {
      const m = motes[i]!;
      // a slow lazy flow: mostly up, swaying sideways
      m.x += Math.sin(m.y * 0.006 + t * 0.21 + m.phase) * m.drift * 0.6 * dt;
      m.y -= m.drift * dt * (0.6 + 0.4 * Math.sin(m.x * 0.004 + t * 0.17 + m.phase));
      const edge = edgeAt(m.x, m.y, W, H);
      if (m.y < -20 || m.x < -20 || m.x > W + 20 || edge < 0.02) {
        motes[i] = spawn(m.drop);
        continue;
      }
      const shine = still ? 0.8 : 0.55 + 0.45 * Math.sin(t * m.twinkle + m.phase);
      const a = m.alpha * shine * edge * (mode === 'light' ? 0.45 : 1);
      if (a < 0.004) continue;
      if (m.drop) {
        // an out-of-focus droplet: a soft disc of light, no rim, melting into the smoke at its edge
        const g = context.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size);
        g.addColorStop(0, `rgba(${m.light},${(a * 0.6).toFixed(3)})`);
        g.addColorStop(0.45, `rgba(${m.light},${(a * 0.45).toFixed(3)})`);
        g.addColorStop(1, `rgba(${m.light},0)`);
        context.fillStyle = g;
        context.beginPath();
        context.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        context.fill();
      } else {
        // a speck with a little halo
        const g = context.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 3.2);
        g.addColorStop(0, `rgba(${m.light},${a.toFixed(3)})`);
        g.addColorStop(0.3, `rgba(${m.light},${(a * 0.4).toFixed(3)})`);
        g.addColorStop(1, `rgba(${m.light},0)`);
        context.fillStyle = g;
        context.fillRect(m.x - m.size * 3.2, m.y - m.size * 3.2, m.size * 6.4, m.size * 6.4);
      }
    }
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    observer?.disconnect();
  };
}
