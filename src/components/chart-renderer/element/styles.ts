import { css } from 'lit';

export const chartRendererStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: var(--ui9000-host-min-height, 220px);
    box-sizing: border-box;
  }
  :host([embedded]) {
    min-height: 0;
  }
  .host {
    display: block;
    width: 100%;
    height: 100%;
    min-height: inherit;
  }
  .host[hidden],
  .empty[hidden] {
    display: none !important;
  }
  .empty {
    display: grid;
    place-items: center;
    height: 100%;
    min-height: inherit;
    padding: 1rem;
    text-align: center;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-family: var(--ui9000-font-family, system-ui, sans-serif);
    font-size: 0.875rem;
    line-height: 1.4;
  }
  .empty strong {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--ui9000-color-text, #111827);
    font-weight: 600;
  }
`;
