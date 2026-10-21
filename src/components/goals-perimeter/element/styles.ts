import { css } from 'lit';

/**
 * Status colours are sampled from the design board: Tailwind v4 emerald-500,
 * amber-500, rose-500 and red-400. Light mode keeps the hues one step darker.
 * Text and lines follow the package theme, so the board sits in the shell
 * like the other charts.
 */
export const goalsPerimeterStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: var(--ui9000-host-min-height, 420px);
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, Inter, sans-serif);
    box-sizing: border-box;
    --gp-healthy: #009966;
    --gp-degraded: #e17100;
    --gp-critical: #ec003f;
    --gp-impure: #ec003f;
    --gp-failed: #e7000b;
    --gp-blocked: #ec003f;
    --gp-tick: #fb2c36;
    --gp-down: #e7000b;
    --gp-line: rgba(64, 64, 64, 0.16);
    --gp-line-bright: rgba(23, 23, 23, 0.4);
    --gp-fringe-line: rgba(82, 82, 82, 0.18);
    --gp-hover: rgba(0, 0, 0, 0.05);
    --gp-chip: rgba(0, 0, 0, 0.06);
  }

  :host([data-mode='dark']) {
    --gp-healthy: #00bc7d;
    --gp-degraded: #fe9a00;
    --gp-critical: #ff2056;
    --gp-impure: #ff2056;
    --gp-failed: #ff6467;
    --gp-blocked: #ff2056;
    --gp-tick: #fb7072;
    --gp-down: #ff6467;
    --gp-line: rgba(212, 212, 212, 0.2);
    --gp-line-bright: rgba(245, 245, 245, 0.45);
    --gp-fringe-line: rgba(161, 161, 161, 0.2);
    --gp-hover: rgba(255, 255, 255, 0.08);
    --gp-chip: rgba(255, 255, 255, 0.1);
  }

  .chart-root {
    position: relative;
    flex: 1 1 auto;
    width: 100%;
    min-height: var(--ui9000-plot-min-height, 320px);
    overflow: hidden;
  }

  .empty {
    display: grid;
    place-items: center;
    height: 100%;
    min-height: inherit;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-size: var(--ui9000-font-size-empty, 0.875rem);
  }

  /*
   * Shell header: the title keeps its full width (it ellipsises only when it
   * is wider than the header on its own), and the exception summary never
   * breaks between words. When the two do not fit side by side, the summary
   * moves to its own line under the title.
   */
  .widget-header-main > .widget-title {
    flex: 1 0 auto;
    max-width: 100%;
  }
  .widget-aside {
    white-space: nowrap;
  }

  /* Shell: exception summary beside the title. */
  .exception-summary {
    display: inline-flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 6px;
    font-size: var(--ui9000-font-size-label, 12px);
    color: var(--ui9000-color-text-muted, #6b7280);
    white-space: nowrap;
  }
  .exception-count,
  .down-count {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 4px;
  }
  .exception-count.has-exceptions {
    color: var(--gp-impure);
  }
  .exception-count svg {
    width: 12px;
    height: 12px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;
    overflow: visible;
  }
  .exception-count strong {
    font-weight: 600;
  }

  /* The way back from an open goal: over the plot's top-left corner, so nothing in the shell moves. */
  .gp-canvas {
    position: absolute;
    inset: 0;
  }
  .gp-crumbs {
    position: absolute;
    top: 6px;
    left: 6px;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: calc(100% - 12px);
    font-size: var(--ui9000-font-size-label, 12px);
    color: var(--ui9000-color-text-muted, #6b7280);
    animation: gp-crumbs-in 180ms ease-out;
  }
  @keyframes gp-crumbs-in {
    from {
      opacity: 0;
    }
  }
  .gp-back {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 6px;
    background: transparent;
    color: var(--ui9000-color-text, #111827);
    font: inherit;
    cursor: pointer;
  }
  .gp-back {
    background: var(--ui9000-color-surface, #ffffff);
  }
  .gp-back:hover,
  .gp-back:focus-visible {
    background: var(--gp-hover);
  }
  .gp-crumb-goal {
    min-width: 0;
    overflow: hidden;
    color: var(--ui9000-color-text, #111827);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Plot. */
  .gp-svg text {
    fill: var(--ui9000-color-text, #111827);
  }

  .strand {
    fill: none;
    stroke: var(--gp-line);
    stroke-width: 0.7px;
    vector-effect: non-scaling-stroke;
  }
  .strand.exception {
    stroke-width: 1.1px;
  }
  .strand-dash {
    fill: none;
    stroke: var(--gp-line-bright);
    stroke-width: 1.3px;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }

  .fringe-links {
    fill: none;
    stroke: var(--gp-fringe-line);
    stroke-width: 0.6px;
    vector-effect: non-scaling-stroke;
  }
  .fringe circle {
    opacity: 0.85;
  }

  .clouds,
  .fringe,
  .strands,
  .agent-links,
  .labels {
    pointer-events: none;
  }
  .speck.agent {
    pointer-events: all;
    cursor: default;
  }

  .agent-link {
    stroke: var(--gp-line);
    stroke-width: 0.8px;
    vector-effect: non-scaling-stroke;
  }
  .agent-link.degraded,
  .agent-link.unavailable {
    stroke: var(--gp-down);
    stroke-opacity: 0.6;
  }

  .goal-box {
    fill: transparent;
    transition: fill 120ms ease;
  }
  .goal {
    cursor: pointer;
    outline: none;
  }
  .goal.is-hover .goal-box,
  .goal:focus-visible .goal-box {
    fill: var(--gp-hover);
  }
  .goal:focus-visible .goal-box {
    stroke: var(--ui9000-color-text-muted, #6b7280);
    stroke-width: 1px;
    vector-effect: non-scaling-stroke;
  }

  .ring {
    fill: none;
    stroke-width: 3.5;
  }
  .ring.healthy {
    stroke: var(--gp-healthy);
  }
  .ring.degraded {
    stroke: var(--gp-degraded);
  }
  .ring.critical {
    stroke: var(--gp-critical);
  }

  .ticks line {
    stroke: var(--gp-tick);
    stroke-width: 2.5;
  }

  .rg,
  .marker,
  .link-mark,
  .ext-node {
    cursor: pointer;
    outline: none;
  }
  .rg {
    --rg-color: var(--gp-healthy);
  }
  .rg.degraded {
    --rg-color: var(--gp-degraded);
  }
  .rg.failed {
    --rg-color: var(--gp-critical);
  }
  .rg-base {
    fill: var(--ui9000-color-surface, #ffffff);
    fill-opacity: 0.88;
  }
  .rg-shape {
    fill: var(--rg-color);
    fill-opacity: 0.07;
    stroke: var(--rg-color);
    stroke-width: 2;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--rg-color) 35%, transparent));
  }
  .rg:hover .rg-shape,
  .rg:focus-visible .rg-shape {
    fill-opacity: 0.18;
    stroke-width: 2.6;
  }
  .glyph {
    fill: none;
    stroke: var(--rg-color);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .glyph .fill {
    fill: var(--rg-color);
  }
  .gp-svg .rg-more {
    fill: var(--ui9000-color-text-muted, #6b7280);
    font-size: var(--ui9000-font-size-label, 12px);
  }

  .hit {
    fill: transparent;
    stroke: none;
  }
  .marker path,
  .marker circle:not(.hit) {
    fill: none;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .marker.failed {
    stroke: var(--gp-failed);
  }
  .marker.blocked {
    stroke: var(--gp-blocked);
    opacity: 0.9;
  }
  .marker.degraded {
    stroke: var(--gp-degraded);
  }
  .marker:hover path,
  .marker:hover circle:not(.hit),
  .marker:focus-visible path,
  .marker:focus-visible circle:not(.hit) {
    stroke-width: 2.4;
  }

  .link-line {
    fill: none;
    stroke: var(--gp-down);
    stroke-width: 1.6;
    stroke-opacity: 0.85;
  }
  .link-mark circle,
  .link-mark path,
  .ext-node.unavailable circle:not(.hit),
  .ext-node.unavailable path {
    stroke: var(--gp-down);
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .link-mark circle,
  .ext-node.unavailable circle:not(.hit) {
    fill: var(--ui9000-color-surface, #ffffff);
  }
  .link-mark path,
  .ext-node path {
    fill: none;
  }
  .link-mark:hover circle,
  .link-mark:hover path,
  .link-mark:focus-visible circle,
  .link-mark:focus-visible path {
    stroke-width: 3;
  }

  .ext-line {
    stroke: var(--gp-line-bright);
    stroke-width: 1px;
    stroke-dasharray: 3 3;
    vector-effect: non-scaling-stroke;
  }
  .ext-line.degraded {
    stroke: var(--gp-degraded);
  }
  .ext-line.unavailable {
    stroke: var(--gp-down);
    stroke-dasharray: none;
  }
  .ext-dot {
    fill: var(--ui9000-color-surface, #ffffff);
    stroke: var(--ui9000-color-text-muted, #6b7280);
    stroke-width: 1.5;
  }
  .ext-node.degraded .ext-dot {
    stroke: var(--gp-degraded);
  }
  .ext-node:hover .ext-dot,
  .ext-node:focus-visible .ext-dot {
    stroke-width: 2.5;
  }

  /* Labels under each ring, in screen px at 100%. */
  .goal-label .row text {
    fill: var(--ui9000-color-text-muted, #6b7280);
  }
  .goal-label .row.title text {
    fill: var(--ui9000-color-text, #111827);
    font-weight: 500;
  }
  .goal-label .row.impure text {
    fill: var(--gp-impure);
  }
  .impure-mark circle,
  .impure-mark path {
    fill: none;
    stroke: var(--gp-impure);
    stroke-width: 1.4;
  }
  .chip {
    fill: transparent;
  }
  .goal-label.is-hover .chip {
    fill: var(--gp-chip);
  }

  /* An open goal. */
  .gp-detail .sector {
    fill: none;
    stroke-width: 3;
    stroke-linecap: butt;
    stroke-opacity: 0.75;
  }
  .gp-detail .glow {
    pointer-events: none;
  }
  .gp-detail .sector-hit {
    fill: transparent;
    pointer-events: all;
  }
  /* A hovered sector stays at full strength; the others step back. */
  .gp-detail .sector,
  .gp-detail .sector-label,
  .gp-detail .sector-leader,
  .gp-detail .detail-cloud .speck,
  .gp-detail .agent-links {
    transition: opacity 120ms ease;
  }
  .gp-detail .is-dimmed {
    opacity: 0.2;
  }
  .gp-detail .detail-cloud .speck {
    pointer-events: none;
  }
  .gp-detail .detail-cloud .speck.agent {
    pointer-events: all;
  }
  .sector-leader {
    fill: none;
    stroke-width: 1;
    stroke-opacity: 0.6;
  }
  .gp-svg .sector-title {
    font-size: var(--ui9000-font-size-title, 14px);
    font-weight: 600;
  }
  .gp-svg .reason text,
  .gp-svg .reason-more {
    fill: var(--ui9000-color-text-muted, #6b7280);
    font-size: var(--ui9000-font-size-label, 12px);
  }
  .reason {
    cursor: default;
    outline: none;
  }
  .reason:hover text,
  .reason:focus-visible text {
    fill: var(--ui9000-color-text, #111827);
  }
  .reason-glyph path,
  .reason-glyph circle {
    fill: none;
    stroke-width: 1.4;
    stroke-linecap: round;
  }
  .reason.failed .reason-glyph {
    stroke: var(--gp-failed);
  }
  .reason.blocked .reason-glyph {
    stroke: var(--gp-blocked);
  }
  .reason.degraded .reason-glyph {
    stroke: var(--gp-degraded);
  }
  .rel-strand {
    fill: none;
    stroke: var(--gp-line);
    stroke-width: 1px;
    vector-effect: non-scaling-stroke;
  }
  .rel-strand.degraded {
    stroke: var(--gp-degraded);
    stroke-opacity: 0.7;
  }
  .rel-node {
    cursor: pointer;
    outline: none;
  }
  .rel-node.external {
    cursor: default;
  }
  .rel-dot {
    fill: var(--ui9000-color-surface, #ffffff);
    stroke: var(--gp-line-bright);
    stroke-width: 1.5;
  }
  .rel-arc {
    fill: none;
    stroke-width: 2.5;
    stroke: var(--gp-healthy);
  }
  .rel-node.degraded .rel-arc {
    stroke: var(--gp-degraded);
  }
  .rel-node.critical .rel-arc {
    stroke: var(--gp-critical);
  }
  .rel-node:hover .rel-dot,
  .rel-node:focus-visible .rel-dot {
    fill: var(--gp-hover);
    stroke-width: 2.5;
  }
  .rel-node.unavailable circle:not(.hit),
  .rel-node.unavailable path {
    fill: var(--ui9000-color-surface, #ffffff);
    stroke: var(--gp-down);
    stroke-width: 2.2;
  }
  .gp-svg .rel-label {
    font-size: var(--ui9000-font-size-title, 14px);
    font-weight: 500;
  }
  .gp-svg .rel-meta,
  .gp-svg .rg-name,
  .gp-svg .detail-meta {
    fill: var(--ui9000-color-text-muted, #6b7280);
    font-size: var(--ui9000-font-size-label, 12px);
  }
  .gp-svg .detail-meta {
    font-size: var(--ui9000-font-size-title, 14px);
  }
  .gp-svg .detail-title {
    font-size: var(--ui9000-font-size-title, 14px);
    font-weight: 500;
  }
  .gp-svg .detail-impure {
    fill: var(--gp-impure);
    font-size: var(--ui9000-font-size-title, 14px);
    letter-spacing: 0.12em;
  }
  .rg.is-selected .rg-shape {
    fill-opacity: 0.22;
    stroke-width: 3;
  }

  @media (prefers-reduced-motion: reduce) {
    .goal-box {
      transition: none;
    }
    .gp-crumbs {
      animation: none;
    }
    .gp-detail .sector,
    .gp-detail .sector-label,
    .gp-detail .sector-leader,
    .gp-detail .detail-cloud .speck,
    .gp-detail .agent-links {
      transition: none;
    }
  }
`;
