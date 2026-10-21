import { create, select, type Selection } from 'd3-selection';

import { CHART_TYPE } from '../../../utils/chart-theme.js';
import { formatAssetHealthCount } from '../lib/format.js';
import { WALL_SLOTS } from '../lib/normalize.js';
import {
  assetHealthPalette,
  type AssetHealthMode,
  type AssetHealthPalette,
} from '../lib/palette.js';
import { seeded, RT0, RT1, type AssetHealthScene, type Pin } from '../lib/scene.js';
import type { AssetHealthCategory, AssetHealthProblem } from '../lib/types.js';
import { createProjection, VIEW_H, VIEW_W, type Orbit } from './camera.js';

const RIN = 150;
const RW = 300;
const RRIM = 318;
const WALL_HEIGHT = 46;
const WALL_STEP = (Math.PI * 2) / WALL_SLOTS;
/** Terraces of the agent core: outer radius, inner radius, height. */
const TERRACES: Array<[number, number, number]> = [
  [RIN, 124, 5],
  [124, 102, 11],
  [102, 80, 17],
  [80, 58, 23],
  [58, 0, 29],
];
const POPUP_WIDTH = 300;

export interface AssetHealthView extends Orbit {
  /** Top-down, no orbit, tiles and wall drawn without height. */
  flat: boolean;
  /** Dims healthy tiles so only problems stand out. */
  problemsOnly: boolean;
  /** Category isolated by a click; the rest fade. */
  selectedCategory: string | null;
  /** Key of the pin whose detail card is open. */
  openPin: string | null;
  /** Stage ink — dark matches Figma; light inverts chrome. */
  themeMode: AssetHealthMode;
}

export interface AssetHealthHandlers {
  onPickCategory: (id: string) => void;
  onTogglePin: (key: string) => void;
  onClosePopup: () => void;
  onShowAgents: (category: AssetHealthCategory, problem: AssetHealthProblem) => void;
  onOpenRule: (problem: AssetHealthProblem) => void;
}

type Node = Selection<SVGElement, unknown, null, undefined>;
type Attrs = Record<string, string | number | undefined>;

function add(parent: Node, tag: string, attrs: Attrs = {}): Node {
  const node = parent.append<SVGElement>(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value !== undefined) node.attr(name, value);
  }
  return node;
}

function addText(parent: Node, content: string, attrs: Attrs): Node {
  return add(parent, 'text', attrs).text(content);
}

