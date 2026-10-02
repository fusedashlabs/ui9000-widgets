import { css } from 'lit';

/**
 * Dark values are sampled from the Figma card (node 34:23675) at 1x. Light is
 * the same structure on the white surface the sibling cards use.
 */
export const powerPathStyles = css`
  :host {
    display: block;
    height: 100%;
    min-height: 0;
    font-family: var(--ui9000-font-family, Inter, system-ui, -apple-system, sans-serif);
    -webkit-font-smoothing: antialiased;
    --ppc-surface: linear-gradient(200deg, #ffffff 0%, #f5f6f8 100%);
    --ppc-border: #e5e7eb;
    --ppc-text: #21262e;
    --ppc-muted: #6c7584;
    --ppc-badge: rgba(17, 20, 26, 0.06);
    --ppc-block: rgba(17, 20, 26, 0.045);
    --ppc-banner: #fdf0f0;
    --ppc-banner-ink: #ffffff;
    --ppc-rule: rgba(17, 20, 26, 0.08);
    --ppc-hover: rgba(17, 20, 26, 0.05);
    --ppc-ok: #0f9f58;
    --ppc-warning: #c27a0e;
    --ppc-critical: #e0404f;
    --ppc-neutral: #6c7584;
    --ppc-dot-ok: #18cc3c;
    --ppc-dot-warning: #f0b424;
    --ppc-dot-critical: #ea4260;
    --ppc-dot-ring: rgba(17, 20, 26, 0.18);
    --ppc-accent-critical: linear-gradient(180deg, #ea607e, #fc6c72);
    --ppc-score-font: 'DIN Alternate', Bahnschrift, 'Barlow Semi Condensed', 'Roboto Condensed',
      var(--ui9000-font-family, Inter), sans-serif;
  }

  :host([data-mode='dark']) {
    --ppc-surface: linear-gradient(200deg, #454444 0%, #2c2b2b 45%, #1a1919 100%);
    --ppc-border: rgba(255, 255, 255, 0.07);
    --ppc-text: #ebeff0;
    --ppc-muted: #a4a9b1;
    --ppc-badge: rgba(0, 0, 0, 0.22);
    --ppc-block: rgba(255, 255, 255, 0.13);
    --ppc-banner: rgba(0, 0, 0, 0.45);
    --ppc-banner-ink: #141414;
    --ppc-rule: rgba(255, 255, 255, 0.1);
    --ppc-hover: rgba(255, 255, 255, 0.09);
    --ppc-ok: #18cc72;
    --ppc-warning: #fccc84;
    --ppc-critical: #fc6c6c;
    --ppc-neutral: #a4a9b1;
    --ppc-dot-ring: rgba(150, 150, 160, 0.5);
  }

  .card {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 13px;
    padding: 20px 14px 18px;
    border: 1px solid var(--ppc-border);
    border-radius: 12px;
    background: var(--ppc-surface);
    color: var(--ppc-text);
    overflow: hidden;
    container-type: inline-size;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 23px;
    margin-bottom: 7px;
  }

  .title {
    min-width: 0;
    margin: 0 0 0 1px;
    overflow: hidden;
    font-size: 17px;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 23px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    flex: none;
    height: 23px;
    padding: 0 10px 0 11px;
    border-radius: 999px;
    background: var(--ppc-badge);
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
  }

  .badge svg {
    width: 11px;
    height: 11px;
  }

  .ok { --ppc-tone: var(--ppc-ok); --ppc-dot: var(--ppc-dot-ok); }
  .warning { --ppc-tone: var(--ppc-warning); --ppc-dot: var(--ppc-dot-warning); }
  .critical { --ppc-tone: var(--ppc-critical); --ppc-dot: var(--ppc-dot-critical); }
  .neutral { --ppc-tone: var(--ppc-neutral); --ppc-dot: var(--ppc-neutral); }

  .health {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 50px;
    padding: 0 10px 0 15px;
    border-radius: 2px 12px 12px 2px;
    background:
      radial-gradient(120% 150% at 88% 0%, color-mix(in srgb, var(--ppc-tone) 22%, transparent), transparent 62%),
      var(--ppc-block);
    --ppc-spark: color-mix(in srgb, var(--ppc-tone) 88%, #ffffff);
  }

  .health::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 2px;
    background: var(--ppc-tone);
  }

  .health.critical::before {
    background: var(--ppc-accent-critical);
  }

  .health-label {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    margin-right: auto;
    font-size: 13px;
    font-weight: 600;
    line-height: 18px;
    white-space: nowrap;
  }

  .health-label > span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .health-label svg {
    width: 12px;
    height: 12px;
    flex: none;
  }

  .spark {
    display: block;
    flex: none;
    width: 72px;
    height: 24px;
  }

  .spark svg {
    display: block;
    overflow: visible;
  }

  .spark-line {
    fill: none;
    stroke: var(--ppc-spark);
    stroke-width: 1.6;
    stroke-linecap: round;
  }

  .spark-halo {
    fill: var(--ppc-spark);
    opacity: 0.3;
  }

  .spark-dot {
    fill: var(--ppc-spark);
  }

  .score {
    flex: none;
    font-family: var(--ppc-score-font);
    font-size: 32px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
    line-height: 1;
  }

  .fault {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 37px;
    padding: 0 15px;
    border-radius: 12px;
    background: var(--ppc-banner);
    color: var(--ppc-critical);
    font-size: 12px;
    line-height: 16px;
  }

  .fault.warning {
    color: var(--ppc-warning);
  }

  .fault svg {
    width: 12px;
    height: 12px;
    flex: none;
  }

  .fault-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rows {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(56px, max-content) minmax(58px, max-content);
    column-gap: 8px;
    min-height: 0;
    margin: 0;
    padding: 0;
    overflow: auto;
    list-style: none;
  }

  .row {
    position: relative;
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    align-items: center;
    min-height: 29px;
    padding: 0 7px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 16px;
  }

  /* Straight rule between rows; a border would bend with the hover radius. */
  .row + .row::before {
    content: '';
    position: absolute;
    inset: -0.5px 0 auto;
    height: 1px;
    background: var(--ppc-rule);
  }

  .row:hover::before,
  .row:hover + .row::before {
    background: transparent;
  }

  .row:hover {
    background: var(--ppc-hover);
  }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--ppc-tone);
    font-weight: 500;
    white-space: nowrap;
  }

  .dot {
    width: 9px;
    height: 9px;
    flex: none;
    border-radius: 50%;
    background:
      radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.75), transparent 45%),
      var(--ppc-dot);
    box-shadow: 0 0 0 1.5px var(--ppc-dot-ring);
  }

  .empty {
    margin: auto;
    color: var(--ppc-muted);
    font-size: 13px;
  }

  @container (max-width: 300px) {
    .spark {
      display: none;
    }
  }
`;
