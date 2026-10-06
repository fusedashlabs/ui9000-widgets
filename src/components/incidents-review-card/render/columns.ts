import { html, nothing } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';

import type {
  IncidentsReviewCount,
  IncidentsReviewFilter,
  IncidentsReviewModel,
  IncidentsReviewTotal,
} from '../lib/index.js';

/**
 * State columns share the width two to one against the total, as in the Figma
 * card (114 / 114 / 59 px). The total never shrinks below its own number.
 */
export function columnTemplate(model: Pick<IncidentsReviewModel, 'counts' | 'total'>): string {
  const states = model.counts.map(() => 'minmax(0, 2fr)');
  if (model.total) states.push(states.length ? 'minmax(max-content, 1fr)' : 'minmax(0, 1fr)');
  return states.join(' ');
}

/** The scope of the counts. A distance draws the scale mark under its label. */
export function renderFilter(filter: IncidentsReviewFilter) {
  return html`<p class="filter ${filter.scale ? 'scale' : ''}">
    <span class="sr-only">Filter: </span>${filter.label}
  </p>`;
}

/** Compact counts keep every digit for assistive text. */
function renderValue(item: { display: string; full: string }) {
  if (item.display === item.full) return html`<span class="value">${item.display}</span>`;
  return html`<span class="value" title=${item.full} aria-hidden="true">${item.display}</span>
    <span class="sr-only">${item.full}</span>`;
}

function renderCount(count: IncidentsReviewCount) {
  return html`<li class="count ${count.tone}">
    ${renderValue(count)}
    <span class="label"
      ><span class="dot" aria-hidden="true"></span><span class="label-text" title=${count.label}>${count.label}</span></span
    >
  </li>`;
}

function renderTotal(total: IncidentsReviewTotal) {
  return html`<li class="count total">
    ${renderValue(total)}
    <span class="label"><span class="label-text" title=${total.label}>${total.label}</span></span>
  </li>`;
}

/**
 * Segment weights: each state's count, so 14 reads clearly shorter than 89.
 * A text count weighs nothing and keeps the minimum width; all zero → equal.
 */
export function trackWeights(counts: readonly Pick<IncidentsReviewCount, 'value'>[]): number[] {
  const weights = counts.map((count) => Math.max(0, count.value ?? 0));
  return weights.some((weight) => weight > 0) ? weights : counts.map(() => 1);
}

/**
 * The lifecycle track under the numbers. The state segments share the state
 * columns in proportion to their counts; the total keeps its grey ticks under
 * its own column. The counts need not sum to the total, so the segments are
 * shares of the states, not of the total.
 */
function renderTrack(model: IncidentsReviewModel) {
  const weights = trackWeights(model.counts);
  return html`<div
      class="stages"
      aria-hidden="true"
      style=${styleMap({ gridColumn: `1 / span ${model.counts.length}` })}
    >
      ${model.counts.map(
        (count, i) => html`<span class="seg ${count.tone}" style=${styleMap({ flexGrow: String(weights[i]) })}></span>`,
      )}
    </div>
    ${model.total ? html`<span class="ticks" aria-hidden="true"></span>` : nothing}`;
}

/** One column per state and one for the total, then the track when incidents have a lifecycle. */
export function renderColumns(model: IncidentsReviewModel) {
  const { counts, total, track } = model;
  return html`<div
    class="columns"
    data-states=${counts.length}
    style=${styleMap({ gridTemplateColumns: columnTemplate(model) })}
  >
    <ul class="numbers" role="list">
      ${counts.map((count) => renderCount(count))}
      ${total ? renderTotal(total) : nothing}
    </ul>
    ${track ? renderTrack(model) : nothing}
  </div>`;
}
