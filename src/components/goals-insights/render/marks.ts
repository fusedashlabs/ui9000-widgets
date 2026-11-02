import { nothing, svg, type SVGTemplateResult } from 'lit';

import { ringArc, ringTicks } from '../../goals-perimeter/lib/cloud.js';
import { CX, cycleSpan, diamondPath, ringMotes, type Stratum } from '../lib/geometry.js';
import type { Evidence, GoalTone, InsightsGoal } from '../lib/types.js';

/**
 * The column's marks as SVG, in the hand of the Goals & insights design. The
 * colours are the scene's CSS variables: `--ah-ink` and its steps, the page
 * style's light (`--gi-cool`, `--ah-arc-glow`, `--ah-glint`) and the status
 * hues — so the column follows the page's style and its light or dark theme.
 */

/** Evidence → colour: the scene's ink is the normal case; colour is kept for what needs a look. */
export const EVIDENCE_COLOR: Record<Evidence, string> = {
  supporting: 'var(--ah-ink)',
  contradicting: 'var(--ah-blocked)',
  disputed: 'var(--ah-warn)',
  unverified: 'var(--ah-faint)',
};

export const TONE_COLOR: Record<GoalTone, string> = { ok: 'var(--ah-ok)', warn: 'var(--ah-warn)', blocked: 'var(--ah-blocked)' };

/** Light along a lit stroke, as on the goals' rings on Agent operations. */
const LIGHT = 'filter: drop-shadow(0 0 3px var(--ah-arc-glow))';
const GLINT = 'filter: drop-shadow(0 0 4px var(--ah-glint))';

/** `scale(k)` about a point: a label kept at the page's type size however large the column is drawn. */
export const atScreenSize = (at: { x: number; y: number }, k: number) =>
  k === 1 ? nothing : `translate(${at.x.toFixed(2)} ${at.y.toFixed(2)}) scale(${k.toFixed(4)}) translate(${(-at.x).toFixed(2)} ${(-at.y).toFixed(2)})`;

/** The gradients the column's glass and pools of light are filled with. */
export function columnDefs(view: { width: number; height: number }, apexY: number, wrap: { top: number; bottom: number }): SVGTemplateResult {
  return svg`<defs>
    <linearGradient id="gi-apex-fade" gradientUnits="userSpaceOnUse" x1="0" y1=${apexY - 6} x2="0" y2=${apexY + 110}>
      <stop offset="0" stop-color="white" stop-opacity="0"></stop>
      <stop offset="1" stop-color="white" stop-opacity="1"></stop>
    </linearGradient>
    <mask id="gi-apex-mask" maskUnits="userSpaceOnUse" x="0" y="0" width=${view.width} height=${view.height}>
      <rect width=${view.width} height=${view.height} fill="url(#gi-apex-fade)"></rect>
    </mask>
    <linearGradient id="gi-wrap-glass" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" class="gi-stop-cool" stop-opacity="0.05"></stop>
      <stop offset="0.12" class="gi-stop-cool" stop-opacity="0"></stop>
      <stop offset="0.88" class="gi-stop-cool" stop-opacity="0"></stop>
      <stop offset="1" class="gi-stop-cool" stop-opacity="0.05"></stop>
    </linearGradient>
    <linearGradient id="gi-wrap-rim" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1=${wrap.top} y2=${wrap.bottom}>
      <stop offset="0" class="gi-stop-cool" stop-opacity="0.16"></stop>
      <stop offset="0.4" class="gi-stop-cool" stop-opacity="0.08"></stop>
      <stop offset="1" class="gi-stop-cool" stop-opacity="0.03"></stop>
    </linearGradient>
    <radialGradient id="gi-goal-glass" fx="0.44" fy="0.58">
      <stop offset="0.58" class="gi-stop-glass" stop-opacity="0"></stop>
      <stop offset="0.9" class="gi-stop-glass" stop-opacity="0.03"></stop>
      <stop offset="1" class="gi-stop-glass" stop-opacity="0.085"></stop>
    </radialGradient>
    <radialGradient id="gi-goal-sheen" cx="0.36" cy="0.3" r="0.55">
      <stop offset="0" class="gi-stop-glass" stop-opacity="0.2"></stop>
      <stop offset="1" class="gi-stop-glass" stop-opacity="0"></stop>
    </radialGradient>
    <radialGradient id="gi-goal-pool">
      <stop offset="0.15" class="gi-stop-cool" stop-opacity="0.1"></stop>
      <stop offset="1" class="gi-stop-cool" stop-opacity="0"></stop>
    </radialGradient>
  </defs>`;
}

