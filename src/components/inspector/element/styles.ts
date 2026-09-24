import { css } from 'lit';

export const inspectorStyles = css`
  .root {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 16px;
  }
  h2 {
    margin: 0;
    font-size: 15px;
    line-height: 20px;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 12px;
    line-height: 16px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ui9000-color-text-muted, #6b7280);
  }
  dl {
    margin: 0;
    display: grid;
    grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
    gap: 2px 12px;
  }
  dt {
    color: var(--ui9000-color-text-muted, #6b7280);
  }
  dd {
    margin: 0;
  }
  .badge {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 999px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    font-size: 12px;
    font-weight: 600;
  }
  .badge[data-band='low'] {
    border-color: transparent;
    background: var(--ui9000-color-risk-low, #d1fae5);
  }
  .badge[data-band='medium'] {
    border-color: transparent;
    background: var(--ui9000-color-risk-medium, #fef3c7);
  }
  .badge[data-band='high'] {
    border-color: transparent;
    background: var(--ui9000-color-risk-high, #fee2e2);
  }
  .badge[data-kind='winner'] {
    border-color: transparent;
    background: var(--ui9000-color-primary, #473dd9);
    color: #fff;
  }
  .list li {
    padding: 6px 0;
  }
  .list li:last-child {
    border-bottom: none;
  }
  .row-head {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .id {
    font-weight: 600;
  }
  .score {
    font-variant-numeric: tabular-nums;
    color: var(--ui9000-color-text-muted, #6b7280);
  }
  .reasons {
    list-style: disc;
    margin: 2px 0 0;
    padding-left: 18px;
    color: var(--ui9000-color-text-muted, #6b7280);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
`;
