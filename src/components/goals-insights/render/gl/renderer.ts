import { BLOOM_KERNELS, blurKernel } from '../../../goals-perimeter/render/gl/renderer.js';
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
} from '../../../goals-perimeter/render/gl/program.js';
import {
  BLUR_FRAG,
  COMPOSITE_FRAG,
  COPY_FRAG,
  GRADE_FRAG,
  HIGH_PASS_FRAG,
  PASS_VERT,
} from '../../../goals-perimeter/render/gl/shaders.js';
import type { ScenePalette } from '../../../goals-perimeter/render/scene-palette.js';
import { MAJOR_RINGS, STRATA, WRAP_BOTTOM, WRAP_PROFILE, WRAP_SAMPLES, WRAP_TOP } from '../../lib/geometry.js';
import {
  CLAIM_FRAG,
  CLAIM_VERT,
  CORE_FRAG,
  DUST_VERT,
  GOAL_FRAG,
  GOAL_VERT,
  PARTICLE_VERT,
  POINT_FRAG,
  RING_FRAG,
  RING_VERT,
  SCREEN_VERT,
  SMOKE_FRAG,
  WRAP_FRAG,
  WRAP_VERT,
} from './shaders.js';

/**
 * The evidence column's light, drawn with WebGL 2 under its SVG: smoke in
 * the column lit by the goal, the shaft of its light down the axis, the glow
 * of the lit rings, the glass blanket, a light round every claim, the
 * sources rising as particles, the rings' dust, the goals' light — added up,
 * then bloomed and graded with the goals perimeter's passes. Nothing here is
 * a mark of its own: every light is one the column's data gives off.
 *
 * Every goal of the model has its place in the shaders' arrays (`GOALS`);
 * each claim's light reads its own attributes, so any number of claims is
 * drawn. Where the device cannot compile it the renderer is not made, and
 * the SVG keeps its own glass and particles.
 */

/** How far the grade pulls colours apart at the frame's corners. */
const SPLIT = 0.012;
/** Bloom as the design sets it: strength, radius, threshold. */
const BLOOM = { strength: 0.55, radius: 0.45, threshold: 0.5 };

export type RGB = [number, number, number];

/** Which way a claim reads, as the light takes it. */
export type ClaimKind = 0 | 1 | 2 | 3;
export const KIND = { against: 0, disputed: 1, for: 2, single: 3 } as const;

/** A source rising up the axis. */
export interface Particle {
  jx: number;
  jy: number;
  size: number;
  dur: number;
  phase: number;
  color: RGB;
}

/** A mote of dust standing in a ring's disc. */
export interface DustMote {
  ring: number;
  ux: number;
  uy: number;
  size: number;
  opacity: number;
}

/** One frame of the column, as the SVG stands. Positions in viewBox units. */
export interface ColumnFrame {
  /** The part of the viewBox the canvas covers. */
  region: { x: number; y: number; w: number; h: number };
  tilt: number;
  /** The column's turn: the blanket's shimmer turns with it. */
  yaw: number;
  flat: boolean;
  /** Seconds since start; null holds the picture still. */
  time: number | null;
  /** 0–1 while the column comes up. */
  intro: number;
  claims: { x: number; y: number; depth: number; r: number; kind: ClaimKind; fresh: boolean; alpha: number }[];
  /** The goals: x, y, radius, strength, colour (linear). The main one first. */
  goals: { x: number; y: number; r: number; strength: number; tone: RGB }[];
  /** Every ring: height, half-width, whether it is a major one, how strongly it shows. */
  rings: { y: number; rx: number; major: boolean; shown: number }[];
  /** Changes when the particles or the dust do: they are rebuilt then. */
  key: string;
  particles: Particle[];
  dust: DustMote[];
}

export interface ColumnRenderer {
  /** Sets the backing store, in canvas px. */
  resize(width: number, height: number): void;
  render(frame: ColumnFrame): void;
  dispose(): void;
}

const CORNERS = [-1, -1, 1, -1, 1, 1, -1, 1];
const QUAD = [0, 1, 2, 0, 2, 3];

/**
 * WebGL 2 for a column of `goals` goals, or null where the device has none
 * or cannot compile it. The scene's light, the glass and the claims that
 * back the goal take their colours from `palette`; what argues against it
 * and what is disputed keep the status hues.
 */
