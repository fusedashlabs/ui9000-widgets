import { nothing, svg, type SVGTemplateResult } from 'lit';

import {
  arcPath,
  ARENA,
  arenaPoint,
  assetCell,
  DAY_MINUTES,
  LABEL,
  leaderPath,
  linePath,
  patchPath,
  PIVOT_X,
  PIVOT_Y,
  poolPath,
  sheetPath,
  wallAngle,
  type AssetHealthDayBin,
  type AssetHealthGoal,
  type FlowState,
  type PlacedLabel,
  type Project,
  type Sector,
  type TroubleState,
} from '../lib/index.js';

const TAU = Math.PI * 2;

export type Tone = 'neutral' | 'warn' | 'awaiting' | 'blocked' | 'failed';

export const TONE: Record<Tone, string> = {
  neutral: 'var(--ah-ink)',
  warn: 'var(--ah-warn)',
  awaiting: 'var(--ah-awaiting)',
  blocked: 'var(--ah-blocked)',
  failed: 'var(--ah-failed)',
};
export const TROUBLE_TONE: Record<TroubleState, Tone> = { blocked: 'blocked', failed: 'failed', awaiting: 'awaiting', slowed: 'warn' };
const FLOW_TONE: Record<FlowState, Tone> = { flowing: 'neutral', throttled: 'warn', awaiting: 'awaiting', blocked: 'blocked', failed: 'failed' };

const f1 = (n: number) => n.toFixed(1);
const diamond = (x: number, y: number, d: number) => `M${f1(x)} ${f1(y - d)}L${f1(x + d)} ${f1(y)}L${f1(x)} ${f1(y + d)}L${f1(x - d)} ${f1(y)}Z`;

/** SVG drawn in screen px around a point of the design space: inside, 1 unit is 1px on screen whatever the arena's scale. */
export const fixed = (x: number, y: number, u: number, body: unknown, attrs: { opacity?: number; cls?: string } = {}) =>
  svg`<g transform="translate(${f1(x)} ${f1(y)})" class=${attrs.cls ?? nothing} style=${attrs.opacity === undefined ? nothing : `opacity:${attrs.opacity}`}><g transform="scale(${u})">${body}</g></g>`;

/** The mark an asset in trouble carries — the mark of the agents it holds, as in the stands. */
export function troubleMark(state: TroubleState, size = 1): SVGTemplateResult {
  const color = TONE[TROUBLE_TONE[state]];
  if (state === 'failed')
    return svg`<path d=${`M${-2.6 * size} ${-2.6 * size}L${2.6 * size} ${2.6 * size}M${2.6 * size} ${-2.6 * size}L${-2.6 * size} ${2.6 * size}`} stroke=${color} stroke-width="1.4" fill="none"></path>`;
  if (state === 'awaiting') return svg`<circle r=${2.8 * size} fill="var(--ah-scene)" stroke=${color} stroke-width="1.3"></circle>`;
  if (state === 'slowed') return svg`<circle r=${1.8 * size} fill=${color}></circle>`;
  return svg`<circle r=${2.7 * size} fill=${color}></circle>`;
}

/**
 * The hub: the goal's own instrument — the progress ring with its scale lit
 * up to progress, and the needle — lying in the middle of the floor, with
 * the reading inside it. Round it, the bench of the idle.
 */
