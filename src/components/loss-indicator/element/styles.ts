import { css } from 'lit';

/**
 * Card chrome follows the host surface and text tokens. The scale keeps the
 * fixed condition colours from the Optivion card: green, yellow, orange, red,
 * then grey past the marker.
 */
export const lossIndicatorStyles = css`
  :host {
    display: block;
    height: 100%;
    min-height: 0;
    font-family: var(--ui9000-font-family, Inter, system-ui, -apple-system, sans-serif);
    font-feature-settings: 'ss01' on, 'cv11' on;
    -webkit-font-smoothing: antialiased;
    --li-text: var(--ui9000-color-text, #111827);
    --li-muted: var(--ui9000-color-text-muted, #6c7584);
    --li-surface: var(--ui9000-color-surface, #ffffff);
    --li-line: var(--ui9000-color-border, #e5e7eb);
    --li-marker: var(--ui9000-color-text, #111827);
    color: var(--li-text);
  }

  .panel {
    box-sizing: border-box;
    height: 100%;
    min-height: 220px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 26px 19px;
    border-radius: 12px;
    background: var(--li-surface);
    border: 1px solid var(--li-line);
    color: var(--li-text);
    overflow: hidden;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    min-height: 38px;
  }

  .info {
    width: 25px;
    height: 25px;
    flex: none;
    color: var(--li-muted);
  }

  .label {
    margin: 0;
    min-width: 0;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 28px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .value-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
  }

  .trend {
    width: 31px;
    height: 31px;
    flex: none;
    display: grid;
    place-items: center;
  }

  .trend svg {
    display: block;
  }

  .value {
    margin: 0 0 0 auto;
    font-size: 36px;
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 44px;
    font-variant-numeric: tabular-nums;
  }

  .scale {
    position: relative;
    height: 56px;
    min-width: 0;
  }

  .ticks {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 31px;
    margin-top: 3px;
  }

  .tick {
    flex: 1 1 0;
    min-width: 2px;
    height: 31px;
    border-radius: 1px;
  }

  .marker {
    position: absolute;
    top: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 18px;
    pointer-events: none;
    transform: translateX(-50%);
  }

  .marker-stem {
    width: 3px;
    height: 37px;
    border-radius: 1px;
    background: var(--li-marker);
  }

  .marker-head {
    width: 0;
    height: 0;
    margin-top: 1px;
    border-left: 9px solid transparent;
    border-right: 9px solid transparent;
    border-top: 10px solid var(--li-marker);
  }

  .axis {
    position: relative;
    height: 22px;
    min-width: 0;
  }

  .axis-label {
    position: absolute;
    top: 0;
    color: var(--li-muted);
    font-size: 14px;
    font-weight: 500;
    line-height: 22px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .axis-label[data-edge='start'] {
    left: 0;
  }

  .axis-label[data-edge='end'] {
    right: 0;
  }

  .axis-label[data-edge='mid'] {
    transform: translateX(-50%);
  }

  .empty {
    margin: auto;
    color: var(--li-muted);
    font-size: 13px;
  }
`;
