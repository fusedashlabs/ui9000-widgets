import { svg, type SVGTemplateResult } from 'lit';

import {
  arcPath,
  arenaPoint,
  linePath,
  patchPath,
  PIVOT_X,
  PIVOT_Y,
  type AssetHealthGoal,
  type FlowState,
  type Project,
} from '../../asset-health-overview/lib/index.js';
import { fixed, TONE, TROUBLE_TONE, troubleMark, type Tone } from '../../asset-health-overview/render/marks.js';
import { ringArc, ringTicks, tickStep } from '../../goals-perimeter/lib/index.js';
import { BURST, formatSeconds, GUIDES, timeRadius, type BurstSector, type Spike } from '../lib/index.js';

const TAU = Math.PI * 2;
const f1 = (n: number) => n.toFixed(1);

const FLOW_TONE: Record<FlowState, Tone> = { flowing: 'neutral', throttled: 'warn', awaiting: 'awaiting', blocked: 'blocked', failed: 'failed' };

/**
 * The core's instrument: the goal's progress ring round its cloud of agents —
 * the scale lit up to progress, and the needle. The cloud itself, the glass
 * and every agent in it, is the painter's. Without a progress the ring stays
 * unlit.
 */
export function coreRing(goal: AssetHealthGoal, P: Project, u: number, enter: number): SVGTemplateResult {
  const c = P(PIVOT_X, PIVOT_Y, 0);
  const r = BURST.core * c.k;
  const ring = r + 7 * u;
  const scale = r + 10.5 * u;
  const step = tickStep((TAU * scale) / u);
  const lit = goal.progress !== null;
  const progress = goal.progress ?? 0;
  const end = -Math.PI / 2 + progress * TAU;
  const at = (radius: number) => `${f1(c.x + Math.cos(end) * radius)} ${f1(c.y + Math.sin(end) * radius)}`;
  return svg`<g fill="none" class="ah-appear" style=${`animation-delay:${enter}ms`}>
    <circle cx=${f1(c.x)} cy=${f1(c.y)} r=${f1(r + 16 * u)} fill="transparent" class="gb-core" data-tip="goal"></circle>
    <g pointer-events="none">
      ${lit ? svg`<path d=${ringTicks(c.x, c.y, scale, 2.5 * u, 5 * u, step, 0, progress)} stroke="var(--ah-ink)" stroke-width=${u} opacity="0.55"></path>` : null}
      <path d=${ringTicks(c.x, c.y, scale, 2.5 * u, 5 * u, step, lit ? progress + 1e-4 : 0, 1)} stroke="var(--ah-ink)" stroke-width=${u} opacity="0.2"></path>
      <path d=${ringArc(c.x, c.y, ring, progress, 1)} stroke="var(--ah-ink)" stroke-width=${u} opacity="0.2"></path>
      ${
        lit
          ? svg`<path d=${ringArc(c.x, c.y, ring, 0, progress)} stroke="var(--ah-ink)" stroke-width=${1.5 * u} opacity="0.9" pathLength="1" stroke-dasharray="1"
                class="ah-draw ah-arc" style=${`animation-delay:${enter + 150}ms`}></path>
              <path d=${`M${at(ring - 3 * u)}L${at(ring + 10 * u)}`} stroke="var(--ah-ink)" stroke-width=${1.5 * u}></path>`
          : null
      }
    </g>
  </g>`;
}

/**
 * The time scale on the floor: a ring at each mark, dotted, its figure
 * standing in the aisle that faces the viewer — so a spike is read against
 * the rings as a call against the clock.
 */
export function timeScale(P: Project, u: number, aisle: number, enter: number): SVGTemplateResult {
  return svg`<g fill="none" class="ah-appear gb-scale" style=${`animation-delay:${enter}ms`} pointer-events="none">
    ${GUIDES.map(
      (t, i) =>
        svg`<path d=${arcPath(P, timeRadius(t), 0, TAU)} stroke="var(--ah-ink)" stroke-width=${u} stroke-dasharray=${`${u} ${3.5 * u}`} opacity=${i === GUIDES.length - 1 ? 0.3 : 0.18}></path>`,
    )}
    ${GUIDES.map((t) => {
      const at = P(...arenaPoint(timeRadius(t), aisle));
      return fixed(at.x, at.y, u, svg`<text y="3.5" text-anchor="middle" class="ah-mini ah-mute ah-halo gb-guide">${formatSeconds(t)}</text>`);
    })}
  </g>`;
}

