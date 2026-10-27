import { css, unsafeCSS } from 'lit';

import { CHART_TYPE } from '../../../utils/chart-theme.js';
import { statusCss } from '../render/scene-palette.js';

const DARK_STATUS = statusCss('dark');
const LIGHT_STATUS = statusCss('light');

/**
 * The arena is a scene, as in the Agent operations design: a graphite room
 * lit from above, a faint perspective floor, film grain, the slab of smoked
 * glass the arena stands on, the agents seated on it, and hairline
 * instruments in the scene's ink. It fills the card, dark with a dark page
 * and light with a light one (the same room by day). Colour only speaks when
 * something deviates: the design system's dataViz yellow, orange, red and
 * purple mean the same everywhere.
 *
 * The arena's own words — names and figures — are set in FuseDash's chart
 * face; its tips are the shared chart tooltip. Captions and states stay in
 * the instrument mono.
 */
export const assetHealthStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: var(--ui9000-host-min-height, 420px);
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, Inter, sans-serif);
    box-sizing: border-box;
    --ah-mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
    --ah-face: var(--ui9000-font-family, ${unsafeCSS(CHART_TYPE.fontFamily)});
    --ah-scene: #06080b;
    --ah-ink: #f1f4f8;
    --ah-ink-2: #d1d7df;
    --ah-mute: #a8b0bc;
    --ah-faint: #929ba8;
    --ah-dim: #424a55;
    --ah-well: rgb(176 204 255 / 0.045);
    --ah-hub: rgb(190 214 255);
    /* The legend button sits on the page's surface, and it and the legend take the page's border, as every other chart's legend does. */
    --ah-surface: var(--ui9000-color-surface, #13161d);
    --ah-surface-muted: var(--ui9000-color-surface-muted, #282e37);
    --ah-border: var(--ui9000-color-border, #444b57);
    --ah-panel-shadow:
      0 2px 4px 0 #141c2c0f,
      0 4px 8px 2px #141c2c0f;
    --ah-ok: ${unsafeCSS(DARK_STATUS.ok)};
    --ah-warn: ${unsafeCSS(DARK_STATUS.warn)};
    --ah-blocked: ${unsafeCSS(DARK_STATUS.blocked)};
    --ah-failed: ${unsafeCSS(DARK_STATUS.failed)};
    --ah-awaiting: ${unsafeCSS(DARK_STATUS.awaiting)};
    /* from the page style's sequential palette; the element sets them, these are the default style's */
    --ah-arc-glow: rgb(147 140 255 / 0.6);
    --ah-glint: rgb(181 176 255 / 0.9);
    --ah-glint-stroke: #ffffff;
    --ah-grid: rgb(147 140 255);
    --ah-mist: 127, 134, 223;
    --ah-floor-mist: 77, 81, 170;
    --ah-ease: cubic-bezier(0.2, 0.7, 0.2, 1);
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
    background: var(--ah-scene);
  }

  .chart-root {
    position: relative;
    flex: 1 1 auto;
    width: 100%;
    min-height: var(--ui9000-plot-min-height, 320px);
    overflow: hidden;
  }
  .chart-root[hidden] {
    display: none;
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
   * Shell header: the title, and under it the line that reads the goal.
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
  .ah-reading-line {
    display: flex;
    align-items: center;
    gap: 10px;
    /* the design system's body/xs, as every chart's subtitle */
    font-family: var(--ah-face);
    font-size: var(--ui9000-font-size-subtitle, 10px);
    font-weight: var(--ui9000-font-weight-subtitle, 400);
    line-height: var(--ui9000-line-height-subtitle, 14px);
    letter-spacing: var(--ui9000-letter-spacing-subtitle, 0.02em);
    text-transform: uppercase;
    color: var(--ui9000-color-text-muted, #6b7280);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  :host([data-mode='dark']) .ah-reading-line {
    color: var(--ah-mute);
  }
  .ah-divider {
    flex: none;
    width: 1px;
    height: 8px;
    background: var(--ah-dim);
  }
  .ah-held {
    color: var(--ah-blocked);
  }
  .ah-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ah-status-dot {
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--ah-ok);
  }
  .ah-status[data-tone='ok'] {
    color: var(--ah-ok);
  }
  .ah-status[data-tone='warn'] {
    color: var(--ah-warn);
  }
  .ah-status[data-tone='warn'] .ah-status-dot {
    background: var(--ah-warn);
  }
  .ah-status[data-tone='blocked'] {
    color: var(--ah-blocked);
  }
  .ah-status[data-tone='blocked'] .ah-status-dot {
    background: var(--ah-blocked);
  }

  /* The scene: the room, its floor and grain, and the agents' picture on the slab of glass. */
  .ah-scene {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    border-radius: inherit;
    background: var(--ah-scene);
    pointer-events: none;
  }
  .ah-scene[hidden] {
    display: none;
  }
  .ah-backdrop,
  .ah-grid-floor,
  .ah-grain,
  .ah-field,
  .ah-field-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .ah-backdrop {
    background:
      radial-gradient(35% 39% at 53% 9%, rgba(var(--ah-mist), 0.05), rgba(var(--ah-mist), 0.02) 55%, transparent),
      radial-gradient(26% 50% at 80% 22%, rgba(var(--ah-mist), 0.05), transparent 70%),
      radial-gradient(32% 37% at 34% 113%, rgba(var(--ah-floor-mist), 0.16), rgba(var(--ah-floor-mist), 0.05) 60%, transparent),
      radial-gradient(22% 28% at 74% 116%, rgba(var(--ah-floor-mist), 0.1), rgba(var(--ah-floor-mist), 0.03) 60%, transparent),
      radial-gradient(70% 60% at 50% 44%, rgb(18 24 32 / 0.5), transparent 70%),
      radial-gradient(120% 80% at 50% 120%, #0f141b, transparent 60%),
      linear-gradient(to bottom, #05070a, #070a0e 60%, var(--ah-scene));
  }
  .ah-grid {
    stroke: var(--ah-grid);
    stroke-width: 1;
    opacity: 0.09;
  }
  .ah-grain {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px 180px;
    opacity: 0.05;
    mix-blend-mode: screen;
  }

  /* The slab the arena stands on: its edge, then its top — smoked glass, with a hairline on its rim. */
  .ah-floor {
    position: absolute;
    border-radius: 50%;
    animation: ah-appear 800ms var(--ah-ease) 120ms backwards;
  }
  .ah-floor-edge {
    background: rgb(7 10 14 / 0.8);
    box-shadow:
      inset 0 0 0 1px rgb(196 216 255 / 0.13),
      0 46px 80px -22px rgb(0 0 0 / 0.75);
  }
  .ah-floor-top {
    background: radial-gradient(closest-side, rgb(9 13 18 / 0.62) 0%, rgb(12 17 23 / 0.56) 58%, rgb(20 27 36 / 0.6) 100%);
    backdrop-filter: blur(16px) saturate(1.08);
    box-shadow:
      inset 0 0 0 1px rgb(196 216 255 / 0.2),
      inset 0 1px 0 0 rgb(214 228 255 / 0.12);
  }

  /* The plot: the stage that turns, its overlay of instruments and its labels. */
  .ah-canvas,
  .ah-stage,
  .ah-overlay,
  .ah-labels {
    position: absolute;
    inset: 0;
  }
  .ah-stage {
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .ah-stage.is-dragging {
    cursor: grabbing;
  }
  .ah-overlay {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .ah-labels {
    pointer-events: none;
  }
  .ah-hit {
    cursor: pointer;
  }
  .ah-fade {
    transition: opacity 300ms ease;
  }
  .ah-cells {
    transition:
      fill-opacity 200ms ease,
      stroke-opacity 200ms ease;
  }
  .ah-quiet {
    pointer-events: none;
  }
  .ah-arc {
    filter: drop-shadow(0 0 3px var(--ah-arc-glow));
  }

  /* Type in the overlay: figures in the chart face, captions in the mono. */
  .ah-figure {
    fill: var(--ah-ink);
    font: 300 22px/1 var(--ah-face);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .ah-figure-unit {
    fill: var(--ah-mute);
    font: 400 12px/16px var(--ah-face);
    letter-spacing: 0;
  }
  .ah-compact-figure {
    fill: var(--ah-ink);
    font: 400 13px/16px var(--ah-face);
    font-variant-numeric: tabular-nums;
  }
  .ah-mini,
  .ah-cap {
    font-family: var(--ah-mono);
    font-size: 10px;
    line-height: 1;
    letter-spacing: -0.045em;
    word-spacing: -0.18em;
    text-transform: uppercase;
  }
  .ah-cap {
    font-size: 11px;
  }
  /* in the labels the small caps are the design system's body/xs, not the instrument mono */
  .ah-label .ah-mini {
    font-family: var(--ah-face);
    font-size: ${unsafeCSS(String(CHART_TYPE.subtitle))}px;
    font-weight: ${unsafeCSS(String(CHART_TYPE.subtitleWeight))};
    letter-spacing: ${unsafeCSS(CHART_TYPE.subtitleTracking)};
    word-spacing: normal;
    font-variant-numeric: tabular-nums;
  }
  text.ah-faint {
    fill: var(--ah-faint);
  }
  text.ah-mute {
    fill: var(--ah-mute);
  }
  .ah-halo {
    stroke: var(--ah-scene);
    stroke-width: 3px;
    stroke-opacity: 0.6;
    paint-order: stroke;
  }

  /* A section's label: its head, its readout and its lines of trouble, at one size whatever the arena's scale. */
  .ah-label {
    position: absolute;
    width: 0;
    height: 0;
  }
  .ah-label-body {
    position: absolute;
    top: 0;
    display: flex;
    flex-direction: column;
    white-space: nowrap;
    pointer-events: auto;
    color: var(--ah-ink);
  }
  .ah-label-body.is-right {
    left: 0;
    align-items: flex-start;
    text-align: left;
  }
  .ah-label-body.is-left {
    right: 0;
    align-items: flex-end;
    text-align: right;
  }
  .ah-label-body.is-ghost {
    pointer-events: none;
  }
  .ah-label-head {
    display: flex;
    flex-direction: column;
    padding: 0;
    border: 0;
    border-radius: 2px;
    background: none;
    color: inherit;
    font: inherit;
    text-align: inherit;
    cursor: pointer;
  }
  .is-right .ah-label-head {
    align-items: flex-start;
  }
  .is-left .ah-label-head {
    align-items: flex-end;
  }
  .ah-label-head:focus-visible,
  .ah-trouble-row:focus-visible {
    outline: 1px solid var(--ah-ink-2);
    outline-offset: 2px;
  }
  .ah-label-title {
    display: flex;
    height: 14px;
    align-items: center;
    gap: 6px;
    font-variant-numeric: tabular-nums;
  }
  .ah-label-name {
    color: var(--ah-ink-2);
    transition: color 150ms ease;
  }
  .ah-label-name.is-on {
    color: var(--ah-ink);
  }
  .ah-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--ah-tone);
  }
  .ah-tone {
    color: var(--ah-tone);
  }
  [data-tone='neutral'] {
    --ah-tone: var(--ah-mute);
  }
  [data-tone='neutral'] .ah-dot {
    background: var(--ah-faint);
  }
  [data-tone='warn'] {
    --ah-tone: var(--ah-warn);
  }
  [data-tone='awaiting'] {
    --ah-tone: var(--ah-awaiting);
  }
  [data-tone='blocked'] {
    --ah-tone: var(--ah-blocked);
  }
  [data-tone='failed'] {
    --ah-tone: var(--ah-failed);
  }
  .ah-label-count {
    margin-top: 2px;
    color: var(--ah-ink);
    font: 400 14px/20px var(--ah-face);
  }
  .ah-label-line {
    position: absolute;
    top: 46px;
    display: flex;
    height: 12px;
    align-items: center;
    gap: 6px;
    color: var(--ah-mute);
    font-variant-numeric: tabular-nums;
    opacity: 0;
    transition: opacity 200ms ease;
  }
  .is-right .ah-label-line {
    left: 0;
  }
  .is-left .ah-label-line {
    right: 0;
  }
  .ah-label-line.is-on {
    opacity: 1;
  }
  .ah-sep {
    color: var(--ah-dim);
  }
  .ah-readout {
    display: flex;
    gap: 16px;
    margin-top: 10px;
  }
  .ah-reading {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .is-left .ah-reading {
    align-items: flex-end;
  }
  .ah-reading .ah-faint {
    color: var(--ah-faint);
  }
  .w-agents {
    width: 44px;
  }
  .w-calls {
    width: 60px;
  }
  .w-held {
    width: 46px;
  }
  .ah-reading-value {
    display: flex;
    height: 16px;
    align-items: center;
    color: var(--ah-ink);
    font: 400 13px/16px var(--ah-face);
    font-variant-numeric: tabular-nums;
  }
  .ah-reading-value.is-quiet {
    color: var(--ah-faint);
  }
  .ah-troubles {
    display: flex;
    width: 100%;
    flex-direction: column;
    margin-top: 9px;
  }
  .ah-trouble-row {
    display: flex;
    width: 100%;
    height: 20px;
    align-items: center;
    gap: 8px;
    padding: 0;
    border: 0;
    border-radius: 2px;
    background: none;
    color: var(--ah-ink-2);
    font: 400 13px/16px var(--ah-face);
    cursor: pointer;
  }
  .ah-trouble-mark {
    width: 10px;
    height: 10px;
    flex: none;
    overflow: visible;
  }
  .ah-trouble-asset {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 150ms ease;
  }
  .ah-trouble-row:hover .ah-trouble-asset,
  .ah-trouble-asset.is-on {
    color: var(--ah-ink);
  }
  .ah-leader {
    flex: 1 1 0%;
    min-width: 12px;
    height: 1px;
    align-self: center;
    color: var(--ah-dim);
    background-image: linear-gradient(90deg, currentColor 1px, transparent 1px);
    background-size: 4px 1px;
    background-repeat: repeat-x;
  }
  .ah-trouble-row .ah-cap {
    flex: none;
    font-variant-numeric: tabular-nums;
  }

  /* The legend button at the bottom left. */
  .ah-controls {
    position: absolute;
    bottom: 10px;
    left: 4px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    animation: ah-rise 560ms var(--ah-ease) 260ms backwards;
  }
  .ah-well {
    display: flex;
    flex-direction: column;
    padding: 2px;
    border: 1px solid var(--ah-border);
    border-radius: 8px;
    background: var(--ah-surface);
    box-shadow: var(--ah-panel-shadow);
  }
  .ah-legend-button:focus-visible {
    outline: 1px solid var(--ah-ink-2);
    outline-offset: 1px;
  }
  .ah-icon {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }
  .ah-legend-button {
    width: 40px;
    height: 32px;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: var(--ah-mute);
    cursor: pointer;
    transition:
      color 150ms ease,
      background-color 150ms ease;
  }
  .ah-legend-button .ah-icon {
    width: 16px;
    height: 16px;
  }
  .ah-legend-button:hover,
  .ah-legend-button[aria-expanded='true'] {
    background: var(--ah-surface-muted);
    color: var(--ah-ink);
  }

  /* Reading the goal: the legend, opened from its button. */
  .ah-legend {
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
    border: 1px solid var(--ah-border);
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgb(196 216 255 / 0.06) 0%, rgb(196 216 255 / 0) 34%),
      rgb(13 17 23 / 0.9);
    box-shadow: 0 32px 72px -16px rgb(0 0 0 / 0.7);
    backdrop-filter: blur(30px) saturate(1.08) brightness(1.08);
    color: var(--ah-ink);
    font-size: 14px;
    animation: ah-pop 200ms var(--ah-ease);
  }
  .ah-legend-head {
    display: flex;
    height: 16px;
    flex: none;
    align-items: center;
    gap: 8px;
  }
  .ah-legend > .ah-legend-head {
    margin-bottom: 2px;
  }
  .ah-legend-head .ah-icon {
    width: 16px;
    height: 16px;
    color: var(--ah-mute);
  }
  .ah-legend-head h2,
  .ah-legend-head h3 {
    margin: 0;
    color: var(--ah-ink-2);
    font-size: 12px;
    font-weight: 400;
    line-height: 16px;
    text-transform: uppercase;
  }
  .ah-legend-well {
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-radius: 11px;
    background-color: rgb(255 255 255 / 0.025);
    background-image: linear-gradient(90deg, rgb(255 255 255 / 0.065), rgb(255 255 255 / 0.026) 22%, rgb(255 255 255 / 0.01) 55%, rgb(255 255 255 / 0));
  }
  .ah-legend-rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
  }
  .ah-legend-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: var(--ah-mute);
    font-size: 12px;
    line-height: 1.375;
  }
  .ah-legend-mark {
    display: block;
    flex: none;
    margin-top: -1px;
    fill: none;
    stroke: var(--ah-ink-2);
    stroke-width: 1.1;
  }
  .ah-legend-mark .solid {
    fill: var(--ah-ink-2);
    stroke: none;
  }
  .ah-legend-mark .blocked {
    stroke: var(--ah-blocked);
  }
  .ah-legend-mark .solid.blocked {
    fill: var(--ah-blocked);
    stroke: none;
  }
  .ah-legend-mark .failed {
    stroke: var(--ah-failed);
  }
  .ah-legend-mark .solid-stroke.failed {
    fill: var(--ah-failed);
  }
  .ah-legend-mark .awaiting {
    stroke: var(--ah-awaiting);
  }
  .ah-legend-mark .warn {
    stroke: var(--ah-warn);
  }
  .ah-legend-mark .solid.warn {
    fill: var(--ah-warn);
    stroke: none;
  }

  /*
   * Light mode: the same room by day. A pale, faintly cool floor; the picture
   * laid down in ink (the WebGL pass does that); hairlines and text in the
   * page's inks; status hues deepened so they hold on white.
   */
  :host([data-mode='light']) {
    --ah-scene: #f6f7fb;
    --ah-ink: #111827;
    --ah-ink-2: #1f2937;
    --ah-mute: #4b5563;
    --ah-faint: #6b7280;
    --ah-dim: #c7cdd8;
    --ah-well: rgb(17 24 39 / 0.04);
    --ah-hub: rgb(71 85 105);
    --ah-surface: var(--ui9000-color-surface, #ffffff);
    --ah-surface-muted: var(--ui9000-color-surface-muted, #f3f4f6);
    --ah-border: var(--ui9000-color-border, #e5e7eb);
    --ah-ok: ${unsafeCSS(LIGHT_STATUS.ok)};
    --ah-warn: ${unsafeCSS(LIGHT_STATUS.warn)};
    --ah-blocked: ${unsafeCSS(LIGHT_STATUS.blocked)};
    --ah-failed: ${unsafeCSS(LIGHT_STATUS.failed)};
    --ah-awaiting: ${unsafeCSS(LIGHT_STATUS.awaiting)};
    /* the default style's, light; the element sets the page style's */
    --ah-arc-glow: rgb(84 72 255 / 0.35);
    --ah-glint: rgb(115 105 255 / 0.5);
    --ah-glint-stroke: rgb(71 61 217);
    --ah-grid: rgb(71 61 217);
    --ah-mist: 181, 176, 255;
    --ah-floor-mist: 147, 140, 255;
  }
  :host([data-mode='light']) .ah-backdrop {
    background:
      radial-gradient(35% 39% at 53% 9%, rgba(var(--ah-mist), 0.16), rgba(var(--ah-mist), 0.05) 55%, transparent),
      radial-gradient(32% 37% at 34% 113%, rgba(var(--ah-floor-mist), 0.14), rgba(var(--ah-floor-mist), 0.04) 60%, transparent),
      radial-gradient(22% 28% at 74% 116%, rgba(var(--ah-floor-mist), 0.1), transparent 60%),
      linear-gradient(to bottom, #fbfcfe, #f3f5fa 60%, var(--ah-scene));
  }
  :host([data-mode='light']) .ah-grid {
    opacity: 0.08;
  }
  :host([data-mode='light']) .ah-grain {
    display: none;
  }
  :host([data-mode='light']) .ah-floor-edge {
    background: rgb(226 232 240 / 0.85);
    box-shadow:
      inset 0 0 0 1px rgb(17 24 39 / 0.12),
      0 46px 80px -22px rgb(15 23 42 / 0.28);
  }
  :host([data-mode='light']) .ah-floor-top {
    background: radial-gradient(closest-side, rgb(255 255 255 / 0.72) 0%, rgb(248 250 252 / 0.66) 58%, rgb(241 245 249 / 0.72) 100%);
    box-shadow:
      inset 0 0 0 1px rgb(17 24 39 / 0.14),
      inset 0 1px 0 0 rgb(255 255 255 / 0.9);
  }
  :host([data-mode='light']) .ah-legend {
    background: rgb(255 255 255 / 0.96);
    box-shadow: 0 18px 44px -16px rgb(15 23 42 / 0.28);
  }
  :host([data-mode='light']) .ah-legend-well {
    background-color: rgb(17 24 39 / 0.025);
    background-image: linear-gradient(90deg, rgb(17 24 39 / 0.045), rgb(17 24 39 / 0.015) 22%, rgb(17 24 39 / 0));
  }

  /* Entrances: each part comes up in place, then stays as it is. */
  .ah-appear {
    animation: ah-appear 800ms var(--ah-ease) backwards;
  }
  .ah-rise {
    animation: ah-rise 560ms var(--ah-ease) backwards;
  }
  .ah-draw {
    animation: ah-draw 1100ms var(--ah-ease) backwards;
  }
  /* now and then a glint runs along a stroke, as light along an edge */
  .ah-glint {
    filter: drop-shadow(0 0 4px var(--ah-glint));
    animation: ah-glint 7.5s cubic-bezier(0.65, 0, 0.35, 1) infinite backwards;
  }
  @keyframes ah-appear {
    from {
      opacity: 0;
    }
  }
  @keyframes ah-rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @keyframes ah-draw {
    from {
      stroke-dashoffset: 1;
    }
  }
  @keyframes ah-glint {
    0% {
      stroke-dashoffset: 0.06;
    }
    34%,
    100% {
      stroke-dashoffset: -1;
    }
  }
  @keyframes ah-pop {
    from {
      opacity: 0;
      transform: scale(0.98) translateX(-6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ah-appear,
    .ah-rise,
    .ah-draw,
    .ah-glint,
    .ah-floor,
    .ah-controls,
    .ah-legend {
      animation: none;
    }
  }
`;
