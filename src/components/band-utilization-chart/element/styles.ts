import { css } from 'lit';

export const bandUtilizationStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: var(--ui9000-host-min-height, 220px);
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, system-ui, sans-serif);
    box-sizing: border-box;
  }

  .band-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
  }

  .band-head .chart-legend {
    flex: 1 1 auto;
    margin-bottom: 8px;
  }

  .band-unit {
    flex: 0 0 auto;
    margin-left: auto;
    padding-top: 1px;
    font-size: 11px;
    line-height: 16px;
    color: var(--ui9000-color-text-muted, #6c7584);
  }

  .chart-root {
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
    overflow: auto;
  }

  .band-segment.is-dim {
    opacity: 0.45;
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
