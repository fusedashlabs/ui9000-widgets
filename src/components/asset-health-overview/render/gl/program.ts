/**
 * The little of three.js the arena's picture needs, on plain WebGL 2:
 * programs whose uniforms are set by name from one shared table, meshes,
 * and render targets in half floats where the device can draw into them.
 */

const VERTEX_PRELUDE = `#version 300 es
#define attribute in
#define varying out
precision highp float;
precision highp int;
in vec3 position;
`;

const FRAGMENT_PRELUDE = `#version 300 es
#define varying in
#define texture2D texture
precision highp float;
precision highp int;
out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
`;

/** A uniform's value: a number, a run of numbers (vectors and arrays alike), or a texture unit for a sampler. */
export type UniformValue = number | Float32Array | { texture: WebGLTexture | null };

export type Uniforms = Record<string, UniformValue>;

export interface Program {
  program: WebGLProgram;
  attributes: Record<string, number>;
  /** Sets every active uniform found in `values`. */
  use(values: Uniforms): void;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`asset-health-overview: shader did not compile: ${log}`);
  }
  return shader;
}

export function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string, defines: Record<string, number> = {}): Program {
  const defs = Object.entries(defines)
    .map(([name, value]) => `#define ${name} ${value}\n`)
    .join('');
  const program = gl.createProgram()!;
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_PRELUDE + defs + vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_PRELUDE + defs + fragment);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(`asset-health-overview: program did not link: ${gl.getProgramInfoLog(program)}`);
  }

  const attributes: Record<string, number> = {};
  for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES); i++) {
    const info = gl.getActiveAttrib(program, i);
    if (info) attributes[info.name] = gl.getAttribLocation(program, info.name);
  }
  const uniforms: { name: string; type: number; location: WebGLUniformLocation }[] = [];
  for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
    const info = gl.getActiveUniform(program, i);
    const location = info && gl.getUniformLocation(program, info.name);
    if (info && location) uniforms.push({ name: info.name.replace(/\[0\]$/, ''), type: info.type, location });
  }

  return {
    program,
    attributes,
    use(values) {
      gl.useProgram(program);
      let unit = 0;
      for (const { name, type, location } of uniforms) {
        const value = values[name];
        if (value === undefined) continue;
        if (typeof value === 'number') {
          if (type === gl.FLOAT) gl.uniform1f(location, value);
          else gl.uniform1i(location, value);
        } else if (value instanceof Float32Array) {
          if (type === gl.FLOAT_VEC2) gl.uniform2fv(location, value);
          else if (type === gl.FLOAT_VEC3) gl.uniform3fv(location, value);
          else if (type === gl.FLOAT_VEC4) gl.uniform4fv(location, value);
          else gl.uniform1fv(location, value);
        } else {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, value.texture);
          gl.uniform1i(location, unit);
          unit++;
        }
      }
    },
  };
}

export interface Mesh {
  vao: WebGLVertexArrayObject;
  mode: number;
  count: number;
  /** Index type when drawn by index. */
  indexed: boolean;
  buffers: WebGLBuffer[];
}

/** A mesh for a program: each attribute a run of floats `size` wide. */
export function createMesh(
  gl: WebGL2RenderingContext,
  program: Program,
  mode: number,
  attributes: Record<string, [data: ArrayLike<number>, size: number]>,
  index?: ArrayLike<number>,
): Mesh {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buffers: WebGLBuffer[] = [];
  let count = 0;
  for (const [name, [data, size]] of Object.entries(attributes)) {
    const location = program.attributes[name];
    if (location === undefined || location < 0) continue;
    const buffer = gl.createBuffer()!;
    buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(data), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    if (name === 'position') count = data.length / size;
  }
  if (index) {
    const buffer = gl.createBuffer()!;
    buffers.push(buffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint32Array.from(index), gl.STATIC_DRAW);
    count = index.length;
  }
  gl.bindVertexArray(null);
  return { vao, mode, count, indexed: !!index, buffers };
}

export function drawMesh(gl: WebGL2RenderingContext, mesh: Mesh): void {
  if (!mesh.count) return;
  gl.bindVertexArray(mesh.vao);
  if (mesh.indexed) gl.drawElements(mesh.mode, mesh.count, gl.UNSIGNED_INT, 0);
  else gl.drawArrays(mesh.mode, 0, mesh.count);
  gl.bindVertexArray(null);
}

export function disposeMesh(gl: WebGL2RenderingContext, mesh: Mesh): void {
  gl.deleteVertexArray(mesh.vao);
  for (const buffer of mesh.buffers) gl.deleteBuffer(buffer);
}

export interface Target {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
}

/** Whether the device can draw into half-float textures; the picture falls back to 8-bit targets where it cannot. */
export function halfFloatTargets(gl: WebGL2RenderingContext): boolean {
  return !!(gl.getExtension('EXT_color_buffer_float') ?? gl.getExtension('EXT_color_buffer_half_float'));
}

export function createTarget(gl: WebGL2RenderingContext, half: boolean): Target {
  const texture = gl.createTexture()!;
  const framebuffer = gl.createFramebuffer()!;
  const target = { texture, framebuffer, width: 0, height: 0 };
  resizeTarget(gl, target, 2, 2, half);
  return target;
}

export function resizeTarget(gl: WebGL2RenderingContext, target: Target, width: number, height: number, half: boolean): void {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (target.width === w && target.height === h) return;
  target.width = w;
  target.height = h;
  gl.bindTexture(gl.TEXTURE_2D, target.texture);
  if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

export function disposeTarget(gl: WebGL2RenderingContext, target: Target): void {
  gl.deleteTexture(target.texture);
  gl.deleteFramebuffer(target.framebuffer);
}

/** Draws into a target (or the canvas, for null), cleared to nothing. */
export function bindTarget(gl: WebGL2RenderingContext, target: Target | null, clear = true): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
  gl.viewport(0, 0, target?.width ?? gl.drawingBufferWidth, target?.height ?? gl.drawingBufferHeight);
  if (clear) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}
