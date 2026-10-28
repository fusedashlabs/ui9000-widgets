/**
 * Shaders of the graph, ported from the Agent operations design (as the goals
 * perimeter has them, less the glass, the sparks and the links: the graph
 * draws its lines in the overlay). Everything is laid out in the scene's
 * design space and projected with the same camera as the SVG overlay
 * (`projector` in lib/scene.ts), so light and instruments stay locked
 * together.
 *
 * The picture is built in light, added up in a high-range buffer: smoke lit
 * from above and by the goals' canopies, and their agents as points with
 * depth of field on the tips of the trees. A last pass blooms, grades and
 * grains it like film.
 *
 * Written as three.js would take them (GLSL ES 1.00 words, `position` and
 * `uv` given); `vertex()` and `fragment()` in ./program.ts add the GLSL ES
 * 3.00 prelude three.js adds, so uniform arrays can be indexed per goal.
 */

/** Camera, canvas mapping and per-goal data shared by every program. */
const COMMON = /* glsl */ `
uniform vec4 uCam;      // cos yaw, sin yaw, cos pitch, sin pitch
uniform float uFocal;
uniform vec2 uPivot;
uniform vec2 uBleed;    // design px the canvas reaches left of and above the design box
uniform vec2 uSize;     // design px the canvas covers
uniform float uPx;      // canvas px per design px
uniform float uUnit;    // design px per screen px
uniform float uTime;
uniform float uIntro;   // 0–1 while the scene settles in
uniform float uHealthy; // brightness of working and idle agents
uniform float uCount;   // goals
uniform vec4 uGoal[8];  // world x, y, z, radius
uniform vec4 uGoalB[8]; // spin angle, alpha, heat, pulse
uniform vec4 uLight[8]; // projected x, y, radius; intensity
uniform vec3 uLightCol[8];
uniform float uDrift;   // how far working agents wander about their places: 1 in a cloud
uniform float uScale[8]; // each goal's agents drawn in from or out about its centre: 1 in a cloud
uniform vec3 uGlass;    // light the glass catches at its limb, from the page's palette

vec3 project(vec3 w) {
  vec3 o = vec3(w.xy - uPivot, w.z);
  float x1 = o.x * uCam.x - o.z * uCam.y;
  float z1 = o.x * uCam.y + o.z * uCam.x;
  float y1 = o.y * uCam.z - z1 * uCam.w;
  float z2 = o.y * uCam.w + z1 * uCam.z;
  float k = uFocal / (uFocal + z2);
  return vec3(uPivot + vec2(x1, y1) * k, z2);
}
float persp(float z2) { return uFocal / (uFocal + z2); }
vec4 toClip(vec2 d) { return vec4((d.x + uBleed.x) / uSize.x * 2.0 - 1.0, 1.0 - (d.y + uBleed.y) / uSize.y * 2.0, 0.0, 1.0); }

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm3(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; } return v / 0.875; }
float fbm4(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; } return v / 0.9375; }

/** An agent's place in the world: its own slow drift, the cloud's turn, the gathering on load. */
vec3 agentWorld(vec3 local, float goal, float seed, float drift) {
  int gi = int(goal + 0.5);
  vec4 G = uGoal[gi];
  float w = uTime * (0.22 + seed * 0.5) + seed * 61.0;
  vec3 l = local * uScale[gi] + vec3(sin(w), cos(w * 1.31 + 2.0), sin(w * 0.73 + 4.0)) * G.w * 0.02 * drift * uDrift;
  l *= mix(2.4 + seed * 1.6, 1.0, uIntro);
  float a = uGoalB[gi].x;
  float ca = cos(a), sa = sin(a);
  return vec3(G.x + l.x * ca - l.z * sa, G.y + l.y, G.z + l.x * sa + l.z * ca);
}
`