/**
 * One stratum, in the hand of the map on Agent operations: a hairline disc,
 * its far half fainter than its near one, with a little dust standing in it.
 * Every fourth — eight hours — is lit: a bright near edge with the scene's
 * light along it, a glint at its front and a scale of ticks inside it. The
 * oldest step back. `dust` is the motes the SVG draws (none where the light
 * layer draws them).
 */
export function ring(s: Stratum, tilt: number, flat: boolean, opacity: number, dust: number): SVGTemplateResult {
  const back = s.old ? 0.45 : 1;
  const major = s.labelled;
  const tip = `ring:${s.cycle}`;
  if (flat) {
    const x1 = (CX - s.rx).toFixed(1);
    const x2 = (CX + s.rx).toFixed(1);
    const y = s.y.toFixed(1);
    return svg`<g class=${major ? '' : 'gi-minor'}>
      <line x1=${x1} x2=${x2} y1=${y} y2=${y} stroke="var(--ah-ink)" stroke-width=${major ? 1.1 : 0.6}
        opacity=${(opacity / s.opacity) * (major ? 0.7 : 0.1 + 0.3 * s.opacity) * back} style=${major ? LIGHT : ''}></line>
      <line x1=${x1} x2=${x2} y1=${y} y2=${y} class="gi-ring-hit" data-tip=${tip}></line>
    </g>`;
  }
  const ry = s.rx * tilt;
  // an arc of the ring, `e` units out from it: its near half, or its far one
  const arc = (e: number, near: boolean) =>
    `M ${(CX - s.rx - e).toFixed(1)} ${s.y.toFixed(1)} A ${(s.rx + e).toFixed(1)} ${(ry + e * tilt).toFixed(1)} 0 0 ${near ? 0 : 1} ${(CX + s.rx + e).toFixed(1)} ${s.y.toFixed(1)}`;
  return svg`<g opacity=${opacity / s.opacity} fill="none" class=${major ? 'gi-ring' : 'gi-ring gi-minor'}>
    <ellipse cx=${CX} cy=${s.y} rx=${s.rx} ry=${ry} fill="var(--gi-cool)" opacity=${(major ? 0.03 : 0.012) * back}></ellipse>
    <g class="gi-trace">
      <path d=${arc(0, false)} stroke="var(--ah-ink)" stroke-width=${major ? 0.75 : 0.5} opacity=${(major ? 0.24 : 0.05 + 0.12 * s.opacity) * back}></path>
      ${major ? nothing : svg`<path d=${arc(0, true)} stroke="var(--ah-ink)" stroke-width="0.75" opacity=${(0.1 + 0.3 * s.opacity) * back}></path>`}
    </g>
    ${
      major
        ? svg`<path d=${arc(0, true)} stroke="var(--gi-cool)" stroke-width="6" opacity=${0.06 * back}></path>
          <path d=${arc(0, true)} stroke="var(--ah-ink)" stroke-width="1.1" opacity=${0.8 * back} stroke-linecap="round" style=${LIGHT}></path>
          <path d=${arc(5, true)} stroke="var(--ah-glint-stroke)" stroke-width="1.25" opacity=${0.9 * back} pathLength="100"
            stroke-dasharray="26 74" stroke-dashoffset="-52" stroke-linecap="round" style=${GLINT}></path>
          <path d=${arc(-5, true)} stroke="var(--ah-ink)" stroke-width="2.2" opacity=${0.3 * back} stroke-dasharray="0.6 6"></path>`
        : nothing
    }
    ${ringMotes(s.cycle, dust).map(
      (m) =>
        svg`<circle cx=${(CX + m.ux * s.rx).toFixed(1)} cy=${(s.y + m.uy * ry).toFixed(1)} r=${m.r.toFixed(2)} fill="var(--ah-ink)"
          opacity=${(m.opacity * (major ? 0.85 : 0.5) * back).toFixed(2)}></circle>`,
    )}
    <ellipse cx=${CX} cy=${s.y} rx=${s.rx} ry=${ry} class="gi-ring-hit" data-tip=${tip}></ellipse>
  </g>`;
}

