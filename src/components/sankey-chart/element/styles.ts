import { css } from 'lit';

export const sankeyStyles = css`
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

  /* Client BlockLabelAxe / LabelAxe — source | target above the plot. */
  .axis-labels {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    flex-shrink: 0;
    margin: 0 3px 8px 3px;
    font-size: 12px;
    font-weight: 500;
    line-height: 14px;
    color: var(--ui9000-color-text, #111827);
  }

  .chart-root {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
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
  .tooltip .key {
    font-weight: 600;
  }
  .empty {
    display: grid;
    place-items: center;
    flex: 1 1 auto;
    padding: 20px;
    text-align: center;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-size: 0.875rem;
  }
`;
