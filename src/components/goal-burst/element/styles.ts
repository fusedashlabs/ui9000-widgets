import { css, unsafeCSS } from 'lit';

import { CHART_TYPE } from '../../../utils/chart-theme.js';

/**
 * What the goal burst adds to the asset health arena's scene, whose
 * stylesheet it shares: the same room, labels, legend button and legend, and
 * here the key to the spikes' colours beside the reading under the title, the
 * map window's frame, and its corner, which reads what the goal draws on.
 */
export const goalBurstStyles = css`
  :host {
    /* small caps: the design system's body/xs, as every chart's subtitle */
    --gb-caps-size: ${unsafeCSS(String(CHART_TYPE.subtitle))}px;
    --gb-caps-weight: ${unsafeCSS(String(CHART_TYPE.subtitleWeight))};
    --gb-caps-tracking: ${unsafeCSS(CHART_TYPE.subtitleTracking)};
  }

  /* The header over the plot, so its menu, when open, stands over the map's corner rather than under it. */
  .widget-header {
    z-index: 2;
  }

  /* Under the title: the reading on the left, the key to the spikes' colours on the right. */
  .widget-header .widget-aside {
    align-self: stretch;
  }
  .gb-aside {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 24px;
  }
  /* on the right, even where it wraps under the reading */
  .gb-key {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    margin-left: auto;
    gap: 6px 14px;
    color: var(--ui9000-color-text-muted, #6b7280);
    font-family: var(--ah-face);
    font-size: var(--gb-caps-size);
    font-weight: var(--gb-caps-weight);
    line-height: 14px;
    letter-spacing: var(--gb-caps-tracking);
    text-transform: uppercase;
    white-space: nowrap;
  }
  :host([data-mode='dark']) .gb-key {
    color: var(--ah-mute);
  }
  .gb-key-caption {
    color: var(--ah-faint);
  }
  .gb-key-entry {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .gb-key-swatch {
    flex: none;
    width: 14px;
    height: 1px;
  }
  /* the arc across each sector: heavier than a spike */
  .gb-key-swatch.answered {
    height: 1.5px;
    border-radius: 1px;
  }

  /* Motes of light along the room's edges, under the burst. */
  .gb-motes {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  /* The map window, framed like a viewfinder. */
  .gb-frame {
    position: absolute;
    top: 4px;
    right: 4px;
    bottom: 4px;
    left: 60px;
    pointer-events: none;
    animation: ah-rise 560ms var(--ah-ease) 600ms backwards;
  }
  .gb-crop {
    position: absolute;
    width: 12px;
    height: 12px;
    border: 0 solid rgb(255 255 255 / 0.2);
  }
  :host([data-mode='light']) .gb-crop {
    border-color: rgb(17 24 39 / 0.22);
  }
  .gb-crop.tl {
    top: 0;
    left: 0;
    border-top-width: 1px;
    border-left-width: 1px;
  }
  .gb-crop.tr {
    top: 0;
    right: 0;
    border-top-width: 1px;
    border-right-width: 1px;
  }
  .gb-crop.bl {
    bottom: 0;
    left: 0;
    border-bottom-width: 1px;
    border-left-width: 1px;
  }
  .gb-crop.br {
    right: 0;
    bottom: 0;
    border-right-width: 1px;
    border-bottom-width: 1px;
  }
  /* Its upper right: the resource groups the goal draws on, of the fleet's, and its assets and calls there. */
  .gb-corner {
    position: absolute;
    top: 0;
    right: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    transform: translateY(-3px);
    color: var(--ah-faint);
    font-family: var(--ah-face);
    font-size: var(--gb-caps-size);
    font-weight: var(--gb-caps-weight);
    line-height: 1;
    letter-spacing: var(--gb-caps-tracking);
    text-transform: uppercase;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  /* The legend's dot for a group whose calls all get through, as beside its label's name. */
  .ah-legend-mark .solid.faint {
    fill: var(--ah-faint);
  }

  /* A label's readout: calls a minute, how quickly nineteen in twenty are answered, and the share held up. */
  .w-p95 {
    width: 58px;
  }

  @media (prefers-reduced-motion: reduce) {
    .gb-frame {
      animation: none;
    }
  }
`;
