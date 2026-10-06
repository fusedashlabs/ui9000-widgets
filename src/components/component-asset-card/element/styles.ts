import { css } from 'lit';

/**
 * Dark values are sampled from the Figma card (node 34:23967, 2x export
 * halved to CSS px). Light is the same structure on the white surface the
 * sibling cards use.
 */
export const componentAssetStyles = css`
  :host {
    display: block;
    min-height: 0;
    font-family: var(--ui9000-font-family, Inter, system-ui, -apple-system, sans-serif);
    -webkit-font-smoothing: antialiased;
    --cac-bezel: linear-gradient(180deg, #eceef1 0%, #e4e7eb 100%);
    --cac-border: #dfe2e7;
    --cac-highlight: rgba(255, 255, 255, 0.9);
    --cac-surface: linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%);
    --cac-text: #21262e;
    --cac-muted: #6c7584;
    --cac-soft: #4a5260;
    --cac-badge: rgba(17, 20, 26, 0.06);
    --cac-ok: #0f9f58;
    --cac-critical: #e0404f;
    --cac-neutral: #6c7584;
    --cac-status-ok: #18b868;
    --cac-status-warning: #e0a019;
    --cac-status-critical: #e0404f;
    --cac-line-ok: #12b866;
    --cac-line-warning: #dd9a12;
    --cac-line-critical: #e8505b;
    --cac-line-neutral: #8a929e;
    --cac-track-ok: #1eae66;
    --cac-track-warning: #e3a43a;
    --cac-track-critical: #d65f63;
    --cac-track-neutral: #c9cdd3;
    --cac-cap-ok: #17c46f;
    --cac-cap-warning: #f0b424;
    --cac-cap-critical: #ea4a52;
    --cac-cap-neutral: #b5bac2;
    --cac-track-fade: #ffffff;
    --cac-divider: rgba(17, 20, 26, 0.55);
    --cac-pin-fill: #ffffff;
    --cac-pin-ring: #21262e;
    --cac-value-font: 'DIN Alternate', Bahnschrift, 'Barlow Semi Condensed', 'Roboto Condensed',
      var(--ui9000-font-family, Inter), sans-serif;
  }

  :host([data-mode='dark']) {
    --cac-bezel: linear-gradient(180deg, #2a2727 0%, #312d2d 100%);
    --cac-border: rgba(255, 255, 255, 0.05);
    --cac-highlight: rgba(255, 255, 255, 0.42);
    --cac-surface: linear-gradient(180deg, #211f1f 0%, #272424 100%);
    --cac-text: #ffffff;
    --cac-muted: #919090;
    --cac-soft: #bebdbd;
    --cac-badge: rgba(255, 255, 255, 0.07);
    --cac-ok: #1dd177;
    --cac-critical: #fc6c6c;
    --cac-neutral: #a4a9b1;
    --cac-status-ok: #1dd177;
    --cac-status-warning: #f0b424;
    --cac-status-critical: #fc6c6c;
    --cac-line-ok: #2dff96;
    --cac-line-warning: #fccc84;
    --cac-line-critical: #fe9192;
    --cac-line-neutral: #a4a9b1;
    --cac-track-ok: #1eae66;
    --cac-track-warning: #c89640;
    --cac-track-critical: #bd5859;
    --cac-track-neutral: #4a4747;
    --cac-cap-ok: #1ebf6f;
    --cac-cap-warning: #e0a640;
    --cac-cap-critical: #d0605f;
    --cac-cap-neutral: #5a5757;
    --cac-track-fade: #1f1d1d;
    --cac-divider: rgba(20, 18, 18, 0.9);
    --cac-pin-fill: #21262e;
    --cac-pin-ring: #ffffff;
  }

  .card {
    box-sizing: border-box;
    height: 100%;
    padding: 5px;
    border: 1px solid var(--cac-border);
    border-radius: 15px;
    background: var(--cac-bezel);
    box-shadow: inset 0 1px 0 var(--cac-highlight);
    color: var(--cac-text);
    container-type: inline-size;
  }

  .surface {
    box-sizing: border-box;
    height: 100%;
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    column-gap: 13px;
    align-items: center;
    padding: 9.5px 10px 10px 14px;
    border-radius: 10px;
    background: var(--cac-surface);
    overflow: hidden;
  }

  .surface.no-asset {
    grid-template-columns: minmax(0, 1fr);
    padding-left: 14px;
  }

  .asset {
    display: grid;
    place-items: center;
    min-width: 0;
  }

  .asset img {
    display: block;
    width: 100%;
    height: 74px;
    object-fit: contain;
  }

  .main {
    min-width: 0;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 20px;
    margin-bottom: 10.5px;
  }

  .title {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4.5px;
    flex: none;
    max-width: 55%;
    height: 15px;
    margin-left: auto;
    padding: 0 5px;
    border-radius: 4px;
    background: var(--cac-badge);
    font-size: 11px;
    line-height: 1;
    white-space: nowrap;
  }

  .badge-id {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status {
    width: 3.5px;
    height: 7px;
    flex: none;
    border-radius: 1.5px;
  }

  .status.ok { background: var(--cac-status-ok); }
  .status.warning { background: var(--cac-status-warning); }
  .status.critical { background: var(--cac-status-critical); }

  .body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .reading {
    min-width: 0;
  }

  .label {
    margin: 0;
    overflow: hidden;
    color: var(--cac-muted);
    font-size: 11px;
    line-height: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value {
    margin: 2px 0 0;
    font-family: var(--cac-value-font);
    font-size: 36px;
    font-weight: 500;
    font-feature-settings: 'tnum', 'zero';
    letter-spacing: 0.01em;
    line-height: 36px;
    white-space: nowrap;
  }

  .delta {
    display: flex;
    align-items: baseline;
    gap: 3px;
    margin: 4px 0 0;
    color: var(--cac-soft);
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
  }

  .delta-change {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    font-weight: 600;
  }

  .delta.ok .delta-change { color: var(--cac-ok); }
  .delta.critical .delta-change { color: var(--cac-critical); }
  .delta.neutral .delta-change { color: var(--cac-neutral); }

  .arrow {
    width: 7px;
    height: 9px;
    flex: none;
    align-self: center;
  }

  .delta.down .arrow {
    transform: rotate(180deg);
  }

  .delta-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .trend {
    display: block;
    flex: none;
    width: 74px;
    height: 30px;
    margin-right: 5.5px;
  }

  .trend svg {
    display: block;
    overflow: visible;
  }

  .trend-line {
    fill: none;
    stroke-width: 1.2;
    stroke-linecap: round;
  }

  .trend-area {
    opacity: 0.16;
  }

  .guide {
    stroke-width: 1;
    stroke-dasharray: 1.5 1.5;
    opacity: 0.45;
  }

  .guide.warning { stroke: var(--cac-line-warning); }
  .guide.critical { stroke: var(--cac-line-critical); }

  .seg.ok { fill: var(--cac-track-ok); }
  .seg.warning { fill: var(--cac-track-warning); }
  .seg.critical { fill: var(--cac-track-critical); }
  .seg.neutral { fill: var(--cac-track-neutral); }
  .cap.ok { fill: var(--cac-cap-ok); }
  .cap.warning { fill: var(--cac-cap-warning); }
  .cap.critical { fill: var(--cac-cap-critical); }
  .cap.neutral { fill: var(--cac-cap-neutral); }

  .divider {
    stroke: var(--cac-divider);
    stroke-width: 0.75;
  }

  .pin {
    fill: var(--cac-pin-fill);
    stroke: var(--cac-pin-ring);
    stroke-width: 0.9;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .empty {
    margin: 0;
    padding: 24px 0;
    color: var(--cac-muted);
    font-size: 13px;
    text-align: center;
  }

  @container (max-width: 330px) {
    .surface {
      grid-template-columns: 60px minmax(0, 1fr);
      column-gap: 10px;
      padding-left: 10px;
    }

    .asset img {
      height: 56px;
    }
  }

  @container (max-width: 270px) {
    .trend {
      display: none;
    }
  }
`;
