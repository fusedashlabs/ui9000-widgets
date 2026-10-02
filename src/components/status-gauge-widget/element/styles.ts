import { css } from 'lit';

/**
 * Card chrome follows the same host tokens as the other charts. The dial
 * stays a fixed health spectrum; card bars use the status color.
 */
export const statusGaugeStyles = css`
  :host {
    display: block;
    height: 100%;
    min-height: 0;
    font-family: var(--ui9000-font-family, Inter, system-ui, -apple-system, sans-serif);
    font-feature-settings: 'ss01' on, 'cv11' on;
    -webkit-font-smoothing: antialiased;
    --sg-text: var(--ui9000-color-text, #111827);
    --sg-muted: var(--ui9000-color-text-muted, #6c7584);
    --sg-surface: var(--ui9000-color-surface, #ffffff);
    --sg-card: var(--ui9000-color-surface-muted, #f3f4f6);
    --sg-badge: var(--ui9000-color-surface-muted, #f3f4f6);
    --sg-line: var(--ui9000-color-border, #e5e7eb);
    --sg-gauge-rest: var(--ui9000-color-border, #e5e7eb);
    --sg-bar-track: #d5d8de;
    --sg-needle: #ffffff;
    --sg-needle-ink: #c5cad3;
    --sg-hair: rgba(255, 255, 255, 0.42);
    --sg-scale: var(--ui9000-color-text-muted, #b7bdc6);
    --sg-cut: var(--ui9000-color-text-muted, #b7bdc6);
    --sg-bead-ring: var(--ui9000-color-surface, #ffffff);
    --sg-ok: #3ad07c;
    --sg-warning: #ff9a3c;
    --sg-critical: #ff4781;
    --sg-neutral: #8b93a0;
    color: var(--sg-text);
  }

  .panel {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    border-radius: 12px;
    background: var(--sg-surface);
    border: 1px solid var(--sg-line);
    color: var(--sg-text);
    overflow: hidden;
  }

  .title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.011em;
    line-height: 22px;
  }

  .subtitle {
    margin: 2px 0 0;
    color: var(--sg-muted);
    font-size: 13px;
    font-weight: 400;
    line-height: 18px;
  }

  .rule {
    height: 1px;
    margin: 4px 0 2px;
    background: var(--sg-line);
  }

  .health {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 28px;
  }

  .health-name {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }

  .check {
    width: 22px;
    height: 22px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 6px;
    border: 1px solid var(--sg-line);
    color: var(--sg-muted);
  }

  .check svg {
    width: 14px;
    height: 14px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    padding: 3px 9px;
    border-radius: 14px;
    background: var(--sg-badge);
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
  }

  .badge.ok { color: var(--sg-ok); }
  .badge.warning { color: var(--sg-warning); }
  .badge.critical { color: var(--sg-critical); }
  .badge.neutral { color: var(--sg-neutral); }

  .dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    background: currentColor;
  }

  .gauge {
    flex: 1 1 140px;
    min-height: 140px;
    min-width: 0;
  }

  .gauge svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .gauge text {
    font-family: inherit;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .metrics {
    display: grid;
    gap: 8px;
    min-height: 0;
    max-height: 48%;
    overflow: auto;
  }

  .metrics[data-cols='1'] {
    grid-template-columns: minmax(0, 1fr);
  }

  .metrics[data-cols='2'] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card {
    min-width: 0;
    padding: 10px 12px 8px;
    border-radius: 8px;
    background: var(--sg-card);
  }

  .card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .card-label {
    color: var(--sg-muted);
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
  }

  .card .dot {
    margin-top: 3px;
  }

  .card.ok .dot { color: var(--sg-ok); background: var(--sg-ok); }
  .card.warning .dot { color: var(--sg-warning); background: var(--sg-warning); }
  .card.critical .dot { color: var(--sg-critical); background: var(--sg-critical); }
  .card.neutral .dot { color: var(--sg-neutral); background: var(--sg-neutral); }

  .range.ok .range-fill { background: var(--sg-ok); }
  .range.warning .range-fill { background: var(--sg-warning); }
  .range.critical .range-fill { background: var(--sg-critical); }
  .range.neutral .range-fill { background: var(--sg-neutral); }

  .value {
    margin-top: 6px;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
  }

  .unit {
    margin-left: 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--sg-muted);
  }

  .range {
    position: relative;
    height: 4px;
    margin-top: 10px;
    overflow: hidden;
    border-radius: 99px;
    /* First 30% is solid. After that, a gap every 5% cuts fill and track. */
    --sg-gap: 2px;
    --sg-ticks: linear-gradient(
      90deg,
      #000 0 calc(30% - var(--sg-gap)),
      transparent calc(30% - var(--sg-gap)) 30%,
      #000 30% calc(35% - var(--sg-gap)),
      transparent calc(35% - var(--sg-gap)) 35%,
      #000 35% calc(40% - var(--sg-gap)),
      transparent calc(40% - var(--sg-gap)) 40%,
      #000 40% calc(45% - var(--sg-gap)),
      transparent calc(45% - var(--sg-gap)) 45%,
      #000 45% calc(50% - var(--sg-gap)),
      transparent calc(50% - var(--sg-gap)) 50%,
      #000 50% calc(55% - var(--sg-gap)),
      transparent calc(55% - var(--sg-gap)) 55%,
      #000 55% calc(60% - var(--sg-gap)),
      transparent calc(60% - var(--sg-gap)) 60%,
      #000 60% calc(65% - var(--sg-gap)),
      transparent calc(65% - var(--sg-gap)) 65%,
      #000 65% calc(70% - var(--sg-gap)),
      transparent calc(70% - var(--sg-gap)) 70%,
      #000 70% calc(75% - var(--sg-gap)),
      transparent calc(75% - var(--sg-gap)) 75%,
      #000 75% calc(80% - var(--sg-gap)),
      transparent calc(80% - var(--sg-gap)) 80%,
      #000 80% calc(85% - var(--sg-gap)),
      transparent calc(85% - var(--sg-gap)) 85%,
      #000 85% calc(90% - var(--sg-gap)),
      transparent calc(90% - var(--sg-gap)) 90%,
      #000 90% calc(95% - var(--sg-gap)),
      transparent calc(95% - var(--sg-gap)) 95%,
      #000 95% 100%
    );
    mask-image: var(--sg-ticks);
    mask-size: 100% 100%;
    mask-repeat: no-repeat;
    -webkit-mask-image: var(--sg-ticks);
    -webkit-mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat;
  }

  .range-track,
  .range-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
  }

  .range-track {
    right: 0;
    background-color: var(--sg-bar-track);
  }

  .range-fill {
    border-radius: 99px 0 0 99px;
  }

  .empty {
    margin: auto;
    color: var(--sg-muted);
    font-size: 13px;
  }
`;
