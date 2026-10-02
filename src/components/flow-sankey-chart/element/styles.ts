import { css } from 'lit';

export const flowSankeyStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 280px;
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, system-ui, sans-serif);
    box-sizing: border-box;
  }

  /* Summary cards from the Figma header: Total Events 685, Time range. */
  /*
   * The section wraps as a whole (see .widget-header-main), so the cards
   * themselves stay on one line and give way by truncating their text.
   */
  /*
   * The resolved palette variables are set on .widget-shell, so anything that
   * inherits its colour must take it from inside that scope. The :host rule
   * sits outside it and would resolve the host's ambient ink instead - which is
   * how the summary card label and value came out dark on the dark panel.
   */
  .widget-shell {
    color: var(--ui9000-color-text, #111827);
  }

  .summary-cards {
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-end;
    gap: 8px;
    min-width: 0;
    max-width: 100%;
  }

  .summary-card {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 6px 10px;
    border-radius: 8px;
    /* Shell surface tokens, not the axis grid colour, so the cards follow the
       panel in both appearances. */
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    background: var(--ui9000-color-surface, transparent);
  }

  .summary-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    font-size: 12px;
    /* Icons paint with currentColor, so the chip sets their tone. */
    color: var(--ui9000-color-text-muted, #6b7280);
  }

  .summary-icon svg {
    display: block;
    width: 14px;
    height: 14px;
  }

  .summary-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.25;
  }

  .summary-label,
  .summary-caption {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .summary-label {
    font-size: 11px;
    font-weight: 500;
  }

  .summary-caption {
    font-size: 10px;
    color: var(--ui9000-color-text-muted, #6b7280);
  }

  .summary-value {
    margin-left: 4px;
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
  }

  .chart-root {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
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