/** Brightness buckets of the calls that get through: each spike its own, from its seed. */
const FLOW_ALPHA = [0.15, 0.24, 0.36];

export interface SpikesOptions {
  sector: BurstSector;
  P: Project;
  u: number;
  /** How strongly it shows, 0–1. */
  alpha: number;
  lit: boolean;
  /** The trouble under the pointer: its fan lights up, the others step back. */
  pointed: string | null;
  /** Problems only: what gets through all but goes out. */
  quiet: boolean;
  enter: number;
}

/**
 * A sector's calls, as spikes out of the cloud: those answered end where the
 * time scale says they were, with a speck; the throttled ones in amber; and
 * those held up run out to their asset in the colour of what holds them.
 * Drawn as a few paths, one per kind and brightness. The 95th percentile of
 * the answers is an arc across the sector.
 */
export function sectorSpikes({ sector, P, u, alpha, lit, pointed, quiet, enter }: SpikesOptions): SVGTemplateResult {
  const line = (s: Spike) => linePath(P, s.from, s.to);
  const speck = (s: Spike) => {
    const q = P(...s.to);
    return `M${f1(q.x)} ${f1(q.y)}h0.01`;
  };
  const flowing = ['', '', ''];
  let specks = '';
  let slow = '';
  let slowSpecks = '';
  const held = new Map<string, { state: FlowState; trouble?: string; d: string }>();
  for (const s of sector.spikes) {
    if (s.state === 'throttled') {
      slow += line(s);
      slowSpecks += speck(s);
    } else if (s.seconds != null) {
      flowing[Math.min(2, Math.floor(s.seed * 3))] += line(s);
      specks += speck(s);
    } else {
      const key = `${s.state}:${s.trouble ?? ''}`;
      const bucket = held.get(key) ?? { state: s.state, trouble: s.trouble, d: '' };
      bucket.d += line(s);
      held.set(key, bucket);
    }
  }
  const lift = lit ? 1.45 : 1;
  const through = quiet ? 0.22 : 1;
  const pad = Math.min(0.04, (sector.a1 - sector.a0) * 0.08);
  const p95 = sector.p95 != null && timeRadius(sector.p95) < BURST.over ? timeRadius(sector.p95) : null;

  return svg`<g class="ah-fade gb-spikes" data-sector=${sector.group.section.id} style=${`opacity:${alpha}`} fill="none" pointer-events="none">
    <g class="ah-appear" style=${`animation-delay:${enter}ms`}>
      ${flowing.map(
        (d, i) =>
          svg`<path d=${d} stroke="var(--ah-ink)" stroke-width=${0.7 * u} class="ah-fade" style=${`opacity:${Math.min(0.62, FLOW_ALPHA[i]! * lift) * through}`}></path>`,
      )}
      <path d=${specks} stroke="var(--ah-ink)" stroke-width=${1.9 * u} stroke-linecap="round" class="ah-fade" style=${`opacity:${(lit ? 0.85 : 0.6) * through}`}></path>
      ${
        slow
          ? svg`<path d=${slow} stroke="var(--ah-warn)" stroke-width=${0.8 * u} opacity=${0.55 * Math.min(1.3, lift)} class="gb-spike-slowed"></path>
              <path d=${slowSpecks} stroke="var(--ah-warn)" stroke-width=${2.2 * u} stroke-linecap="round" opacity="0.9"></path>`
          : null
      }
      ${[...held.values()].map((bucket) => {
        const color = TONE[FLOW_TONE[bucket.state]];
        const on = pointed != null && pointed === bucket.trouble;
        const off = pointed != null && !on;
        return svg`<path d=${bucket.d} stroke=${color} stroke-width=${(on ? 1.25 : 0.95) * u} class="ah-fade gb-spike-held" data-state=${bucket.state}
          style=${`opacity:${on ? 1 : off ? 0.25 : 0.72}${on ? `;filter:drop-shadow(0 0 3px ${color})` : ''}`}></path>`;
      })}
      ${
        // nineteen of every twenty calls answered end inside this arc: a measure across the sector, a stop at either end
        p95 != null
          ? svg`<path class="ah-fade gb-p95"
              d=${
                arcPath(P, p95, sector.a0 + pad, sector.a1 - pad) +
                linePath(P, arenaPoint(p95 - 3.5 * u, sector.a0 + pad), arenaPoint(p95 + 3.5 * u, sector.a0 + pad)) +
                linePath(P, arenaPoint(p95 - 3.5 * u, sector.a1 - pad), arenaPoint(p95 + 3.5 * u, sector.a1 - pad))
              }
              stroke="var(--ah-ink)" stroke-width=${1.25 * u} style=${`opacity:${lit ? 0.9 : 0.5}`}></path>`
          : null
      }
    </g>
  </g>`;
}

