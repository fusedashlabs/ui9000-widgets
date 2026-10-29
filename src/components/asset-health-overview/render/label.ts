import { html, nothing, type TemplateResult } from 'lit';

import {
  assetCount,
  crewSize,
  formatAssetHealthCount as num,
  formatPercent,
  formatShort,
  LABEL,
  TROUBLE_WORD,
  type AssetHealthTrouble,
  type PlacedLabel,
  type Sector,
} from '../lib/index.js';
import { TROUBLE_TONE, troubleMark, type Tone } from './marks.js';

export interface GroupLabelOptions {
  sector: Sector;
  label: PlacedLabel;
  /** Screen px of the label's spine side, and of its top. */
  x: number;
  y: number;
  /** The arena is small on screen: a label keeps to its head, and its readout shows as one line under the pointer. */
  compact: boolean;
  lit: boolean;
  picked: boolean;
  pointed: string | null;
  opacity: number;
  enter: number;
  /** The place a label is leaving: it only fades out. */
  ghost?: boolean;
}

/** A line of trouble under a section's readout: the asset, and how many agents it holds. */
function troubleRow(t: AssetHealthTrouble, sectionId: string, on: boolean, ghost: boolean): TemplateResult {
  return html`<button
    type="button"
    class="ah-trouble-row"
    tabindex=${ghost ? -1 : nothing}
    data-section=${sectionId}
    data-trouble=${t.key}
    data-tip=${ghost ? nothing : `trouble:${t.key}`}
    data-tone=${TROUBLE_TONE[t.state]}
  >
    <svg aria-hidden="true" viewBox="-5 -5 10 10" class="ah-trouble-mark">${troubleMark(t.state)}</svg>
    <span class="ah-trouble-asset ${on ? 'is-on' : ''}">${t.asset}</span>
    <span class="ah-leader"></span>
    <span class="ah-cap ah-tone">${t.agents ? num(t.agents) : TROUBLE_WORD[t.state]}</span>
  </button>`;
}

/**
 * A section's label, set at one size whatever the arena's scale: the
 * category and how the goal fares with it, what the goal has of it, a
 * readout — the agents seated in its section, its calls a minute, the share
 * of them held up — and a line for each asset in trouble. Its head picks the
 * section out.
 */
export function groupLabel(o: GroupLabelOptions): TemplateResult {
  const { sector, label, compact, lit, picked, pointed, ghost = false } = o;
  const s = sector.section;
  const right = label.side > 0;
  const state = s.crew.held ? s.hold : null;
  const tone: Tone = state ?? (s.health === 'degraded' ? 'warn' : 'neutral');
  const word = state ? `${num(s.crew.held)} ${TROUBLE_WORD[state]}` : s.health === 'degraded' ? 'Slowed' : 'Flows';
  const width = compact ? LABEL.compactWidth : LABEL.width;
  const agents = crewSize(s);
  const readings = [
    { caption: 'Agents', value: num(agents), cls: 'w-agents', quiet: false },
    { caption: 'Calls /min', value: s.calls === null ? '—' : formatShort(s.calls), cls: 'w-calls', quiet: s.calls === null },
    { caption: 'Held up', value: formatPercent(s.slowed), cls: 'w-held', quiet: s.slowed < 0.005 },
  ];

  return html`<div class="ah-label ah-fade" style="left:${o.x.toFixed(1)}px;top:${o.y.toFixed(1)}px;opacity:${o.opacity * label.fade}">
    <div
      class="ah-label-body ${right ? 'is-right' : 'is-left'} ${ghost ? 'is-ghost' : 'ah-rise'}"
      style="width:${width}px;${ghost ? '' : `animation-delay:${o.enter}ms`}"
      aria-hidden=${ghost ? 'true' : nothing}
      data-section=${s.id}
    >
      <button
        type="button"
        class="ah-label-head"
        tabindex=${ghost ? -1 : nothing}
        aria-pressed=${picked ? 'true' : 'false'}
        data-section=${s.id}
        data-pick=${s.id}
        data-tip=${ghost ? nothing : `section:${s.id}`}
      >
        <span class="ah-mini ah-label-title" data-tone=${tone}>
          <span class="ah-label-name ${lit || picked ? 'is-on' : ''}">${s.name}</span>
          <span aria-hidden="true" class="ah-dot"></span>
          <span class="ah-tone">${word}</span>
        </span>
        <span class="ah-label-count">${assetCount(s)}</span>
      </button>
      ${
        compact
          ? html`<span class="ah-mini ah-label-line ${lit ? 'is-on' : ''}">
              <span>${num(agents)} ${agents === 1 ? 'agent' : 'agents'}</span><span class="ah-sep">·</span><span>${s.calls === null ? '—' : formatShort(s.calls)} /min</span>
            </span>`
          : html`<span class="ah-readout">
                ${readings.map(
                  (r) => html`<span class="ah-reading ${r.cls}">
                    <span class="ah-mini ah-faint">${r.caption}</span>
                    <span class="ah-reading-value ${r.quiet ? 'is-quiet' : ''}">${r.value}</span>
                  </span>`,
                )}
              </span>
              ${s.troubles.length
                ? html`<span class="ah-troubles">${s.troubles.map((t) => troubleRow(t, s.id, pointed === t.key, ghost))}</span>`
                : nothing}`
      }
    </div>
  </div>`;
}
