import { css } from 'lit';

export const treemapChartStyles = css`
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
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    width: 100%;
    height: 100%;
  }

  .chart-root[hidden] {
    display: none;
  }

  /* Grouped mode — client TreemapGroupsContainer */
  .treemap-groups {
    display: grid;
    gap: 8px;
    margin-top: 10px;
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow: auto;
  }

  .treemap-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: 8px;
    border-radius: 8px;
    background: var(--ui9000-color-surface-muted, #f7f8fa);
  }

  .treemap-card-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding-bottom: 8px;
    flex-shrink: 0;
  }

  .treemap-card-title {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 14px;
    line-height: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* The group name owns the header — the field caption gives up space first. */
  .treemap-card-subtitle {
    flex: 0 100 auto;
    min-width: 0;
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .treemap-card-plot {
    flex: 1;
    min-height: 0;
    width: 100%;
  }

  /* Tile label — client TextBox / TextName / TextValue */
  .tile-label {
    padding: 4px;
    box-sizing: border-box;
    overflow: hidden;
  }

  .tile-name {
    display: block;
    font-size: 14px;
    line-height: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tile-value {
    display: block;
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
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

  .tooltip-title {
    font-weight: 600;
    margin-bottom: 2px;
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