export function hubMarks(goal: AssetHealthGoal, P: Project, u: number, pitch: number, enter: number): SVGTemplateResult {
  const progress = goal.progress ?? 0;
  // progress runs clockwise from the far side of the floor, as a dial's does from twelve
  const at = (share: number) => Math.PI / 2 - share * TAU;
  const scale = ARENA.hub + 4 * u;
  const ticks = (from: number, to: number) => {
    let d = '';
    for (let i = from; i <= to; i++) d += linePath(P, arenaPoint(scale, at(i / 50)), arenaPoint(scale + (i % 5 === 0 ? 6.5 : 3) * u, at(i / 50)));
    return d;
  };
  const reached = goal.progress === null ? -1 : Math.floor(progress * 50);
  const centre = P(PIVOT_X, PIVOT_Y, 0);
  // how tall the ring stands on screen, tilted: the reading keeps inside it
  const room = Math.abs(P(...arenaPoint(ARENA.hub, Math.PI / 2)).y - P(...arenaPoint(ARENA.hub, -Math.PI / 2)).y) / u;
  const benchRings = Math.ceil(goal.idle / Math.max(1, Math.floor((TAU * ARENA.bench) / pitch)));
  const figure = goal.progress === null ? { value: goal.total.toLocaleString('en-US'), unit: '', caption: 'agents' } : { value: String(Math.round(progress * 100)), unit: '%', caption: 'to target' };

  return svg`<g fill="none" class="ah-appear" style=${`animation-delay:${enter}ms`}>
    <path d=${patchPath(P, 0, ARENA.hub + 10 * u, 0, TAU)} fill="transparent" data-tip="hub"></path>
    <path d=${patchPath(P, 0, ARENA.hub - 1.5 * u, 0, TAU)} fill="url(#ah-hub)" pointer-events="none"></path>
    ${
      goal.idle > 0
        ? svg`<path d=${arcPath(P, ARENA.bench, 0, TAU)} stroke="var(--ah-ink)" stroke-width=${u} stroke-dasharray=${`${u} ${3 * u}`} opacity="0.2" pointer-events="none"></path>
          <path d=${patchPath(P, ARENA.bench - pitch * 0.7, ARENA.bench + (benchRings - 0.3) * pitch, 0, TAU)} fill="transparent" data-tip="bench"></path>`
        : nothing
    }
    <path d=${ticks(0, reached)} stroke="var(--ah-ink)" stroke-width=${u} opacity="0.55"></path>
    <path d=${ticks(reached + 1, 49)} stroke="var(--ah-ink)" stroke-width=${u} opacity="0.2"></path>
    <path d=${arcPath(P, ARENA.hub, at(progress), at(1))} stroke="var(--ah-ink)" stroke-width=${u} opacity="0.2"></path>
    ${
      goal.progress !== null && progress > 0
        ? svg`<path d=${arcPath(P, ARENA.hub, at(0), at(progress))} stroke="var(--ah-ink)" stroke-width=${1.5 * u} opacity="0.9" pathLength="1" stroke-dasharray="1"
              class="ah-draw ah-arc" style=${`animation-delay:${enter + 150}ms`}></path>
          <path d=${arcPath(P, ARENA.hub, at(0), at(progress))} stroke="var(--ah-glint-stroke)" stroke-width=${2 * u} stroke-linecap="round" pathLength="1" stroke-dasharray="0.05 1" stroke-dashoffset="0.06"
              class="ah-glint" style=${`animation-delay:${enter + 2600}ms`} pointer-events="none"></path>
          <path d=${linePath(P, arenaPoint(ARENA.hub - 5 * u, at(progress)), arenaPoint(ARENA.hub + 13 * u, at(progress)))} stroke="var(--ah-ink)" stroke-width=${1.5 * u}></path>`
        : nothing
    }
    ${fixed(
      centre.x,
      centre.y,
      u,
      room >= 44
        ? svg`<text y="3" text-anchor="middle" class="ah-figure">${figure.value}<tspan class="ah-figure-unit">${figure.unit}</tspan></text>
            <text y="17" text-anchor="middle" class="ah-mini ah-faint">${figure.caption}</text>`
        : svg`<text y="5" text-anchor="middle" class="ah-compact-figure">${figure.value}${figure.unit}</text>`,
      { cls: 'ah-quiet' },
    )}
  </g>`;
}

