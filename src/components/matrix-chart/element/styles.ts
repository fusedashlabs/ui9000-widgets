import { css } from 'lit';

export const matrixStyles = css`
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
  .chart-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .chart-top-axis {
    flex-shrink: 0;
    width: 100%;
    overflow: hidden;
  }
  .chart-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
  }
  .chart-root {
    width: 100%;
    min-height: inherit;
  }
  .chart-root svg .matrix-cell {
    cursor: default;
  }
  .chart-root[data-hoverable] svg .matrix-cell:hover {
    stroke: var(--ui9000-color-text, #111827);
    stroke-width: 1.5px;
  }
  .palette-legend {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding: 8px 0 12px;
    font-size: 12px;
    line-height: 1.2;
    color: var(--ui9000-color-text-muted, #6c7584);
  }
  .palette-swatches {
    display: flex;
    align-items: center;
  }
  .palette-swatch {
    width: 14px;
    height: 8px;
  }
  .palette-swatch:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  .palette-swatch:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }
  .tooltip {
    position: absolute;
    pointer-events: none;
    z-index: 2;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.35;
    background: var(--ui9000-color-text, #111827);
    color: #fff;
    box-shadow: 0 4px 12px rgb(0 0 0 / 18%);
    transform: translate(-50%, calc(-100% - 10px));
    white-space: nowrap;
  }
  .tooltip .name {
    font-weight: 600;
  }
  .empty {
    display: grid;
    place-items: center;
    height: 100%;
    min-height: inherit;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-size: 0.875rem;
  }
`;
