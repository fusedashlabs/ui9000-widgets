import { css, unsafeCSS } from 'lit';

import { CHART_TYPE } from '../../../utils/chart-theme.js';

/**
 * What the bipartite graph adds to the goals perimeter's scene, whose
 * stylesheet it shares: the same room, clouds, rings, callouts, legend button
 * and legend, and here the ribbons, the resource groups' labels, the key to
 * the ribbons' colours beside the reading under the title, and the corner of
 * the map window that says which groups these are.
 */
export const bipartiteGraphStyles = css`
  :host {
    /* the page style's traffic colour; the element sets it, this is the default style's */
    --bp-traffic: rgb(214 236 255);
    --bp-traffic-glow: rgb(170 210 255);
    /* small caps: the design system's body/xs, as every chart's subtitle */
    --bp-caps-size: ${unsafeCSS(String(CHART_TYPE.subtitle))}px;
    --bp-caps-weight: ${unsafeCSS(String(CHART_TYPE.subtitleWeight))};
    --bp-caps-tracking: ${unsafeCSS(CHART_TYPE.subtitleTracking)};
  }
  :host([data-mode='light']) {
    --bp-traffic: rgb(71 61 217);
    --bp-traffic-glow: rgb(115 105 255 / 0.5);
  }

  /* Under the title: the reading on the left, the key to the ribbons' colours on the right. */
  .widget-header .widget-aside {
    align-self: stretch;
  }
  .bp-aside {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 24px;
  }
  /* on the right, even where it wraps under the reading */
  .bp-key {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    margin-left: auto;
    gap: 6px 14px;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-family: var(--gp-face);
    font-size: var(--bp-caps-size);
    font-weight: var(--bp-caps-weight);
    line-height: 14px;
    letter-spacing: var(--bp-caps-tracking);
    text-transform: uppercase;
    white-space: nowrap;
  }
  :host([data-mode='dark']) .bp-key {
    color: var(--gp-mute);
  }
  .bp-key-caption {
    color: var(--gp-faint);
  }
  .bp-key-entry {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .bp-key-swatch {
    flex: none;
    width: 14px;
    height: 1px;
  }

  /* The corner of the map window. */
  .bp-corner {
    position: absolute;
    top: 0;
    right: 20px;
    transform: translateY(-3px);
    color: var(--gp-faint);
    font-family: var(--gp-face);
    font-size: var(--bp-caps-size);
    font-weight: var(--bp-caps-weight);
    line-height: 1;
    letter-spacing: var(--bp-caps-tracking);
    text-transform: uppercase;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  /* A ribbon: a band as wide as the calls, a line down its middle, and light running along it. */
  .bp-ribbon {
    pointer-events: auto;
    transition: opacity 200ms ease;
  }
  .bp-ribbon-hit,
  .bp-ribbon-band,
  .bp-ribbon-line,
  .bp-ribbon-run {
    fill: none;
    stroke-linecap: round;
  }
  .bp-ribbon-hit {
    stroke: transparent;
    pointer-events: stroke;
  }
  .bp-ribbon-band,
  .bp-ribbon-line {
    transition: opacity 200ms ease;
  }
  .bp-ribbon-line {
    stroke-width: 1;
  }
  .bp-ribbon-run {
    stroke-dasharray: 0.03 0.97;
    filter: drop-shadow(0 0 2.5px var(--bp-glow, var(--bp-traffic-glow)));
    pointer-events: none;
    animation: bp-run 4s linear infinite;
  }
  @keyframes bp-run {
    from {
      stroke-dashoffset: 1;
    }
    to {
      stroke-dashoffset: 0;
    }
  }

  /* A resource group: its diamond, and its label to the right in the goals' own anatomy. */
  .bp-resource {
    fill: none;
    pointer-events: auto;
    transition: opacity 200ms ease;
  }
  .bp-resource .gp-diamond-dot,
  .bp-resource .gp-diamond-core {
    stroke: none;
  }
  .bp-resource-callout {
    position: absolute;
    width: 0;
    height: 0;
    transition: opacity 200ms ease;
  }
  .bp-resource-label {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    color: var(--gp-ink);
    white-space: nowrap;
    pointer-events: auto;
  }
  .bp-resource-name {
    margin-top: 2px;
    color: var(--gp-ink-2);
    font: var(--gp-text-md);
    transition: color 200ms ease;
  }
  .bp-resource-callout.is-lit .bp-resource-name {
    color: var(--gp-ink);
  }
  .bp-resource-line {
    display: flex;
    height: 12px;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    color: var(--gp-mute);
    font-family: var(--gp-face);
    font-size: var(--bp-caps-size);
    font-weight: var(--bp-caps-weight);
    line-height: 1;
    letter-spacing: var(--bp-caps-tracking);
    text-transform: uppercase;
    font-variant-numeric: tabular-nums;
    transition: opacity 200ms ease;
  }
  .bp-strong {
    color: var(--gp-ink-2);
  }
  .bp-resource-label.is-compact .bp-resource-line {
    opacity: 0;
  }
  .bp-resource-callout.is-lit .bp-resource-label.is-compact .bp-resource-line {
    opacity: 1;
  }

  /* Drawn under ~45% of its design size, the labels fold away: every mark still explains itself under the pointer. */
  .bp-stage[data-tiny] .gp-callout,
  .bp-stage[data-tiny] .gp-leader,
  .bp-stage[data-tiny] .bp-resource-callout {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .bp-ribbon-run {
      display: none;
    }
  }
`;