/** A triangle over the whole canvas; `vD` is the design-space point under each pixel. */
export const SCREEN_VERT = /* glsl */ `
${COMMON}
varying vec2 vD;
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  vD = vec2(vUv.x * uSize.x - uBleed.x, (1.0 - vUv.y) * uSize.y - uBleed.y);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/**
 * Smoke. Two depths of slowly churning noise, lit by a wide fall of light
 * from above and — only a trace — by every goal near it. Kept thin: the grade's
 * gamma lifts faint light a long way, so pools of it soon read as blotches. Drawn small and stretched: smoke has
 * no edges to lose.
 */
export const FOG_FRAG = /* glsl */ `
${COMMON}
uniform vec2 uShift;    // the camera's turn, so the smoke slides as the map does
uniform vec3 uCool;
varying vec2 vD;
varying vec2 vUv;
void main() {
  float t = uTime;
  // billows: slow, large, folded over themselves
  vec2 a = vD * 0.00125 + uShift * 0.5 + vec2(t * 0.012, -t * 0.005);
  vec2 warp = vec2(fbm3(a * 1.9 + vec2(0.0, t * 0.024)), fbm3(a * 1.9 + vec2(5.2, 1.3) - t * 0.018));
  float billows = fbm4(a + warp * 1.35);
  // wisps: finer, nearer, sliding the other way
  vec2 b = vD * 0.0037 + uShift * 1.3 + vec2(-t * 0.019, t * 0.009);
  float wisps = fbm4(b + warp * 0.8);
  float dens = pow(smoothstep(0.3, 0.8, billows), 1.35) * (0.5 + 0.85 * wisps);

  // light falling from above the field, through the smoke
  vec2 c = vD - vec2(uPivot.x + 70.0, -380.0);
  float ang = atan(c.x, c.y);
  float reach = length(c);
  float cone = exp(-ang * ang * 2.3) * smoothstep(1350.0, 220.0, reach);
  float rays = 0.7 + 0.3 * noise(vec2(ang * 9.0, t * 0.06)) * (0.55 + 0.45 * noise(vec2(ang * 23.0 + 4.0, -t * 0.045)));
  // the fall of light is the picture's one soft source: mostly even, the smoke only stirring it a
  // little, so it reads as a light from above and not as lit patches drifting over the field
  vec3 col = uCool * (dens * 0.0002 + mix(0.5, dens, 0.3) * cone * rays * 0.02);

  // every goal lights the smoke round it
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uCount) break;
    vec4 L = uLight[i];
    vec2 d = (vD - L.xy) / L.z;
    float r2 = dot(d, d);
    col += uLightCol[i] * L.w * (dens * exp(-r2 * 0.26) * 0.001 + exp(-r2 * 1.1) * 0.001);
  }

  // the light holds to the middle of the field and falls away round it, as a lens would have it
  col *= mix(0.42, 1.0, smoothstep(1.25, 0.3, length((vD - uPivot) / vec2(860.0, 500.0))));
  gl_FragColor = vec4(col * uIntro * (0.45 + 0.55 * uHealthy), 1.0);
}
`

/** Lays the smoke into the picture. */
export const FOG_COPY_FRAG = /* glsl */ `
uniform sampler2D tFog;
varying vec2 vUv;
void main() { gl_FragColor = vec4(texture2D(tFog, vUv).rgb, 0.0); }
`

/**
 * Agents. One point each; nearer ones larger and brighter, and those away
 * from the plane of focus spread into soft discs. `position` is the agent's
 * place inside its goal; `aData` its goal, its own random number and state.
 */
export const AGENT_VERT = /* glsl */ `
${COMMON}
attribute vec3 aData;
uniform float uGrain;    // design px of a nominal dot
uniform float uFocus;    // depth in focus
uniform float uAperture;
uniform float uNear;     // how much nearer agents are drawn larger and brighter: 1 in a cloud
uniform vec3 uCol[6];
varying vec4 vCol;
varying vec3 vShape;     // state; the mark's radius as a share of the sprite; canvas px across
void main() {
  float goal = aData.x, seed = aData.y, state = aData.z;
  int gi = int(goal + 0.5);
  vec4 G = uGoal[gi];
  bool held = state > 1.5;
  vec3 world = agentWorld(position, goal, seed, state < 0.5 ? 1.0 : 0.0);
  vec3 p = project(world);
  vec3 c = project(G.xyz);
  float k = persp(p.z);
  float near = mix(0.5, clamp(0.5 - (p.z - c.z) / (2.0 * G.w), 0.0, 1.0), uNear);
  float depth = clamp(1.0 - c.z / 1500.0, 0.74, 1.1);
  float r, I;
  if (!held) {
    float twinkle = state < 0.5 ? 0.8 + 0.2 * sin(uTime * (0.6 + seed * 1.7) + seed * 97.0) : 1.0;
    // a goal drawn small keeps its agents apart with a finer dot
    r = (0.55 + 0.62 * near + 0.5 * seed * seed * seed) * uGrain * k * mix(0.74, 1.0, smoothstep(0.3, 1.0, uScale[gi]));
    I = (0.18 + 0.82 * pow(near, 1.3)) * (0.66 + 0.34 * seed) * twinkle * uHealthy;
    I *= state > 0.5 ? 0.5 : (seed > 0.9 ? 2.8 : 1.15);
  } else {
    r = (0.78 + 0.5 * near) * uGrain * k * 2.3;
    I = 0.6 + 0.4 * near;
  }
  // spread by its distance from the plane of focus — never by more than a couple of px on screen, however far in the view is zoomed
  float coc = min(abs(p.z - uFocus) * uAperture, 2.2 * uUnit) * (held ? 0.4 : 1.0) + (1.0 - uIntro) * 5.0 * uGrain;
  float rr = r + coc;
  I *= pow(r / rr, held ? 0.6 : 1.25);
  float halo = held ? 2.2 : 2.3;
  float size = max((rr * halo + 0.6 / uPx) * 2.0 * uPx, 2.0);
  gl_PointSize = size;
  gl_Position = toClip(p.xy);
  vCol = vec4(uCol[int(state + 0.5)], I * uGoalB[gi].y * depth);
  vShape = vec3(state, rr * 2.0 * uPx / size, size);
}
`

/** Working and idle agents: crisp points, added to the light. */
export const AGENT_FRAG = /* glsl */ `
varying vec4 vCol;
varying vec3 vShape;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float d = length(q);
  float core = vShape.y;
  float a = exp(-pow(d / core, 3.0) * 1.1) + 0.05 * exp(-d * d * 7.0) * step(d, 1.0);
  gl_FragColor = vec4(vCol.rgb * vCol.a * a, 0.0);
}
`

/**
 * Held agents wear their state's mark — a ring (holding), a solid dot
 * (blocked), a cross (failed), a triangle (over budget) — laid over the light
 * rather than added to it, so the mark keeps its colour in a crowd.
 */
export const HELD_FRAG = /* glsl */ `
varying vec4 vCol;
varying vec3 vShape;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float d = length(q);
  float core = vShape.y;
  float aa = 2.0 / vShape.z;
  float st = vShape.x;
  float a;
  if (st < 2.5) {
    a = smoothstep(core * 0.24 + aa, core * 0.24 - aa * 0.3, abs(d - core * 0.74));
  } else if (st < 3.5) {
    a = smoothstep(core * 0.66 + aa, core * 0.66 - aa, d);
  } else if (st < 4.5) {
    vec2 p = abs(vec2(q.x + q.y, q.x - q.y)) * 0.7071;
    float sd = min(max(p.x - core * 0.86, p.y - core * 0.2), max(p.y - core * 0.86, p.x - core * 0.2));
    a = smoothstep(aa, -aa * 0.3, sd);
  } else {
    vec2 p = q / core;
    p.y += 0.12;
    float sd = max(abs(p.x) * 0.866 + p.y * 0.5, -p.y) - 0.44;
    a = smoothstep(aa / core, -aa / core * 0.3, sd);
  }
  float bloom = exp(-d * d * 5.0) * 0.1 * step(d, 1.0);
  float alpha = clamp(a * vCol.a, 0.0, 1.0);
  gl_FragColor = vec4(vCol.rgb * (a * 1.25 + bloom) * vCol.a, alpha);
}
`

/**
 * The last pass, as a lens and a film would have it: colours pulled apart a
 * touch towards the edges, a soft shoulder on the highlights, a cool cast in
 * the shadows, grain. Alpha follows the light, so the picture is laid over
 * the page as light is.
 */
export const GRADE_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uSplit;   // how far the colours part at the frame's corners
uniform float uLightMode; // 1 on a light page: the light is laid down as ink
uniform vec3 uInk;      // the ink neutral light becomes, sRGB
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 c = vUv - 0.5;
  vec2 split = c * dot(c, c) * uSplit;
  vec3 col = vec3(texture2D(tDiffuse, vUv + split).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - split).b);
  col = 1.0 - exp(-col * 1.12);
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col * vec3(0.9, 0.98, 1.12), col, smoothstep(0.0, 0.5, lum));
  // a toe: the faintest light — the wide skirt of the bloom, the last of the smoke — falls to black
  // instead of being lifted into a veil over the whole field; anything brighter is left as it was
  col = col * col / (col + 0.004);
  float g = hash(gl_FragCoord.xy + fract(uTime * 7.0) * 311.0) - 0.5;
  if (uLightMode > 0.5) {
    // ink: as much of it as there was light, lifted less than light is, so the faint smoke stays a whisper
    // on the pale room; neutral light becomes the ink, coloured light keeps its hue, darkened to hold on white
    float bright = max(col.r, max(col.g, col.b));
    float a = clamp(pow(bright, 1.0 / 1.5) * (1.0 + g * 0.08), 0.0, 1.0);
    vec3 hue = pow(col / max(bright, 1e-4), vec3(1.0 / 2.2));
    float chroma = max(hue.r, max(hue.g, hue.b)) - min(hue.r, min(hue.b, hue.g));
    vec3 ink = mix(uInk, hue * 0.7, smoothstep(0.12, 0.5, chroma));
    gl_FragColor = vec4(ink * a, a);
    return;
  }
  col = pow(col, vec3(1.0 / 2.2));
  col *= 1.0 + g * 0.16;
  gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));
}
`

