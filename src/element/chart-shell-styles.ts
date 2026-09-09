import { css } from 'lit';

/** FuseDash WidgetWrapper chrome — padding, header, menu (MCP chat / Storybook). */
export const chartShellStyles = css`
  .widget-shell {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: inherit;
    box-sizing: border-box;
    padding: 12px 16px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 8px;
    background: var(--ui9000-color-surface, #ffffff);
  }

  :host([embedded]) .widget-shell {
    padding: 8px 10px 4px;
    border: none;
    border-radius: 0;
    background: transparent;
  }

  .widget-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    flex-shrink: 0;
    margin-bottom: 8px;
    min-width: 0;
  }

  .widget-title {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    color: var(--ui9000-color-text, #111827);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .widget-actions {
    position: relative;
    flex-shrink: 0;
  }

  .menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.92);
    color: var(--ui9000-color-text-muted, #6b7280);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
  }

  .menu-btn:hover {
    background: #fff;
    border-color: var(--ui9000-color-border-strong, #d1d5db);
  }

  .menu-dropdown {
    position: absolute;
    top: 36px;
    right: 0;
    z-index: 5;
    min-width: 170px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 10px;
    background: #fff;
    box-shadow:
      0 10px 15px -3px rgb(0 0 0 / 10%),
      0 4px 6px -4px rgb(0 0 0 / 10%);
    overflow: hidden;
  }

  .menu-item {
    display: block;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: transparent;
    text-align: left;
    font-size: 13px;
    color: var(--ui9000-color-text, #111827);
    cursor: pointer;
  }

  .menu-item:hover {
    background: var(--ui9000-color-surface-muted, #f3f4f6);
  }

  .widget-body {
    flex: 1 1 auto;
    /* Chat/MCP hosts often set only min-height on :host; nested panes set this var to 0. */
    min-height: var(--ui9000-plot-min-height, 240px);
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /* Default plot slot — charts may nest further (box/bar scroll). */
  .widget-body > .chart-root {
    flex: 1 1 auto;
    width: 100%;
    min-height: var(--ui9000-plot-min-height, 240px);
  }

  .widget-body > .chart-body {
    flex: 1 1 auto;
    min-height: var(--ui9000-plot-min-height, 240px);
  }

  .chart-legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    flex-shrink: 0;
    margin-bottom: 8px;
    font-size: 11px;
    line-height: 1.2;
    color: var(--ui9000-color-text-muted, #6c7584);
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .legend-swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .legend-line {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 2px;
    border-radius: 1px;
    background: var(--legend-color, #473dd9);
    flex-shrink: 0;
  }

  .legend-line--dashed {
    background: transparent;
    border-top: 2px dashed var(--legend-color, #6c7584);
    height: 0;
  }

  .legend-dot {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  /* FuseDash ChartLegend legendType="palette" — Low / High sequential ramp. */
  .legend-palette {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 8px;
    padding-bottom: 12px;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.2;
    color: var(--ui9000-color-text-muted, #6c7584);
  }

  .legend-palette-swatches {
    display: flex;
    align-items: center;
  }

  .legend-palette-swatch {
    width: 14px;
    height: 8px;
    flex-shrink: 0;
  }

  .legend-palette-swatch:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }

  .legend-palette-swatch:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }

  .label-tooltip {
    position: absolute;
    pointer-events: none;
    z-index: 4;
    max-width: min(320px, 90vw);
    padding: 2px 5px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 5px;
    font-size: 11px;
    line-height: 1.35;
    background: var(--ui9000-color-surface, #fff);
    color: var(--ui9000-color-text-muted, #6c7584);
    box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
    transform: translate(-50%, calc(-100% - 8px));
    white-space: nowrap;
  }
`;