function addTitle(parent: Node, content: string): void {
  add(parent, 'title').text(content);
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Draws the whole overview into `svgEl`: a tilted bowl with the agents on a
 * stepped core, assets tiled in category sectors, the last 24h as the outer
 * wall and problems as beams rising out of their tile. Call it again with a new
 * view to repaint; the previous drawing is replaced.
 */
export function drawAssetHealthOverview(
  svgEl: SVGSVGElement,
  scene: AssetHealthScene,
  view: AssetHealthView,
  handlers: AssetHealthHandlers,
  uid: string,
): void {
  const { model, wall, tiles, pins, heads } = scene;
  const { goal: g } = model;
  const { flat, problemsOnly, selectedCategory, themeMode } = view;
  const C = assetHealthPalette(themeMode);
  const { yaw, st, ct, pr, pts, ringD, annD, sideD } = createProjection(view, flat);
  // Ticket: omit the 24h wall when there are no recent errors.
  const WALLH = flat || wall.length === 0 ? 0 : WALL_HEIGHT;
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  const catOp = (cat: string) => (!selectedCategory || selectedCategory === cat ? 1 : 0.16);
  const blend = `pointer-events:none;mix-blend-mode:${C.glowBlend}`;

  const svg = select(svgEl) as unknown as Node;
  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
  svg.on('click', () => handlers.onClosePopup());

  const defs = add(svg, 'defs');
  add(add(defs, 'filter', { id: id('glow'), x: '-20%', y: '-20%', width: '140%', height: '140%' }), 'feGaussianBlur', {
    stdDeviation: 3.2,
  });
  add(add(defs, 'filter', { id: id('haze'), x: '-30%', y: '-60%', width: '160%', height: '220%' }), 'feGaussianBlur', {
    stdDeviation: 9,
  });
  const shadow = add(defs, 'radialGradient', { id: id('shadow'), cx: '50%', cy: '50%', r: '50%' });
  add(shadow, 'stop', { offset: '0%', 'stop-color': '#000', 'stop-opacity': C.shadowOpacity });
  add(shadow, 'stop', { offset: '100%', 'stop-color': '#000', 'stop-opacity': 0 });
  const fade = (name: string, color: string, from: number, to: number) => {
    const gradient = add(defs, 'linearGradient', { id: id(name), x1: 0, y1: 1, x2: 0, y2: 0 });
    add(gradient, 'stop', { offset: '0%', 'stop-color': color, 'stop-opacity': from });
    add(gradient, 'stop', { offset: '100%', 'stop-color': color, 'stop-opacity': to });
  };
  fade('wallN', C.soft, 0.02, 0.1);
  fade('wallE', C.crit, 0.12, 0.5);

  // Blurred layers are collected while drawing and mounted at their paint position.
  const glow = create('svg:g') as unknown as Node;
  const haze = create('svg:g') as unknown as Node;
  const mount = (layer: Node, filter: string) => {
    svg.append(() => layer.node());
    layer.attr('filter', url(filter)).attr('style', blend);
  };

  const placed: Box[] = [];
  const clear = (x: number, y: number, w: number, h: number) =>
    x >= 4 &&
    y >= 4 &&
    x + w <= VIEW_W - 4 &&
    y + h <= VIEW_H - 4 &&
    !placed.some((k) => x < k.x + k.w + 4 && x + w > k.x - 4 && y < k.y + k.h + 4 && y + h > k.y - 4);

  // ---- 24h wall --------------------------------------------------------------------
  const drawPanel = (w: AssetHealthScene['wall'][number], front: boolean) => {
    const a0 = w.a + 0.004;
    const a1 = w.a + WALL_STEP - 0.004;
    const bh = WALLH * Math.min(1, ((w.hgt - 10) / 46) * 0.85 + 0.15);
    const P4 = (za: number, zb: number) =>
      pts([pr(RW, a0, za), pr(RW, a1, za), pr(RW, a1, zb), pr(RW, a0, zb)]);
    const sh = (Math.sin(w.a + Math.PI / WALL_SLOTS + yaw) + 1) / 2;

    if (w.err) add(glow, 'polygon', { points: P4(0, bh), fill: C.crit, opacity: 0.7 });
    if (!front && WALLH) {
      const back = Math.max(0, -Math.sin(w.a + Math.PI / WALL_SLOTS + yaw));
      add(glow, 'polygon', {
        points: P4(WALLH * 0.5, WALLH),
        fill: w.err ? C.crit : C.ok,
        opacity: w.err ? 0.5 : 0.16 + 0.22 * back,
      });
      add(haze, 'polygon', {
        points: P4(WALLH * 0.2, WALLH + 6),
        fill: w.err ? C.crit : C.ok,
        opacity: w.err ? 0.35 : 0.08 + 0.14 * back,
      });
    }

    const panel = add(svg, 'g');
    add(panel, 'polygon', {
      points: P4(0, WALLH),
      fill: w.err ? url('wallE') : front ? 'none' : url('wallN'),
      stroke: w.err
        ? `rgba(${C.rgb.crit},.45)`
        : `rgba(${C.rgb.neutral},${front ? 0.1 : 0.05 + 0.07 * sh})`,
      'stroke-width': 0.6,
    });
    const bar = add(panel, 'polygon', {
      points: P4(0, bh),
      fill: w.err
        ? `rgba(${C.rgb.crit},${front ? 0.62 : 0.55})`
        : `rgba(${C.rgb.neutral},${front ? 0.035 + 0.05 * sh : 0.07 + 0.12 * sh})`,
      style: 'cursor:help',
    });
    addTitle(bar, w.tip);
  };

  // ground shadow
  {
    const q = pr(0, 0, 0);
    add(svg, 'ellipse', {
      cx: q.x,
      cy: q.y + 18 * ct,
      rx: RRIM + 40,
      ry: (RRIM + 40) * st,
      fill: url('shadow'),
      'pointer-events': 'none',
    });
  }

  // back wall
  for (const w of wall) if (pr(RW, w.a).d < 0) drawPanel(w, false);
  if (WALLH) {
    const rim = ringD(RW, WALLH, Math.PI - yaw, Math.PI * 2 - yaw, 60);
    add(haze, 'path', { d: rim, fill: 'none', stroke: C.ok, 'stroke-width': 8, opacity: 0.3 });
    mount(haze, 'haze');
    add(glow, 'path', { d: rim, fill: 'none', stroke: C.okBright, 'stroke-width': 2.4, opacity: 0.6 });
  }

  // floor + rims
  add(svg, 'path', {
    d: annD(RW, 0, 0),
    fill: C.floor,
    'fill-rule': 'evenodd',
    stroke: C.line,
    'pointer-events': 'none',
  });
  add(svg, 'path', {
    d: `${ringD(RRIM, 0)} Z`,
    fill: 'none',
    stroke: C.line2,
    'stroke-width': 1.4,
    'pointer-events': 'none',
  });
  add(svg, 'path', {
    d: `${ringD(RRIM + 10, 0)} Z`,
    fill: 'none',
    stroke: C.line,
    'stroke-dasharray': '2 6',
    'pointer-events': 'none',
  });

  // ---- tiles, back to front ----------------------------------------------------------
  tiles
    .map((b) => ({ b, d: Math.sin((b.aa + b.ab) / 2 + yaw) }))
    .sort((p, q) => p.d - q.d)
    .forEach(({ b, d }) => {
      const th = flat ? 0 : b.th;
      const rgb = C.rgb[b.tone];
      const topA = b.problem ? 0.72 : problemsOnly ? 0.03 : b.name ? 0.34 : 0.06 + 0.07 * b.noise;
      const arc = (r: number, z: number) =>
        Array.from({ length: 5 }, (_, i) => pr(r, b.aa + ((b.ab - b.aa) * i) / 4, z));

      const tile = add(svg, 'g', { opacity: catOp(b.cat), style: 'cursor:pointer' });
      tile.on('click', () => handlers.onPickCategory(b.cat));
      addTitle(tile, b.tip);

      if (th > 0) {
        const edge = d >= 0 ? b.rb : b.ra;
        add(tile, 'polygon', {
          points: pts(arc(edge, th).concat(arc(edge, 0).reverse())),
          fill: `rgba(${rgb},${Math.min(0.9, topA * 0.55 + 0.05)})`,
        });
        const endA = Math.cos((b.aa + b.ab) / 2 + yaw) > 0 ? b.aa : b.ab;
        add(tile, 'polygon', {
          points: pts([pr(b.ra, endA, 0), pr(b.rb, endA, 0), pr(b.rb, endA, th), pr(b.ra, endA, th)]),
          fill: `rgba(${rgb},${Math.min(0.8, topA * 0.38 + 0.03)})`,
        });
      }
      const top = pts(arc(b.ra, th).concat(arc(b.rb, th).reverse()));
      add(tile, 'polygon', {
        points: top,
        fill: `rgba(${rgb},${topA})`,
        stroke: `rgba(${rgb},${Math.min(1, topA + 0.2)})`,
        'stroke-width': 0.5,
      });
      if (b.problem) add(glow, 'polygon', { points: top, fill: `rgb(${rgb})`, opacity: 0.5 });
    });

  // selected category outline
  if (selectedCategory) {
    const head = heads.find((h) => h.category.id === selectedCategory);
    if (head) {
      const outline = [];
      for (let i = 0; i <= 24; i++) outline.push(pr(RT1 + 6, head.a0 + ((head.a1 - head.a0) * i) / 24));
      for (let i = 24; i >= 0; i--) outline.push(pr(RT0 - 6, head.a0 + ((head.a1 - head.a0) * i) / 24));
      add(svg, 'polygon', {
        points: pts(outline),
        fill: `rgba(${C.rgb.neutral},.04)`,
        stroke: C.ink,
        'stroke-width': 1.4,
        'stroke-dasharray': '4 4',
        'pointer-events': 'none',
      });
    }
  }

  // ---- agent core: stepped terraces, one state ring per step --------------------------
  const running = Math.max(0, g.total - g.blocked - g.failed - g.awaiting);
  const total = Math.max(1, g.total);
  const terraces = TERRACES.map(([r0, r1, z]) => [r0, r1, flat ? 0 : z] as const);
  const states: Array<[string, number, string]> = [
    ['Running', running, C.ok],
    ['Needs input', g.awaiting, C.warn],
    ['Blocked', g.blocked, C.coral],
    ['Failed', g.failed, C.crit],
  ];
  const tick = seeded(4242);
  terraces.forEach(([r0, r1, z], ti) => {
    const zb = ti ? terraces[ti - 1]![2] : 0;
    if (z > zb) {
      add(svg, 'path', {
        d: sideD(r0, zb, z),
        fill: `rgba(${C.rgb.neutral},${0.035 + ti * 0.012})`,
        'pointer-events': 'none',
      });
    }
    add(svg, 'path', {
      d: annD(r0, r1, z),
      'fill-rule': 'evenodd',
      fill: ti === 4 ? C.stepTop : C.step,
      stroke: `rgba(${C.rgb.neutral},.16)`,
      'stroke-width': 0.7,
      'pointer-events': 'none',
    });
    if (ti >= 4) return;

    const ticks = 40 + ti * 22;
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * Math.PI * 2;
      const p0 = pr(r1 + 2, a, z);
      const p1 = pr(r1 + 2 + (r0 - r1 - 4) * (0.35 + 0.65 * tick()), a, z);
      add(svg, 'line', {
        x1: p0.x,
        y1: p0.y,
        x2: p1.x,
        y2: p1.y,
        stroke: `rgba(${C.rgb.neutral},.14)`,
        'stroke-width': 0.6,
        'pointer-events': 'none',
      });
    }
    const [label, value, color] = states[ti]!;
    const rr = (r0 + r1) / 2 + (r0 - r1) * 0.3;
    const frac = value / total;
    add(svg, 'path', {
      d: `${ringD(rr, z)} Z`,
      fill: 'none',
      stroke: C.line,
      'stroke-width': 4,
      'pointer-events': 'none',
    });
    if (value > 0) {
      const d = ringD(rr, z, -Math.PI / 2 - yaw, -Math.PI / 2 - yaw + frac * Math.PI * 2, Math.max(2, Math.round(90 * frac)));
      const arcPath = add(svg, 'path', { d, fill: 'none', stroke: color, 'stroke-width': 4, style: 'cursor:help' });
      addTitle(
        arcPath,
        `${label} · ${formatAssetHealthCount(value)}\n${Math.round(frac * 100)}% of ${formatAssetHealthCount(g.total)} agents`,
      );
      add(glow, 'path', { d, fill: 'none', stroke: color, 'stroke-width': 5, opacity: 0.6 });
    }
  });
  {
    const zc = terraces[4]![2];
    const q = pr(0, 0, zc);
    [44, 30, 16].forEach((rr, i) =>
      add(svg, 'path', {
        d: `${ringD(rr, zc)} Z`,
        fill: 'none',
        stroke: C.soft,
        'stroke-width': 0.8,
        opacity: 0.24 - i * 0.05,
        'stroke-dasharray': i ? '1 4' : undefined,
        'pointer-events': 'none',
      }),
    );
    addText(svg, formatAssetHealthCount(g.total), {
      x: q.x,
      y: q.y + 3,
      fill: C.ink,
      'font-size': CHART_TYPE.title,
      'font-weight': 600,
      'text-anchor': 'middle',
    });
    addText(svg, 'AGENTS', {
      x: q.x,
      y: q.y + 18,
      fill: C.muted,
      'font-size': CHART_TYPE.axis,
      'text-anchor': 'middle',
      'letter-spacing': '.16em',
    });
    placed.push({ x: q.x - 62, y: q.y - 40, w: 124, h: 70 });
  }

  // ---- front wall + glowing rims -----------------------------------------------------
  for (const w of wall) if (pr(RW, w.a).d >= 0) drawPanel(w, true);
  add(svg, 'path', {
    d: `${ringD(RW, WALLH)} Z`,
    fill: 'none',
    stroke: C.muted,
    'stroke-width': 1.2,
    opacity: 0.55,
    'pointer-events': 'none',
  });
  add(svg, 'path', { d: `${ringD(RW, 0)} Z`, fill: 'none', stroke: C.rim, 'pointer-events': 'none' });
  add(glow, 'path', {
    d: `${ringD(RW, WALLH)} Z`,
    fill: 'none',
    stroke: C.soft,
    'stroke-width': 2,
    opacity: 0.25,
  });
  for (const w of wall) {
    if (!w.err) continue;
    add(glow, 'path', {
      d: ringD(RW, WALLH, w.a, w.a + WALL_STEP, 3),
      fill: 'none',
      stroke: C.crit,
      'stroke-width': 3.5,
      opacity: 0.9,
    });
  }
  mount(glow, 'glow');

  // keep callouts off the failing tiles
  for (const pin of pins) {
    const qs = [pr(pin.r - 14, pin.a - 0.05, pin.th), pr(pin.r + 14, pin.a + 0.05, pin.th), pr(pin.r, pin.a, 0)];
    const xs = qs.map((q) => q.x);
    const ys = qs.map((q) => q.y);
    placed.push({
      x: Math.min(...xs) - 4,
      y: Math.min(...ys) - 4,
      w: Math.max(...xs) - Math.min(...xs) + 8,
      h: Math.max(...ys) - Math.min(...ys) + 8,
    });
  }

  // ---- category headers outside the rim -----------------------------------------------
  heads.forEach(({ category: c, mid }) => {
    const q = pr(RRIM + 34, mid);
    // Named problems + any leftover failing/degraded counts (same split as toneAt).
    const failingLeft = Math.max(
      0,
      c.failing - c.problems.filter((p) => p.sev === 'impaired').length,
    );
    const degradedLeft = Math.max(
      0,
      c.degraded - c.problems.filter((p) => p.sev === 'degraded').length,
    );
    const problemCount = c.problems.length + failingLeft + degradedLeft;
    const sub = `${c.total} · ${problemCount ? `${problemCount} with problems` : 'all healthy'}`;
    const hw = Math.max(c.name.length * 9.5, sub.length * 6.4);
    const anchor = Math.abs(Math.cos(mid + yaw)) < 0.25 ? 'middle' : Math.cos(mid + yaw) > 0 ? 'start' : 'end';
    const left = anchor === 'start' ? q.x : anchor === 'end' ? q.x - hw : q.x - hw / 2;
    const hy0 = q.y + (q.d > 0 ? 18 : -6 - WALLH * ct);
    let hy = hy0;
    for (let t = 1; t <= 6 && !clear(left, hy - 12, hw, 30); t++) hy = hy0 + (q.d > 0 ? 20 : -20) * t;
    placed.push({ x: left, y: hy - 12, w: hw, h: 30 });

    const head = add(svg, 'g', { opacity: catOp(c.id), style: 'cursor:pointer' });
    head.on('click', () => handlers.onPickCategory(c.id));
    addTitle(head, `${c.name}\nClick to show only this category`);
    addText(head, c.name.toUpperCase(), {
      x: q.x,
      y: hy,
      fill: C.ink,
      'font-size': CHART_TYPE.label,
      'letter-spacing': '.14em',
      'text-anchor': anchor,
    });
    addText(head, sub, {
      x: q.x,
      y: hy + 15,
      fill: problemCount ? C.crit : C.muted,
      'font-size': CHART_TYPE.axis,
      'text-anchor': anchor,
    });
  });

  // ---- problem beams + callouts -------------------------------------------------------
  const pinBoxes: Array<{ pin: Pin; x: number; y: number; color: string }> = [];
  pins.forEach((pin, i) => {
    const color = pin.tone === 'crit' ? C.crit : C.warn;
    const base = pr(pin.r, pin.a, flat ? 0 : pin.th);
    const top = pr(pin.r, pin.a, flat ? 0 : 132);
    const label = `${pin.problem.name} · ${pin.problem.why}`;
    const lw = Math.min(260, 20 + label.length * 6.3);
    const right = Math.cos(pin.a + yaw) >= 0;
    const candidates: Array<[number, number]> = [
      [top.x - lw / 2, top.y - 34],
      [right ? top.x + 10 : top.x - 10 - lw, top.y - 10],
      [top.x - lw / 2, top.y - 58],
      [right ? top.x - 10 - lw : top.x + 10, top.y - 10],
      [top.x - lw / 2, top.y - 82],
    ];
    const [bx0, by0] = candidates.find(([x, y]) => clear(x, y, lw, 20)) ?? candidates[0]!;
    placed.push({ x: bx0, y: by0, w: lw, h: 20 });
    pinBoxes.push({ pin, x: bx0, y: by0, color });

    const bx = base.x;
    const by = base.y;
    const ty = top.y;
    const height = Math.max(1, by - ty);
    const gid = `pb${i}`;

    const group = add(svg, 'g', { opacity: catOp(pin.category.id), style: 'cursor:pointer' });
    group.on('click', (event: Event) => {
      event.stopPropagation();
      handlers.onTogglePin(pin.key);
    });

    const beam = add(group, 'g', { 'pointer-events': 'none' });
    const gradient = add(add(beam, 'defs'), 'linearGradient', { id: id(gid), x1: 0, y1: 1, x2: 0, y2: 0 });
    add(gradient, 'stop', { offset: '0%', 'stop-color': color, 'stop-opacity': 0.85 });
    add(gradient, 'stop', { offset: '60%', 'stop-color': color, 'stop-opacity': 0.35 });
    add(gradient, 'stop', { offset: '100%', 'stop-color': color, 'stop-opacity': 0.05 });
    add(beam, 'ellipse', {
      cx: bx,
      cy: by,
      rx: 26,
      ry: 26 * st,
      fill: color,
      opacity: 0.35,
      filter: url('haze'),
    });
    add(beam, 'polygon', {
      points: `${bx - 11},${by} ${bx + 11},${by} ${bx + 3},${ty} ${bx - 3},${ty}`,
      fill: url(gid),
    });
    add(beam, 'polygon', {
      points: `${bx - 5},${by} ${bx + 5},${by} ${bx + 1.5},${ty} ${bx - 1.5},${ty}`,
      fill: color,
      opacity: 0.35,
    });
    for (let k = 0; k < Math.floor(height / 7); k++) {
      const yy = by - 6 - k * 7;
      const f = 1 - (k * 7) / height;
      add(beam, 'line', {
        x1: bx - 5 - 4 * f,
        y1: yy,
        x2: bx + 5 + 4 * f,
        y2: yy,
        stroke: color,
        'stroke-width': 0.7,
        opacity: 0.15 + 0.45 * f,
      });
    }
    add(beam, 'line', { x1: bx, y1: by, x2: bx, y2: ty, stroke: color, 'stroke-width': 1.2 });
    add(beam, 'line', {
      x1: bx,
      y1: by,
      x2: bx,
      y2: by - height * 0.45,
      stroke: C.beamCore,
      'stroke-width': 0.8,
      opacity: 0.8,
    });
    add(beam, 'ellipse', { cx: bx, cy: by, rx: 9, ry: 9 * st, fill: 'none', stroke: color, 'stroke-width': 1.2 });
    add(beam, 'circle', { cx: bx, cy: by, r: 2.6, fill: C.ink });

    add(group, 'rect', { x: top.x - 4, y: top.y - 4, width: 8, height: 8, fill: C.deep, stroke: color, 'stroke-width': 1.4 });
    add(group, 'rect', { x: bx0, y: by0, width: lw, height: 20, fill: C.deep, stroke: color });
    addText(group, label, { x: bx0 + 8, y: by0 + 14, fill: C.ink, 'font-size': CHART_TYPE.axis });
  });

  // ---- problem detail card ------------------------------------------------------------
  const open = pinBoxes.find((b) => b.pin.key === view.openPin);
  if (open) drawPopup(svg, open, handlers, C);

  // ---- legend (top-right) --------------------------------------------------------------
  (
    [
      [C.ok, 'healthy asset'],
      [C.warn, 'degraded'],
      [C.crit, 'failing · errors in 24h wall'],
    ] as const
  ).forEach(([color, label], i) => {
    add(svg, 'rect', { x: VIEW_W - 200, y: 20 + i * 18, width: 10, height: 10, fill: color, opacity: 0.7 });
    addText(svg, label, { x: VIEW_W - 184, y: 29 + i * 18, fill: C.muted, 'font-size': CHART_TYPE.axis });
  });
}

