import { css } from 'lit';

export const lollipopStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 220px;
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, system-ui, sans-serif);
    box-sizing: border-box;
  }
  .chart-body {
    flex: 1 1 auto;
    min-height: var(--ui9000-plot-min-height, 240px);
    display: flex;
    flex-direction: column;
  }
  .chart-scroll {
    flex: 1 1 auto;
    min-height: var(--ui9000-plot-min-height, 200px);
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
  }
  .chart-x-axis {
    flex-shrink: 0;
    width: 100%;
    min-height: 21px;
    overflow: hidden;
  }
  .chart-root {
    width: 100%;
    min-height: var(--ui9000-plot-min-height, 240px);
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
