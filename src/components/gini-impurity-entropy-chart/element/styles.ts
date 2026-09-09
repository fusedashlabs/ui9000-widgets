import { css } from 'lit';

export const giniImpurityEntropyChartStyles = css`
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
  .chart-root {
    flex: 1;
    min-height: 0;
    width: 100%;
    height: 100%;
    min-height: inherit;
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
    margin-bottom: 2px;
  }
  .tooltip .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  /** Mirrors the plot: the curve under the cursor reads full strength. */
  .tooltip .row.dimmed {
    opacity: 0.55;
  }
  .tooltip .row.active {
    font-weight: 600;
  }
  .tooltip .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .tooltip .value {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
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
