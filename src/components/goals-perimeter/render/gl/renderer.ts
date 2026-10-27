import { FIELD_STATES, type AgentField, type PaintOptions } from '../../lib/field.js';
import { LINK_SAMPLES } from '../../lib/cloud.js';
import { hashString, rng } from '../../lib/random.js';
import { PIVOT_X, PIVOT_Y, projector } from '../../lib/scene.js';
import { BOARD } from '../../lib/layout.js';
import { STATUS, type ScenePalette } from '../scene-palette.js';
import {
  bindTarget,
  createMesh,
  createProgram,
  createTarget,
  disposeMesh,
  disposeTarget,
  drawMesh,
  halfFloatTargets,
  resizeTarget,
  type Mesh,
  type Program,
  type Target,
  type Uniforms,
} from './program.js';
import {
  AGENT_FRAG,
  AGENT_VERT,
  BLUR_FRAG,
  COMPOSITE_FRAG,
  COPY_FRAG,
  FLOW_VERT,
  FOG_COPY_FRAG,
  FOG_FRAG,
  GLOW_FRAG,
  GRADE_FRAG,
  HELD_FRAG,
  HIGH_PASS_FRAG,
  LINK_FRAG,
  LINK_VERT,
  ORB_FRAG,
  ORB_VERT,
  PASS_VERT,
  SCREEN_VERT,
  SPARK_VERT,
} from './shaders.js';

/**
 * The board's picture, drawn with WebGL: smoke, the goals as glass, the
 * agents with depth of field, calls and traffic as moving light — then bloom
 * and a film grade. It reads the same field and options as the canvas
 * painter (../field-painter.ts), which stays as the fallback.
 *
 * Nothing here is drawn that is not the scene's light or its data: a point is
 * always an agent, a spark a call, a light on a link traffic.
 */

const MAX_GOALS = 8;
const MAX_LINKS = 8;
const MAX_SLOTS = 24;
/** Points in a moving light's tail. */
const TAIL = 7;
const SPARKS_PER_SLOT = 12;
const LIGHTS_PER_LINK = 12;
const RIBBON_STEPS = 48;
/** How far the grade pulls colours apart at the frame's corners, as a share of the frame. */
const SPLIT = 0.012;
/** The smoke is drawn at this share of the canvas and stretched. */
const FOG_SCALE = 1 / 3;
/** Bloom as the design sets it: strength, radius, threshold. */
const BLOOM = { strength: 0.35, radius: 0.5, threshold: 0.62 };
const BLOOM_KERNELS = [6, 10, 14, 18, 22];

type RGB = [number, number, number];

/** A colour as linear light. */
const linear = (hex: string): RGB => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.pow(c / 255, 2.2)) as RGB;
};

const IDLE: RGB = [0.2, 0.29, 0.38];
const HOLD = {
  awaiting: linear(STATUS.awaiting),
  blocked: linear(STATUS.blocked),
  failed: linear(STATUS.failed),
  degraded: linear(STATUS.warn),
} as const;

export interface FieldRenderer {
  /** Sets the backing store, in canvas px. */
  resize(width: number, height: number): void;
  render(options: PaintOptions): void;
  dispose(): void;
}

/** three.js's gaussian, with neighbouring taps merged into single bilinear fetches. */
function blurKernel(kernelRadius: number) {
  const sigma = kernelRadius / 3;
  const coefficients = Array.from({ length: kernelRadius }, (_, i) => (0.39894 * Math.exp((-0.5 * i * i) / (sigma * sigma))) / sigma);
  const offsets: number[] = [];
  const weights: number[] = [];
  for (let i = 1; i < kernelRadius; i += 2) {
    const wa = coefficients[i]!;
    const wb = i + 1 < kernelRadius ? coefficients[i + 1]! : 0;
    offsets.push((i * wa + (i + 1) * wb) / (wa + wb));
    weights.push(wa + wb);
  }
  return { center: coefficients[0]!, offsets: Float32Array.from(offsets), weights: Float32Array.from(weights) };
}

