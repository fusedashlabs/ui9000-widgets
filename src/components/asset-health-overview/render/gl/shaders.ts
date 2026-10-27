/**
 * Shaders of the arena, ported from the Agent operations design. Everything
 * is laid out in the scene's design space and projected with the same camera
 * as the SVG overlay (`projector` in lib/camera.ts), so light and instruments
 * stay locked together.
 *
 * The picture is built in light, added up in a high-range buffer: smoke lit
 * from above and by the goals, the goals as glass vessels, their agents as
 * points with depth of field, calls as sparks and traffic as light on the
 * links. A last pass blooms, grades and grains it like film.
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

/** A square round each goal, wide enough for the air outside the vessel. */
export const ORB_VERT = /* glsl */ `
${COMMON}
varying vec2 vQ;
varying float vGoal;
const float REACH = 2.8;
void main() {
  vGoal = position.z;
  vec4 L = uLight[int(position.z + 0.5)];
  vQ = position.xy * REACH;
  gl_Position = toClip(L.xy + vQ * L.z);
}
`

/**
 * A goal as a vessel of glass: light gathering at the limb, brighter on the
 * side the key light strikes, a small glint, mist turning inside with the
 * cloud, and an atmosphere of its light round it — the glow the spheres on
 * Goals and Rules have. A goal in trouble glows warmer and its limb beats.
 */
