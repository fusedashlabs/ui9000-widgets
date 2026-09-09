import { css } from 'lit';

export const pieChartStyles = css`
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
  /* Chart left, unit legend as a vertical list on the right (client Pie/Donut). */
  :host .widget-body {
    flex-direction: row;
    align-items: center;
    gap: 32px;
  }
  :host .widget-body > .chart-root {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    width: auto;
    height: 100%;
  }
  .chart-root {
    flex: 1;
    min-height: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :host .chart-legend {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: flex-start;
    align-self: center;
    flex-shrink: 0;
    gap: 6px;
    margin-bottom: 0;
    max-width: 40%;
    max-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }
  :host .legend-item {
    white-space: nowrap;
  }
  :host .legend-label {
    overflow: hidden;
    text-overflow: ellipsis;
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
  .empty {
    display: grid;
    place-items: center;
    height: 100%;
    min-height: inherit;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-size: 0.875rem;
  }
`;
