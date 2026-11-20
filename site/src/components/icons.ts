import { svg, html } from 'lit';

/** Line icons on a 24px grid; they take the text colour (currentColor). */
const icon = (paths: ReturnType<typeof svg>) =>
  html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const icons = {
  menu: icon(svg`<path d="M4 7h16M4 12h16M4 17h16" />`),
  close: icon(svg`<path d="M6 6l12 12M18 6L6 18" />`),
  sun: icon(
    svg`<circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />`,
  ),
  moon: icon(svg`<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />`),
  chevronDown: icon(svg`<path d="M6 9l6 6 6-6" />`),
  chevronUp: icon(svg`<path d="M6 15l6-6 6 6" />`),
  chevronRight: icon(svg`<path d="M9 6l6 6-6 6" />`),
  arrowRight: icon(svg`<path d="M5 12h14M13 6l6 6-6 6" />`),
  plus: icon(svg`<path d="M12 5v14M5 12h14" />`),
  minus: icon(svg`<path d="M5 12h14" />`),
  copy: icon(svg`<rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />`),
  check: icon(svg`<path d="M5 12.5l4.5 4.5L19 7.5" />`),
  reset: icon(svg`<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4.5h4.5" />`),
  play: icon(svg`<path d="M8 5.5v13l10.5-6.5z" />`),
  search: icon(svg`<circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" />`),
  page: icon(svg`<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" /><path d="M14 3.5V8h4M9.5 12.5h5M9.5 16h5" />`),
  chart: icon(svg`<path d="M4 20h16M7 16.5v-5M12 16.5v-10M17 16.5v-7" />`),
  gear: icon(
    svg`<path d="M10.26 5.01L10.51 2.62H13.49L13.74 5.01A7.2 7.2 0 0 1 15.71 5.83L17.58 4.31L19.69 6.42L18.17 8.29A7.2 7.2 0 0 1 18.99 10.26L21.38 10.51V13.49L18.99 13.74A7.2 7.2 0 0 1 18.17 15.71L19.69 17.58L17.58 19.69L15.71 18.17A7.2 7.2 0 0 1 13.74 18.99L13.49 21.38H10.51L10.26 18.99A7.2 7.2 0 0 1 8.29 18.17L6.42 19.69L4.31 17.58L5.83 15.71A7.2 7.2 0 0 1 5.01 13.74L2.62 13.49V10.51L5.01 10.26A7.2 7.2 0 0 1 5.83 8.29L4.31 6.42L6.42 4.31L8.29 5.83A7.2 7.2 0 0 1 10.26 5.01Z" /><circle cx="12" cy="12" r="3" />`,
  ),
  sliders: icon(svg`<path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" />`),
  enter: icon(svg`<path d="M19 5v7a3 3 0 0 1-3 3H6" /><path d="M10 11l-4 4 4 4" />`),
};
