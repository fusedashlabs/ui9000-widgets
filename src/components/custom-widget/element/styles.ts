import { css } from 'lit';

import { KPI_ROW_HEIGHT, PANE_GAP } from '../lib/layout.js';

export const customWidgetStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 220px;
    overflow: hidden;
    border-radius: 8px;
    color: var(--ui9000-color-text, #111827);
    font-family: var(--ui9000-font-family, system-ui, sans-serif);
    box-sizing: border-box;
  }

  .custom-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: inherit;
    overflow: hidden;
  }

  /* Nested charts keep plot chrome; the pane is the rounded zone */
  .pane ui9000-chart-renderer {
    min-height: 0;
  }

  .kpi-band {
    flex: 0 0 auto;
    height: ${KPI_ROW_HEIGHT}px;
    min-height: ${KPI_ROW_HEIGHT}px;
    max-height: ${KPI_ROW_HEIGHT}px;
    width: 100%;
    overflow: hidden;
  }

  .custom-content {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    width: 100%;
    gap: ${PANE_GAP}px;
    overflow: hidden;
    box-sizing: border-box;
  }

  .pane {
    display: flex;
    align-items: stretch;
    justify-content: center;
    min-width: 0;
    min-height: 0;
    flex: 1 1 0;
    overflow: hidden;
    --ui9000-host-min-height: 0;
    --ui9000-plot-min-height: 0;
  }

  .pane[data-kind='chartWidget'],
  .pane[data-kind='tableWidget'],
  .pane[data-kind='textWidget'],
  .pane[data-kind='imageWidget'] {
    border: 1px solid var(--ui9000-color-border, #e5e7eb);
    border-radius: 8px;
    background: var(--ui9000-color-surface, #fff);
  }

  .custom-content[data-direction='vertical'][data-panes='2'] .pane {
    flex: 1 1 50%;
    max-width: 50%;
  }

  .custom-content[data-direction='horizontal'][data-panes='2'] .pane {
    flex: 1 1 0;
    min-height: 0;
  }

  .pane > * {
    display: block;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
  }

  .pane-empty,
  .default-state {
    display: grid;
    place-items: center;
    align-content: center;
    width: 100%;
    height: 100%;
    padding: 1rem;
    text-align: center;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-size: 0.875rem;
    line-height: 1.4;
    box-sizing: border-box;
  }

  .pane-empty strong,
  .default-state strong {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--ui9000-color-text, #111827);
    font-weight: 600;
  }

  .default-state span,
  .pane-empty span {
    max-width: 34ch;
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
    /* collapse lets tbody text paint through sticky headers */
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

  .text-pane {
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: auto;
    padding: 8px;
    box-sizing: border-box;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    color: var(--ui9000-color-text, #111827);
    text-align: left;
  }

  .text-pane .md p {
    margin: 0 0 10px;
  }

  .text-pane .md h1,
  .text-pane .md h2,
  .text-pane .md h3 {
    margin: 0 0 8px;
    font-weight: 600;
    color: var(--ui9000-color-text, #111827);
  }

  .text-pane .md h1 {
    font-size: 1.25rem;
  }

  .text-pane .md h2 {
    font-size: 1.1rem;
  }

  .text-pane .md h3 {
    font-size: 1rem;
  }

  .text-pane .md ul,
  .text-pane .md ol {
    margin: 0 0 10px;
    padding-left: 16px;
  }

  .text-pane .md li {
    margin: 1px 0;
    padding-bottom: 5px;
  }

  .text-pane .md code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
  }

  .text-pane .md pre {
    margin: 0 0 10px;
    padding: 8px;
    overflow: auto;
    background: var(--ui9000-color-background, #f3f4f6);
    border-radius: 6px;
  }

  .text-pane .md a {
    color: var(--ui9000-color-primary, #473dd9);
  }

  .image-pane {
    display: flex;
    width: 100%;
    height: 100%;
    border-radius: 6px;
    overflow: hidden;
  }

  .image-pane img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;
