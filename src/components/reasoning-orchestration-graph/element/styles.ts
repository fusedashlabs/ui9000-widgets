import { css } from 'lit';

/**
 * The shell, its text and its rules follow the package theme like every
 * other chart. Readouts, model labels and panels use the design board's
 * monospace, upper-case treatment; their colours come from the palette.
 */
export const reasoningOrchestrationStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: var(--ui9000-host-min-height, 520px);
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, system-ui, sans-serif);
    box-sizing: border-box;
    --ro-mono: var(--ui9000-font-family-mono, ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace);
    --ro-muted: var(--ui9000-color-text-muted, #6b7280);
    --ro-rule: var(--ui9000-color-border, #e5e7eb);
    --ro-chip: rgba(255, 255, 255, 0.86);
    --ro-up: #0f9488;
    --ro-down: #e03131;
  }

  :host([data-mode='dark']) {
    --ro-chip: rgba(15, 18, 25, 0.82);
    --ro-up: #4fd1c5;
    --ro-down: #ff5d5d;
  }

  .mono,
  .ro-readouts,
  .widget-subtitle,
  .ro-chip,
  .ro-legend,
  .ro-panels,
  .ro-reset,
  .cap-note {
    font-family: var(--ro-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
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

  /* Top chart: readouts over the breadth-by-depth strip. */
  .ro-top {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--ro-rule);
  }
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
    font-weight: 500;
  }
  .ro-criterion {
    text-align: right;
    flex: 0 1 auto;
  }
  .ro-top-chart {
    width: 100%;
    height: 40px;
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
    background: var(--ro-chip);
    color: var(--ro-muted);
    pointer-events: none;
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
    font-size: 9px;
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

  /* Bottom panels: step entropy, refinement pipeline, compute scaling. */
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
    font-weight: 500;
  }
  .ro-delta[data-trend='up'] {
    color: var(--ro-up);
  }
  .ro-delta[data-trend='down'] {
    color: var(--ro-down);
  }
  .ro-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 6px 16px;
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
    font-weight: 500;
  }
  .ro-pipeline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 3px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .ro-step-item {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .ro-step {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border: 1px solid var(--ro-rule);
    border-radius: 2px;
    white-space: nowrap;
  }
  .ro-step[data-status='done'] {
    color: var(--ui9000-color-text, #111827);
  }
  .ro-step[data-status='active'] {
    color: var(--ui9000-color-text, #111827);
    border-color: currentColor;
  }
  .ro-step[data-status='failed'] {
    color: var(--ro-down);
  }
  .ro-step[data-status='pending'] {
    opacity: 0.6;
  }
  .ro-step-mark {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    border: 1px solid currentColor;
    box-sizing: border-box;
  }
  .ro-step[data-status='done'] .ro-step-mark,
  .ro-step[data-status='failed'] .ro-step-mark {
    background: currentColor;
  }
  .ro-step[data-status='active'] .ro-step-mark {
    background: var(--ro-active, currentColor);
    border-color: var(--ro-active, currentColor);
  }
  .ro-step-arrow {
    opacity: 0.5;
  }
  .ro-scaling {
    width: 100%;
    height: 56px;
  }

  .empty {
    display: grid;
    place-items: center;
    height: 100%;
    min-height: inherit;
    color: var(--ro-muted);
    font-size: 0.875rem;
  }
  .cap-note {
    color: var(--ro-muted);
  }
`;
