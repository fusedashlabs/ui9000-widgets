/**
 * Shaders of the evidence column's light, ported from the Goals & insights
 * design. Everything is laid out in the column's own viewBox units and drawn
 * as added light into a high-range buffer — smoke lit by the goal, the shaft
 * of its light down the axis, the glow of the lit rings, the glass blanket
 * round the column, a light round every claim, the sources rising as
 * particles, the dust in the rings, the goals' light — then bloomed and
 * graded with the goals perimeter's passes. The SVG over it keeps the
 * hairlines, the claims and the type.
 *
 * Written as three.js would take them (GLSL ES 1.00 words, `position`
 * given); the perimeter's `createProgram` adds the GLSL ES 3.00 prelude.
 * `GOALS`, `RINGS`, `MAJORS` and `WRAP_VECS` are defined by the renderer from
 * the model and the column's geometry; each claim's light reads its own
 * attributes, so the column has no cap on claims here.
 */

const COMMON = /* glsl */ `
uniform vec4 uRegion;   // viewBox x, y, width, height the canvas covers
uniform float uPx;      // canvas px per viewBox unit
uniform float uTime;
uniform float uIntro;   // 0–1 while the column comes up
uniform float uTilt;    // a ring's height to its width
uniform float uFlat;    // 1 when the column is laid flat
uniform float uYaw;     // the column's turn
uniform vec3 uCool;     // the scene's light, from the page's palette

const float CX = 500.0;
const float APEX_Y = 118.0;
const float TAIL_Y = 774.0;

vec4 toClip(vec2 v) { return vec4((v.x - uRegion.x) / uRegion.z * 2.0 - 1.0, 1.0 - (v.y - uRegion.y) / uRegion.w * 2.0, 0.0, 1.0); }

/** Half-width of the column at height y: the cone, then the body into the tail (lib/geometry's halfWidthAt). */
float hwAt(float y) {
  if (y <= 352.0) return 26.0 + (y - APEX_Y) / 234.0 * 172.0;
  float t = (y - 352.0) / 422.0;
  return 198.0 + sin(min(1.0, t * 1.25) * 3.14159265) * 78.0 - t * 150.0;
}

/** The blanket's half-width, sampled from its top to its bottom (lib/geometry's WRAP_PROFILE), four to a vector. */
uniform vec4 uWrap[WRAP_VECS];
uniform vec2 uWrapY;     // its top, its bottom
float wrapSample(int i) { int j = i / 4; return uWrap[j][i - j * 4]; }
float wrapAt(float y) {
  // a smooth curve through the samples (Catmull–Rom), so the outline has no corners
  float last = float(WRAP_VECS * 4 - 1);
  float at = clamp((y - uWrapY.x) / (uWrapY.y - uWrapY.x), 0.0, 1.0) * last;
  int i = int(floor(at));
  float u = at - float(i);
  int top = WRAP_VECS * 4 - 1;
  float p0 = wrapSample(max(i - 1, 0));
  float p1 = wrapSample(i);
  float p2 = wrapSample(min(i + 1, top));
  float p3 = wrapSample(min(i + 2, top));
  return 0.5 * (2.0 * p1 + (-p0 + p2) * u + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * u * u + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * u * u * u);
}

/** The core fades in under the apex rather than running into the goal. */
float apexFade(float y) { return smoothstep(APEX_Y - 6.0, APEX_Y + 110.0, y); }

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm3(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; } return v / 0.875; }
float fbm4(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; } return v / 0.9375; }
`;

