import { css } from 'lit';

export const inspectorStyles = css`
  :host {
    height: auto;
  }
  .root {
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 16px 18px 20px;
    box-sizing: border-box;
    height: auto;
    overflow: visible;
    color: var(--ui9000-color-text, inherit);
    background: var(--ui9000-color-surface, #ffffff);
  }
  .choice {
    padding: 16px 18px 18px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-left: 3px solid var(--ui9000-color-primary, #473dd9);
    border-radius: 10px;
    background: var(--ui9000-color-surface, transparent);
  }
  .choice-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .toggle {
    margin-left: auto;
    padding: 4px 10px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 999px;
    background: transparent;
    color: var(--ui9000-color-text, inherit);
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    line-height: 16px;
    cursor: pointer;
  }
  .who,
  .objective,
  .outcome {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 16px;
  }
  .who {
    background: var(--ui9000-color-primary, #473dd9);
    color: #fff;
  }
  .who[data-by='engine'] {
    background: transparent;
    color: var(--ui9000-color-text, inherit);
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
  }
  .who[data-by='named'] {
    background: var(--ui9000-color-risk-low, color-mix(in srgb, #10b981 22%, transparent));
    color: var(--ui9000-color-text, #111827);
  }
  .objective,
  .outcome {
    color: var(--ui9000-color-text-muted, #6b7280);
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
  }
  h2 {
    margin: 14px 0 0;
    font-size: 18px;
    line-height: 24px;
    font-weight: 600;
  }
  .why {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 20px;
  }
  h3 {
    margin: 0 0 12px;
    font-size: 11px;
    line-height: 16px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ui9000-color-text-muted, #6b7280);
  }
  .count {
    margin-left: 6px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
  }
  .scores,
  .groups {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .scores li,
  .groups li {
    padding: 14px 16px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 8px;
    background: var(
      --ui9000-color-surface-muted,
      color-mix(in srgb, var(--ui9000-color-text, #111827) 12%, var(--ui9000-color-surface, #ffffff))
    );
  }
  .row-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: baseline;
  }
  .id {
    font-size: 13px;
    font-weight: 600;
  }
  .score {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--ui9000-color-text-muted, #6b7280);
  }
  .bar {
    margin-top: 12px;
    height: 4px;
    border-radius: 999px;
    background: var(--ui9000-color-border, #e5e7eb);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    width: var(--share, 0%);
    border-radius: 999px;
    background: var(--ui9000-color-primary, #473dd9);
  }
  .reason {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 18px;
    color: var(--ui9000-color-text-muted, #6b7280);
  }
  .groups .reason {
    margin: 0;
  }
  .chips,
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .groups .chips {
    margin-top: 12px;
  }
  .facts {
    padding-top: 4px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    font-size: 11px;
    line-height: 16px;
  }
  .pill[data-band='low'],
  .pill[data-band='held'] {
    border-color: transparent;
    background: var(--ui9000-color-risk-low, color-mix(in srgb, #10b981 22%, transparent));
  }
  .pill[data-band='medium'] {
    border-color: transparent;
    background: var(--ui9000-color-risk-medium, color-mix(in srgb, #f59e0b 26%, transparent));
  }
  .pill[data-band='high'] {
    border-color: transparent;
    background: var(--ui9000-color-risk-high, color-mix(in srgb, #ef4444 26%, transparent));
  }
  .pill.more,
  .pill.action {
    color: var(--ui9000-color-text-muted, #6b7280);
  }
`;
