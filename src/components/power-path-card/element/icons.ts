import { svg } from 'lit';

/** Radio mast for the asset badge. */
export const ANTENNA_ICON = svg`<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <circle cx="8" cy="5.6" r="1.4" fill="currentColor"></circle>
  <path d="M5.4 8.2a3.7 3.7 0 0 1 0-5.2M10.6 3a3.7 3.7 0 0 1 0 5.2M3.6 10a6.2 6.2 0 0 1 0-8.8M12.4 1.2a6.2 6.2 0 0 1 0 8.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>
  <path d="M8 7.4 5.2 15M8 7.4l2.8 7.6M6.2 12.4h3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`;

/** Lightning bolt beside the health label. */
export const BOLT_ICON = svg`<svg viewBox="0 0 16 16" aria-hidden="true">
  <path d="M9.6 1 3.4 9.1h4.1L6.4 15l6.2-8.1H8.5L9.6 1Z" fill="currentColor"></path>
</svg>`;

/** Filled alert disc for the fault banner. */
export const ALERT_ICON = svg`<svg viewBox="0 0 16 16" aria-hidden="true">
  <circle cx="8" cy="8" r="7.5" fill="currentColor"></circle>
  <path d="M8 4.2v4.6" stroke="var(--ppc-banner-ink)" stroke-width="1.8" stroke-linecap="round"></path>
  <circle cx="8" cy="11.4" r="1.05" fill="var(--ppc-banner-ink)"></circle>
</svg>`;
