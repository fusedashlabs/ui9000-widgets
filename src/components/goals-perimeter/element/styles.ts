import { css, unsafeCSS } from 'lit';

import { CHART_TYPE } from '../../../utils/chart-theme.js';

/**
 * The board is a scene, as in the Agent operations design: a graphite room
 * lit from above, a faint perspective floor, film grain, the clouds of
 * agents, and hairline instruments in the scene's ink. It fills the card,
 * dark with a dark page and light with a light one (the same room by day).
 * Colour only speaks when something deviates: status mint, amber, hold
 * orange, failed red and awaiting periwinkle mean the same everywhere.
 *
 * The board's own words — goal names and readings — are set in FuseDash's
 * chart face and type scale (design-system body md and sm, as other charts'
 * labels); its tips are the shared chart tooltip. Captions, codes, statuses and the
 * diamonds' names stay in the instrument mono.
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
    --gp-mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
    /* FuseDash's chart face: design-system body md (names) and body sm (figures) */
    --gp-face: var(--ui9000-font-family, ${unsafeCSS(CHART_TYPE.fontFamily)});
    --gp-text-md: ${unsafeCSS(String(CHART_TYPE.headingWeight))} ${unsafeCSS(String(CHART_TYPE.heading))}px / ${unsafeCSS(String(CHART_TYPE.headingLine))}px var(--gp-face);
    --gp-text-sm: ${unsafeCSS(String(CHART_TYPE.labelWeight))} ${unsafeCSS(String(CHART_TYPE.label))}px / ${unsafeCSS(String(CHART_TYPE.labelLine))}px var(--gp-face);
    --gp-scene: #06080b;
    --gp-ink: #f1f4f8;
    --gp-ink-2: #d1d7df;
    --gp-mute: #a8b0bc;
    --gp-faint: #929ba8;
    --gp-dim: #424a55;
    --gp-hairline: rgb(196 216 255 / 0.11);
    /* The legend button sits on the page's surface, and it and the legend take the page's border, as every other chart's legend does. */
    --gp-surface: var(--ui9000-color-surface, #13161d);
    --gp-surface-muted: var(--ui9000-color-surface-muted, #282e37);
    --gp-border: var(--ui9000-color-border, #444b57);
    --gp-panel-shadow:
      0 2px 4px 0 #141c2c0f,
      0 4px 8px 2px #141c2c0f;
    --gp-ok: #7ee8a2;
    --gp-warn: #f5b84f;
    --gp-blocked: #ff6a2c;
    --gp-failed: #ff4861;
    --gp-awaiting: #a8a1ff;
    /* from the page style's sequential palette; the element sets them, these are the default style's */
    --gp-line: rgb(229 229 251);
    --gp-arc-glow: rgb(147 140 255 / 0.6);
    --gp-glint: rgb(181 176 255 / 0.9);
    --gp-grid: rgb(147 140 255);
    --gp-mist: 127, 134, 223;
    --gp-floor-mist: 77, 81, 170;
    --gp-ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  }

  .widget-shell {
    position: relative;
    isolation: isolate;
  }
  .widget-header,
  .widget-body {
    position: relative;
    z-index: 1;
  }
  :host([data-mode='dark']) .widget-shell {
    background: var(--gp-scene);
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
   * Shell header: the title, and under it the line that reads the board.
   */
  .widget-header .widget-header-main {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: flex-start;
    gap: 8px;
  }
  .widget-header .widget-header-main > .widget-title {
    max-width: 100%;
  }
  .widget-header .widget-aside {
    align-self: flex-start;
    max-width: 100%;
    overflow: hidden;
  }
  .gp-reading-line {
    display: flex;
    align-items: center;
    gap: 10px;
    font: 11px/1 var(--gp-mono);
    letter-spacing: -0.045em;
    word-spacing: -0.18em;
    text-transform: uppercase;
    color: var(--ui9000-color-text-muted, #6b7280);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  :host([data-mode='dark']) .gp-reading-line {
    color: var(--gp-mute);
  }
  .gp-divider {
    flex: none;
    width: 1px;
    height: 8px;
    background: var(--gp-dim);
  }
  .gp-held {
    color: var(--gp-blocked);
  }
  .gp-status-dot {
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--gp-ok);
  }
  .gp-status-dot.degraded {
    background: var(--gp-warn);
  }
  .gp-status-dot.critical {
    background: var(--gp-blocked);
  }

  /* The scene: the room, its floor and grain, the motes, and the agents' picture. */
  .gp-scene {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    border-radius: inherit;
    background: var(--gp-scene);
    pointer-events: none;
  }
  .gp-scene[hidden] {
    display: none;
  }
  .gp-backdrop,
  .gp-floor,
  .gp-grain,
  .gp-motes,
  .gp-field,
  .gp-field-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .gp-backdrop {
    background:
      radial-gradient(35% 39% at 53% 9%, rgba(var(--gp-mist), 0.05), rgba(var(--gp-mist), 0.02) 55%, transparent),
      radial-gradient(26% 50% at 80% 22%, rgba(var(--gp-mist), 0.05), transparent 70%),
      radial-gradient(32% 37% at 34% 113%, rgba(var(--gp-floor-mist), 0.16), rgba(var(--gp-floor-mist), 0.05) 60%, transparent),
      radial-gradient(22% 28% at 74% 116%, rgba(var(--gp-floor-mist), 0.1), rgba(var(--gp-floor-mist), 0.03) 60%, transparent),
      radial-gradient(70% 60% at 50% 44%, rgb(18 24 32 / 0.5), transparent 70%),
      radial-gradient(120% 80% at 50% 120%, #0f141b, transparent 60%),
      linear-gradient(to bottom, #05070a, #070a0e 60%, var(--gp-scene));
  }
  .gp-grid {
    stroke: var(--gp-grid);
    stroke-width: 1;
    opacity: 0.09;
  }
  .gp-grain {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px 180px;
    opacity: 0.05;
    mix-blend-mode: screen;
  }
  .gp-field {
    transition: opacity 200ms ease;
  }

  /* The plot: the stage that turns, its overlay of instruments and its callouts. */
  .gp-canvas,
  .gp-stage,
  .gp-overlay,
  .gp-labels {
    position: absolute;
    inset: 0;
  }
  .gp-stage {
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .gp-stage.is-dragging {
    cursor: grabbing;
  }
  .gp-overlay {
    overflow: visible;
    pointer-events: none;
  }
  .gp-labels {
    pointer-events: none;
  }

  .gp-link {
    pointer-events: auto;
  }
  .gp-link-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 14;
    pointer-events: stroke;
  }
  .gp-link-line {
    fill: none;
    stroke-width: 1;
    transition: opacity 200ms ease;
  }

  .gp-goal-mark {
    fill: none;
    pointer-events: auto;
  }
  .gp-goal-mark .gp-hit,
  .gp-satellite .gp-hit {
    fill: transparent;
  }
  .gp-orbit {
    stroke: var(--gp-line);
    stroke-width: 1;
    stroke-dasharray: 1 3.5;
  }
  .gp-orbit.far {
    opacity: 0.16;
  }
  .gp-glass {
    pointer-events: none;
  }
  .gp-ticks,
  .gp-rest,
  .gp-needle,
  .gp-progress,
  .gp-brackets {
    stroke: var(--gp-line);
    stroke-width: 1;
  }
  .gp-needle {
    stroke-width: 1.25;
  }
  .gp-progress {
    stroke-width: 1.25;
    opacity: 0.85;
    stroke-dasharray: 1;
    filter: drop-shadow(0 0 3px var(--gp-arc-glow));
  }
  .gp-glint {
    stroke: var(--gp-glint-stroke, #fff);
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-dasharray: 0.05 1;
    stroke-dashoffset: 0.06;
    filter: drop-shadow(0 0 4px var(--gp-glint));
    pointer-events: none;
    animation: gp-glint 7.5s cubic-bezier(0.65, 0, 0.35, 1) infinite backwards;
  }
  .gp-brackets {
    transition: opacity 200ms ease;
  }

  .gp-diamond {
    transition: opacity 300ms ease;
  }
  .gp-diamond-edge {
    fill: var(--gp-scene);
    stroke-width: 1.1;
    stroke-linejoin: miter;
  }
  .gp-diamond-trace {
    fill: none;
    stroke: var(--gp-line);
    stroke-width: 1;
    stroke-dasharray: 2 2.5;
  }
  .gp-satellite-name {
    font: 10px/1 var(--gp-mono);
    letter-spacing: -0.045em;
    word-spacing: -0.18em;
    text-transform: uppercase;
    stroke: var(--gp-scene);
    stroke-width: 3;
    stroke-opacity: 0.55;
    paint-order: stroke;
    transition: opacity 200ms ease;
  }
  .gp-satellite-name .gp-name {
    fill: var(--gp-faint);
  }
  .gp-satellite-name .gp-count {
    fill: var(--gp-ink-2);
    font-variant-numeric: tabular-nums;
  }
  .gp-satellite-name.is-lit .gp-name {
    fill: var(--gp-ink-2);
  }
  .gp-satellite-name.is-lit .gp-count {
    fill: var(--gp-ink);
  }

  .gp-leader {
    pointer-events: none;
  }
  .gp-leader-line {
    fill: none;
    stroke: var(--gp-line);
    stroke-width: 1;
    transition: opacity 200ms ease;
  }
  .gp-leader-end {
    fill: var(--gp-line);
    opacity: 0.9;
  }
  .gp-spine {
    stroke: var(--gp-line);
    stroke-width: 1;
    opacity: 0.2;
  }
  .gp-bar {
    fill: var(--gp-line);
    opacity: 0.95;
  }

  /* A goal's label: code and status, name, and the readout. */
  .gp-callout {
    position: absolute;
    width: 0;
    height: 0;
  }
  .gp-callout-label {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    color: var(--gp-ink);
    text-align: left;
    white-space: nowrap;
    pointer-events: auto;
  }
  .gp-callout.is-left .gp-callout-label {
    right: 0;
    left: auto;
    align-items: flex-end;
    text-align: right;
  }
  .gp-callout.is-ghost .gp-callout-label {
    pointer-events: none;
  }
  .gp-callout-head,
  .gp-caption,
  .gp-readout-line {
    font: 10px/1 var(--gp-mono);
    letter-spacing: -0.045em;
    word-spacing: -0.18em;
    text-transform: uppercase;
  }
  .gp-callout-head {
    display: flex;
    height: 14px;
    align-items: center;
    gap: 6px;
  }
  .gp-code,
  .gp-caption {
    color: var(--gp-faint);
  }
  .gp-status {
    color: var(--gp-mute);
  }
  .gp-callout-name {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    font: var(--gp-text-md);
  }
  .gp-callout.is-left .gp-callout-name {
    flex-direction: row-reverse;
  }
  .gp-readout {
    display: flex;
    gap: 14px;
    margin-top: 10px;
  }
  .gp-reading {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .gp-callout.is-left .gp-reading {
    align-items: flex-end;
  }
  .gp-reading.agents,
  .gp-reading.held {
    width: 36px;
  }
  .gp-reading.progress {
    width: 44px;
  }
  .gp-reading.burn {
    width: 28px;
  }
  .gp-value {
    display: flex;
    height: 16px;
    align-items: center;
    gap: 6px;
    color: var(--gp-ink);
    font: var(--gp-text-sm);
    font-variant-numeric: tabular-nums;
  }
  .gp-quiet {
    color: var(--gp-faint);
  }
  .gp-held-mark {
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 1px;
    background: var(--gp-blocked);
  }
  .gp-readout-line {
    position: absolute;
    top: 46px;
    left: 0;
    display: none;
    height: 12px;
    align-items: center;
    gap: 6px;
    color: var(--gp-mute);
    font-variant-numeric: tabular-nums;
    opacity: 0;
    transition: opacity 200ms ease;
  }
  .gp-callout.is-left .gp-readout-line {
    right: 0;
    left: auto;
  }
  .gp-sep {
    color: var(--gp-dim);
  }
  .gp-callout-label.is-compact .gp-readout {
    display: none;
  }
  .gp-callout-label.is-compact .gp-readout-line {
    display: flex;
  }
  .gp-callout.is-lit .gp-readout-line {
    opacity: 1;
  }

  /* The map window, framed like a viewfinder. */
  .gp-frame {
    position: absolute;
    top: 4px;
    right: 4px;
    bottom: 4px;
    left: 60px;
    pointer-events: none;
    animation: gp-rise 560ms var(--gp-ease) 600ms backwards;
  }
  .gp-crop {
    position: absolute;
    width: 12px;
    height: 12px;
    border: 0 solid rgb(255 255 255 / 0.2);
  }
  .gp-crop.tl {
    top: 0;
    left: 0;
    border-top-width: 1px;
    border-left-width: 1px;
  }
  .gp-crop.tr {
    top: 0;
    right: 0;
    border-top-width: 1px;
    border-right-width: 1px;
  }
  .gp-crop.bl {
    bottom: 0;
    left: 0;
    border-bottom-width: 1px;
    border-left-width: 1px;
  }
  .gp-crop.br {
    right: 0;
    bottom: 0;
    border-right-width: 1px;
    border-bottom-width: 1px;
  }

  /* The legend button at the bottom left. */
  .gp-controls {
    position: absolute;
    bottom: 10px;
    left: 4px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    animation: gp-rise 560ms var(--gp-ease) 260ms backwards;
  }
  .gp-well {
    display: flex;
    flex-direction: column;
    padding: 2px;
    border: 1px solid var(--gp-border);
    border-radius: 8px;
    background: var(--gp-surface);
    box-shadow: var(--gp-panel-shadow);
  }
  .gp-legend-button:focus-visible {
    outline: 1px solid var(--gp-ink-2);
    outline-offset: 1px;
  }
  .gp-icon {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }
  .gp-legend-button {
    width: 40px;
    height: 32px;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: var(--gp-mute);
    cursor: pointer;
    transition:
      color 150ms ease,
      background-color 150ms ease;
  }
  .gp-legend-button .gp-icon {
    width: 16px;
    height: 16px;
  }
  .gp-legend-button:hover,
  .gp-legend-button[aria-expanded='true'] {
    background: var(--gp-surface-muted);
    color: var(--gp-ink);
  }

  /* Reading the map: the legend, opened from its button. */
  .gp-legend {
    position: fixed;
    z-index: 1000;
    display: flex;
    width: 340px;
    max-width: calc(100vw - 24px);
    flex-direction: column;
    gap: 12px;
    box-sizing: border-box;
    padding: 16px;
    overflow-y: auto;
    border: 1px solid var(--gp-border);
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgb(196 216 255 / 0.06) 0%, rgb(196 216 255 / 0) 34%),
      rgb(13 17 23 / 0.9);
    box-shadow: 0 32px 72px -16px rgb(0 0 0 / 0.7);
    backdrop-filter: blur(30px) saturate(1.08) brightness(1.08);
    color: var(--gp-ink);
    font-size: 14px;
    animation: gp-pop 200ms var(--gp-ease);
  }
  .gp-legend-head {
    display: flex;
    height: 16px;
    flex: none;
    align-items: center;
    gap: 8px;
  }
  .gp-legend > .gp-legend-head {
    margin-bottom: 2px;
  }
  .gp-legend-head .gp-icon {
    width: 16px;
    height: 16px;
    color: var(--gp-mute);
  }
  .gp-legend-head h2,
  .gp-legend-head h3 {
    margin: 0;
    color: var(--gp-ink-2);
    font-size: 12px;
    font-weight: 400;
    line-height: 16px;
    text-transform: uppercase;
  }
  .gp-legend-well {
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-radius: 11px;
    background-color: rgb(255 255 255 / 0.025);
    background-image: linear-gradient(90deg, rgb(255 255 255 / 0.065), rgb(255 255 255 / 0.026) 22%, rgb(255 255 255 / 0.01) 55%, rgb(255 255 255 / 0));
  }
  .gp-legend-rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
  }
  .gp-legend-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: var(--gp-mute);
    font-size: 12px;
    line-height: 1.375;
  }
  .gp-legend-mark {
    display: block;
    flex: none;
    margin-top: -1px;
    fill: none;
    stroke: var(--gp-ink-2);
    stroke-width: 1.1;
  }
  .gp-legend-mark .solid {
    fill: var(--gp-ink-2);
    stroke: none;
  }
  .gp-legend-mark .blocked {
    stroke: var(--gp-blocked);
  }
  .gp-legend-mark .solid.blocked {
    fill: var(--gp-blocked);
    stroke: none;
  }
  .gp-legend-mark .failed {
    stroke: var(--gp-failed);
  }
  .gp-legend-mark .awaiting {
    stroke: var(--gp-awaiting);
  }
  .gp-legend-mark .degraded {
    stroke: var(--gp-warn);
  }
  .gp-legend-mark .solid.degraded {
    fill: var(--gp-warn);
    stroke: none;
  }

  /*
   * Light mode: the same room by day. A pale, faintly cool floor; the picture
   * laid down in ink (the WebGL pass does that); hairlines and text in the
   * page's inks; status hues one step deeper so they hold on white.
   */
  :host([data-mode='light']) {
    --gp-scene: #f6f7fb;
    --gp-ink: #111827;
    --gp-ink-2: #1f2937;
    --gp-mute: #4b5563;
    --gp-faint: #6b7280;
    --gp-dim: #c7cdd8;
    --gp-hairline: rgb(17 24 39 / 0.1);
    --gp-surface: var(--ui9000-color-surface, #ffffff);
    --gp-surface-muted: var(--ui9000-color-surface-muted, #f3f4f6);
    --gp-border: var(--ui9000-color-border, #e5e7eb);
    --gp-ok: #16a34a;
    --gp-warn: #c97a06;
    --gp-blocked: #e5560f;
    --gp-failed: #e11d48;
    --gp-awaiting: #6d5ce8;
    /* the default style's, light; the element sets the page style's */
    --gp-line: rgb(54 60 119);
    --gp-arc-glow: rgb(84 72 255 / 0.35);
    --gp-glint: rgb(115 105 255 / 0.5);
    --gp-glint-stroke: rgb(71 61 217);
    --gp-grid: rgb(71 61 217);
    --gp-mist: 181, 176, 255;
    --gp-floor-mist: 147, 140, 255;
  }
  :host([data-mode='light']) .gp-backdrop {
    background:
      radial-gradient(35% 39% at 53% 9%, rgba(var(--gp-mist), 0.16), rgba(var(--gp-mist), 0.05) 55%, transparent),
      radial-gradient(32% 37% at 34% 113%, rgba(var(--gp-floor-mist), 0.14), rgba(var(--gp-floor-mist), 0.04) 60%, transparent),
      radial-gradient(22% 28% at 74% 116%, rgba(var(--gp-floor-mist), 0.1), transparent 60%),
      linear-gradient(to bottom, #fbfcfe, #f3f5fa 60%, var(--gp-scene));
  }
  :host([data-mode='light']) .gp-grid {
    opacity: 0.08;
  }
  :host([data-mode='light']) .gp-grain {
    display: none;
  }
  :host([data-mode='light']) .gp-crop {
    border-color: rgb(17 24 39 / 0.22);
  }
  :host([data-mode='light']) .gp-legend {
    background: rgb(255 255 255 / 0.96);
    box-shadow: 0 18px 44px -16px rgb(15 23 42 / 0.28);
  }
  :host([data-mode='light']) .gp-legend-well {
    background-color: rgb(17 24 39 / 0.025);
    background-image: linear-gradient(90deg, rgb(17 24 39 / 0.045), rgb(17 24 39 / 0.015) 22%, rgb(17 24 39 / 0));
  }

  /* Entrances: each part comes up in place, then stays as it is. */
  .gp-appear {
    animation: gp-appear 800ms var(--gp-ease) backwards;
  }
  .gp-rise {
    animation: gp-rise 560ms var(--gp-ease) backwards;
  }
  .gp-draw {
    animation: gp-draw 1100ms var(--gp-ease) backwards;
  }
  @keyframes gp-appear {
    from {
      opacity: 0;
    }
  }
  @keyframes gp-rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @keyframes gp-draw {
    from {
      stroke-dashoffset: 1;
    }
  }
  @keyframes gp-glint {
    0% {
      stroke-dashoffset: 0.06;
    }
    34%,
    100% {
      stroke-dashoffset: -1;
    }
  }
  @keyframes gp-pop {
    from {
      opacity: 0;
      transform: scale(0.98) translateX(-6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .gp-appear,
    .gp-rise,
    .gp-draw,
    .gp-glint,
    .gp-frame,
    .gp-controls,
    .gp-legend {
      animation: none;
    }
  }
`;