export interface BandOptions {
  sector: BurstSector;
  P: Project;
  u: number;
  alpha: number;
  lit: boolean;
  picked: boolean;
  pointed: string | null;
  enter: number;
}

/**
 * A group's band: an arc round its sector with a tick for every asset the
 * goal works with there — a longer one for those known by name — and, on
 * the band, a ringed mark for each asset in trouble, where its calls fan in.
 * The band answers the pointer for the whole sector.
 */
export function assetBand({ sector, P, u, alpha, lit, picked, pointed, enter }: BandOptions): SVGTemplateResult {
  const s = sector.group.section;
  const { a0, a1 } = sector;
  const named = new Set(s.named.map((a) => a.tick));
  const n = s.assets;
  const span = a1 - a0;
  const pad = Math.min(0.03, span * 0.06);
  let ticks = '';
  let names = '';
  for (let k = 0; k < n; k++) {
    const angle = a0 + pad + ((k + 0.5) / n) * (span - 2 * pad);
    const seg = linePath(P, arenaPoint(BURST.band, angle), arenaPoint(BURST.band + (named.has(k) ? BURST.named : BURST.tick) * u, angle));
    if (named.has(k)) names += seg;
    else ticks += seg;
  }
  const on = lit || picked;

  return svg`<g class="ah-fade gb-band" data-band=${s.id} style=${`opacity:${alpha}`} fill="none">
    <path d=${patchPath(P, BURST.band - 12 * u, BURST.band + (BURST.named + 6) * u, a0, a1)} fill="transparent" class="ah-hit" data-section=${s.id} data-tip=${`section:${s.id}`}></path>
    <g class="ah-appear" style=${`animation-delay:${enter}ms`} pointer-events="none">
      <path d=${arcPath(P, BURST.band, a0, a1)} stroke="var(--ah-ink)" stroke-width=${(on ? 1.5 : 1) * u} class="ah-fade" style=${`opacity:${on ? 0.8 : 0.45}`}></path>
      <path d=${ticks} stroke="var(--ah-ink)" stroke-width=${u} class="ah-fade" style=${`opacity:${on ? 0.42 : 0.26}`}></path>
      <path d=${names} stroke="var(--ah-ink)" stroke-width=${u} class="ah-fade" style=${`opacity:${on ? 0.85 : 0.6}`}></path>
      <!-- picked out: a dotted arc outside the band -->
      <path d=${arcPath(P, BURST.band + (BURST.named + 4) * u, a0, a1)} stroke="var(--ah-ink)" stroke-width=${u} stroke-dasharray=${`${2 * u} ${2.5 * u}`}
        class="ah-fade gb-picked" style=${`opacity:${picked ? 0.9 : 0}`}></path>
    </g>
    ${sector.marks.map(({ trouble, angle }, i) => {
      const at = P(...arenaPoint(BURST.band, angle));
      const color = TONE[TROUBLE_TONE[trouble.state]];
      const lit = pointed === trouble.key;
      // where the calls held up on it fan in: a glow in its colour, its ring, its mark
      const body = svg`<circle r="12" fill="transparent"></circle>
        <circle r="10" fill=${color} class="ah-fade" style=${`opacity:${lit ? 0.24 : 0.13}`}></circle>
        <circle r="6.5" fill="var(--ah-scene)" stroke=${color} stroke-width="1.25" style=${`filter:drop-shadow(0 0 3px ${color})`}></circle>
        ${troubleMark(trouble.state)}
        <circle r="10.5" stroke="var(--ah-ink)" stroke-width="1" stroke-dasharray="2 2.5" class="ah-fade" style=${`opacity:${lit ? 0.9 : 0}`}></circle>`;
      return svg`<g class="ah-appear ah-hit gb-trouble" style=${`animation-delay:${enter + 260 + i * 80}ms`} data-section=${s.id} data-trouble=${trouble.key} data-tip=${`trouble:${trouble.key}`}>
        ${fixed(at.x, at.y, u, body)}
      </g>`;
    })}
  </g>`;
}
