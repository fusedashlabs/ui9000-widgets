import { css, unsafeCSS } from 'lit';

import { CHART_TYPE } from '../utils/chart-theme.js';

/**
 * Chat draws its own card (padding + border). Dashboard charts sit in the
 * client WidgetWrapper, which is already that zone — dash sends only the
 * header and the plot.
 */
export const chartShellStyles = css`
  :host {
    --ui9000-font-size-axis: ${unsafeCSS(String(CHART_TYPE.axis))}px;
    --ui9000-font-weight-axis: ${unsafeCSS(String(CHART_TYPE.axisWeight))};
    --ui9000-line-height-axis: ${unsafeCSS(String(CHART_TYPE.axisLine))}px;
    --ui9000-font-size-label: ${unsafeCSS(String(CHART_TYPE.label))}px;
    --ui9000-font-weight-label: ${unsafeCSS(String(CHART_TYPE.labelWeight))};
    --ui9000-line-height-label: ${unsafeCSS(String(CHART_TYPE.labelLine))}px;
    --ui9000-font-size-title: ${unsafeCSS(String(CHART_TYPE.title))}px;
    --ui9000-font-weight-title: ${unsafeCSS(String(CHART_TYPE.titleWeight))};
    --ui9000-line-height-title: ${unsafeCSS(String(CHART_TYPE.titleLine))}px;
    --ui9000-font-size-subtitle: ${unsafeCSS(String(CHART_TYPE.subtitle))}px;
    --ui9000-font-weight-subtitle: ${unsafeCSS(String(CHART_TYPE.subtitleWeight))};
    --ui9000-line-height-subtitle: ${unsafeCSS(String(CHART_TYPE.subtitleLine))}px;
    --ui9000-letter-spacing-subtitle: ${unsafeCSS(CHART_TYPE.subtitleTracking)};
    --ui9000-font-size-empty: ${unsafeCSS(CHART_TYPE.empty)};
    --ui9000-font-weight-empty: ${unsafeCSS(String(CHART_TYPE.emptyWeight))};
    --ui9000-line-height-empty: ${unsafeCSS(String(CHART_TYPE.emptyLine))}px;
    font-family: var(--ui9000-font-family, ${unsafeCSS(CHART_TYPE.fontFamily)});
  }

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
    position: relative;
  }

  /* Title + subtitle stacked, so an aside can share the header row. */
  .widget-heading {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .widget-heading > .widget-title {
    flex: 0 0 auto;
  }

  .widget-subtitle {
    min-width: 0;
    font-size: var(--ui9000-font-size-subtitle, 10px);
    font-weight: var(--ui9000-font-weight-subtitle, 400);
    line-height: var(--ui9000-line-height-subtitle, 14px);
    letter-spacing: var(--ui9000-letter-spacing-subtitle, 0.02em);
    color: var(--ui9000-color-text-muted, #6c7584);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Heading + aside share this row so the aside can wrap under the title. */
  .widget-header-main {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px 12px;
    min-width: 0;
  }

  /*
   * A floor under the heading is what makes the aside wrap: without it the
   * title would ellipsise away to nothing and the cards would never drop.
   */
  .widget-header-main > .widget-heading {
    flex: 1 1 var(--ui9000-heading-min-width, 180px);
    min-width: var(--ui9000-heading-min-width, 180px);
  }

  /* Centred against the heading block, whether it is one line or two. */
  .widget-aside {
    display: flex;
    align-items: center;
    align-self: center;
    gap: 8px;
    /* Never shrink, so the block wraps whole instead of compressing. */
    flex: 0 0 auto;
    max-width: 100%;
  }

  /* Typography renders a paragraph. Keep it in the header line. */
  ui9000-typography p {
    margin: 0;
    color: inherit !important;
  }

  .widget-title {
    flex: 1;
    min-width: 0;
    font-size: var(--ui9000-font-size-title, 12px);
    font-weight: var(--ui9000-font-weight-title, 400);
    line-height: var(--ui9000-line-height-title, 16px);
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

  .widget-actions slot[name='actions'] {
    display: flex;
    align-items: center;
  }

  /* Empty opt-out: the slot stays mounted, but it must not push the title. */
  .widget-actions[data-slot-only] {
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    overflow: visible;
    gap: 0;
  }

  /*
   * Dash host buttons live in the slot, inside this shadow tree, so a page
   * hover rule cannot see them. Hide the slotted element until the chart is
   * hovered or focused. data-open keeps it up while a menu portaled outside
   * the chart is open. data-persist is the always-visible case (public page).
   */
  :host([header-variant='dash']) slot[name='actions']::slotted(*) {
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  }

  :host([header-variant='dash']:hover) slot[name='actions']::slotted(*),
  :host([header-variant='dash']:focus-within) slot[name='actions']::slotted(*),
  :host([header-variant='dash']) slot[name='actions']::slotted([data-open]),
  :host([header-variant='dash']) slot[name='actions']::slotted([data-persist]) {
    opacity: 1;
  }

  .menu-anchor {
    position: relative;
  }

  .menu-btn svg,
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

  .widget-header[data-variant='dash'] .menu-btn {
    width: auto;
    height: 24px;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 16px;
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
    font-size: var(--ui9000-font-size-label, 12px);
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
    font-size: var(--ui9000-font-size-title, 12px);
    line-height: 20px;
  }

  .menu-item:hover,
  .menu-item:focus-visible {
    background: var(--ui9000-color-surface-muted, #f3f4f6);
    color: var(--ui9000-color-text, #111827);
  }

  :host([data-mode='dark']) .menu-btn {
    background: var(--ui9000-color-surface, #13161d);
    border-color: var(--ui9000-color-border, #444b57);
    color: var(--ui9000-color-text, #eff0f1);
  }

  :host([data-mode='dark']) .menu-btn:hover {
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
    font-size: var(--ui9000-font-size-axis, 12px);
    font-weight: var(--ui9000-font-weight-axis, 400);
    line-height: var(--ui9000-line-height-axis, 16px);
    color: var(--ui9000-color-text-muted, #6c7584);
  }

  .legend-title {
    font-weight: 600;
    color: var(--ui9000-color-text, #111827);
    white-space: nowrap;
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
    font-size: var(--ui9000-font-size-label, 12px);
    font-weight: var(--ui9000-font-weight-label, 400);
    line-height: var(--ui9000-line-height-label, 16px);
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
    font-size: var(--ui9000-font-size-label, 12px);
    font-weight: var(--ui9000-font-weight-label, 400);
    line-height: var(--ui9000-line-height-label, 16px);
    background: var(--ui9000-color-surface, #fff);
    color: var(--ui9000-color-text-muted, #6c7584);
    box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
    transform: translate(-50%, calc(-100% - 8px));
    white-space: nowrap;
  }

  .tooltip {
    font-family: inherit;
    font-size: var(--ui9000-font-size-label, 12px);
    font-weight: var(--ui9000-font-weight-label, 400);
    line-height: var(--ui9000-line-height-label, 16px);
  }

  .empty {
    color: var(--ui9000-color-text, #111827);
    font-size: var(--ui9000-font-size-empty, 14px);
    font-weight: var(--ui9000-font-weight-empty, 400);
    line-height: var(--ui9000-line-height-empty, 20px);
  }
`;