/** "now", "−8h" … beside every fourth ring. */
export function timeLabel(s: Stratum, k: number): SVGTemplateResult {
  const x = CX + s.rx;
  const now = s.cycle === 0;
  return svg`<g data-tip=${`time:${s.cycle}`} transform=${atScreenSize({ x: x + 5, y: s.y }, k)} class="gi-time">
    <rect x=${(x + 2).toFixed(1)} y=${(s.y - 9).toFixed(1)} width="52" height="18" fill="transparent"></rect>
    <line x1=${(x + 5).toFixed(1)} y1=${s.y.toFixed(1)} x2=${(x + 14).toFixed(1)} y2=${s.y.toFixed(1)} stroke="var(--ah-ink)" stroke-opacity=${now ? 0.6 : 0.3}></line>
    <text x=${(x + 18).toFixed(1)} y=${(s.y + 3.5).toFixed(1)} class=${now ? 'gi-cap gi-halo is-ink' : 'gi-cap gi-halo'}>${now ? 'Now' : `−${cycleSpan(s.cycle)[0]}h`}</text>
  </g>`;
}

/**
 * A claim, round the origin, as the map draws a resource group: a diamond on
 * the scene in the colour of how it reads against its goal, and how full it
 * is says what holds — empty when it backs the goal, a dot when it is
 * disputed, a solid diamond inside when it argues against it. Zoomed in, the
 * kind of asset it is about stands beside it.
 */
export function claimDiamond(evidence: Evidence, d: number, kind?: string): SVGTemplateResult {
  const color = EVIDENCE_COLOR[evidence];
  return svg`<circle r=${d + 4} fill="transparent"></circle>
    <path d=${diamondPath(d)} fill="var(--ah-scene)" stroke=${color} stroke-width="1.1" stroke-linejoin="miter"></path>
    ${evidence === 'disputed' ? svg`<circle r="1.4" fill=${color}></circle>` : nothing}
    ${evidence === 'contradicting' ? svg`<path d=${diamondPath(d * 0.5)} fill=${color}></path>` : nothing}
    ${kind ? svg`<text data-kind="" data-kind-w=${Math.ceil(kind.length * 6.2)} data-kind-d=${d} x=${d + 6} y="3.5" class="ah-mini gi-kind gi-halo">${kind}</text>` : nothing}`;
}

/** Corner brackets round a mark of half-size `h`, as the map frames what is under the pointer. */
export function brackets(h: number, arm = 4): string {
  return [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]
    .map(([sx, sy]) => `M${sx! * h} ${sy! * (h - arm)}L${sx! * h} ${sy! * h}L${sx! * (h - arm)} ${sy! * h}`)
    .join('');
}

interface DialSpec {
  r: number;
  progress: number | null;
  gap: number;
  scale: number;
  ticks: [minor: number, major: number, step: number];
}

/** The glass under a goal's agents: the pool of light, the glass round the sphere and the dark it stands on. Drawn under the cloud. */
export function goalBase({ r, gap }: DialSpec, pool: number, poolOpacity = 1): SVGTemplateResult {
  return svg`<circle r=${pool} fill="url(#gi-goal-pool)" opacity=${poolOpacity} pointer-events="none"></circle>
    <circle r=${r + gap} fill="url(#gi-goal-glass)"></circle>
    <circle r=${r} fill="var(--ah-scene)" fill-opacity="0.55"></circle>`;
}

/**
 * A goal's glass over its agents and its dial, as the map draws them: a
 * sheen, a crescent of light along the lit limb, a window's glint; a scale
 * lit as far as its confidence and dim beyond, the ring with the scene's
 * light along its lit part and a glint running along it now and then, and a
 * needle where the confidence has got to. Drawn over the cloud.
 */
