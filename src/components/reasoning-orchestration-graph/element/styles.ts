import { lightTheme } from '@fuselab-creative/design-system';
import { css, unsafeCSS } from 'lit';

import { hexWithAlpha } from '../../../utils/fusedash-visual.js';
import { STATUS, statusCss } from '../../goals-perimeter/render/scene-palette.js';

/** Chips and the legend: white on light, the darkest gray on dark. */
const CHIP_DARK = lightTheme.colors.ui.gray['14'];
/**
 * Benchmark deltas: the dataViz green and orange-red the goals graphs use for an ok and a blocked status, deepened
 * on light so they hold as text, as theirs are.
 */
const UP = { light: statusCss('light').ok, dark: STATUS.ok };
const DOWN = { light: statusCss('light').blocked, dark: STATUS.blocked };

/**
 * The shell, its text and its rules follow the package theme like every
 * other chart. Readouts and labels use that same family and the base size.
 */
export const reasoningOrchestrationStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: var(--ui9000-host-min-height, 520px);
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, Inter, sans-serif);
    box-sizing: border-box;
    --ro-muted: var(--ui9000-color-text-muted, #6b7280);
    --ro-rule: var(--ui9000-color-border, #e5e7eb);
    --ro-chip: ${unsafeCSS(hexWithAlpha('#FFFFFF', 86))};
    /* The legend's right end: the chip colour at 0.4 opacity. */
    --ro-chip-fade: ${unsafeCSS(hexWithAlpha('#FFFFFF', 40))};
    --ro-up: ${unsafeCSS(UP.light)};
    --ro-down: ${unsafeCSS(DOWN.light)};
  }

  :host([data-mode='dark']) {
    --ro-chip: ${unsafeCSS(hexWithAlpha(CHIP_DARK, 82))};
    --ro-chip-fade: ${unsafeCSS(hexWithAlpha(CHIP_DARK, 40))};
    --ro-up: ${unsafeCSS(UP.dark)};
    --ro-down: ${unsafeCSS(DOWN.dark)};
  }

  /* Capitals in the subtitle style (body/xs), as the other graphs' labels and legends. */
  .ro-readouts,
  .ro-chip,
  .ro-legend,
  .ro-panels,
  .ro-reset,
  .cap-note {
    font-family: var(--ui9000-font-family, Inter, sans-serif);
    font-size: var(--ui9000-font-size-subtitle, 10px);
    font-weight: var(--ui9000-font-weight-subtitle, 400);
    line-height: var(--ui9000-line-height-subtitle, 14px);
    letter-spacing: var(--ui9000-letter-spacing-subtitle, 0.02em);
    text-transform: uppercase;
  }

  /* The title has its own line and wraps instead of being cut; the experiment metadata is the line under it. */
  .widget-heading > .widget-title,
  .widget-heading > .widget-subtitle {
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .widget-heading > .widget-subtitle {
    color: var(--ro-muted);
  }

  /* Readouts over the entropy strip: its title and the benchmarks. */
  .ro-readouts {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    color: var(--ro-muted);
  }
  .ro-readouts > span {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .ro-readouts strong {
    color: var(--ui9000-color-text, #111827);
    font-weight: inherit;
  }

  .chart-root {
    position: relative;
    flex: 1 1 auto;
    width: 100%;
    min-height: var(--ui9000-plot-min-height, 340px);
    overflow: hidden;
  }
  .ro-canvas {
    position: absolute;
    inset: 0;
  }

  /* Model labels in the plot's top corners, legend bottom right. */
  .ro-models {
    position: absolute;
    inset: 6px 6px auto 6px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    pointer-events: none;
  }
  .ro-models-side {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .ro-models-side--right {
    align-items: flex-end;
  }
  .ro-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 3px 7px;
    border: 1px solid var(--ro-rule);
    border-radius: 2px;
    background: var(--ro-chip);
    color: var(--ro-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ro-chip-name {
    color: var(--ui9000-color-text, #111827);
  }
  .ro-dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .ro-legend {
    position: absolute;
    right: 6px;
    bottom: 6px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 5px 8px;
    border: 1px solid var(--ro-rule);
    border-radius: 2px;
    /* Solid behind the colour keys, thinning to 0.4 opacity on the right so the plot shows through the labels. */
    background: linear-gradient(90deg, var(--ro-chip) 0, var(--ro-chip) 28px, var(--ro-chip-fade) 100%);
    color: var(--ro-muted);
    pointer-events: none;
    transition: opacity 160ms ease;
  }
  /* Under the pointer the legend fades out, so the nodes beneath it show and stay hoverable. */
  .ro-legend.is-faded {
    opacity: 0;
  }
  /* A click on a stage name fades every stage name until the pointer leaves the plot or a click lands on empty plot; the nodes under them hover meanwhile. */
  .ro-readout {
    transition: opacity 160ms ease;
  }
  .chart-root.is-stages-faded .ro-readout {
    opacity: 0;
  }
  .chart-root.is-stages-faded .ro-stage-hit {
    pointer-events: none;
  }
  /* A selection other than the active path fades the notes off its chain. */
  .ro-note {
    transition: opacity 160ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .ro-legend,
    .ro-readout,
    .ro-note {
      transition: none;
    }
  }
  .ro-legend-title {
    color: var(--ui9000-color-text, #111827);
  }
  .ro-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .ro-swatch-path {
    flex: none;
    width: 14px;
    height: 2px;
    border-radius: 1px;
  }
  .ro-swatch-pruned {
    flex: none;
    width: 6px;
    text-align: center;
    line-height: 1;
    font-size: var(--ui9000-font-size-subtitle, 10px);
  }
  .ro-reset {
    position: absolute;
    left: 6px;
    bottom: 6px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: calc(50% - 12px);
    padding: 3px 8px;
    border: 1px solid var(--ro-rule);
    border-radius: 2px;
    background: var(--ro-chip);
    color: var(--ui9000-color-text, #111827);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ro-reset:hover,
  .ro-reset:focus-visible {
    border-color: var(--ro-muted);
    outline: none;
  }

  .ro-path.is-hover .ro-path-line {
    stroke-opacity: 1;
    stroke-width: 1.8;
  }
  .ro-path-hit:focus-visible {
    stroke: var(--ro-muted);
    stroke-opacity: 0.35;
  }

  /* Bottom panels: the step entropy strip, its benchmarks and its series. */
  .ro-panels {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--ro-rule);
    color: var(--ro-muted);
  }
  .ro-entropy {
    width: 100%;
    height: 30px;
  }
  .ro-benchmarks {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 2px 10px;
  }
  .ro-benchmark strong {
    color: var(--ui9000-color-text, #111827);
    font-weight: inherit;
  }
  .ro-delta[data-trend='up'] {
    color: var(--ro-up);
  }
  .ro-delta[data-trend='down'] {
    color: var(--ro-down);
  }
  .ro-panel {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }
  .ro-panel-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ro-series {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
  }
  .ro-series-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .ro-series-item strong {
    color: var(--ui9000-color-text, #111827);
    font-weight: inherit;
  }

  .empty {
    display: grid;
    place-items: center;
    height: 100%;
    min-height: inherit;
    color: var(--ro-muted);
    font-size: var(--ui9000-font-size-empty, 0.875rem);
  }
  .cap-note {
    color: var(--ro-muted);
  }
`;