/** A full-screen triangle, for the passes that work on whole pictures. */
export const PASS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

/** Bloom, after three.js's UnrealBloomPass: the bright parts of the picture… */
export const HIGH_PASS_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float luminosityThreshold;
uniform float smoothWidth;
varying vec2 vUv;
void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  float v = dot(texel.xyz, vec3(0.2126, 0.7152, 0.0722));
  float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);
  gl_FragColor = mix(vec4(0.0), texel, alpha);
}
`

/** …blurred one way at a time, at five sizes… (`KERNEL_PAIRS` is defined per size) */
export const BLUR_FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D colorTexture;
uniform vec2 invSize;
uniform vec2 direction;
uniform float centerWeight;
uniform float gaussianOffsets[KERNEL_PAIRS];
uniform float gaussianWeights[KERNEL_PAIRS];
void main() {
  vec3 diffuseSum = texture2D(colorTexture, vUv).rgb * centerWeight;
  for (int i = 0; i < KERNEL_PAIRS; i++) {
    vec2 uvOffset = direction * invSize * gaussianOffsets[i];
    vec3 sample1 = texture2D(colorTexture, vUv + uvOffset).rgb;
    vec3 sample2 = texture2D(colorTexture, vUv - uvOffset).rgb;
    diffuseSum += (sample1 + sample2) * gaussianWeights[i];
  }
  gl_FragColor = vec4(diffuseSum, 1.0);
}
`