export function goalDial({ r, progress, gap, scale, ticks }: DialSpec): SVGTemplateResult {
  const ring = r + gap;
  const at = r + scale;
  const [minor, major, step] = ticks;
  const lit = progress ?? 0;
  const end = -Math.PI / 2 + lit * Math.PI * 2;
  const limb = (a: number) => `${(Math.cos(Math.PI * a) * (r - 1)).toFixed(2)} ${(Math.sin(Math.PI * a) * (r - 1)).toFixed(2)}`;
  return svg`<g pointer-events="none">
      <circle r=${r} fill="url(#gi-goal-sheen)"></circle>
      <path d=${`M${limb(0.95)}A${r - 1} ${r - 1} 0 0 1 ${limb(1.45)}`} fill="none" stroke="var(--ah-glint-stroke)" stroke-width=${Math.max(0.8, r * 0.09)}
        stroke-linecap="round" opacity="0.75" style=${GLINT}></path>
      <ellipse cx=${-r * 0.38} cy=${-r * 0.46} rx=${r * 0.2} ry=${r * 0.06} transform=${`rotate(-38 ${(-r * 0.38).toFixed(2)} ${(-r * 0.46).toFixed(2)})`}
        fill="var(--ah-glint-stroke)" opacity="0.85"></ellipse>
      <circle r=${r} fill="none" stroke="var(--gi-cool)" stroke-width="0.6" opacity="0.55"></circle>
    </g>
    <path d=${ringTicks(0, 0, at, minor, major, step, 0, lit)} fill="none" stroke="var(--ah-ink)" stroke-width="0.75" opacity="0.5"></path>
    <path d=${ringTicks(0, 0, at, minor, major, step, lit + 1e-4, 1)} fill="none" stroke="var(--ah-ink)" stroke-width="0.75" opacity="0.18"></path>
    <path d=${ringArc(0, 0, ring, lit, 1)} fill="none" stroke="var(--ah-ink)" stroke-width="0.75" opacity="0.18"></path>
    ${
      progress !== null && progress > 0
        ? svg`<path d=${ringArc(0, 0, ring, 0, lit)} fill="none" stroke="var(--ah-ink)" stroke-width="1.25" opacity="0.85" style=${LIGHT}></path>
          <path d=${ringArc(0, 0, ring, 0, lit)} fill="none" stroke="var(--ah-glint-stroke)" stroke-width="1.75" stroke-linecap="round" pathLength="1"
            stroke-dasharray="0.05 1" stroke-dashoffset="0.06" class="ah-glint"></path>`
        : nothing
    }
    ${
      progress !== null
        ? svg`<path d=${`M${(Math.cos(end) * (ring - 3)).toFixed(1)} ${(Math.sin(end) * (ring - 3)).toFixed(1)}L${(Math.cos(end) * (ring + major + 4)).toFixed(1)} ${(Math.sin(end) * (ring + major + 4)).toFixed(1)}`}
            stroke="var(--ah-ink)" stroke-width="1.25"></path>`
        : nothing
    }`;
}

/** The main goal's dial: the column's hero, large enough to hold its own over the column it heads. */
export const MAIN_DIAL: DialSpec = { r: 26, progress: null, gap: 9, scale: 14, ticks: [3, 6, 0.025] };
/** A connected goal's dial, small. */
export const ASIDE_DIAL: DialSpec = { r: 8, progress: null, gap: 4.5, scale: 7.5, ticks: [1.8, 3.5, 0.05] };

/** The goal's code and its status, as the callout's first line: `G-014 ● On track`. */
function headLine(goal: InsightsGoal, lead: string, x: number, y: number, end: boolean, lit = false): SVGTemplateResult {
  return svg`<text x=${x} y=${y} text-anchor=${end ? 'end' : 'start'} class="gi-cap gi-halo">
    <tspan class=${lit ? 'is-ink-2' : 'is-faint'}>${lead}</tspan>${
      goal.status
        ? svg`<tspan dx="6" fill=${TONE_COLOR[goal.status.tone]}>●</tspan><tspan dx="4" class="is-mute">${goal.status.label}</tspan>`
        : nothing
    }
  </text>`;
}

/**
 * The goal at the apex, round its centre: and to its right a label in the
 * map's callout hand — a leader off the ring into the label's spine, its
 * code and status, its name. The dial and the glass are drawn apart, round
 * its agents.
 */