export function createColumnRenderer(canvas: HTMLCanvasElement, palette: ScenePalette, goals: number, against: RGB, disputed: RGB): ColumnRenderer | null {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  } catch {
    gl = null;
  }
  if (!gl) return null;
  try {
    return build(gl, canvas, palette, goals, against, disputed);
  } catch {
    // a device whose limits the column's programs exceed: the SVG draws on without the light
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }
}

function build(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, palette: ScenePalette, goalCount: number, against: RGB, disputed: RGB): ColumnRenderer {
  let lost = false;
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };
  canvas.addEventListener('webglcontextlost', onLost);
  const half = halfFloatTargets(gl);
  const light = palette.mode === 'light';

  const GOALS = Math.max(1, goalCount);
  const RINGS = STRATA.length;
  const MAJORS = MAJOR_RINGS;
  const WRAP_VECS = WRAP_SAMPLES / 4;
  const U = {
    uRegion: new Float32Array([0, 0, 1000, 800]),
    uPx: 1,
    uTime: 0,
    uIntro: 1,
    uTilt: 0.19,
    uYaw: 0,
    uFlat: 0,
    uWrap: Float32Array.from(WRAP_PROFILE),
    uWrapY: new Float32Array([WRAP_TOP, WRAP_BOTTOM]),
    uCool: Float32Array.from(palette.light),
    uGlass: Float32Array.from(palette.glass),
    uDust: Float32Array.from(palette.agent),
    uAgainst: Float32Array.from(against),
    uDisputed: Float32Array.from(disputed),
    uFor: Float32Array.from(palette.agent),
    uRing: new Float32Array(MAJORS * 4),
    uRingAll: new Float32Array(RINGS * 4),
    uGoal: new Float32Array(GOALS * 4),
    uGoalTone: new Float32Array(GOALS * 3),
    uGoalL: new Float32Array(GOALS * 4),
    uGoalC: new Float32Array(GOALS * 3),
  } satisfies Uniforms;

  const programs: Program[] = [];
  const meshes: Mesh[] = [];
  const program = (vertex: string, fragment: string, defines?: Record<string, number>) => {
    const p = createProgram(gl, vertex, fragment, { GOALS, RINGS, MAJORS, WRAP_VECS, ...defines });
    programs.push(p);
    return p;
  };
  const mesh = (p: Program, mode: number, attributes: Record<string, [ArrayLike<number>, number]>, index?: ArrayLike<number>) => {
    const m = createMesh(gl, p, mode, attributes, index);
    meshes.push(m);
    return m;
  };
  const screenPositions: [number[], number] = [[-1, -1, 0, 3, -1, 0, -1, 3, 0], 3];

  // ── smoke and the core's shaft, over the whole canvas ──
  const smokeProgram = program(SCREEN_VERT, SMOKE_FRAG);
  const smokeMesh = mesh(smokeProgram, gl.TRIANGLES, { position: screenPositions });
  const coreProgram = program(SCREEN_VERT, CORE_FRAG);
  const coreMesh = mesh(coreProgram, gl.TRIANGLES, { position: screenPositions });

  // ── the blanket round the column: a grid across it and down it, shaped by the shader ──
  const WROWS = 320;
  const WCOLS = 96;
  const wp: number[] = [];
  const wa: number[] = [];
  const wi: number[] = [];
  for (let r = 0; r <= WROWS; r++)
    for (let c = 0; c <= WCOLS; c++) {
      wp.push(0, 0, 0);
      wa.push((c / WCOLS) * 2 - 1, r / WROWS);
    }
  for (let r = 0; r < WROWS; r++)
    for (let c = 0; c < WCOLS; c++) {
      const a = r * (WCOLS + 1) + c;
      wi.push(a, a + 1, a + WCOLS + 1, a + 1, a + WCOLS + 2, a + WCOLS + 1);
    }
  const wrapProgram = program(WRAP_VERT, WRAP_FRAG);
  const wrapMesh = mesh(wrapProgram, gl.TRIANGLES, { position: [wp, 3], aAcross: [wa, 2] }, wi);

  // ── the lit rings' near halves, a band each ──
  const STEPS = 72;
  const rp: number[] = [];
  const ri: number[] = [];
  for (let ring = 0; ring < MAJORS; ring++) {
    const base = rp.length / 3;
    for (let k = 0; k <= STEPS; k++) {
      const t = (k / STEPS) * Math.PI;
      for (const side of [-1, 1]) rp.push(ring, t, side);
    }
    for (let k = 0; k < STEPS; k++) {
      const a = base + k * 2;
      ri.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const ringProgram = program(RING_VERT, RING_FRAG);
  const ringMesh = mesh(ringProgram, gl.TRIANGLES, { position: [rp, 3] }, ri);

  // ── the goals' light: a square each ──
  const goalProgram = program(GOAL_VERT, GOAL_FRAG);
  const slots = Array.from({ length: GOALS }, (_, i) => i);
  const goalMesh = mesh(
    goalProgram,
    gl.TRIANGLES,
    { position: [slots.flatMap((i) => [0, 1, 2, 3].flatMap((k) => [i, CORNERS[k * 2]!, CORNERS[k * 2 + 1]!])), 3] },
    slots.flatMap((n) => QUAD.map((k) => n * 4 + k)),
  );

  // ── the claims' light: a square each, its data in attributes rewritten every frame ──
  const claimProgram = program(CLAIM_VERT, CLAIM_FRAG);
  let claims: { vao: WebGLVertexArrayObject; buffers: WebGLBuffer[]; data: Float32Array; dataB: Float32Array; count: number } | null = null;
  const claimBuffers = (n: number) => {
    if (claims && claims.count === n) return claims;
    if (claims) {
      gl.deleteVertexArray(claims.vao);
      for (const b of claims.buffers) gl.deleteBuffer(b);
    }
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buffers: WebGLBuffer[] = [];
    const attach = (name: string, data: Float32Array, size: number, usage: number) => {
      const location = claimProgram.attributes[name];
      const buffer = gl.createBuffer()!;
      buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      if (location === undefined || location < 0) return;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    };
    attach('position', Float32Array.from(Array.from({ length: n }, () => [0, 1, 2, 3].flatMap((k) => [CORNERS[k * 2]!, CORNERS[k * 2 + 1]!, 0])).flat()), 3, gl.STATIC_DRAW);
    const data = new Float32Array(n * 16);
    const dataB = new Float32Array(n * 16);
    attach('aClaim', data, 4, gl.DYNAMIC_DRAW);
    attach('aClaimB', dataB, 4, gl.DYNAMIC_DRAW);
    const index = gl.createBuffer()!;
    buffers.push(index);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint32Array.from(Array.from({ length: n }, (_, c) => QUAD.map((k) => c * 4 + k)).flat()), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    claims = { vao, buffers, data, dataB, count: n };
    return claims;
  };

  // ── the dust and the particles: rebuilt when the goal's claims change ──
  const dustProgram = program(DUST_VERT, POINT_FRAG);
  const particleProgram = program(PARTICLE_VERT, POINT_FRAG);
  let dust: Mesh | null = null;
  let particles: Mesh | null = null;
  let built = '';
  const rebuild = (f: ColumnFrame) => {
    built = f.key;
    if (dust) disposeMesh(gl, dust);
    if (particles) disposeMesh(gl, particles);
    dust = createMesh(gl, dustProgram, gl.POINTS, {
      position: [f.dust.flatMap(() => [0, 0, 0]), 3],
      aRing: [f.dust.map((m) => m.ring), 1],
      aU: [f.dust.flatMap((m) => [m.ux, m.uy]), 2],
      aSize: [f.dust.map((m) => m.size), 1],
      aOp: [f.dust.map((m) => m.opacity), 1],
      aSeed: [f.dust.map((_, i) => (i * 0.618) % 1), 1],
    });
    particles = createMesh(gl, particleProgram, gl.POINTS, {
      position: [f.particles.flatMap(() => [0, 0, 0]), 3],
      aJit: [f.particles.flatMap((p) => [p.jx, p.jy]), 2],
      aSize: [f.particles.map((p) => p.size), 1],
      aDur: [f.particles.map((p) => p.dur), 1],
      aPhase: [f.particles.map((p) => p.phase), 1],
      aColor: [f.particles.flatMap((p) => p.color), 3],
    });
  };

  // ── bloom, then the grade ──
  const picture = createTarget(gl, half);
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
  const passMeshes = new Map<Program, Mesh>([highPass, composite, copy, grade, ...blurs.map((b) => b.program)].map((p) => [p, mesh(p, gl.TRIANGLES, { position: screenPositions })]));
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

  let sized = 0;

  return {
    resize(width, height) {
      if (lost) return;
      sized = width;
      canvas.width = width;
      canvas.height = height;
      resizeTarget(gl, picture, width, height, half);
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

    render(f) {
      if (!sized || lost) return;
      if (f.key !== built) rebuild(f);
      const t = f.time ?? 0;
      U.uRegion.set([f.region.x, f.region.y, f.region.w, f.region.h]);
      U.uPx = sized / f.region.w;
      U.uTime = t;
      U.uIntro = f.intro;
      U.uTilt = Math.max(0.0001, f.tilt);
      U.uYaw = f.yaw;
      U.uFlat = f.flat ? 1 : 0;

      let m = 0;
      f.rings.forEach((r, i) => {
        U.uRingAll.set([r.y, r.rx, r.major ? 1 : 0, r.shown], i * 4);
        if (r.major && m < MAJORS) U.uRing.set([r.y, r.rx, (i === 0 ? 1.6 : 1) * r.shown, 0], 4 * m++);
      });
      for (let i = 0; i < GOALS; i++) {
        const g = f.goals[i];
        if (!g) {
          U.uGoal.set([0, 0, 0, 0], i * 4);
          U.uGoalL.set([0, 0, 1, 0], i * 4);
          continue;
        }
        U.uGoal.set([g.x, g.y, g.r, g.strength], i * 4);
        U.uGoalTone.set(g.tone, i * 3);
        U.uGoalL.set([g.x, g.y, g.r * 4, g.strength], i * 4);
        U.uGoalC.set(g.tone, i * 3);
      }

      const c = claimBuffers(f.claims.length);
      f.claims.forEach((claim, i) => {
        for (let k = 0; k < 4; k++) {
          c.data.set([claim.x, claim.y, claim.r, claim.kind], (i * 4 + k) * 4);
          c.dataB.set([claim.alpha, claim.fresh ? 1 : 0, claim.depth, i], (i * 4 + k) * 4);
        }
      });

      // the picture, in light
      gl.disable(gl.BLEND);
      bindTarget(gl, picture);
      additive();
      smokeProgram.use(U);
      drawMesh(gl, smokeMesh);
      coreProgram.use(U);
      drawMesh(gl, coreMesh);
      wrapProgram.use(U);
      drawMesh(gl, wrapMesh);
      ringProgram.use(U);
      drawMesh(gl, ringMesh);
      goalProgram.use(U);
      drawMesh(gl, goalMesh);
      if (c.count) {
        claimProgram.use(U);
        gl.bindVertexArray(c.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, c.buffers[1]!);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, c.data);
        gl.bindBuffer(gl.ARRAY_BUFFER, c.buffers[2]!);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, c.dataB);
        gl.drawElements(gl.TRIANGLES, c.count * 6, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
      }
      if (dust) {
        dustProgram.use(U);
        drawMesh(gl, dust);
      }
      if (particles) {
        particleProgram.use(U);
        drawMesh(gl, particles);
      }

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
      runPass(grade, { tDiffuse: { texture: picture.texture }, uTime: t, uSplit: SPLIT, uLightMode: light ? 1 : 0, uInk: Float32Array.from(palette.ink) }, null);
    },

    dispose() {
      canvas.removeEventListener('webglcontextlost', onLost);
      if (lost) return;
      for (const m of meshes) disposeMesh(gl, m);
      if (dust) disposeMesh(gl, dust);
      if (particles) disposeMesh(gl, particles);
      if (claims) {
        gl.deleteVertexArray(claims.vao);
        for (const b of claims.buffers) gl.deleteBuffer(b);
      }
      for (const p of programs) gl.deleteProgram(p.program);
      for (const target of [picture, bright, ...horizontal, ...vertical]) disposeTarget(gl, target);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
