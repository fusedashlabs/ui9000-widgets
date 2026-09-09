import { css } from 'lit';

export const surfaceStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, system-ui, sans-serif);
    font-size: 14px;
    line-height: 20px;
  }
  .blocked {
    margin: 0;
    padding: 8px;
    color: var(--ui9000-color-text-muted, #6b7280);
  }
  .root {
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: auto;
    box-sizing: border-box;
  }
  button, input, select, textarea {
    font: inherit;
    color: inherit;
  }
  label, .label {
    display: block;
    margin-bottom: 4px;
    font-weight: 600;
    color: var(--ui9000-color-text, #111827);
  }
  .field {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 6px;
    background: var(--ui9000-color-surface, #fff);
    box-sizing: border-box;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .btn {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    background: var(--ui9000-color-surface, #fff);
    cursor: pointer;
  }
  .btn[data-kind='approve'] {
    background: var(--ui9000-color-primary, #473dd9);
    color: #fff;
    border-color: transparent;
  }
  .muted { color: var(--ui9000-color-text-muted, #6b7280); }
  .list { list-style: none; margin: 0; padding: 0; }
  .list li {
    padding: 8px 0;
    border-bottom: 1px solid var(--ui9000-color-grid, #e5e7eb);
  }
  .sev {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
  }
`;