export const ORB_FRAG = /* glsl */ `
${COMMON}
varying vec2 vQ;
varying float vGoal;
void main() {
  int i = int(vGoal + 0.5);
  vec4 H = uGoalB[i];
  vec4 L = uLight[i];
  vec3 tint = uLightCol[i];
  float r = length(vQ);
  float px = 1.0 / (L.z * uPx);
  vec3 key = normalize(vec3(-0.5, -0.72, 0.48));
  float beat = 1.0 + H.w * 0.7 * pow(0.5 + 0.5 * sin(uTime * 1.7), 5.0);
  vec3 col = vec3(0.0);
  if (r < 1.0) {
    float nz = sqrt(1.0 - r * r);
    vec3 n = vec3(vQ, nz);
    float fres = pow(1.0 - nz, 2.4);
    float lit = clamp(dot(n, key) * 0.5 + 0.5, 0.0, 1.0);
    col += tint * fres * (0.025 + 0.22 * lit * lit) * beat;
    col += tint * smoothstep(1.0 - 3.0 * px, 1.0 - 0.9 * px, r) * (0.12 + 0.85 * lit * lit) * beat;
    // its atmosphere seen through the limb: a band of its light just inside the glass
    col += tint * pow(1.0 - nz, 2.0) * (0.06 + 0.12 * lit) * beat;
    // and the body of the glass faintly lit by it, as the spheres on Goals and Rules are
    col += tint * (0.024 + 0.026 * lit) * nz;
    // the key from the upper left, as on the Rules engine's glass: a crescent along the lit limb,
    // a broad sheen, a window's glint lying along the limb, and the bounce on the far side
    vec2 Lk = normalize(vec2(-0.62, -0.78));
    float facing = dot(r > 1e-4 ? vQ / r : vec2(0.0), Lk);
    col += uGlass * smoothstep(0.84, 0.985, r) * smoothstep(0.25, 0.95, facing) * 0.36;
    vec2 q = vQ - Lk * 0.42;
    col += uGlass * 0.66 * exp(-dot(q, q) / 0.09) * 0.045;
    vec2 g = vQ - Lk * 0.64;
    vec2 gt = vec2(dot(g, vec2(Lk.y, -Lk.x)), dot(g, Lk));
    col += vec3(1.0) * exp(-(gt.x * gt.x) / 0.008 - (gt.y * gt.y) / 0.0004) * 0.95;
    col += vec3(1.0) * exp(-dot(vQ - Lk * 0.53, vQ - Lk * 0.53) / 0.00025) * 0.6;
    col += uGlass * 0.72 * smoothstep(0.82, 0.99, r) * smoothstep(0.3, 0.95, -facing) * 0.16;
    // the limb itself, a hairline of white light
    col += mix(uGlass, vec3(1.0), 0.3) * smoothstep(1.0 - 2.4 * px, 1.0 - 0.8 * px, r) * (0.3 + 0.4 * lit);
    // mist inside, turning with the agents: a near layer and a far one
    float ca = cos(H.x), sa = sin(H.x);
    vec3 s = vec3(n.x * ca + n.z * sa, n.y, -n.x * sa + n.z * ca);
    float near = fbm3(s.xy * 2.3 + s.z * 1.2 + vec2(0.0, uTime * 0.03));
    float far = fbm3(vec2(-s.x, s.y) * 1.6 + 3.1 - vec2(uTime * 0.02, 0.0));
    col += tint * (smoothstep(0.4, 0.88, near) * 0.02 + far * 0.007) * nz;
    col += tint * exp(-r * r * 2.6) * 0.02;
  }
  // the atmosphere outside the glass, falling off over about a third of the radius; the lit side a little stronger
  vec2 side = r > 1e-4 ? vQ / r : vec2(0.0);
  float litOut = clamp(dot(side, normalize(key.xy)) * 0.5 + 0.5, 0.0, 1.0);
  // (gone well before the square's edge, so the glow never shows the quad it is drawn on)
  col += tint * exp(-max(r - 1.0, 0.0) * 5.0) * smoothstep(0.96, 1.0, r) * smoothstep(1.8, 1.35, r) * (0.08 + 0.07 * litOut) * beat;
  // and the wide pool of its light round it, as the Rules engine casts: a soft gaussian reaching
  // about two and a half radii, exactly nothing at its edge (inside the square's reach)
  float k = r / 2.6;
  col += tint * exp(-k * k * 4.0) * (1.0 - smoothstep(0.55, 1.0, k)) * 0.1 * beat;
  gl_FragColor = vec4(col * H.y * L.w, 0.0);
}
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
 * Calls. A spark leaves an agent, arcs out of the vessel and lands on the
 * diamond of the resource group it calls; one that is turned away comes back
 * in the colour of what stopped it. `position` is the calling agent's place;
 * `aSpark` its slot, random number, place in its own trail and ordinal.
 */
export const SPARK_VERT = /* glsl */ `
${COMMON}
attribute vec4 aSpark;
uniform vec4 uSlot[24];    // goal, angle on the orbit, share of calls turned away, sparks shown
uniform vec3 uSlotCol[24];
uniform float uOrbit;      // the orbit's radius beyond the goal's, design px
uniform float uFlat;
uniform vec3 uSparkCol;
varying vec4 vCol;
void main() {
  int si = int(aSpark.x + 0.5);
  vec4 S = uSlot[si];
  float seed = aSpark.y;
  int gi = int(S.x + 0.5);
  vec4 G = uGoal[gi];
  vec3 from = agentWorld(position, S.x, fract(seed * 5.3), 1.0);
  float R = G.w + uOrbit;
  vec3 to = G.xyz + (uFlat > 0.5 ? vec3(cos(S.y) * R, sin(S.y) * R, 0.0) : vec3(cos(S.y) * R, 0.0, sin(S.y) * R));
  bool turned = fract(seed * 3.17 + 0.31) < S.z;
  float speed = (turned ? 0.1 : 0.17) + 0.12 * fract(seed * 7.31);
  float ph = fract(uTime * speed + seed * 13.7);
  // a call turned away goes out and comes back
  float s = turned ? sin(ph * 3.14159) * 0.97 : ph;
  s = clamp(s - aSpark.z * 0.085 * (turned && ph > 0.5 ? -1.0 : 1.0), 0.0, 1.0);
  float e = s * s * (3.0 - 2.0 * s);
  vec3 mid = mix(from, to, 0.5) + normalize(to - G.xyz) * G.w * 0.2 - vec3(0.0, G.w * 0.22, 0.0);
  vec3 w = mix(mix(from, mid, e), mix(mid, to, e), e);
  vec3 p = project(w);
  float shown = step(aSpark.w + 0.5, S.w);
  float env = sin(ph * 3.14159);
  float tail = pow(1.0 - aSpark.z, 1.6);
  float size = (1.5 - 0.8 * aSpark.z) * uUnit * uPx * 2.4;
  gl_PointSize = max(size, 1.5);
  gl_Position = toClip(p.xy);
  vec3 col = turned ? uSlotCol[si] * 1.5 : uSparkCol;
  vCol = vec4(col, env * tail * shown * uGoalB[gi].y * smoothstep(0.9, 1.0, uIntro) * (turned ? 1.7 : (0.35 + 0.65 * uHealthy) * 1.15));
}
`

export const GLOW_FRAG = /* glsl */ `
varying vec4 vCol;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(q, q) * 3.2);
  gl_FragColor = vec4(vCol.rgb * vCol.a * a, 0.0);
}
`

const LINKS = /* glsl */ `
uniform vec3 uLinkA[8];
uniform vec3 uLinkM[8];
uniform vec3 uLinkB[8];
uniform vec4 uLinkCol[8];  // colour; brightness
uniform vec4 uLinkFlow[8]; // lights shown; 1 when the same trouble holds agents at both ends
vec3 along(int i, float t) { float it = 1.0 - t; return it * it * uLinkA[i] + 2.0 * it * t * uLinkM[i] + t * t * uLinkB[i]; }
`

/** A link's glow: a soft band along its curve. `position` is link, place along it, side. */
export const LINK_VERT = /* glsl */ `
${COMMON}
${LINKS}
varying vec3 vL;   // side, place along, link
varying vec4 vCol;
void main() {
  int i = int(position.x + 0.5);
  float t = position.y;
  vec3 p0 = project(along(i, t));
  vec3 p1 = project(along(i, t + 0.012));
  vec2 dir = normalize(p1.xy - p0.xy + vec2(1e-5, 0.0));
  vec2 n = vec2(-dir.y, dir.x);
  gl_Position = toClip(p0.xy + n * position.z * 6.0 * uUnit);
  vL = vec3(position.z, t, position.x);
  vCol = uLinkCol[i];
}
`

export const LINK_FRAG = /* glsl */ `
uniform float uTime;
uniform float uIntro;
varying vec3 vL;
varying vec4 vCol;
void main() {
  float g = exp(-vL.x * vL.x * 5.5);
  float ends = smoothstep(0.0, 0.05, vL.y) * smoothstep(1.0, 0.95, vL.y);
  // slow swells of light gliding along
  float swell = pow(0.5 + 0.5 * sin(vL.y * 17.0 - uTime * 0.9 + vL.z * 2.3), 6.0);
  gl_FragColor = vec4(vCol.rgb * vCol.a * g * ends * (0.005 + 0.03 * swell) * smoothstep(0.85, 1.0, uIntro), 0.0);
}
`

/** Traffic: lights running both ways along a link, each with a short tail. `position` is link, random number, place in the tail. */
export const FLOW_VERT = /* glsl */ `
${COMMON}
${LINKS}
attribute float aOrd;
varying vec4 vCol;
void main() {
  int i = int(position.x + 0.5);
  float seed = position.y, trail = position.z;
  vec4 F = uLinkFlow[i];
  float way = mod(aOrd, 2.0) < 0.5 ? 1.0 : -1.0;
  // where the same trouble holds both ends, the traffic stutters
  float tm = mix(uTime, floor(uTime * 2.2) / 2.2 + 0.25 * fract(uTime * 2.2), F.y);
  float speed = 0.05 + 0.05 * fract(seed * 9.7);
  float ph = fract(seed * 7.13 + tm * speed);
  float t = clamp((way > 0.0 ? ph : 1.0 - ph) - way * trail * 0.03, 0.0, 1.0);
  vec3 p0 = project(along(i, t));
  vec3 p1 = project(along(i, min(t + 0.01, 1.0)));
  vec2 dir = normalize(p1.xy - p0.xy + vec2(1e-5, 0.0));
  vec2 n = vec2(-dir.y, dir.x);
  vec2 at = p0.xy + n * sin(t * 31.0 + seed * 40.0 + uTime * 0.7) * 1.6 * uUnit;
  float size = (1.9 - 1.1 * trail) * uUnit * uPx * 1.7;
  gl_PointSize = max(size, 1.5);
  gl_Position = toClip(at);
  float shown = step(aOrd + 0.5, F.x);
  float flick = mix(1.0, step(0.35, fract(uTime * 2.7 + seed * 9.0)), F.y);
  vCol = vec4(uLinkCol[i].rgb, uLinkCol[i].a * sin(ph * 3.14159) * pow(1.0 - trail, 1.7) * shown * flick * smoothstep(0.9, 1.0, uIntro) * 1.0);
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