/** The whole canvas; `vD` is the viewBox point under each pixel. */
export const SCREEN_VERT = /* glsl */ `
${COMMON}
varying vec2 vD;
void main() {
  vD = vec2(uRegion.x + (position.x * 0.5 + 0.5) * uRegion.z, uRegion.y + (0.5 - position.y * 0.5) * uRegion.w);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Smoke in the column: two depths of slowly churning noise rising through it,
 * held inside its outline, lit by the light falling from the goal down the
 * column — and, only a trace, by every goal round it. Kept thin: the grade's
 * gamma lifts faint light a long way.
 */
export const SMOKE_FRAG = /* glsl */ `
${COMMON}
uniform vec4 uGoalL[GOALS];   // x, y, reach, strength
uniform vec3 uGoalC[GOALS];
varying vec2 vD;
void main() {
  float t = uTime;
  // billows rising slowly, folded over themselves
  vec2 a = vD * 0.0032 + vec2(t * 0.01, t * 0.028);
  vec2 warp = vec2(fbm3(a * 1.9 + vec2(0.0, t * 0.024)), fbm3(a * 1.9 + vec2(5.2, 1.3) - t * 0.018));
  float billows = fbm4(a + warp * 1.35);
  // wisps: finer, quicker
  vec2 b = vD * 0.009 + vec2(-t * 0.02, t * 0.05);
  float wisps = fbm4(b + warp * 0.8);
  float dens = pow(smoothstep(0.3, 0.8, billows), 1.35) * (0.5 + 0.85 * wisps);

  // the column holds the smoke: thick inside its outline, gone a little way out
  float hw = hwAt(clamp(vD.y, APEX_Y, TAIL_Y));
  float inside = smoothstep(1.3, 0.55, abs(vD.x - CX) / max(hw, 8.0)) * smoothstep(APEX_Y - 30.0, APEX_Y + 50.0, vD.y) * smoothstep(TAIL_Y + 10.0, TAIL_Y - 70.0, vD.y);

  // the goal's light falling down the column through it
  vec2 c = vD - uGoalL[0].xy;
  float ang = atan(c.x, max(c.y, 1.0));
  float cone = exp(-ang * ang * 2.4) * smoothstep(820.0, 40.0, length(c)) * step(0.0, c.y);
  float rays = 0.7 + 0.3 * noise(vec2(ang * 9.0, t * 0.06)) * (0.55 + 0.45 * noise(vec2(ang * 23.0 + 4.0, -t * 0.045)));
  vec3 col = uCool * (dens * inside * 0.003 + mix(0.45, dens, 0.55) * cone * rays * inside * 0.034);

  // every goal lights the smoke round it
  for (int i = 0; i < GOALS; i++) {
    vec4 L = uGoalL[i];
    if (L.w <= 0.0) continue;
    vec2 d = (vD - L.xy) / L.z;
    float r2 = dot(d, d);
    col += uGoalC[i] * L.w * (dens * exp(-r2 * 0.26) * 0.003 + exp(-r2 * 1.1) * 0.003);
  }
  gl_FragColor = vec4(col * uIntro, 0.0);
}
`;

/** The near half of each lit ring as a band of glow: `position` = ring, angle (0 at its right end, π at its left), side across it. */
export const RING_VERT = /* glsl */ `
${COMMON}
uniform vec4 uRing[MAJORS];  // height, half-width, strength
varying vec3 vR;             // angle, side, ring
void main() {
  float t = position.y;
  vec4 R = uRing[int(position.x + 0.5)];
  float tilt = uTilt * (1.0 - uFlat);
  vec2 p = vec2(CX + cos(t) * R.y, R.x + sin(t) * R.y * tilt);
  vec2 tng = normalize(vec2(-sin(t) * R.y, cos(t) * R.y * tilt) + vec2(1e-4, 0.0));
  vec2 nrm = vec2(-tng.y, tng.x);
  vR = vec3(t, position.z, position.x);
  gl_Position = toClip(p + nrm * position.z * 10.0);
}
`;

export const RING_FRAG = /* glsl */ `
${COMMON}
uniform vec4 uRing[MAJORS];
varying vec3 vR;
void main() {
  vec4 R = uRing[int(vR.z + 0.5)];
  float side = vR.y;
  float core = exp(-side * side * 60.0);
  float skirt = exp(-side * side * 7.0);
  float front = mix(max(0.0, sin(vR.x)), 1.0, uFlat);
  // the glint at its front, where the SVG draws it
  float glint = exp(-pow((vR.x - 1.5708) * 3.0, 2.0));
  vec3 col = uCool * (skirt * 0.02 + core * 0.05 + core * glint * 0.08) * front;
  gl_FragColor = vec4(col * R.z * uIntro, 0.0);
}
`;

/**
 * The blanket: a skin over the column, barely there, as the glass of the
 * map's spheres — clear across its body, a faint light gathering only at its
 * limbs, a little more on the side the key light strikes and nearer the
 * goal, and a trace of shimmer turning with the column. `aAcross` = across it
 * (−1 … 1), down it (0 … 1).
 */
export const WRAP_VERT = /* glsl */ `
${COMMON}
attribute vec2 aAcross;
varying vec2 vA;
varying float vY;
void main() {
  float y = mix(uWrapY.x, uWrapY.y, aAcross.y);
  vA = aAcross;
  vY = y;
  gl_Position = toClip(vec2(CX + aAcross.x * wrapAt(y), y));
}
`;

export const WRAP_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uGlass;    // light the glass catches at its limb, from the page's palette
varying vec2 vA;
varying float vY;
void main() {
  float u = clamp(vA.x, -0.999, 0.999);
  float nz = sqrt(1.0 - u * u);
  // the surface leans with the drop's outline: out where it widens, in where it closes
  float slope = (wrapAt(vY + 4.0) - wrapAt(vY - 4.0)) / 8.0;
  vec3 n = normalize(vec3(u, -slope * nz, nz));
  float down = clamp((vY - APEX_Y) / (TAIL_Y - APEX_Y), 0.0, 1.0);
  float edge = 1.0 - nz;
  // glass: light gathers at the limb (fresnel)
  vec3 col = uCool * 0.6 * pow(edge, 3.2) * 0.34;
  // the key from the upper left: a crescent along the lit limb, a broad sheen across the body
  vec2 L = normalize(vec2(-0.62, -0.78));
  float facing = dot(normalize(vec2(u, n.y - 0.35) + 1e-4), L);
  col += uGlass * smoothstep(0.8, 0.985, abs(u)) * smoothstep(0.2, 0.95, facing) * 0.32 * (1.0 - 0.6 * down);
  float sheen = exp(-pow(u + 0.42, 2.0) / 0.05) * exp(-pow(down - 0.32, 2.0) / 0.05);
  col += uGlass * 0.6 * sheen * 0.05;
  // a window's glint: a tall soft bar down the lit side near the shoulder, and a bright point at its head
  col += vec3(1.0) * exp(-pow(u + 0.66, 2.0) / 0.0016 - pow(down - 0.34, 2.0) / 0.0035) * 0.32;
  col += vec3(1.0) * exp(-pow(u + 0.62, 2.0) / 0.0007 - pow(down - 0.28, 2.0) / 0.0012) * 0.35;
  // the bounce on the far limb
  col += uCool * 0.75 * smoothstep(0.82, 0.99, abs(u)) * smoothstep(0.3, 0.95, -facing) * 0.13;
  // the limb itself, a hairline of light just inside the edge, brighter towards the goal
  float au = abs(u);
  col += uGlass * smoothstep(0.93, 0.975, au) * (1.0 - smoothstep(0.975, 0.999, au)) * (0.22 + 0.25 * exp(-down * 2.2));
  // liquid: slow currents of light moving through the glass, turning with the column
  float a = asin(u);
  vec2 m = vec2(a * 1.4 + uYaw * 0.9, vY * 0.009 - uTime * 0.06);
  float flow = fbm3(m + vec2(fbm3(m * 1.6 + vec2(uTime * 0.04, 0.0)), fbm3(m * 1.3 - uTime * 0.03)) * 1.4);
  col += uCool * 0.8 * smoothstep(0.45, 0.9, flow) * 0.05 * (0.35 + 0.65 * nz) * (1.0 - 0.5 * down);
  col += uGlass * smoothstep(0.78, 0.98, flow) * 0.04 * nz * (1.0 - 0.6 * down);
  // and everything fades out at the very edge, so the silhouette is soft rather than cut
  col *= 1.0 - smoothstep(0.985, 0.999, au);
  // the blanket is barely there: the glass reads, it does not cover the column
  col *= 0.14;
  gl_FragColor = vec4(col * uIntro, 0.0);
}
`;

