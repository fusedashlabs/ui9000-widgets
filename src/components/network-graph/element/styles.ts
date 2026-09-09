import { css } from 'lit';

export const networkGraphStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 320px;
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, system-ui, sans-serif);
    box-sizing: border-box;
  }
  .chart-root {
    flex: 1;
    min-height: 0;
    width: 100%;
    border-radius: 12px;
    background: var(--ui9000-color-surface-muted, #f9faff);
    overflow: hidden;
    touch-action: pan-y;
  }
  .empty {
    display: grid;
    place-items: center;
    flex: 1;
    min-height: inherit;
    padding: 8px;
    text-align: center;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-size: 0.875rem;
  }

  /* Overlay — same layout as map-chart bubble legend. */
  .graph-legend {
    position: absolute;
    right: 5px;
    bottom: 5px;
    z-index: 10;
    width: max-content;
    min-width: 360px;
    max-width: calc(100% - 20px);
    max-height: 50%;
    display: flex;
    flex-direction: column;
    padding: 8px 0;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--ui9000-color-surface, #ffffff);
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 8px;
    box-shadow:
      0 2px 4px 0 #141c2c0f,
      0 4px 8px 2px #141c2c0f;
    user-select: none;
    pointer-events: auto;
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
    font-size: 11px;
    font-weight: 400;
    line-height: 12px;
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
    padding: 8px 12px;
    border-bottom: 1px solid var(--ui9000-color-border, #e5e7eb);
    width: 100%;
    box-sizing: border-box;
  }
  .legend-layer:last-child {
    border-bottom: none;
  }
  .legend-details {
    margin-top: 8px;
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
    width: 100%;
  }
  .legend-colors[data-qualitative]::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    top: calc(50% + 1px);
    height: 1px;
    transform: translateY(-50%);
    border-top: 1px dashed #8f95a0;
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
    background-color: var(--bucket-fill, #6c758429);
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
    background-color: #6c758429;
  }
  .legend-bucket[data-bubble]::after {
    display: none;
    width: var(--inner-size, 0px);
    height: var(--inner-size, 0px);
    border: 1px solid var(--ui9000-color-border, #8f95a0);
    background: transparent;
  }
  .legend-bucket[data-bubble][data-inner]::after {
    display: block;
  }
  .legend-values {
    display: flex;
    width: 100%;
    padding-top: 6px;
  }
  .legend-value {
    flex: 1;
    min-width: 0;
    padding-right: 5px;
    font-size: 8px;
    font-weight: 400;
    line-height: 16px;
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
