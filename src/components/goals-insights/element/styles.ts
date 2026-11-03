import { css, unsafeCSS } from 'lit';

import { CHART_TYPE } from '../../../utils/chart-theme.js';

/**
 * What the evidence column adds to the asset health arena's scene, whose
 * stylesheet it shares: the same room, reading line, legend button and
 * legend; here the key to the claims' colours beside the reading under the
 * title, the column's layers — its SVG, its goals' agents and their glass —
 * and the type its labels are set in: names and figures in FuseDash's chart
 * face (design-system body md and sm), captions in its body/xs like every
 * chart's subtitle, the asset each claim is about in the instrument mono.
 */
export const goalsInsightsStyles = css`
  :host {
    /* small caps: the design system's body/xs, as every chart's subtitle */
    --gi-caps-size: ${unsafeCSS(String(CHART_TYPE.subtitle))}px;
    --gi-caps-weight: ${unsafeCSS(String(CHART_TYPE.subtitleWeight))};
    --gi-caps-tracking: ${unsafeCSS(CHART_TYPE.subtitleTracking)};
    --gi-text-md: ${unsafeCSS(String(CHART_TYPE.headingWeight))} ${unsafeCSS(String(CHART_TYPE.heading))}px var(--ah-face);
    --gi-text-sm: ${unsafeCSS(String(CHART_TYPE.labelWeight))} ${unsafeCSS(String(CHART_TYPE.label))}px var(--ah-face);
    /* the scene's light, from the page style's sequential palette; the element sets it, this is the default style's */
    --gi-cool: rgb(147 140 255);
    /* the light the goals' glass catches */
    --gi-glass: #ffffff;
  }
  :host([data-mode='light']) {
    --gi-cool: rgb(71 61 217);
    --gi-glass: rgb(17 24 39);
  }

  /* The header over the plot, so its menu, when open, stands over the column rather than under it. */
  .widget-header {
    z-index: 2;
  }

  /* Under the title: the reading on the left, the key to the claims' colours on the right. */
  .widget-header .widget-aside {
    align-self: stretch;
  }
  .gi-aside {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    max-width: 100%;
    gap: 6px 24px;
  }
  .gi-aside > .ah-reading-line {
    max-width: 100%;
    overflow: hidden;
  }
  .gi-caption {
    color: var(--ah-faint);
  }
  .gi-key {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    /* on a narrow card its entries wrap rather than run off the card */
    min-width: 0;
    max-width: 100%;
    margin-left: auto;
    gap: 6px 14px;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-family: var(--ah-face);
    font-size: var(--gi-caps-size);
    font-weight: var(--gi-caps-weight);
    line-height: 14px;
    letter-spacing: var(--gi-caps-tracking);
    text-transform: uppercase;
    white-space: nowrap;
  }
  :host([data-mode='dark']) .gi-key {
    color: var(--ah-mute);
  }
  .gi-key-caption {
    color: var(--ah-faint);
  }
  .gi-key-entry {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .gi-key-mark {
    display: block;
    flex: none;
    overflow: visible;
  }

  /* Motes of light along the room's edges, under the column; the column's light over them. */
  .gi-motes,
  .gi-glow {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  /* The plot: the column's SVG, its goals' agents over it, and their glass and labels over those. */
  .gi-stage,
  .gi-column,
  .gi-clouds,
  .gi-goals {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .gi-stage {
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    animation: ah-appear 800ms var(--ah-ease) 240ms backwards;
  }
  .gi-stage.is-dragging {
    cursor: grabbing;
  }
  :host([flat]) .gi-stage {
    cursor: default;
  }
  .gi-column,
  .gi-goals {
    display: block;
    overflow: visible;
  }
  .gi-clouds,
  .gi-goals {
    pointer-events: none;
  }
  .gi-goals .gi-hit {
    pointer-events: auto;
  }
  .gi-cloud {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
  }
  .gi-goal[data-goal],
  .gi-claim {
    cursor: pointer;
  }
  .gi-goal:focus {
    outline: none;
  }
  .gi-time,
  .gi-ring-hit,
  .gi-goal[data-tip='main'] {
    cursor: help;
  }
  .gi-ring-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 8px;
  }
  /* the two-hour rings between the lit ones stand back to a trace, and come up under the pointer */
  .gi-minor .gi-trace {
    opacity: 0.25;
    transition: opacity 200ms ease;
  }
  .gi-minor:hover .gi-trace {
    opacity: 1;
  }
  .gi-stop-cool {
    stop-color: var(--gi-cool);
  }
  .gi-stop-glass {
    stop-color: var(--gi-glass);
  }
  /* The shadow under the column: as soft as the asset health floor's (an 80px box-shadow blur is a 40px blur), in its colours at three fifths of their strength. */
  .gi-shadow {
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 50%;
    background: rgb(0 0 0 / 0.45);
    filter: blur(40px);
    pointer-events: none;
  }
  /* Over it, smoked glass as the asset health floor's — grey-blue — with the room's floor mist (the page style's violet) gathered in it. */
  .gi-shadow-smoke {
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      rgba(var(--ah-floor-mist), 0.36) 0%,
      rgba(var(--ah-floor-mist), 0.18) 45%,
      rgb(30 40 54 / 0.18) 75%,
      transparent 100%
    );
    filter: blur(22px);
    mix-blend-mode: screen;
    pointer-events: none;
  }
  /* laid flat, two thirds of that: two fifths of the asset health floor's strength */
  .gi-shadow.is-flat,
  .gi-shadow-smoke.is-flat {
    opacity: 0.667;
  }
  :host([data-mode='light']) .gi-shadow {
    background: rgb(15 23 42 / 0.168);
  }
  /* by day the glass is a pale violet-grey laid over the shadow, not light added to it */
  :host([data-mode='light']) .gi-shadow-smoke {
    background: radial-gradient(
      closest-side,
      rgba(var(--ah-floor-mist), 0.18) 0%,
      rgba(var(--ah-floor-mist), 0.084) 45%,
      rgb(226 232 240 / 0.12) 75%,
      transparent 100%
    );
    mix-blend-mode: normal;
  }

  /* Type in the column, kept at the page's size however large the column is drawn. */
  .gi-cap {
    fill: var(--ah-faint);
    font-family: var(--ah-face);
    font-size: var(--gi-caps-size);
    font-weight: var(--gi-caps-weight);
    letter-spacing: var(--gi-caps-tracking);
    text-transform: uppercase;
    font-variant-numeric: tabular-nums;
  }
  .gi-cap.is-ink,
  .gi-cap .is-ink {
    fill: var(--ah-ink);
  }
  .gi-cap .is-ink-2 {
    fill: var(--ah-ink-2);
  }
  .gi-cap .is-mute {
    fill: var(--ah-mute);
  }
  .gi-cap .is-faint,
  .gi-cap.is-faint {
    fill: var(--ah-faint);
  }
  .gi-name {
    fill: var(--ah-ink);
    font: var(--gi-text-md);
  }
  .gi-value {
    fill: var(--ah-ink);
    font: var(--gi-text-sm);
    font-variant-numeric: tabular-nums;
  }
  .gi-kind {
    fill: var(--ah-faint);
    transition: opacity 200ms ease;
  }
  /* a scene-coloured edge under a label, so the lines it lies on do not run through its letters */
  .gi-halo {
    stroke: var(--ah-scene);
    stroke-width: 4px;
    stroke-opacity: 0.85;
    stroke-linejoin: round;
    paint-order: stroke;
  }
  .gi-kind.gi-halo {
    stroke-width: 3px;
    stroke-opacity: 0.55;
  }

  /* The legend's claim marks are filled with the room, as the column draws them. */
  .ah-legend-mark .scene {
    fill: var(--ah-scene);
  }
  .ah-legend-mark .faint {
    stroke: var(--ah-faint);
  }
  .ah-legend-mark .solid.cool {
    fill: var(--gi-cool);
  }

  @media (prefers-reduced-motion: reduce) {
    .gi-stage {
      animation: none;
    }
  }
`;