/** …and laid together, the wider sizes a little weaker. */
export const COMPOSITE_FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D blurTexture1;
uniform sampler2D blurTexture2;
uniform sampler2D blurTexture3;
uniform sampler2D blurTexture4;
uniform sampler2D blurTexture5;
uniform float bloomStrength;
uniform float bloomRadius;
uniform float bloomFactors[5];
float lerpBloomFactor(const in float factor) { return mix(factor, 1.2 - factor, bloomRadius); }
void main() {
  // 3.0 as three.js has it, for backwards compatibility with its alpha-based intensity
  vec3 bloom = 3.0 * bloomStrength * (
    lerpBloomFactor(bloomFactors[0]) * texture2D(blurTexture1, vUv).rgb +
    lerpBloomFactor(bloomFactors[1]) * texture2D(blurTexture2, vUv).rgb +
    lerpBloomFactor(bloomFactors[2]) * texture2D(blurTexture3, vUv).rgb +
    lerpBloomFactor(bloomFactors[3]) * texture2D(blurTexture4, vUv).rgb +
    lerpBloomFactor(bloomFactors[4]) * texture2D(blurTexture5, vUv).rgb
  );
  gl_FragColor = vec4(bloom, max(bloom.r, max(bloom.g, bloom.b)));
}
`

/** A picture copied as it is. */
export const COPY_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tDiffuse, vUv); }
`
