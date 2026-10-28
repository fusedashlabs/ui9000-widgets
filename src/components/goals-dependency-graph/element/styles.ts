import { css, unsafeCSS } from 'lit';

import { CHART_TYPE } from '../../../utils/chart-theme.js';
import { statusCss } from '../render/scene-palette.js';

const DARK_STATUS = statusCss('dark');
const LIGHT_STATUS = statusCss('light');

/**
 * The graph is a scene, as in the Agent operations design and as the goals
 * perimeter draws it: a graphite room lit from above, a faint perspective
 * floor, film grain, the trees of agents, and hairline instruments in the
 * scene's ink. It fills the card, dark with a dark page and light with a
 * light one (the same room by day). Colour only speaks when something
 * deviates: the design system's dataViz green, yellow, orange, red and purple
 * mean the same everywhere.
 *
 * Every word is set in FuseDash's chart face and type scale, as the other
 * charts' are: goal names in body md, figures in body sm, and codes,
 * statuses, captions and the groups' names in body xs capitals. Its tips are
 * the shared chart tooltip.
 */
export const goalsDependencyGraphStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: var(--ui9000-host-min-height, 420px);
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, Inter, sans-serif);
    box-sizing: border-box;
    /* FuseDash's chart face: design-system body md (names), body sm (figures) and body xs (small capitals) */
    --gd-face: var(--ui9000-font-family, ${unsafeCSS(CHART_TYPE.fontFamily)});
    --gd-text-md: ${unsafeCSS(String(CHART_TYPE.headingWeight))} ${unsafeCSS(String(CHART_TYPE.heading))}px / ${unsafeCSS(String(CHART_TYPE.headingLine))}px var(--gd-face);
    --gd-text-sm: ${unsafeCSS(String(CHART_TYPE.labelWeight))} ${unsafeCSS(String(CHART_TYPE.label))}px / ${unsafeCSS(String(CHART_TYPE.labelLine))}px var(--gd-face);
    --gd-text-xs: ${unsafeCSS(String(CHART_TYPE.subtitleWeight))} ${unsafeCSS(String(CHART_TYPE.subtitle))}px / 1 var(--gd-face);
    --gd-tracking-xs: ${unsafeCSS(CHART_TYPE.subtitleTracking)};
    --gd-scene: #06080b;
    --gd-ink: #f1f4f8;
    --gd-ink-2: #d1d7df;
    --gd-mute: #a8b0bc;
    --gd-faint: #929ba8;
    --gd-dim: #424a55;
    /* The legend button sits on the page's surface, and it and the legend take the page's border, as every other chart's legend does. */
    --gd-surface: var(--ui9000-color-surface, #13161d);
    --gd-surface-muted: var(--ui9000-color-surface-muted, #282e37);
    --gd-border: var(--ui9000-color-border, #444b57);
    --gd-panel-shadow:
      0 2px 4px 0 #141c2c0f,
      0 4px 8px 2px #141c2c0f;
    --gd-ok: ${unsafeCSS(DARK_STATUS.ok)};
    --gd-warn: ${unsafeCSS(DARK_STATUS.warn)};
    --gd-blocked: ${unsafeCSS(DARK_STATUS.blocked)};
    --gd-failed: ${unsafeCSS(DARK_STATUS.failed)};
    --gd-awaiting: ${unsafeCSS(DARK_STATUS.awaiting)};
    /* from the page style's palettes; the element sets them, these are the default style's */
    --gd-line: rgb(229 229 251);
    --gd-traffic: rgb(255 214 140);
    --gd-arc-glow: rgb(147 140 255 / 0.6);
    --gd-grid: rgb(147 140 255);
    --gd-mist: 127, 134, 223;
    --gd-floor-mist: 77, 81, 170;
    --gd-ease: cubic-bezier(0.2, 0.7, 0.2, 1);
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
    background: var(--gd-scene);
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
   * Shell header: the title, and under it the line that reads the graph.
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
  .gd-reading-line {
    display: flex;
    align-items: center;
    gap: 10px;
    /* the design system's body/xs, as every chart's subtitle */
    font-family: var(--gd-face);
    font-size: var(--ui9000-font-size-subtitle, 10px);
    font-weight: var(--ui9000-font-weight-subtitle, 400);
    line-height: var(--ui9000-line-height-subtitle, 14px);
    letter-spacing: var(--ui9000-letter-spacing-subtitle, 0.02em);
    text-transform: uppercase;
    color: var(--ui9000-color-text-muted, #6b7280);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  :host([data-mode='dark']) .gd-reading-line {
    color: var(--gd-mute);
  }
  .gd-divider {
    flex: none;
    width: 1px;
    height: 8px;
    background: var(--gd-dim);
  }
  .gd-held {
    color: var(--gd-blocked);
  }

  /* The scene: the room, its floor and grain, and the agents' picture. */
  .gd-scene {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    border-radius: inherit;
    background: var(--gd-scene);
    pointer-events: none;
  }
  .gd-scene[hidden] {
    display: none;
  }
  .gd-backdrop,
  .gd-floor,
  .gd-grain,
  .gd-field,
  .gd-field-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .gd-backdrop {
    background:
      radial-gradient(35% 39% at 53% 9%, rgba(var(--gd-mist), 0.05), rgba(var(--gd-mist), 0.02) 55%, transparent),
      radial-gradient(26% 50% at 80% 22%, rgba(var(--gd-mist), 0.05), transparent 70%),
      radial-gradient(32% 37% at 34% 113%, rgba(var(--gd-floor-mist), 0.16), rgba(var(--gd-floor-mist), 0.05) 60%, transparent),
      radial-gradient(22% 28% at 74% 116%, rgba(var(--gd-floor-mist), 0.1), rgba(var(--gd-floor-mist), 0.03) 60%, transparent),
      radial-gradient(70% 60% at 50% 44%, rgb(18 24 32 / 0.5), transparent 70%),
      radial-gradient(120% 80% at 50% 120%, #0f141b, transparent 60%),
      linear-gradient(to bottom, #05070a, #070a0e 60%, var(--gd-scene));
  }
  .gd-grid {
    stroke: var(--gd-grid);
    stroke-width: 1;
    opacity: 0.09;
  }
  .gd-grain {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px 180px;
    opacity: 0.05;
    mix-blend-mode: screen;
  }

  /* The plot: the stage that pans, its overlay of instruments and its labels. */
  .gd-canvas,
  .gd-stage,
  .gd-overlay,
  .gd-labels {
    position: absolute;
    inset: 0;
  }
  .gd-stage {
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .gd-stage.is-dragging {
    cursor: grabbing;
  }
  .gd-overlay {
    overflow: visible;
    pointer-events: none;
  }
  .gd-labels {
    pointer-events: none;
  }
  .gd-hit {
    fill: transparent;
  }

  .gd-baseline {
    opacity: 0.2;
    pointer-events: none;
  }
  .gd-baseline-fade {
    color: var(--gd-line);
  }

  .gd-tree {
    transition: opacity 200ms ease;
    pointer-events: none;
  }
  .gd-limbs,
  .gd-twigs {
    fill: none;
    stroke: var(--gd-line);
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }
  .gd-limbs {
    stroke-width: 0.8;
  }
  .gd-twigs {
    stroke-width: 0.6;
  }

  .gd-edge {
    cursor: pointer;
    pointer-events: auto;
    transition: opacity 200ms ease;
  }
  .gd-edge-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 12;
    pointer-events: stroke;
  }
  .gd-edge-line {
    fill: none;
    stroke-width: 1;
    pointer-events: none;
  }
  .gd-edge-line.is-bright {
    stroke-width: 1.5;
    filter: drop-shadow(0 0 3px var(--gd-edge-color));
  }
  .gd-edge-run {
    fill: none;
    stroke-linecap: round;
    stroke-dasharray: 0.022 0.978;
    filter: drop-shadow(0 0 2.5px var(--gd-edge-color));
    pointer-events: none;
    animation: gd-run 4s linear infinite;
  }

  .gd-resource {
    cursor: pointer;
    pointer-events: auto;
    transition: opacity 200ms ease;
  }
  .gd-diamond-edge {
    fill: var(--gd-scene);
    stroke-width: 1.1;
    stroke-linejoin: miter;
  }
  .gd-diamond-trace {
    fill: none;
    stroke: var(--gd-line);
    stroke-width: 1;
    stroke-dasharray: 2 2.5;
  }
  .gd-resource-name {
    font: var(--gd-text-xs);
    letter-spacing: var(--gd-tracking-xs);
    text-transform: uppercase;
    stroke: var(--gd-scene);
    stroke-width: 3;
    stroke-opacity: 0.55;
    paint-order: stroke;
  }
  .gd-resource-name .gd-name {
    fill: var(--gd-mute);
  }
  .gd-resource-name .gd-count {
    fill: var(--gd-ink);
    font-variant-numeric: tabular-nums;
  }
  .gd-resource-name.is-lit .gd-name {
    fill: var(--gd-ink-2);
  }

  .gd-root {
    transition: opacity 200ms ease;
  }
  .gd-root-mark {
    fill: none;
    cursor: pointer;
    pointer-events: auto;
  }
  .gd-disc {
    fill: var(--gd-scene);
    fill-opacity: 0.82;
  }
  .gd-glass {
    pointer-events: none;
  }
  .gd-ticks,
  .gd-rest,
  .gd-needle,
  .gd-progress,
  .gd-brackets {
    stroke: var(--gd-line);
    stroke-width: 1;
  }
  .gd-needle {
    stroke-width: 1.25;
  }
  .gd-progress {
    stroke-width: 1.25;
    opacity: 0.88;
    filter: drop-shadow(0 0 3px var(--gd-arc-glow));
  }
  .gd-brackets {
    transition: opacity 200ms ease;
  }

  .gd-leader {
    pointer-events: none;
  }
  .gd-leader-line {
    fill: none;
    stroke: var(--gd-line);
    stroke-width: 1;
    opacity: 0.5;
  }
  .gd-leader-end {
    fill: var(--gd-line);
    opacity: 0.9;
  }
  .gd-spine {
    stroke: var(--gd-line);
    stroke-width: 1;
    opacity: 0.2;
  }
  .gd-bar {
    opacity: 0.95;
  }

  /* A goal's label under its root: code and status, name, and the readout. It is the goal's button. */
  .gd-label {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 2px;
    background: none;
    color: var(--gd-ink-2);
    text-align: center;
    cursor: pointer;
    pointer-events: auto;
    transform: translateX(-50%);
    transition: opacity 200ms ease;
  }
  .gd-label:focus-visible {
    outline: 1px solid var(--gd-ink-2);
    outline-offset: 4px;
  }
  .gd-label-head,
  .gd-caption,
  .gd-readout-line {
    font: var(--gd-text-xs);
    letter-spacing: var(--gd-tracking-xs);
    text-transform: uppercase;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .gd-label-head {
    display: flex;
    height: 14px;
    align-items: center;
    gap: 6px;
  }
  .gd-code,
  .gd-caption {
    color: var(--gd-faint);
  }
  .gd-status {
    color: var(--gd-mute);
  }
  .gd-status-dot {
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }
  .gd-label-name {
    margin-top: 2px;
    font: var(--gd-text-md);
    text-wrap: balance;
    transition: color 200ms ease;
  }
  .gd-label.is-main .gd-label-name,
  .gd-label.is-lit .gd-label-name {
    color: var(--gd-ink);
  }
  .gd-readout {
    display: flex;
    gap: 14px;
    margin-top: 10px;
    text-align: left;
    white-space: nowrap;
  }
  .gd-label:not(.is-main) .gd-readout,
  .gd-label.is-folded .gd-readout {
    display: none;
  }
  .gd-reading {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .gd-reading.agents,
  .gd-reading.held,
  .gd-reading.goals {
    min-width: 36px;
  }
  .gd-reading.progress {
    min-width: 44px;
  }
  .gd-reading.burn,
  .gd-reading.for {
    min-width: 30px;
  }
  .gd-value {
    display: flex;
    height: 16px;
    align-items: center;
    gap: 6px;
    color: var(--gd-ink);
    font: var(--gd-text-sm);
    font-variant-numeric: tabular-nums;
  }
  .gd-quiet {
    color: var(--gd-faint);
  }
  .gd-strong {
    color: var(--gd-ink-2);
  }
  .gd-held-mark {
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 1px;
    background: var(--gd-blocked);
  }
  .gd-readout-line {
    display: flex;
    height: 12px;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    color: var(--gd-mute);
    transition: opacity 200ms ease;
  }
  .gd-label.is-main:not(.is-folded) .gd-readout-line {
    display: none;
  }
  .gd-label.is-compact:not(.is-lit) .gd-readout-line {
    opacity: 0;
  }
  .gd-sep {
    color: var(--gd-dim);
  }

  /* The traced line's label, over the row of groups. */
  .gd-trace {
    position: absolute;
    width: 0;
    height: 0;
  }
  .gd-trace-label {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    color: var(--gd-ink);
    text-align: left;
    white-space: nowrap;
    pointer-events: auto;
  }
  .gd-trace.is-left .gd-trace-label {
    right: 0;
    left: auto;
    align-items: flex-end;
    text-align: right;
  }
  .gd-trace.is-left .gd-reading {
    align-items: flex-end;
  }
  .gd-trace-title {
    max-width: 300px;
    margin-top: 2px;
    overflow: hidden;
    font: var(--gd-text-md);
    text-overflow: ellipsis;
  }

  /* The legend button at the bottom left. */
  .gd-controls {
    position: absolute;
    bottom: 10px;
    left: 4px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    animation: gd-rise 560ms var(--gd-ease) 260ms backwards;
  }
  .gd-well {
    display: flex;
    flex-direction: column;
    padding: 2px;
    border: 1px solid var(--gd-border);
    border-radius: 8px;
    background: var(--gd-surface);
    box-shadow: var(--gd-panel-shadow);
  }
  .gd-legend-button:focus-visible {
    outline: 1px solid var(--gd-ink-2);
    outline-offset: 1px;
  }
  .gd-icon {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }
  .gd-legend-button {
    width: 40px;
    height: 32px;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: var(--gd-mute);
    cursor: pointer;
    transition:
      color 150ms ease,
      background-color 150ms ease;
  }
  .gd-legend-button .gd-icon {
    width: 16px;
    height: 16px;
  }
  .gd-legend-button:hover,
  .gd-legend-button[aria-expanded='true'] {
    background: var(--gd-surface-muted);
    color: var(--gd-ink);
  }

  /* Reading the graph: the legend, opened from its button, placed in the shell so a scaled ancestor (the docs page) cannot throw it. */
  .gd-legend {
    position: absolute;
    z-index: 1000;
    display: flex;
    width: 340px;
    max-width: calc(100% - 24px);
    flex-direction: column;
    gap: 12px;
    box-sizing: border-box;
    padding: 16px;
    overflow-y: auto;
    border: 1px solid var(--gd-border);
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgb(196 216 255 / 0.06) 0%, rgb(196 216 255 / 0) 34%),
      rgb(13 17 23 / 0.9);
    box-shadow: 0 32px 72px -16px rgb(0 0 0 / 0.7);
    backdrop-filter: blur(30px) saturate(1.08) brightness(1.08);
    color: var(--gd-ink);
    font-family: var(--gd-face);
    animation: gd-pop 200ms var(--gd-ease);
  }
  .gd-legend-head {
    display: flex;
    height: 16px;
    flex: none;
    align-items: center;
    gap: 8px;
  }
  .gd-legend > .gd-legend-head {
    margin-bottom: 2px;
  }
  .gd-legend-head .gd-icon {
    width: 16px;
    height: 16px;
    color: var(--gd-mute);
  }
  .gd-legend-head h2,
  .gd-legend-head h3 {
    margin: 0;
    color: var(--gd-ink-2);
    font: var(--gd-text-sm);
    letter-spacing: var(--gd-tracking-xs);
    text-transform: uppercase;
  }
  .gd-legend-well {
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-radius: 11px;
    background-color: rgb(255 255 255 / 0.025);
    background-image: linear-gradient(90deg, rgb(255 255 255 / 0.065), rgb(255 255 255 / 0.026) 22%, rgb(255 255 255 / 0.01) 55%, rgb(255 255 255 / 0));
  }
  .gd-legend-rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
  }
  .gd-legend-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: var(--gd-mute);
    font: var(--gd-text-sm);
  }
  .gd-legend-mark {
    display: block;
    flex: none;
    margin-top: -1px;
    fill: none;
    stroke: var(--gd-ink-2);
    stroke-width: 1.1;
  }
  .gd-legend-mark .solid {
    fill: var(--gd-ink-2);
    stroke: none;
  }
  .gd-legend-mark .blocked {
    stroke: var(--gd-blocked);
  }
  .gd-legend-mark .solid.blocked {
    fill: var(--gd-blocked);
    stroke: none;
  }
  .gd-legend-mark .failed {
    stroke: var(--gd-failed);
  }
  .gd-legend-mark .awaiting {
    stroke: var(--gd-awaiting);
  }
  .gd-legend-mark .degraded {
    stroke: var(--gd-warn);
  }
  .gd-legend-mark .solid.degraded {
    fill: var(--gd-warn);
    stroke: none;
  }
  .gd-legend-mark .traffic {
    stroke: var(--gd-traffic);
  }

  /*
   * Light mode: the same room by day. A pale, faintly cool floor; the picture
   * laid down in ink (the WebGL pass does that); hairlines and text in the
   * page's inks; status hues deepened so they hold on white.
   */
  :host([data-mode='light']) {
    --gd-scene: #f6f7fb;
    --gd-ink: #111827;
    --gd-ink-2: #1f2937;
    --gd-mute: #4b5563;
    --gd-faint: #6b7280;
    --gd-dim: #c7cdd8;
    --gd-surface: var(--ui9000-color-surface, #ffffff);
    --gd-surface-muted: var(--ui9000-color-surface-muted, #f3f4f6);
    --gd-border: var(--ui9000-color-border, #e5e7eb);
    --gd-ok: ${unsafeCSS(LIGHT_STATUS.ok)};
    --gd-warn: ${unsafeCSS(LIGHT_STATUS.warn)};
    --gd-blocked: ${unsafeCSS(LIGHT_STATUS.blocked)};
    --gd-failed: ${unsafeCSS(LIGHT_STATUS.failed)};
    --gd-awaiting: ${unsafeCSS(LIGHT_STATUS.awaiting)};
    /* the default style's, light; the element sets the page style's */
    --gd-line: rgb(54 60 119);
    --gd-traffic: rgb(156 104 28);
    --gd-arc-glow: rgb(84 72 255 / 0.35);
    --gd-grid: rgb(71 61 217);
    --gd-mist: 181, 176, 255;
    --gd-floor-mist: 147, 140, 255;
  }
  :host([data-mode='light']) .gd-backdrop {
    background:
      radial-gradient(35% 39% at 53% 9%, rgba(var(--gd-mist), 0.16), rgba(var(--gd-mist), 0.05) 55%, transparent),
      radial-gradient(32% 37% at 34% 113%, rgba(var(--gd-floor-mist), 0.14), rgba(var(--gd-floor-mist), 0.04) 60%, transparent),
      radial-gradient(22% 28% at 74% 116%, rgba(var(--gd-floor-mist), 0.1), transparent 60%),
      linear-gradient(to bottom, #fbfcfe, #f3f5fa 60%, var(--gd-scene));
  }
  :host([data-mode='light']) .gd-grid {
    opacity: 0.08;
  }
  :host([data-mode='light']) .gd-grain {
    display: none;
  }
  :host([data-mode='light']) .gd-baseline {
    opacity: 0.3;
  }
  :host([data-mode='light']) .gd-legend {
    background: rgb(255 255 255 / 0.96);
    box-shadow: 0 18px 44px -16px rgb(15 23 42 / 0.28);
  }
  :host([data-mode='light']) .gd-legend-well {
    background-color: rgb(17 24 39 / 0.025);
    background-image: linear-gradient(90deg, rgb(17 24 39 / 0.045), rgb(17 24 39 / 0.015) 22%, rgb(17 24 39 / 0));
  }

  /* Entrances: each part comes up in place, then stays as it is. */
  .gd-appear {
    animation: gd-appear 800ms var(--gd-ease) backwards;
  }
  .gd-rise {
    animation: gd-rise 560ms var(--gd-ease) backwards;
  }
  .gd-label.gd-rise {
    animation-name: gd-rise-centred;
  }
  @keyframes gd-appear {
    from {
      opacity: 0;
    }
  }
  @keyframes gd-rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @keyframes gd-rise-centred {
    from {
      opacity: 0;
      transform: translate(-50%, 8px);
    }
  }
  /* a light running the length of a line (pathLength 1, dash 0.022 0.978) */
  @keyframes gd-run {
    from {
      stroke-dashoffset: 1;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes gd-pop {
    from {
      opacity: 0;
      transform: scale(0.98) translateX(-6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .gd-appear,
    .gd-rise,
    .gd-controls,
    .gd-legend {
      animation: none;
    }
  }
`;
