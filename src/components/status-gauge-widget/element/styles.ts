import { css } from 'lit';

/**
 * Surfaces follow the chart tokens and, when the host provides them, the
 * client `--colors-*` theme. The dial is a fixed health spectrum; card bars
 * use the status color on a ticked range track.
 */
export const statusGaugeStyles = css`
  :host {
    display: block;
    height: 100%;
    min-height: 0;
    font-family: var(--ui9000-font-family, Inter, system-ui, -apple-system, sans-serif);
    font-feature-settings: 'ss01' on, 'cv11' on;
    -webkit-font-smoothing: antialiased;
    --sg-text: var(--colors-neutral-text-default, #21262e);
    --sg-muted: var(--colors-neutral-text-weak, #6c7584);
    --sg-surface: var(--colors-neutral-background-base, #ffffff);
    --sg-card: var(--colors-neutral-background-default, #f3f4f6);
    --sg-badge: var(--colors-neutral-background-hover, #e8eaed);
    --sg-line: var(--colors-neutral-border-weakest, #e5e7eb);
    --sg-gauge-rest: #f4f5f7;
    --sg-bar-track: #d5d8de;
    --sg-needle: #ffffff;
    --sg-needle-ink: #c5cad3;
    --sg-hair: rgba(255, 255, 255, 0.42);
    --sg-scale: #b7bdc6;
    --sg-cut: #b7bdc6;
    --sg-bead-ring: #ffffff;
    --sg-ok: #3ad07c;
    --sg-warning: #ff9a3c;
    --sg-critical: #ff4781;
    --sg-neutral: #8b93a0;
    color: var(--sg-text);
  }

  :host([theme='dark']),
  :host([data-mode='dark']),
  :host-context([data-theme='dark']) {
    --sg-text: #eff0f1;
    --sg-muted: #a4a9b1;
    --sg-surface: #16181d;
    --sg-card: #22262e;
    --sg-badge: #2a2e36;
    --sg-line: #343a44;
    --sg-gauge-rest: #ffffff;
    --sg-bar-track: #d0d4da;
    --sg-needle: #ffffff;
    --sg-needle-ink: rgba(22, 24, 29, 0.35);
    --sg-hair: rgba(255, 255, 255, 0.38);
    --sg-scale: rgba(255, 255, 255, 0.72);
    --sg-cut: #ffffff;
    --sg-bead-ring: #3a342c;
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

  .panel[data-mode='dark'] {
    --sg-text: #eff0f1;
    --sg-muted: #a4a9b1;
    --sg-surface: #16181d;
    --sg-card: #22262e;
    --sg-badge: #2a2e36;
    --sg-line: #343a44;
    --sg-gauge-rest: #ffffff;
    --sg-bar-track: #d0d4da;
    --sg-needle: #ffffff;
    --sg-needle-ink: rgba(22, 24, 29, 0.35);
    --sg-hair: rgba(255, 255, 255, 0.38);
    --sg-scale: rgba(255, 255, 255, 0.72);
    --sg-cut: #ffffff;
    --sg-bead-ring: #3a342c;
    background: #16181d;
    border-color: #343a44;
    color: #eff0f1;
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
    background-image: repeating-linear-gradient(
      90deg,
      transparent 0 5px,
      rgba(22, 24, 29, 0.55) 5px 6px
    );
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