function drawPopup(
  svg: Node,
  open: { pin: Pin; x: number; y: number; color: string },
  handlers: AssetHealthHandlers,
  C: AssetHealthPalette,
): void {
  const { problem: p, category: c } = open.pin;
  const color = open.color;
  const rows: Array<[string, string]> = [
    ['Type', p.type],
    ['Category', c.name],
    ['Location', p.loc],
    ['Status', p.sev === 'impaired' ? 'Failing' : 'Degraded'],
  ];
  const fix =
    p.sev === 'impaired'
      ? `Restart or fail over ${p.name}, then retry blocked agents`
      : 'Watch latency; throttle agents if it keeps rising';
  const fixLines: string[] = [];
  for (const word of fix.split(' ')) {
    const last = fixLines[fixLines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= 40) fixLines[fixLines.length - 1] = `${last} ${word}`;
    else fixLines.push(word);
  }
  const height = 74 + rows.length * 19 + 18 + fixLines.length * 16 + 44;
  const px = Math.max(8, Math.min(VIEW_W - POPUP_WIDTH - 8, open.x));
  let py = open.y + 28;
  if (py + height > VIEW_H - 8) py = Math.max(8, open.y - height - 8);
  const fy = py + 74 + rows.length * 19 + 6;
  const by = fy + 18 + (fixLines.length - 1) * 16 + 14;

  const card = add(svg, 'g');
  card.on('pointerdown', (event: Event) => event.stopPropagation());
  add(card, 'rect', { x: px, y: py, width: POPUP_WIDTH, height, rx: 10, fill: C.surface, stroke: color });
  addText(card, p.name, { x: px + 14, y: py + 22, fill: C.ink, 'font-size': CHART_TYPE.title, 'font-weight': 500 });
  addText(card, p.why.charAt(0).toUpperCase() + p.why.slice(1), {
    x: px + 14,
    y: py + 40,
    fill: color,
    'font-size': CHART_TYPE.label,
  });

  const close = add(card, 'g', { style: 'cursor:pointer' });
  close.on('click', (event: Event) => {
    event.stopPropagation();
    handlers.onClosePopup();
  });
  add(close, 'rect', { x: px + POPUP_WIDTH - 30, y: py + 8, width: 22, height: 22, rx: 6, fill: C.deep, stroke: C.line });
  addText(close, '✕', {
    x: px + POPUP_WIDTH - 19,
    y: py + 23,
    fill: C.muted,
    'font-size': CHART_TYPE.label,
    'text-anchor': 'middle',
  });

  add(card, 'line', { x1: px + 14, y1: py + 54, x2: px + POPUP_WIDTH - 14, y2: py + 54, stroke: C.line });
  rows.forEach(([key, value], i) => {
    addText(card, key, { x: px + 14, y: py + 74 + i * 19, fill: C.dim, 'font-size': CHART_TYPE.label });
    addText(card, value, {
      x: px + 110,
      y: py + 74 + i * 19,
      fill: key === 'Status' ? color : C.soft,
      'font-size': CHART_TYPE.label,
    });
  });
  addText(card, 'Suggested', { x: px + 14, y: fy, fill: C.dim, 'font-size': CHART_TYPE.label });
  fixLines.forEach((line, i) =>
    addText(card, line, { x: px + 14, y: fy + 18 + i * 16, fill: C.ok, 'font-size': CHART_TYPE.label }),
  );

  const agents = add(card, 'g', { style: 'cursor:pointer' });
  agents.on('click', (event: Event) => {
    event.stopPropagation();
    handlers.onShowAgents(c, p);
  });
  add(agents, 'rect', { x: px + 14, y: by, width: 128, height: 26, rx: 8, fill: C.ink });
  addText(agents, 'Show agents', {
    x: px + 78,
    y: by + 17,
    fill: C.deep,
    'font-size': CHART_TYPE.label,
    'font-weight': 500,
    'text-anchor': 'middle',
  });

  const rule = add(card, 'g', { style: 'cursor:pointer' });
  rule.on('click', (event: Event) => {
    event.stopPropagation();
    handlers.onOpenRule(p);
  });
  add(rule, 'rect', {
    x: px + 150,
    y: by,
    width: 136,
    height: 26,
    rx: 8,
    fill: 'transparent',
    stroke: C.line2,
  });
  addText(rule, 'Open in Rules', {
    x: px + 218,
    y: by + 17,
    fill: C.soft,
    'font-size': CHART_TYPE.label,
    'text-anchor': 'middle',
  });
}
