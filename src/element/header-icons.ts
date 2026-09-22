import { svg, type SVGTemplateResult } from 'lit';

/**
 * Header icons from the FuseDash widget menu.
 * Overflow, download, remove, and settings are Carbon icons at 16px
 * (Apache-2.0). Chat, table, feedback, and add-to-page are the same SVGs
 * the client menu renders next to those Carbon icons.
 * Clip paths from the source files are the 16×16 viewBox, so they are omitted.
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

/** Carbon TrashCan, rendered at 16. */
export const iconRemove = glyph(
  '0 0 32 32',
  svg`<path d="M12 12H14V24H12z"></path><path d="M18 12H20V24H18z"></path><path d="M4,6V8H6V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V8h2V6ZM8,28V8H24V28Z"></path><path d="M12 2H20V4H12z"></path>`,
);

/** Carbon SettingsAdjust, rendered at 16. */
export const iconSettings = glyph(
  '0 0 32 32',
  svg`<path d="M30,8h-4.1c-0.5-2.3-2.5-4-4.9-4s-4.4,1.7-4.9,4H2v2h14.1c0.5,2.3,2.5,4,4.9,4s4.4-1.7,4.9-4H30V8z M21,12c-1.7,0-3-1.3-3-3 s1.3-3,3-3s3,1.3,3,3S22.7,12,21,12z"></path><path d="M2,24h4.1c0.5,2.3,2.5,4,4.9,4s4.4-1.7,4.9-4H30v-2H15.9c-0.5-2.3-2.5-4-4.9-4s-4.4,1.7-4.9,4H2V24z M11,20c1.7,0,3,1.3,3,3 s-1.3,3-3,3s-3-1.3-3-3S9.3,20,11,20z"></path>`,
);

/** Client `ai-filled.svg`. Keeps its own fill; the button color must not recolor it. */
export const iconChat = svg`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path fill="var(--colors-primary-icon-weaker, #9ea1fa)" fill-rule="evenodd" d="M.867 6.18a7.3 7.3 0 0 1 .76-1.86 7.36 7.36 0 0 1 9.221-3.105 2.9 2.9 0 0 1 1.278 1.605 2.92 2.92 0 0 1-.18 2.243l-.044.082-.007.011-.075.127-.002.004-.1.171-7.992-.05h-.175a3.57 3.57 0 0 0-2.83 1.498 7 7 0 0 1 .146-.726m.584.836A2.92 2.92 0 0 0 .7 8.939a7.36 7.36 0 0 0 9.992 5.913 3.55 3.55 0 0 1-1.634-.58 3.6 3.6 0 0 1-1.085-1.133l-.007-.012-.076-.134-3.948-6.939-.001.002-.205-.007h-.027l-.132-.001h-.03a2.94 2.94 0 0 0-2.096.968m6.89 5.476.004.006h.007l.09.17.005.009.006.012q.03.056.063.11l.005.009.002.003.006.01a2.94 2.94 0 0 0 2.308 1.4q.098.007.194.007c.521 0 1.009-.137 1.432-.375a7.362 7.362 0 0 0 .123-11.611c.251.548.352 1.134.316 1.705-.032.49-.163.97-.387 1.407l.004.003-.065.111-.075.127-.015.027-.28.478z" clip-rule="evenodd"></path></svg>`;

/** Client `tableIcon.svg`. */
export const iconTable = glyph(
  '0 0 16 16',
  svg`<path d="M13.5 1.5h-11a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-11a1 1 0 0 0-1-1m0 1v2h-11v-2zm-5 3h5V9h-5zM7.5 9h-5V5.5h5zm-5 1h5v3.5h-5zm6 3.5V10h5v3.5z"></path>`,
);

/** Client `FeedBackIcon.svg`. */
export const iconFeedback = glyph(
  '0 0 16 16',
  svg`<path fill-rule="evenodd" d="M8 6.48c0 .699-.306 1.348-.814 1.812A2.75 2.75 0 0 1 5.334 9H0V4.418l1.369-1.874L1.767 0h1.566c.326 0 .655.118.91.35.259.237.423.577.424.953V2.74h1.667a1.7 1.7 0 0 1 1.145.44c.32.293.52.71.521 1.167zM3.667 3.74V1.303a.3.3 0 0 0-.098-.215A.35.35 0 0 0 3.333 1h-.71l-.304 1.938L1 4.744V8h4.333c.442 0 .866-.16 1.178-.446A1.46 1.46 0 0 0 7 6.478v-2.13a.58.58 0 0 0-.196-.43.7.7 0 0 0-.47-.179H3.666zM8 9.52c0-.699.306-1.348.814-1.812A2.75 2.75 0 0 1 10.666 7H16v4.582l-1.369 1.874L14.233 16h-1.566c-.326 0-.655-.118-.91-.35a1.3 1.3 0 0 1-.424-.954v-1.435H9.666a1.7 1.7 0 0 1-1.145-.44c-.32-.293-.52-.71-.521-1.168zm4.333 2.74v2.436c0 .08.035.158.098.215a.35.35 0 0 0 .236.089h.71l.304-1.938L15 11.256V8h-4.333c-.442 0-.866.16-1.178.446A1.46 1.46 0 0 0 9 9.522v2.13c0 .162.07.316.196.43a.7.7 0 0 0 .47.179h2.667z" clip-rule="evenodd"></path>`,
);

/** Client `report-icon.svg` (Add to page). */
export const iconPage = glyph(
  '0 0 16 16',
  svg`<path d="M9 9H5v1h4zM11 6.5H5v1h6zM7.5 11.5H5v1h2.5z"></path><path d="M12.5 2.5H11V2a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v.5H3.5a1 1 0 0 0-1 1V14a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V3.5a1 1 0 0 0-1-1M6 2h4v2H6zm6.5 12h-9V3.5H5V5h6V3.5h1.5z"></path>`,
);