/** A soft disc per claim: `position` = its corner (±1); its place, size, side and emphasis are its own attributes. */
export const CLAIM_VERT = /* glsl */ `
${COMMON}
attribute vec4 aClaim;   // x, y, half-diagonal, kind
attribute vec4 aClaimB;  // alpha, fresh, depth, slot
varying vec2 vQ;
varying vec4 vC;
varying vec4 vB;
void main() {
  vQ = position.xy;
  vC = aClaim;
  vB = aClaimB;
  float reach = aClaim.z * (aClaim.w < 0.5 ? 5.0 : 4.0);
  gl_Position = aClaim.z > 0.0 && aClaimB.x > 0.0 ? toClip(aClaim.xy + vQ * reach) : vec4(2.0, 2.0, 0.0, 1.0);
}
`;

export const CLAIM_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uAgainst;
uniform vec3 uDisputed;
uniform vec3 uFor;
varying vec2 vQ;
varying vec4 vC;
varying vec4 vB;
void main() {
  float r2 = dot(vQ, vQ);
  float kind = vC.w;
  // against the goal: a hot core and a wide burn; disputed: a softer one; for it: a breath, more while it is fresh
  vec3 tone = kind < 0.5 ? uAgainst : kind < 1.5 ? uDisputed : uFor;
  float strength = kind < 0.5 ? 1.35 : kind < 1.5 ? 0.85 : kind < 2.5 ? 0.24 + 0.4 * vB.y : 0.08;
  float beat = kind < 0.5 ? 0.85 + 0.15 * sin(uTime * 1.6 + vB.w * 1.7) : 1.0;
  // a hot core, a halo round the diamond, and a faint wide burn
  vec3 col = tone * (exp(-r2 * 30.0) * 0.7 + exp(-r2 * 11.0) * 0.12 + exp(-r2 * 5.0) * 0.04) * strength * beat * smoothstep(1.0, 0.75, sqrt(r2));
  col *= 0.45 + 0.55 * (vB.z * 0.5 + 0.5);
  gl_FragColor = vec4(col * vB.x * uIntro, 0.0);
}
`;

/** The sources behind the goal's claims, rising up the axis into the goal, each at its own pace from its own phase. */
export const PARTICLE_VERT = /* glsl */ `
${COMMON}
attribute vec2 aJit;
attribute float aSize;
attribute float aDur;
attribute float aPhase;
attribute vec3 aColor;
varying vec4 vCol;
void main() {
  float ph = fract((uTime + aPhase) / aDur);
  vec2 p = vec2(CX, mix(766.0, 124.0, ph)) + aJit;
  float env = smoothstep(0.0, 0.12, ph) * (1.0 - smoothstep(0.86, 1.0, ph)) * 0.95 * apexFade(p.y);
  gl_PointSize = max(1.5, aSize * 2.6 * uPx);
  gl_Position = toClip(p);
  vCol = vec4(aColor, env * uIntro);
}
`;

export const POINT_FRAG = /* glsl */ `
varying vec4 vCol;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(q, q) * 3.4);
  gl_FragColor = vec4(vCol.rgb * vCol.a * a * 2.2, 0.0);
}
`;

/** The dust standing in each ring's disc: the evidence records that came in during its two hours, twinkling faintly. */
export const DUST_VERT = /* glsl */ `
${COMMON}
uniform vec4 uRingAll[RINGS];  // height, half-width, major, shown
uniform vec3 uDust;
attribute float aRing;
attribute vec2 aU;
attribute float aSize;
attribute float aOp;
attribute float aSeed;
varying vec4 vCol;
void main() {
  vec4 R = uRingAll[int(aRing + 0.5)];
  float tilt = uTilt * (1.0 - uFlat);
  vec2 p = vec2(CX + aU.x * R.y, R.x + aU.y * R.y * tilt);
  float twinkle = 0.75 + 0.25 * sin(uTime * 1.3 + aSeed * 40.0);
  gl_PointSize = max(1.2, aSize * 2.4 * uPx);
  gl_Position = toClip(p);
  vCol = vec4(uDust, aOp * (R.z > 0.5 ? 0.85 : 0.5) * twinkle * R.w * uIntro);
}
`;

/** The goals' light: round each a pool of its own colour and a brighter limb; `position` = goal slot, corner. */
export const GOAL_VERT = /* glsl */ `
${COMMON}
uniform vec4 uGoal[GOALS];   // x, y, radius, strength
varying vec2 vQ;
varying float vSlot;
void main() {
  int i = int(position.x + 0.5);
  vec4 G = uGoal[i];
  vSlot = position.x;
  vQ = position.yz * 3.2;
  gl_Position = G.w > 0.0 ? toClip(G.xy + vQ * G.z) : vec4(2.0, 2.0, 0.0, 1.0);
}
`;

export const GOAL_FRAG = /* glsl */ `
${COMMON}
uniform vec4 uGoal[GOALS];
uniform vec3 uGoalTone[GOALS];
varying vec2 vQ;
varying float vSlot;
void main() {
  int i = int(vSlot + 0.5);
  vec4 G = uGoal[i];
  float r = length(vQ);
  vec3 tone = mix(uCool, uGoalTone[i], 0.45);
  vec3 col = tone * exp(-max(r - 1.0, 0.0) * 1.6) * 0.07 * smoothstep(0.92, 1.05, r);
  col += tone * exp(-pow((r - 1.0) * 22.0, 2.0)) * 0.45;
  col += tone * exp(-r * r * 3.0) * 0.012;
  col *= smoothstep(3.2, 2.2, r);
  gl_FragColor = vec4(col * G.w * uIntro, 0.0);
}
`;

/** The core's light: a soft shaft down the axis from the goal, brightest under it. */
export const CORE_FRAG = /* glsl */ `
${COMMON}
uniform vec4 uGoalL[GOALS];
varying vec2 vD;
void main() {
  float top = uGoalL[0].y;
  float down = clamp((vD.y - top) / (TAIL_Y - top), 0.0, 1.0);
  float dx = vD.x - CX;
  float shaft = exp(-dx * dx / (2.0 * 13.0 * 13.0)) * step(top, vD.y) * step(vD.y, TAIL_Y);
  float flicker = 0.85 + 0.15 * noise(vec2(vD.y * 0.02, uTime * 0.2));
  vec3 col = uCool * shaft * (0.02 * exp(-down * 2.2) + 0.004) * flicker;
  gl_FragColor = vec4(col * uIntro, 0.0);
}
`;
