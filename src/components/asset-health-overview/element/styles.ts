import { css } from 'lit';

/**
 * Stage chrome uses `--aho-*` set from `assetHealthPalette` in the element.
 * Fallbacks match `LIGHT_PALETTE` so first paint before resolve is light.
 */
export const assetHealthStyles = css`
  :host {
    display: block;
    min-height: 0;
    font-family: var(--ui9000-font-family, Inter, sans-serif);
    -webkit-font-smoothing: antialiased;
    --aho-stage: #f5f5f5;
    --aho-border: #e5e5e5;
    --aho-empty: #737373;
  }

  .stage {
    background: var(--aho-stage);
    border: 1px solid var(--aho-border);
    border-radius: 12px;
    overflow: hidden;
  }

  .scene {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: pan-y;
  }

  :host([flat]) .scene {
    cursor: default;
  }

  .scene.dragging {
    cursor: grabbing;
  }

  .empty {
    margin: 0;
    padding: 48px 16px;
    text-align: center;
    font-size: var(--ui9000-font-size-label, 12px);
    color: var(--aho-empty);
  }
`;