export function mainGoalLabel(goal: InsightsGoal, k: number): SVGTemplateResult {
  const r = MAIN_DIAL.r;
  const lead = { x: Math.cos(-0.55) * (r + 18), y: Math.sin(-0.55) * (r + 18) };
  const spine = 70;
  return svg`<g transform=${atScreenSize(lead, k)} class="gi-callout">
    <path d=${`M${lead.x.toFixed(1)} ${lead.y.toFixed(1)}L${spine - 14} -22L${spine} -22`} fill="none" stroke="var(--ah-ink)" stroke-width="0.75" opacity="0.42"></path>
    <rect x=${lead.x - 1.5} y=${lead.y - 1.5} width="3" height="3" fill="var(--ah-ink)" opacity="0.9"></rect>
    <line x1=${spine} y1="-31" x2=${spine} y2="5" stroke="var(--ah-ink)" stroke-width="0.75" opacity="0.2"></line>
    <rect x=${spine - 1} y="-29" width="2" height="10" fill="var(--ah-ink)" opacity="0.95"></rect>
    ${headLine(goal, goal.code, spine + 7, -20, false)}
    <text x=${spine + 7} y="0" class="gi-name gi-halo">${goal.name}</text>
  </g>`;
}

/** How much of a connected goal's label the room beside it allows. */
export type LabelFit = 'full' | 'compact' | 'none';

/**
 * A goal that shares evidence with the main one, round its centre: under its
 * dial a label in the map's callout hand — a leader off the ring down into
 * the label's spine, then what it is, its code and status, its name and a
 * readout: priority, confidence, the claims filed under it. On the left of
 * the column it hangs down to the left, mirrored, so it stays off the column.
 * Under the pointer, corner brackets frame the goal.
 */
export function connectedGoalLabel(goal: InsightsGoal, side: -1 | 1, hovered: boolean, fit: LabelFit, k: number): SVGTemplateResult {
  const spine = side * 16;
  const top = 30;
  const lead = { x: side * Math.cos(1.05) * 17, y: Math.sin(1.05) * 17 };
  const text = spine + side * 7;
  const end = side < 0;
  // the readout's columns, outwards from the spine — mirrored on the left, so they read in the same order
  const cols = end ? [text - 140, text - 62, text] : [text, text + 62, text + 140];
  const reading = (x: number, caption: string, value: string) =>
    svg`<text x=${x} y=${top + 52} text-anchor=${end ? 'end' : 'start'} class="gi-cap gi-halo is-faint">${caption}</text>
      <text x=${x} y=${top + 68} text-anchor=${end ? 'end' : 'start'} class="gi-value gi-halo">${value}</text>`;
  return svg`<path d=${brackets(24, 5)} fill="none" stroke="var(--ah-ink)" stroke-width="0.75" opacity=${hovered ? 0.75 : 0} class="ah-fade"></path>
    ${
      fit === 'none'
        ? nothing
        : svg`<g transform=${atScreenSize(lead, k)} class="gi-callout">
          <path d=${`M${lead.x.toFixed(1)} ${lead.y.toFixed(1)}L${spine} ${top}`} fill="none" stroke="var(--ah-ink)" stroke-width="0.75" opacity=${hovered ? 0.85 : 0.42}></path>
          <rect x=${lead.x - 1.5} y=${lead.y - 1.5} width="3" height="3" fill="var(--ah-ink)" opacity="0.9"></rect>
          <line x1=${spine} y1=${top} x2=${spine} y2=${top + (fit === 'full' ? 70 : 36)} stroke="var(--ah-ink)" stroke-width="0.75" opacity="0.2"></line>
          <rect x=${spine - 1} y=${top + 2} width="2" height="10" fill="var(--ah-ink)" opacity="0.95"></rect>
          ${headLine(goal, `Connected · ${goal.code}`, text, top + 10, end, hovered)}
          <text x=${text} y=${top + 29} text-anchor=${end ? 'end' : 'start'} class="gi-name gi-halo">${goal.name}</text>
          ${
            fit === 'full'
              ? svg`${reading(cols[0]!, 'Priority', goal.priority ?? '—')}
                ${reading(cols[1]!, 'Confidence', goal.confidence === null ? '—' : `${Math.round(goal.confidence * 100)}%`)}
                ${reading(cols[2]!, 'Claims', String(goal.claims))}`
              : nothing
          }
        </g>`
    }`;
}