export interface SectorMarkOptions {
  sector: Sector;
  P: Project;
  /** Seen from straight overhead: what stands up is laid outwards. */
  plan: boolean;
  u: number;
  /** How far towards the hub the section's rows reach, and the room a seat takes: a row every so far. */
  depth: number;
  pitch: number;
  /** The section's last 24 hours, oldest first, and the busiest rate on any wall — the height of the tallest bar. */
  day: AssetHealthDayBin[];
  peak: number;
  /** Under the pointer (or its label is). */
  lit: boolean;
  /** Picked out. */
  picked: boolean;
  /** How strongly it shows, 0–1: other sections step back when one is picked or only trouble is shown. */
  alpha: number;
  /** The trouble under the pointer, here or in a label. */
  pointed: string | null;
  enter: number;
}

/**
 * One category's section of the arena, from the floor outwards: the gate —
 * white where the goal's traffic flows, in colour for the share that is
 * slowed, held or turned away — with the category's diamond in it; the cells
 * of its assets, the ones in trouble lit, a beam on each; and the wall of its
 * last 24 hours. The agents seated in front of the gate are the painter's;
 * this draws what they face.
 */
export function sectorMarks(o: SectorMarkOptions): SVGTemplateResult {
  const { sector, P, plan, u, depth, pitch, day, peak, lit, picked, alpha, pointed, enter } = o;
  const { section: s, a0, a1, mid } = sector;
  const id = s.id;
  const on = lit || picked;
  const centre = P(PIVOT_X, PIVOT_Y, 0);
  const stand = ARENA.cells + ARENA.cellRows * ARENA.cell;
  const troubleAt = new Map(s.troubles.map((t) => [t.tick, t]));

  // the gate, piece by piece along the goal's traffic mix
  const pieces: { state: FlowState; d: string }[] = [];
  let from = a0;
  for (const piece of s.mix) {
    const to = Math.min(a1, from + piece.share * (a1 - a0));
    pieces.push({ state: piece.state, d: arcPath(P, ARENA.gate, from, to) });
    from = to;
  }
  const c = P(...arenaPoint(ARENA.gate, mid));
  const d = ARENA.diamond * u;
  const state = s.crew.held ? s.hold : null;
  const color = state ? TONE[state] : s.health === 'degraded' ? TONE.warn : TONE.neutral;

  // the cells: every asset that is well, as one path
  let cells = '';
  for (let k = 0; k < s.assets; k++) {
    if (troubleAt.has(k)) continue;
    const cell = assetCell(sector, k);
    cells += patchPath(P, cell.r0, cell.r1, cell.a0, cell.a1);
  }

  // the wall: a bar a stretch of the day, the nearer half of the arena's drawn fainter so the floor shows through it
  const bars = { far: '', near: '', farAway: '', nearAway: '', mirrored: '' };
  const tone: Tone = state ?? 'warn';
  day.forEach((bin, i) => {
    if (bin.calls <= 0) return;
    const angle = wallAngle(sector, i, day.length);
    const rate = bin.calls / (DAY_MINUTES / day.length);
    const height = Math.max(2 * u, (ARENA.wallHeight * rate) / peak);
    const through = height * (1 - bin.away);
    const side = plan || P(...arenaPoint(ARENA.wall, angle)).z >= centre.z ? 'far' : 'near';
    bars[side] += linePath(P, arenaPoint(ARENA.wall, angle, 0, plan), arenaPoint(ARENA.wall, angle, through, plan));
    if (bin.away > 0.004) bars[`${side}Away`] += linePath(P, arenaPoint(ARENA.wall, angle, through, plan), arenaPoint(ARENA.wall, angle, Math.max(height, through + 1.5 * u), plan));
    // the glass floor gives the bar back, fainter and shorter
    if (!plan) bars.mirrored += linePath(P, arenaPoint(ARENA.wall, angle), arenaPoint(ARENA.wall, angle, -height * 0.7));
  });
  // the rows of the stands, as lines on the floor: one where each row of seats begins
  let tiers = '';
  for (let radius: number = ARENA.stands; radius > depth - 0.5; radius -= pitch) tiers += arcPath(P, radius, a0, a1);
  // the wall's own scale: a mark an hour along its foot, a longer one every six
  let hours = '';
  for (let h = 0; h <= 24; h++) {
    const angle = a1 - (h / 24) * (a1 - a0);
    hours += linePath(P, arenaPoint(ARENA.wall - 2.5 * u, angle), arenaPoint(ARENA.wall - (h % 6 === 0 ? 8 : 5) * u, angle));
  }
  const barWidth = Math.max(1.25, Math.min(2.25, ((a1 - a0) * ARENA.wall) / Math.max(1, day.length) / u / 2.6)) * u;
  // the top edge of the wall's glass: the same arc, at the wall's height
  const steps = Math.max(2, Math.ceil((a1 - a0) / 0.06));
  let sheetTop = '';
  for (let i = 0; i <= steps; i++) {
    const q = P(...arenaPoint(ARENA.wall, a0 + ((a1 - a0) * i) / steps, ARENA.wallHeight));
    sheetTop += `${i ? 'L' : 'M'}${f1(q.x)} ${f1(q.y)}`;
  }

  const troubleCentre = (tick: number) => {
    const cell = assetCell(sector, tick);
    return { cell, radius: (cell.r0 + cell.r1) / 2, angle: (cell.a0 + cell.a1) / 2 };
  };
  const shadow = (tone: string, r: number) => `filter:drop-shadow(0 0 ${r}px ${tone})`;

  return svg`<g fill="none" class="ah-fade" style=${`opacity:${alpha}`}>
    <path d=${patchPath(P, depth, stand, a0, a1)} fill="transparent" class="ah-hit" data-section=${id} data-tip=${`section:${id}`}></path>

    <g class="ah-appear" style=${`animation-delay:${enter}ms`} pointer-events="none">
      <path d=${patchPath(P, depth, ARENA.stands + 3, a0, a1)} fill="var(--ah-well)" class="ah-fade" style=${`opacity:${on ? 1 : 0.7}`}></path>
      <path d=${tiers} stroke="var(--ah-ink)" stroke-width=${u} opacity="0.085"></path>

      ${
        plan
          ? nothing
          : svg`<g clip-path="url(#ah-floor)">
              <path d=${bars.mirrored} stroke="var(--ah-ink)" stroke-width=${barWidth} opacity="0.085"></path>
              ${s.troubles.map((t) => {
                const { radius, angle } = troubleCentre(t.tick);
                return svg`<path d=${linePath(P, arenaPoint(radius, angle), arenaPoint(radius, angle, -ARENA.beam * 0.7))} stroke=${TONE[TROUBLE_TONE[t.state]]} stroke-width=${3.5 * u} stroke-linecap="round" opacity="0.2"></path>`;
              })}
            </g>`
      }
      ${s.troubles.map((t) => {
        const { radius, angle } = troubleCentre(t.tick);
        return svg`<path d=${poolPath(P, radius, angle, 26)} fill=${`url(#ah-pool-${t.state})`}></path>`;
      })}

      <path d=${linePath(P, arenaPoint(depth, a0), arenaPoint(stand, a0)) + linePath(P, arenaPoint(depth, a1), arenaPoint(stand, a1))} stroke="var(--ah-ink)" stroke-width=${u} class="ah-fade" style=${`opacity:${on ? 0.3 : 0.14}`}></path>

      ${pieces.map((piece) => {
        const flows = FLOW_TONE[piece.state] === 'neutral';
        // where no agent is held, whatever does not flow is simply slowed: one colour, the diamond's
        const pieceTone = TONE[s.crew.held ? FLOW_TONE[piece.state] : 'warn'];
        return svg`<path d=${piece.d} stroke=${flows ? TONE.neutral : pieceTone} stroke-width=${(flows ? 1.25 : 2.5) * u}
          class="ah-fade" style=${flows ? `opacity:${on ? 0.95 : 0.7}` : `opacity:1;${shadow(pieceTone, 3)}`}></path>`;
      })}
      ${pieces
        .filter((piece) => FLOW_TONE[piece.state] === 'neutral')
        .slice(0, 1)
        .map(
          (piece) =>
            svg`<path d=${piece.d} stroke="var(--ah-glint-stroke)" stroke-width=${2 * u} stroke-linecap="round" pathLength="1" stroke-dasharray="0.05 1" stroke-dashoffset="0.06"
              class="ah-glint" style=${`animation-delay:${enter * 5 + 1800}ms`}></path>`,
        )}

      <path d=${cells} fill="var(--ah-ink)" stroke="var(--ah-ink)" stroke-width=${0.75 * u} class="ah-cells" style=${`fill-opacity:${on ? 0.2 : 0.13};stroke-opacity:${on ? 0.55 : 0.36}`}></path>

      <path d=${sheetPath(P, ARENA.wall, a0, a1, ARENA.wallHeight, plan)} fill="var(--ah-ink)" class="ah-cells" style=${`fill-opacity:${on ? 0.06 : 0.035}`}></path>
      <path d=${plan ? arcPath(P, ARENA.wall + ARENA.wallHeight, a0, a1) : sheetTop} stroke="var(--ah-ink)" stroke-width=${u} opacity="0.16"></path>
      <path d=${hours} stroke="var(--ah-ink)" stroke-width=${u} opacity="0.34"></path>
      <path d=${arcPath(P, ARENA.wall, a0, a1)} stroke="var(--ah-ink)" stroke-width=${u} opacity="0.28"></path>
      <path d=${bars.far} stroke="var(--ah-ink)" stroke-width=${barWidth} class="ah-fade" style=${`opacity:${on ? 0.66 : 0.44}`}></path>
      <path d=${bars.near} stroke="var(--ah-ink)" stroke-width=${barWidth} class="ah-fade" style=${`opacity:${on ? 0.36 : 0.2}`}></path>
      <path d=${bars.farAway} stroke=${TONE[tone]} stroke-width=${barWidth} style=${shadow(TONE[tone], 2)}></path>
      <path d=${bars.nearAway} stroke=${TONE[tone]} stroke-width=${barWidth} opacity="0.6"></path>
      <path d=${linePath(P, arenaPoint(ARENA.wall - 3 * u, a0), arenaPoint(ARENA.wall + 5 * u, a0))} stroke="var(--ah-ink)" stroke-width=${1.25 * u} opacity="0.8"></path>
      ${[
        { angle: a1, text: '24h ago' },
        { angle: a0, text: 'now' },
      ].map(({ angle, text }) => {
        const at = P(...arenaPoint(ARENA.wall + (plan ? ARENA.wallHeight : 0) + 11 * u, angle));
        const anchor = at.x > centre.x + 12 * u ? 'start' : at.x < centre.x - 12 * u ? 'end' : 'middle';
        return fixed(at.x, at.y, u, svg`<text y="3.5" text-anchor=${anchor} class="ah-mini ah-mute ah-halo">${text}</text>`, { opacity: on ? 1 : 0, cls: 'ah-fade' });
      })}
    </g>

    <path d=${arcPath(P, ARENA.wall + 2 * u, a0, a1)} stroke="transparent" stroke-width=${12 * u} data-section=${id} data-tip=${`wall:${id}`}></path>

    ${s.named
      .filter((asset) => !troubleAt.has(asset.tick))
      .map((asset) => {
        const cell = assetCell(sector, asset.tick);
        return svg`<path d=${patchPath(P, cell.r0, cell.r1, cell.a0, cell.a1)} fill="transparent" data-section=${id} data-tip=${`asset:${id}:${asset.tick}`}></path>`;
      })}

    ${s.troubles.map((t, i) => {
      const { cell, radius, angle } = troubleCentre(t.tick);
      const toneOf = TONE[TROUBLE_TONE[t.state]];
      const top = P(...arenaPoint(radius, angle, plan ? 0 : ARENA.beam));
      const ring = pointed === t.key;
      return svg`<g class="ah-appear ah-hit" style=${`animation-delay:${enter + 260 + i * 80}ms`} data-section=${id} data-trouble=${t.key} data-tip=${`trouble:${t.key}`}>
        <path d=${patchPath(P, cell.r0, cell.r1, cell.a0, cell.a1)} fill=${toneOf} stroke=${toneOf} stroke-width=${0.75 * u} style=${shadow(toneOf, 4)}></path>
        ${
          plan
            ? nothing
            : svg`<path d=${linePath(P, arenaPoint(radius, angle), arenaPoint(radius, angle, ARENA.beam))} stroke=${toneOf} stroke-width=${5 * u} stroke-linecap="round" opacity="0.16"></path>
                <path d=${linePath(P, arenaPoint(radius, angle), arenaPoint(radius, angle, ARENA.beam))} stroke=${toneOf} stroke-width=${1.25 * u}></path>`
        }
        ${fixed(
          top.x,
          top.y,
          u,
          svg`<circle r="10" fill="transparent"></circle>
            <circle r="7.5" stroke="var(--ah-ink)" stroke-width="1" stroke-dasharray="2 2.5" class="ah-fade" style=${`opacity:${ring ? 0.9 : 0}`}></circle>
            ${plan ? nothing : troubleMark(t.state)}`,
        )}
      </g>`;
    })}

    <g class="ah-appear ah-hit" style=${`animation-delay:${enter + 120}ms`} data-section=${id} data-tip=${`section:${id}`}>
      <circle cx=${f1(c.x)} cy=${f1(c.y)} r=${12 * u} fill="transparent"></circle>
      <path d=${diamond(c.x, c.y, d)} fill="var(--ah-scene)" stroke=${color} stroke-width=${1.2 * u} stroke-linejoin="miter"></path>
      ${s.health === 'degraded' ? svg`<circle cx=${f1(c.x)} cy=${f1(c.y)} r=${1.6 * u} fill=${color}></circle>` : nothing}
      ${state ? svg`<path d=${diamond(c.x, c.y, d * 0.5)} fill=${color}></path>` : nothing}
      <path d=${diamond(c.x, c.y, d + 4.5 * u)} stroke="var(--ah-ink)" stroke-width=${u} stroke-dasharray=${`${2 * u} ${2.5 * u}`} class="ah-fade" style=${`opacity:${picked ? 1 : lit ? 0.55 : 0}`}></path>
    </g>
  </g>`;
}

/**
 * The line from a section to its label: off its wall on a diagonal, level
 * for a moment, then the label's spine — a hairline down its side with a
 * bright bar beside its head.
 */
export function labelLeader(x: number, y: number, label: PlacedLabel, u: number, lit: boolean, enter: number): SVGTemplateResult {
  return svg`<g pointer-events="none" class="ah-appear" style=${`opacity:${label.fade};animation-delay:${enter}ms`}>
    <path d=${leaderPath(x, y, label, u)} fill="none" stroke="var(--ah-ink)" stroke-width=${u} class="ah-fade" style=${`opacity:${lit ? 0.85 : 0.4}`}></path>
    <rect x=${f1(x - 1.5 * u)} y=${f1(y - 1.5 * u)} width=${3 * u} height=${3 * u} fill="var(--ah-ink)" opacity="0.9"></rect>
    <line x1=${label.hx} y1=${label.y0} x2=${label.hx} y2=${label.y1} stroke="var(--ah-ink)" stroke-width=${u} opacity="0.2"></line>
    <rect x=${f1(label.hx - u)} y=${f1(label.y0 + 2 * u)} width=${2 * u} height=${(LABEL.head - 4) * u} fill="var(--ah-ink)" opacity="0.95"></rect>
  </g>`;
}
