import { svg, type SVGTemplateResult } from 'lit';

/**
 * Default header action. Download is the Carbon icon at 16px (Apache-2.0).
 * Hosts that want chat, settings, or a menu pass those buttons in the
 * `actions` slot instead of this control.
 */

function glyph(viewBox: string, paths: SVGTemplateResult): SVGTemplateResult {
  return svg`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="${viewBox}" fill="currentColor" aria-hidden="true">${paths}</svg>`;
}

/** Carbon OverflowMenuHorizontal, rendered at 16. */
export const iconOverflow = glyph(
  '0 0 32 32',
  svg`<circle cx="8" cy="16" r="2"></circle><circle cx="16" cy="16" r="2"></circle><circle cx="24" cy="16" r="2"></circle>`,
);

/** Carbon Download, 16px glyph. */
export const iconDownload = glyph(
  '0 0 16 16',
  svg`<path d="M13 7 12.3 6.3 8.5 10.1 8.5 1 7.5 1 7.5 10.1 3.7 6.3 3 7 8 12z"></path><path d="M13,12v2H3v-2H2v2l0,0c0,0.6,0.4,1,1,1h10c0.6,0,1-0.4,1-1l0,0v-2H13z"></path>`,
);
