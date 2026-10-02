import { css } from 'lit';

export const kpiWidgetStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 95px;
    color: var(--ui9000-color-text, #111827);
    background: var(--ui9000-color-surface, #ffffff);
    font-family: var(--ui9000-font-family, system-ui, sans-serif);
    box-sizing: border-box;
  }

  .kpi-root[data-layout='single'] {
    min-height: 120px;
  }

  .kpi-root[data-layout='advanced'] {
    min-height: 220px;
  }

  .kpi-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: inherit;
    min-width: 0;
    overflow: hidden;
  }

  .kpi-section-title {
    flex: 0 0 auto;
    width: 100%;
    min-width: 0;
    padding: 8px 14px 4px;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    color: var(--ui9000-color-text, #111827);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kpi-grid {
    flex: 1;
    min-height: 0;
    width: 100%;
    scrollbar-width: thin;
  }

  .kpi-grid[data-layout='grid'] {
    display: grid;
    grid-auto-rows: minmax(72px, 1fr);
    gap: 0;
    align-content: start;
  }

  .kpi-grid[data-layout='single'] {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
  }

  .kpi-grid[data-scroll='vertical'] {
    overflow-x: hidden;
    overflow-y: auto;
  }

  .kpi-grid[data-scroll='horizontal'] {
    overflow-x: auto;
    overflow-y: hidden;
  }

  .kpi-grid[data-scroll='both'] {
    overflow: auto;
  }

  .kpi-advanced {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .kpi-advanced-main {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    width: 100%;
    min-width: 0;
    min-height: 80px;
    overflow: hidden;
  }

  .kpi-advanced-main .kpi-card {
    flex: 1;
    min-height: 0;
    padding: 14px 16px 8px;
  }

  .kpi-advanced-split {
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;
    align-items: stretch;
  }

  .kpi-advanced-split[data-split='horizontal'] {
    flex-direction: row;
  }

  .kpi-advanced-split[data-split='stacked'] {
    flex-direction: column;
  }

  .kpi-advanced-value {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }

  .kpi-advanced-split[data-split='horizontal'] .kpi-advanced-value {
    flex: 0 0 25%;
    width: 25%;
    padding-right: 8px;
  }

  .kpi-advanced-split[data-split='stacked'] .kpi-advanced-value {
    flex: 0 0 auto;
    width: 100%;
    margin-bottom: 8px;
  }

  .kpi-advanced-chart {
    min-width: 0;
    min-height: 0;
    flex: 1 1 0;
    position: relative;
    overflow: hidden;
  }

  .kpi-advanced-chart ui9000-chart-renderer {
    display: block;
    width: 100%;
    height: 100%;
  }

  .kpi-supporting {
    display: grid;
    grid-auto-rows: minmax(72px, 1fr);
    gap: 0;
    flex: 0 1 auto;
    min-width: 0;
    min-height: 72px;
    max-height: 50%;
    width: 100%;
    align-content: start;
    border-top: 1px solid var(--ui9000-color-border, #e5e7eb);
    padding-top: 4px;
    scrollbar-width: thin;
  }

  .kpi-supporting[data-scroll='vertical'] {
    overflow-x: hidden;
    overflow-y: auto;
  }

  .kpi-supporting[data-scroll='horizontal'] {
    overflow-x: auto;
    overflow-y: hidden;
  }

  .kpi-supporting[data-scroll='both'] {
    overflow: auto;
  }

  .kpi-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    padding: 10px 12px;
    box-sizing: border-box;
  }

  .kpi-grid[data-layout='single'] .kpi-card {
    padding: 14px;
  }

  .kpi-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    min-width: 0;
    gap: 8px;
    margin-bottom: 6px;
  }

  .kpi-grid[data-layout='single'] .kpi-header,
  .kpi-advanced-main .kpi-header {
    margin-bottom: 10px;
  }

  .kpi-name {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--ui9000-color-text-muted, #6b7280);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .kpi-grid[data-layout='single'] .kpi-name,
  .kpi-advanced-main .kpi-name {
    font-size: 14px;
    line-height: 20px;
    color: var(--ui9000-color-text, #111827);
  }

  .kpi-badge {
    flex-shrink: 0;
    width: fit-content;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    line-height: 16px;
    font-weight: 400;
    padding: 1px 6px;
    border-radius: 14px;
    color: var(--ui9000-color-text-muted, #6b7280);
    background: var(--ui9000-color-surface-muted, #f3f4f6);
  }

  .kpi-grid[data-layout='single'] .kpi-badge,
  .kpi-advanced-main .kpi-badge {
    font-size: 14px;
    line-height: 20px;
    padding: 3px 9px;
  }

  .kpi-badge[data-variant='Good'],
  .kpi-badge[data-variant='OnTarget'] {
    color: #0e8a5b;
    background: rgba(14, 138, 91, 0.12);
  }

  .kpi-badge[data-variant='Low'],
  .kpi-badge[data-variant='OffTarget'] {
    color: #d92d20;
    background: rgba(217, 45, 32, 0.12);
  }

  .kpi-badge[data-variant='Mission'] {
    color: #fff;
    background: #111827;
  }

  .kpi-value-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
    flex-wrap: wrap;
  }

  .kpi-advanced-main .kpi-value-row {
    flex-wrap: nowrap;
  }

  .kpi-value {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    line-height: 1.15;
    color: var(--ui9000-color-text, #111827);
  }

  .kpi-grid[data-layout='single'] .kpi-value {
    font-size: clamp(28px, 8vw, 48px);
  }

  .kpi-advanced-main .kpi-value {
    font-size: clamp(18px, 5vw, 42px);
  }

  :host([scale='compact']) .kpi-value {
    font-size: 18px;
  }

  :host([scale='compact']) .kpi-grid[data-layout='single'] .kpi-value {
    font-size: clamp(20px, 6vw, 32px);
  }

  :host([scale='comfortable']) .kpi-value {
    font-size: 28px;
  }

  :host([scale='comfortable']) .kpi-grid[data-layout='single'] .kpi-value {
    font-size: clamp(32px, 9vw, 56px);
  }

  .kpi-unit,
  .kpi-suffix {
    font-size: 14px;
    font-weight: 300;
    color: var(--ui9000-color-text, #111827);
  }

  .kpi-indicator {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ui9000-color-text-muted, #6b7280);
  }

  .kpi-indicator-arrow {
    font-size: 11px;
    line-height: 1;
  }

  .kpi-subtitle-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    margin-top: 4px;
  }

  .kpi-subtitle-row .kpi-subtitle {
    margin-top: 0;
  }

  .kpi-subtitle {
    margin: 6px 0 0;
    padding-left: 15px;
    position: relative;
    font-size: 12px;
    line-height: 1.35;
    color: var(--ui9000-color-text-muted, #6b7280);
  }

  .kpi-subtitle::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transform: translateY(-50%);
    background: var(--ui9000-color-text-muted, #6b7280);
  }

  .kpi-footer {
    flex: 0 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 6px 14px 8px;
    border-top: 1px solid var(--ui9000-color-border, #e5e7eb);
    box-sizing: border-box;
  }

  .kpi-footer-block {
    display: flex;
    gap: 4px;
    min-width: 0;
    font-size: 13px;
    line-height: 20px;
  }

  .kpi-footer-label {
    font-weight: 400;
    color: var(--ui9000-color-text-muted, #6b7280);
  }

  .kpi-footer-value {
    font-weight: 400;
    color: var(--ui9000-color-text, #111827);
  }

  .empty {
    display: grid;
    place-items: center;
    flex: 1;
    min-height: 72px;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-size: 13px;
  }
`;