/**
 * WebGL 2, or null where the device has none (the canvas painter draws
 * instead). The scene's light, the glass, the healthy agents and the traffic
 * take their colours from `palette`; held agents keep theirs.
 */
export function createFieldRenderer(canvas: HTMLCanvasElement, field: AgentField, palette: ScenePalette): FieldRenderer | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;
  let lost = false;
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };
  canvas.addEventListener('webglcontextlost', onLost);
  const half = halfFloatTargets(gl);

  const goals = field.clouds.map((c) => c.goal);
  const { light: COOL, agent: WORKING, traffic: TRAFFIC } = palette;
  const light = palette.mode === 'light';
  // one set of values behind every program
  const U = {
    uCam: new Float32Array([1, 0, 1, 0]),
    uFocal: 1500,
    uPivot: new Float32Array([PIVOT_X, PIVOT_Y]),
    uBleed: new Float32Array(2),
    uSize: new Float32Array([BOARD.width, BOARD.height]),
    uPx: 1,
    uUnit: 1,
    uTime: 0,
    uIntro: 1,
    uHealthy: 1,
    uCount: Math.min(MAX_GOALS, goals.length),
    uGoal: new Float32Array(MAX_GOALS * 4),
    uGoalB: new Float32Array(MAX_GOALS * 4),
    uLight: new Float32Array(MAX_GOALS * 4),
    uLightCol: new Float32Array(MAX_GOALS * 3),
    uShift: new Float32Array(2),
    uCool: Float32Array.from(COOL),
    uGlass: Float32Array.from(palette.glass),
    uGrain: 1,
    uDrift: 1,
    uScale: new Float32Array(MAX_GOALS).fill(1),
    uNear: 1,
    uFocus: 0,
    uAperture: 0.0022,
    uCol: Float32Array.from([WORKING, IDLE, HOLD.awaiting, HOLD.blocked, HOLD.failed, HOLD.degraded].flat()),
    uSlot: new Float32Array(MAX_SLOTS * 4),
    uSlotCol: new Float32Array(MAX_SLOTS * 3),
    uOrbit: 26,
    uFlat: 0,
    uSparkCol: Float32Array.from(TRAFFIC),
    uLinkA: new Float32Array(MAX_LINKS * 3),
    uLinkM: new Float32Array(MAX_LINKS * 3),
    uLinkB: new Float32Array(MAX_LINKS * 3),
    uLinkCol: new Float32Array(MAX_LINKS * 4),
    uLinkFlow: new Float32Array(MAX_LINKS * 4),
  } satisfies Uniforms;

  const programs: Program[] = [];
  const meshes: Mesh[] = [];
  const program = (vertex: string, fragment: string, defines?: Record<string, number>) => {
    const p = createProgram(gl, vertex, fragment, defines);
    programs.push(p);
    return p;
  };
  const mesh = (p: Program, mode: number, attributes: Record<string, [ArrayLike<number>, number]>, index?: ArrayLike<number>) => {
    const m = createMesh(gl, p, mode, attributes, index);
    meshes.push(m);
    return m;
  };
  const screenPositions: [number[], number] = [[-1, -1, 0, 3, -1, 0, -1, 3, 0], 3];

  // ── smoke: drawn small into its own target, then laid into the picture ──
  const fogProgram = program(SCREEN_VERT, FOG_FRAG);
  const fogMesh = mesh(fogProgram, gl.TRIANGLES, { position: screenPositions });
  const fogCopyProgram = program(SCREEN_VERT, FOG_COPY_FRAG);
  const fogCopyMesh = mesh(fogCopyProgram, gl.TRIANGLES, { position: screenPositions });

  // ── the goals as vessels: a square each ──
  const corners = [-1, -1, 1, -1, 1, 1, -1, 1];
  const vessels = field.clouds.slice(0, MAX_GOALS).map((_, i) => i);
  const orbProgram = program(ORB_VERT, ORB_FRAG);
  const orbMesh = mesh(
    orbProgram,
    gl.TRIANGLES,
    { position: [vessels.flatMap((i) => [0, 1, 2, 3].flatMap((k) => [corners[k * 2]!, corners[k * 2 + 1]!, i])), 3] },
    vessels.flatMap((_, n) => [0, 1, 2, 0, 2, 3].map((k) => n * 4 + k)),
  );

  // ── links: a band of glow each, and the lights that run along it ──
  const band: number[] = [];
  const bandIndex: number[] = [];
  for (let l = 0; l < MAX_LINKS; l++) {
    for (let s = 0; s <= RIBBON_STEPS; s++) band.push(l, s / RIBBON_STEPS, -1, l, s / RIBBON_STEPS, 1);
    for (let s = 0; s < RIBBON_STEPS; s++) {
      const at = l * (RIBBON_STEPS + 1) * 2 + s * 2;
      bandIndex.push(at, at + 1, at + 2, at + 1, at + 3, at + 2);
    }
  }
  const linkProgram = program(LINK_VERT, LINK_FRAG);
  const linkMesh = mesh(linkProgram, gl.TRIANGLES, { position: [band, 3] }, bandIndex);

  const flowRnd = rng(9127);
  const flow: number[] = [];
  const flowOrd: number[] = [];
  for (let l = 0; l < MAX_LINKS; l++)
    for (let n = 0; n < LIGHTS_PER_LINK; n++) {
      const seed = flowRnd();
      for (let k = 0; k < TAIL; k++) {
        flow.push(l, seed, k / TAIL);
        flowOrd.push(n);
      }
    }
  const flowProgram = program(FLOW_VERT, GLOW_FRAG);
  const flowMesh = mesh(flowProgram, gl.POINTS, { position: [flow, 3], aOrd: [flowOrd, 1] });

  // ── agents: the healthy and idle as added light, the held laid over it ──
  const free: number[][] = [[], []];
  const held: number[][] = [[], []];
  field.clouds.slice(0, MAX_GOALS).forEach((cloud, gi) => {
    FIELD_STATES.forEach((state, si) => {
      const [from, to] = cloud.ranges[state];
      const into = si < 2 ? free : held;
      for (let i = from; i < to; i++) {
        into[0]!.push(cloud.position[i * 3]!, cloud.position[i * 3 + 1]!, cloud.position[i * 3 + 2]!);
        into[1]!.push(gi, cloud.seed[i]!, si);
      }
    });
  });
  const freeProgram = program(AGENT_VERT, AGENT_FRAG);
  const freeMesh = mesh(freeProgram, gl.POINTS, { position: [free[0]!, 3], aData: [free[1]!, 3] });
  const heldProgram = program(AGENT_VERT, HELD_FRAG);
  const heldMesh = mesh(heldProgram, gl.POINTS, { position: [held[0]!, 3], aData: [held[1]!, 3] });

  // ── calls: sparks from agents to the diamonds on their goal's orbit, rebuilt when the orbits change ──
  const sparkProgram = program(SPARK_VERT, GLOW_FRAG);
  let sparks: Mesh | null = null;
  let sparkKey = '';
  function buildSparks(slotGoals: number[]) {
    if (sparks) disposeMesh(gl!, sparks);
    const rnd = rng(hashString(slotGoals.join(), 31));
    const start: number[] = [];
    const data: number[] = [];
    slotGoals.forEach((gi, slot) => {
      const cloud = field.clouds[gi];
      if (!cloud) return;
      // each spark belongs to one healthy agent, and leaves from where it is
      const [from, to] = cloud.ranges.healthy;
      for (let n = 0; n < SPARKS_PER_SLOT; n++) {
        const agent = from + Math.floor(rnd() * Math.max(1, to - from));
        const seed = rnd();
        for (let k = 0; k < TAIL; k++) {
          start.push(cloud.position[agent * 3] ?? 0, cloud.position[agent * 3 + 1] ?? 0, cloud.position[agent * 3 + 2] ?? 0);
          data.push(slot, seed, k / TAIL, n);
        }
      }
    });
    sparks = createMesh(gl!, sparkProgram, gl!.POINTS, { position: [start, 3], aSpark: [data, 4] });
  }

  // ── bloom, then the grade ──
  const picture = createTarget(gl, half);
  const fogTarget = createTarget(gl, half);
  const bright = createTarget(gl, half);
  const horizontal = BLOOM_KERNELS.map(() => createTarget(gl, half));
  const vertical = BLOOM_KERNELS.map(() => createTarget(gl, half));
  const highPass = program(PASS_VERT, HIGH_PASS_FRAG);
  const blurs = BLOOM_KERNELS.map((radius) => {
    const kernel = blurKernel(radius);
    return { kernel, program: program(PASS_VERT, BLUR_FRAG, { KERNEL_PAIRS: kernel.offsets.length }) };
  });
  const composite = program(PASS_VERT, COMPOSITE_FRAG);
  const copy = program(PASS_VERT, COPY_FRAG);
  const grade = program(PASS_VERT, GRADE_FRAG);
  const pass = (p: Program) => mesh(p, gl.TRIANGLES, { position: screenPositions });
  const passMeshes = new Map<Program, Mesh>([highPass, composite, copy, grade, ...blurs.map((b) => b.program)].map((p) => [p, pass(p)]));
  const runPass = (p: Program, values: Uniforms, target: Target | null) => {
    bindTarget(gl, target);
    p.use(values);
    drawMesh(gl, passMeshes.get(p)!);
  };

  const additive = () => {
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
  };
  const over = () => {
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  };

  /** Width of the backing store, once it has one. */
  let sized = 0;
  let focus = 0;
  let aperture = 0.0022;
  let primed = false;

  return {
    resize(width, height) {
      if (lost) return;
      sized = width;
      canvas.width = width;
      canvas.height = height;
      resizeTarget(gl, picture, width, height, half);
      resizeTarget(gl, fogTarget, Math.max(2, Math.round(width * FOG_SCALE)), Math.max(2, Math.round(height * FOG_SCALE)), half);
      let w = Math.round(width / 2);
      let h = Math.round(height / 2);
      resizeTarget(gl, bright, w, h, half);
      for (let i = 0; i < BLOOM_KERNELS.length; i++) {
        resizeTarget(gl, horizontal[i]!, w, h, half);
        resizeTarget(gl, vertical[i]!, w, h, half);
        w = Math.round(w / 2);
        h = Math.round(h / 2);
      }
    },

    render(o) {
      if (!sized || lost) return;
      const live = o.time != null;
      const t = o.time ?? 0;
      const { pose, unit: u, region } = o;
      // the canvas covers the part of the scene on screen
      U.uBleed.set([-region.x, -region.y]);
      U.uSize.set([region.w, region.h]);
      U.uPx = sized / region.w;
      U.uCam.set([Math.cos(pose.yaw), Math.sin(pose.yaw), Math.cos(pose.pitch), Math.sin(pose.pitch)]);
      U.uFocal = pose.focal;
      U.uUnit = u;
      U.uTime = t;
      U.uIntro = o.intro;
      U.uHealthy = o.healthy;
      // dots keep to the map's scale a little: finer when it is drawn small, fuller when zoomed in
      U.uGrain = Math.max(0.62, Math.min(1.9, Math.sqrt(1 / (1.42 * u)))) * u;
      U.uOrbit = o.orbit;
      U.uFlat = o.flat ? 1 : 0;
      U.uShift.set([pose.yaw * 0.5, pose.pitch * 0.45]);

      // the goals: where they are, how they turn, and the light each gives
      const P = projector(pose);
      let target = 0;
      // zoomed in, the lens focuses on the goal nearest the middle of the frame, as an eye would
      const pull = Math.max(0, Math.min(1, (o.zoom - 1.12) / 0.5));
      let nearest = Infinity;
      field.clouds.slice(0, MAX_GOALS).forEach((cloud, i) => {
        const g = cloud.goal;
        const a = g.goal.agents;
        const c = P(g.x, g.y, g.z);
        const alpha = (o.goalAlpha?.(g.id) ?? 1) * Math.min(1, o.intro * 1.4);
        const heldAgents = a.awaiting + a.blocked + a.failed + a.degraded;
        const heat = Math.min(1, (heldAgents / Math.max(1, a.total)) * 3.6);
        U.uGoal.set([g.x, g.y, g.z, g.r], i * 4);
        U.uGoalB.set([cloud.phase + (live ? t * cloud.spin : 0), alpha, heat, g.goal.status === 'critical' && live ? 1 : 0], i * 4);
        U.uLight.set([c.x, c.y, g.r * c.k, (0.55 + 0.45 * Math.sqrt(a.total / 1200)) * alpha], i * 4);
        // its light warms with the share of its agents that are held, towards their colours
        const warm: RGB = [0, 0, 0];
        if (heldAgents)
          for (const s of ['awaiting', 'blocked', 'failed', 'degraded'] as const)
            for (let k = 0; k < 3; k++) warm[k] = warm[k]! + (HOLD[s][k]! * a[s]) / heldAgents;
        U.uLightCol.set(
          COOL.map((cool, k) => cool + (warm[k]! * 0.9 - cool) * heat * 0.62),
          i * 3,
        );
        const off = Math.hypot(c.x - (region.x + region.w / 2), c.y - (region.y + region.h / 2));
        if (!o.focus && pull > 0 && off < nearest) {
          nearest = off;
          target = c.z * pull;
        }
        if (o.focus === g.id) {
          nearest = -1;
          target = c.z;
        }
      });

      // the plane in focus follows the goal under the pointer, and the lens opens for it
      const open = o.focus ? 0.0052 : 0.0022;
      if (live && primed) {
        focus += (target - focus) * 0.07;
        aperture += (open - aperture) * 0.07;
      } else {
        focus = target;
        aperture = open;
      }
      primed = true;
      U.uFocus = focus;
      // by day an agent out of focus is a smudge of ink, not a soft light: half the spread
      U.uAperture = pose.focal > 1e6 ? 0 : aperture * (light ? 0.5 : 1);

      // calls: one slot per resource group on a goal's orbit
      const slots = o.slots.slice(0, MAX_SLOTS);
      const index = Object.fromEntries(goals.map((g, i) => [g.id, i]));
      const key = slots.map((s) => s.goal).join();
      if (key !== sparkKey) {
        sparkKey = key;
        buildSparks(slots.map((s) => index[s.goal] ?? 0));
      }
      U.uSlot.fill(0);
      slots.forEach((s, i) => {
        const shown = live ? Math.max(2, Math.min(SPARKS_PER_SLOT, Math.round(Math.log10(Math.max(10, s.calls)) * 3.1 - 5))) : 0;
        U.uSlot.set([index[s.goal] ?? 0, s.angle, s.trouble, shown], i * 4);
        U.uSlotCol.set(s.hold ? HOLD[s.hold] : HOLD.degraded, i * 3);
      });

      // links: the curve through each one's samples
      for (let i = 0; i < MAX_LINKS; i++) {
        const link = o.links[i];
        if (!link) {
          U.uLinkCol.set([0, 0, 0, 0], i * 4);
          U.uLinkFlow.set([0, 0, 0, 0], i * 4);
          continue;
        }
        const a = link.points[0]!;
        const b = link.points[LINK_SAMPLES]!;
        const h = link.points[LINK_SAMPLES / 2]!;
        U.uLinkA.set(a, i * 3);
        U.uLinkB.set(b, i * 3);
        U.uLinkM.set([2 * h[0] - (a[0] + b[0]) / 2, 2 * h[1] - (a[1] + b[1]) / 2, 2 * h[2] - (a[2] + b[2]) / 2], i * 3);
        // a link carries its goals' traffic; one the same hold stops at both ends takes that hold's colour
        const col = link.hold ? HOLD[link.hold] : TRAFFIC;
        U.uLinkCol.set([col[0], col[1], col[2], link.alpha * (link.hold ? 1.5 : 0.3 + 0.7 * o.healthy)], i * 4);
        const lights = live ? Math.max(3, Math.min(LIGHTS_PER_LINK, Math.round(Math.log10(Math.max(10, link.calls)) * 3.4 - 6))) : 0;
        U.uLinkFlow.set([lights, link.hold ? 1 : 0, 0, 0], i * 4);
      }

      // the smoke, small
      gl.disable(gl.BLEND);
      bindTarget(gl, fogTarget);
      fogProgram.use(U);
      drawMesh(gl, fogMesh);

      // the picture, in light
      bindTarget(gl, picture);
      additive();
      fogCopyProgram.use({ ...U, tFog: { texture: fogTarget.texture } });
      drawMesh(gl, fogCopyMesh);
      orbProgram.use(U);
      drawMesh(gl, orbMesh);
      linkProgram.use(U);
      drawMesh(gl, linkMesh);
      flowProgram.use(U);
      drawMesh(gl, flowMesh);
      freeProgram.use(U);
      drawMesh(gl, freeMesh);
      if (sparks) {
        sparkProgram.use(U);
        drawMesh(gl, sparks);
      }
      over();
      heldProgram.use(U);
      drawMesh(gl, heldMesh);

      // bloom: the bright parts, blurred at five sizes, added back
      gl.disable(gl.BLEND);
      runPass(highPass, { tDiffuse: { texture: picture.texture }, luminosityThreshold: BLOOM.threshold, smoothWidth: 0.01 }, bright);
      let input = bright;
      blurs.forEach(({ kernel, program: blur }, i) => {
        const h = horizontal[i]!;
        const v = vertical[i]!;
        const shared = {
          invSize: new Float32Array([1 / h.width, 1 / h.height]),
          centerWeight: kernel.center,
          gaussianOffsets: kernel.offsets,
          gaussianWeights: kernel.weights,
        };
        runPass(blur, { ...shared, colorTexture: { texture: input.texture }, direction: new Float32Array([1, 0]) }, h);
        runPass(blur, { ...shared, colorTexture: { texture: h.texture }, direction: new Float32Array([0, 1]) }, v);
        input = v;
      });
      runPass(
        composite,
        {
          blurTexture1: { texture: vertical[0]!.texture },
          blurTexture2: { texture: vertical[1]!.texture },
          blurTexture3: { texture: vertical[2]!.texture },
          blurTexture4: { texture: vertical[3]!.texture },
          blurTexture5: { texture: vertical[4]!.texture },
          // on a light page a halo is a stain, not a glow: a third as much of it
          bloomStrength: light ? BLOOM.strength * 0.33 : BLOOM.strength,
          bloomRadius: BLOOM.radius,
          bloomFactors: new Float32Array([1, 0.8, 0.6, 0.4, 0.2]),
        },
        horizontal[0]!,
      );
      bindTarget(gl, picture, false);
      additive();
      copy.use({ tDiffuse: { texture: horizontal[0]!.texture } });
      drawMesh(gl, passMeshes.get(copy)!);

      // the grade, onto the canvas
      gl.disable(gl.BLEND);
      runPass(
        grade,
        { tDiffuse: { texture: picture.texture }, uTime: t, uSplit: SPLIT, uLightMode: light ? 1 : 0, uInk: Float32Array.from(palette.ink) },
        null,
      );
    },

    dispose() {
      canvas.removeEventListener('webglcontextlost', onLost);
      if (lost) return;
      for (const m of meshes) disposeMesh(gl, m);
      if (sparks) disposeMesh(gl, sparks);
      for (const p of programs) gl.deleteProgram(p.program);
      for (const target of [picture, fogTarget, bright, ...horizontal, ...vertical]) disposeTarget(gl, target);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
