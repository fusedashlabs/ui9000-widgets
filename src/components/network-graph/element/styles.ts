import { css } from 'lit';

export const networkGraphStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 320px;
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, Inter, sans-serif);
    box-sizing: border-box;
    --panel-card: var(--ui9000-color-surface, #ffffff);
    --panel-sidebar: var(--ui9000-color-surface-muted, #f3f4f6);
    --panel-text: var(--ui9000-color-text, #111827);
    --panel-muted: var(--ui9000-color-text-muted, #6c7584);
    --panel-line: var(--ui9000-color-border, #e5e7eb);
    --panel-grid: var(--ui9000-color-grid, #afb3bb);
    --panel-tab: color-mix(in srgb, var(--panel-text) 6%, transparent);
    --panel-button: var(--panel-line);
    --panel-legend-fill: color-mix(in srgb, var(--panel-muted) 16%, transparent);
    --panel-dock: color-mix(in srgb, var(--panel-sidebar) 75%, transparent);
    --panel-card-shadow: 0 2px 4px 0 #141c2c0f, 0 4px 8px 2px #141c2c0f;
    --panel-topic-shadow: 0 2px 4px 0 #141c2c0f;
    --toggle-track: var(--panel-sidebar);
    --toggle-thumb: var(--panel-card);
    --toggle-text: var(--panel-muted);
    --toggle-text-active: var(--panel-text);
    --toggle-shadow: var(--panel-card-shadow);
    --control-button: var(--panel-card);
    --control-button-hover: var(--panel-sidebar);
    --control-icon: var(--panel-text);
    --control-title: var(--panel-muted);
    --item-title: var(--panel-text);
    --item-sub: var(--panel-muted);
    --item-hover: var(--panel-tab);
  }
  .network-stage {
    position: relative;
    flex: 1;
    min-height: 0;
    width: 100%;
    border-radius: 12px;
    background: var(--panel-card);
    overflow: hidden;
  }
  .view-toggle {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 3;
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border-radius: 999px;
    background: var(--toggle-track);
    box-shadow: var(--toggle-shadow);
  }
  .view-toggle[hidden] {
    display: none;
  }
  .view-button {
    border: 0;
    border-radius: 999px;
    padding: 10px 16px;
    font-size: var(--ui9000-font-size-heading);
    line-height: var(--ui9000-line-height-heading);
    font-family: inherit;
    cursor: pointer;
    color: var(--toggle-text);
    background: transparent;
    transition:
      background 0.2s ease,
      color 0.2s ease;
  }
  .view-button[data-active] {
    color: var(--toggle-text-active);
    background: var(--toggle-thumb);
  }
  .view-button:focus-visible {
    outline: 2px solid var(--graph-accent);
    outline-offset: 1px;
  }
  .zoom-controls {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 3;
    display: flex;
    gap: 4px;
  }
  .zoom-button {
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    cursor: pointer;
    background: var(--control-button);
    color: var(--control-icon);
    box-shadow: var(--toggle-shadow);
    transition: background 0.2s ease;
  }
  .zoom-button:hover {
    background: var(--control-button-hover);
  }
  .zoom-button:focus-visible {
    outline: 2px solid var(--graph-accent);
    outline-offset: 1px;
  }
  .fan-overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
    overflow: visible;
  }
  .connections-panel {
    position: absolute;
    top: 50%;
    right: 24px;
    z-index: 2;
    width: 250px;
    max-height: calc(100% - 128px);
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 14px;
    pointer-events: none;
  }
  .connections-title {
    margin: 0 0 0 26px;
    font-size: var(--ui9000-font-size-heading);
    line-height: var(--ui9000-line-height-heading);
    color: var(--control-title);
  }
  .connections-list {
    list-style: none;
    margin: -40px 0 -40px -40px;
    padding: 40px 0 40px 40px;
    overflow-y: auto;
    pointer-events: auto;
  }
  .connection-item {
    margin: 0;
  }
  .connection-button {
    width: 100%;
    display: grid;
    grid-template-columns: 14px 1fr;
    align-items: start;
    gap: 12px;
    padding: 2px 4px 2px 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
  }
  .connection-button:hover {
    background: var(--item-hover);
  }
  .connection-button:focus-visible {
    outline: 2px solid var(--graph-accent);
    outline-offset: -2px;
  }
  .connection-text {
    min-width: 0;
  }
  .connection-dot {
    position: relative;
    width: 8px;
    height: 8px;
    margin: 5px 3px 0;
    border-radius: 50%;
    background: var(--graph-accent);
  }
  .connection-dot::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: var(--ring);
    height: var(--ring);
    border: 5px solid color-mix(in srgb, var(--graph-accent) 20%, transparent);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    pointer-events: none;
  }
  .connection-name {
    display: block;
    overflow-wrap: anywhere;
    font-size: var(--ui9000-font-size-label);
    line-height: var(--ui9000-line-height-label);
    color: var(--item-title);
    position: relative;
  }
  .connection-sub {
    display: block;
    font-size: var(--ui9000-font-size-subtitle);
    line-height: var(--ui9000-line-height-subtitle);
    color: var(--item-sub);
  }
  .heatmap-pane {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    padding: 8px 12px 0;
    box-sizing: border-box;
    border-radius: 12px;
    overflow: hidden;
    background: var(--ui9000-color-surface, #ffffff);
  }
  .heatmap-pane[hidden] {
    display: none;
  }
  .heatmap-root {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    position: relative;
  }
  .heatmap-fade {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 72px;
    pointer-events: none;
    background: linear-gradient(to bottom, transparent, var(--ui9000-color-surface, #ffffff));
  }
  .heatmap-header {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--ui9000-color-surface, #ffffff);
  }
  .heatmap-reveal {
    animation: heatmap-reveal 320ms ease-out both;
  }
  @keyframes heatmap-reveal {
    from {
      opacity: 0;
      transform: translateX(-6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .heatmap-reveal {
      animation: none;
    }
  }
  .chart-root {
    position: absolute;
    inset: 0;
    overflow: hidden;
    touch-action: pan-y;
  }
  .chart-root[data-covered] {
    visibility: hidden;
  }
  .empty {
    display: grid;
    place-items: center;
    flex: 1;
    min-height: inherit;
    padding: 8px;
    text-align: center;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-size: var(--ui9000-font-size-empty);
    line-height: var(--ui9000-line-height-empty);
  }

  /* Overlay — same layout as map-chart bubble legend. */
  .graph-legend {
    position: absolute;
    right: 16px;
    bottom: 16px;
    z-index: 10;
    width: max-content;
    min-width: 200px;
    max-width: calc(100% - 32px);
    max-height: 50%;
    display: flex;
    flex-direction: column;
    padding: 8px 0;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--ui9000-color-surface, #ffffff);
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 8px;
    box-shadow: var(--panel-card-shadow);
    user-select: none;
    pointer-events: auto;
  }
  /* Narrow widget, folded: a smaller legend leaves more of the graph in view. */
  .graph-legend[data-compact] {
    min-width: 0;
    width: 168px;
  }
  .legend-panel-header {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 12px;
    box-sizing: border-box;
    border-bottom: 1px solid var(--ui9000-color-border, #e5e7eb);
  }
  .graph-legend:not(:has(.legend-layers)) .legend-panel-header {
    border-bottom: none;
  }
  .legend-kicker {
    margin: 0;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--ui9000-font-size-subtitle);
    font-weight: 400;
    line-height: var(--ui9000-line-height-subtitle);
    letter-spacing: 0.88px;
    text-transform: uppercase;
    color: var(--ui9000-color-text, #111827);
  }
  .legend-chevron {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 0;
    background: transparent
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%238f95a0' stroke-width='1.25'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")
      center / 16px no-repeat;
    cursor: pointer;
    transition: transform 0.5s;
  }
  .legend-chevron[aria-expanded='false'] {
    transform: rotate(180deg);
  }
  .legend-layers {
    overflow-y: auto;
    overflow-x: visible;
    width: 100%;
  }
  .legend-layer {
    padding: 0 12px 8px;
    width: 100%;
    box-sizing: border-box;
  }
  .legend-caption {
    margin: 0;
    padding: 8px 12px 0;
    font-size: var(--ui9000-font-size-label);
    line-height: var(--ui9000-line-height-label);
    color: var(--ui9000-color-text-muted, #6c7584);
  }
  .legend-types {
    display: flex;
    flex-direction: column;
    padding: 8px 0;
  }
  .legend-type {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
  }
  .legend-type-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .legend-type-name {
    font-size: var(--ui9000-font-size-label);
    line-height: var(--ui9000-line-height-label);
    color: var(--ui9000-color-text, #111827);
  }
  .legend-scale {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    padding-top: 8px;
  }
  .legend-scale[data-kind='bubbles'] {
    padding-top: 30px;
  }
  .legend-colors {
    display: flex;
    position: relative;
    width: 280px;
    max-width: 100%;
  }
  .legend-colors[data-qualitative]::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    top: calc(50% + 1px);
    height: 1px;
    transform: translateY(-50%);
    border-top: 1px dashed var(--panel-muted);
    z-index: 10;
    pointer-events: none;
  }
  .legend-buckets {
    position: relative;
    display: flex;
    width: 100%;
  }
  .legend-bucket {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 12px;
    background-color: var(--panel-legend-fill);
  }
  .legend-bucket[data-qualitative] {
    border-right: 1px solid var(--ui9000-color-border, #e5e7eb);
  }
  .legend-bucket:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  .legend-bucket:last-child {
    border-right: none;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }
  .legend-bucket[data-muted] {
    opacity: 0.3;
  }
  .legend-bucket[data-bubble]::before,
  .legend-bucket[data-bubble]::after {
    content: '';
    position: absolute;
    top: -2px;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 100%;
    -webkit-mask-image: linear-gradient(to bottom, #000 0 50%, transparent 50% 100%);
    mask-image: linear-gradient(to bottom, #000 0 50%, transparent 50% 100%);
    z-index: 1;
  }
  .legend-bucket[data-bubble]::before {
    width: var(--bubble-size, 12px);
    height: var(--bubble-size, 12px);
    background-color: var(--panel-legend-fill);
  }
  .legend-bucket[data-bubble]::after {
    display: none;
    width: var(--inner-size, 0px);
    height: var(--inner-size, 0px);
    border: 1px solid var(--panel-line);
    background: transparent;
  }
  .legend-bucket[data-bubble][data-inner]::after {
    display: block;
  }
  .legend-values {
    display: flex;
    width: 280px;
    max-width: 100%;
    padding-top: 6px;
  }
  .legend-value {
    flex: 1;
    min-width: 0;
    padding-right: 5px;
    font-size: var(--ui9000-font-size-subtitle);
    font-weight: 400;
    line-height: var(--ui9000-line-height-subtitle);
    text-align: center;
    color: var(--ui9000-color-text-muted, #6c7584);
    user-select: none;
  }
  .legend-value:first-child {
    text-align: start;
  }
  .legend-value:last-child {
    text-align: end;
  }
  .legend-range {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 12px;
    z-index: 100;
    pointer-events: none;
  }
  .legend-range-track {
    position: absolute;
    top: 0;
    width: 100%;
    height: 12px;
    cursor: pointer;
    touch-action: none;
    pointer-events: none;
  }
  .legend-thumb {
    position: absolute;
    top: 1px;
    z-index: 2;
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--ui9000-color-text, #141c2c);
    box-shadow: 0 0 0 1px inset var(--ui9000-color-surface, #ffffff);
    transform: translateX(-50%);
    cursor: pointer;
    pointer-events: auto;
    touch-action: none;
  }
  .legend-thumb::before {
    content: '';
    position: absolute;
    inset: -4px;
  }
  .legend-thumb:hover,
  .legend-thumb:active {
    border: 2px solid var(--ui9000-color-border, #8f95a0);
    background: var(--ui9000-color-surface, #ffffff);
  }
  .legend-thumb:focus-visible {
    outline: 2px solid var(--ui9000-color-primary, #473dd9);
    outline-offset: 2px;
  }
`;
