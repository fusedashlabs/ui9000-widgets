import { css } from 'lit';

/**
 * Chat draws its own card (padding + border). Dashboard charts sit in the
 * client WidgetWrapper, which is already that zone — dash sends only the
 * header and the plot.
 */
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

  :host([header-variant='dash']) .widget-shell {
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
  }

  /*
   * Dashboard cells already have a height. The chart fills that cell.
   * A 220px host min-height plus an inner scrollport made the column and
   * the plot scroll at the same time.
   */
  :host([embedded]),
  :host([header-variant='dash']) {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  :host([embedded]) .widget-shell,
  :host([header-variant='dash']) .widget-shell {
    min-height: 0;
    overflow: hidden;
  }

  :host([embedded]) .widget-body,
  :host([header-variant='dash']) .widget-body,
  :host([embedded]) .widget-body > .chart-body,
  :host([header-variant='dash']) .widget-body > .chart-body,
  :host([embedded]) .widget-body > .chart-root,
  :host([header-variant='dash']) .widget-body > .chart-root,
  :host([embedded]) .chart-body,
  :host([header-variant='dash']) .chart-body,
  :host([embedded]) .chart-scroll,
  :host([header-variant='dash']) .chart-scroll,
  :host([embedded]) .chart-root,
  :host([header-variant='dash']) .chart-root {
    min-height: 0;
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
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .hover-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Dashboard: chat + overflow stay hidden until the widget is hovered or the menu is open. */
  .widget-header[data-variant='dash'] .hover-actions {
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  }

  .widget-shell:hover .widget-header[data-variant='dash'] .hover-actions,
  .widget-header[data-variant='dash'] .hover-actions[data-open='true'] {
    opacity: 1;
  }

  .menu-anchor {
    position: relative;
  }

  .icon-btn,
  .settings-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    background: var(--ui9000-color-surface, #ffffff);
    color: var(--ui9000-color-text, #111827);
    cursor: pointer;
  }

  .menu-btn svg,
  .icon-btn svg,
  .settings-btn svg,
  .menu-item svg {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    display: block;
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
    background: var(--ui9000-color-surface, #ffffff);
    color: var(--ui9000-color-text, #111827);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
  }

  .widget-header[data-variant='dash'] .menu-btn,
  .widget-header[data-variant='dash'] .icon-btn {
    width: auto;
    height: 24px;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 16px;
  }

  .settings-btn {
    height: 24px;
    padding: 4px;
    border-radius: 24px;
    background: var(--ui9000-color-surface, #fff);
    box-shadow:
      0 2px 2px rgb(0 0 0 / 6%),
      0 2px 4px 1px rgb(0 0 0 / 4%);
  }

  .menu-btn:hover {
    background: var(--ui9000-color-surface-muted, #f3f4f6);
    border-color: var(--ui9000-color-border, #e5e7eb);
  }

  .menu-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 5;
    min-width: 170px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 10px;
    background: var(--ui9000-color-surface, #ffffff);
    box-shadow:
      0 10px 15px -3px rgb(0 0 0 / 10%),
      0 4px 6px -4px rgb(0 0 0 / 10%);
    overflow: hidden;
  }

  .widget-header[data-variant='dash'] .menu-dropdown {
    min-width: 192px;
    border-radius: 8px;
    padding: 8px 0;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: transparent;
    text-align: left;
    font-family: var(--ui9000-font-family, inherit);
    font-size: 13px;
    font-weight: 400;
    line-height: 20px;
    color: var(--ui9000-color-text, #111827);
    cursor: pointer;
    appearance: none;
  }

  .menu-item svg {
    color: inherit;
    fill: currentColor;
  }

  .widget-header[data-variant='dash'] .menu-item {
    padding: 4px 12px;
    min-height: 32px;
    font-size: 14px;
    line-height: 20px;
  }

  .menu-divider {
    height: 1px;
    margin: 4px 0;
    background: var(--ui9000-color-border, #e5e7eb);
  }

  .menu-item:hover,
  .menu-item:focus-visible {
    background: var(--ui9000-color-surface-muted, #f3f4f6);
    color: var(--ui9000-color-text, #111827);
  }

  :host([data-mode='dark']) .menu-btn,
  :host([data-mode='dark']) .icon-btn,
  :host([data-mode='dark']) .settings-btn {
    background: var(--ui9000-color-surface, #13161d);
    border-color: var(--ui9000-color-border, #444b57);
    color: var(--ui9000-color-text, #eff0f1);
  }

  :host([data-mode='dark']) .menu-btn:hover,
  :host([data-mode='dark']) .icon-btn:hover,
  :host([data-mode='dark']) .settings-btn:hover {
    background: var(--ui9000-color-surface-muted, #282e37);
    color: var(--ui9000-color-text, #eff0f1);
  }

  :host([data-mode='dark']) .menu-dropdown {
    background: var(--ui9000-color-surface, #13161d);
    border-color: var(--ui9000-color-border, #444b57);
  }

  :host([data-mode='dark']) .menu-item {
    color: var(--ui9000-color-text, #eff0f1);
  }

  :host([data-mode='dark']) .menu-item:hover,
  :host([data-mode='dark']) .menu-item:focus-visible {
    background: var(--ui9000-color-surface-muted, #282e37);
    color: var(--ui9000-color-text, #eff0f1);
  }

  :host([data-mode='dark']) .menu-divider {
    background: var(--ui9000-color-border, #444b57);
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
