import { css } from 'lit';

export const tableStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, system-ui, sans-serif);
  }

  .table-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
  }

  .table-scroll {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    overflow: auto;
    scrollbar-width: thin;
  }

  .table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
  }

  .table thead {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--ui9000-color-surface, #ffffff);
  }

  .table thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--ui9000-color-surface, #ffffff);
    background-clip: padding-box;
    color: var(--ui9000-color-text, #111827);
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.01em;
    text-transform: capitalize;
    box-shadow: 0 1px 0 var(--ui9000-color-grid, #e5e7eb);
  }

  .table th,
  .table td {
    padding: 10px 12px;
    vertical-align: middle;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-bottom: 1px solid var(--ui9000-color-grid, #e5e7eb);
    color: var(--ui9000-color-text-muted, #6b7280);
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    text-align: left;
  }

  .table tbody tr {
    cursor: pointer;
  }

  .table tbody tr:last-child td {
    border-bottom: none;
  }

  .table-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    line-height: 16px;
  }

  .table-badge[data-type='success'] {
    color: #0f7b4a;
    background: #d9f5e7;
  }

  .table-badge[data-type='error'] {
    color: #b42318;
    background: #fde8e6;
  }
`;
