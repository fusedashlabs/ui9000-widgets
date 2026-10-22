import { html, nothing, type TemplateResult } from 'lit';

import { dsText } from './ds-text.js';

import type { LabelTooltipState } from '../utils/chart-shell.js';
import { headerTitleDisplay } from '../utils/chart-shell.js';
import { iconDownload, iconOverflow } from './header-icons.js';
import { type WidgetHeaderVariant } from './widget-header.js';

export function renderWidgetHeader(options: {
  title: string;
  /** Second line under the title, stacked inside the same header row. */
  subtitle?: string;
  /**
   * Chart-supplied block sitting between the heading and the actions. Typed as
   * a Lit child value, so a chart can hand over `nothing` without the union
   * widening at the call site.
   */
  aside?: unknown;
  /**
   * Set false to drop Download image. The `actions` slot stays, so a host can
   * still project its own buttons onto a chart that does not offer download.
   */
  showActions?: boolean;
  /**
   * Set false to print the whole title, for a chart whose title takes its own
   * line and wraps instead of being cut at the header's length limit.
   */
  truncateTitle?: boolean;
  variant?: WidgetHeaderVariant;
  menuOpen: boolean;
  /**
   * A host projected nodes into the `actions` slot. The download menu stays
   * hidden for as long as that slot has an element.
   */
  customActions?: boolean;
  onActionsSlotChange?: (event: Event) => void;
  onMenuToggle: (e: Event) => void;
  onMenuClose: () => void;
  onDownload?: () => void;
}): TemplateResult | typeof nothing {
  const displayTitle = options.truncateTitle === false ? options.title : headerTitleDisplay(options.title);
  const variant = options.variant ?? 'chat';

  const downloadMenu =
    options.showActions === false || options.customActions
      ? nothing
      : html`<div class="menu-anchor">
        <button
          class="menu-btn"
          part="menu-button"
          type="button"
          aria-label="Chart menu"
          aria-expanded=${options.menuOpen ? 'true' : 'false'}
          @click=${options.onMenuToggle}
        >
          ${iconOverflow}
        </button>
        ${options.menuOpen
          ? html`<div class="menu-dropdown" part="menu">
              <button
                class="menu-item"
                type="button"
                data-action="download-image"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  options.onMenuClose();
                  options.onDownload?.();
                }}
              >
                ${iconDownload} Download image
              </button>
            </div>`
          : nothing}
      </div>`;

  // No download and no host buttons yet: keep the slot in the tree so a
  // later assignment can project, without reserving a gap in the title row.
  const slotOnly = options.showActions === false && !options.customActions;

  const actions = html`<div
    class="widget-actions"
    data-screenshot-ignore
    ?data-slot-only=${slotOnly}
  >
    <slot name="actions" @slotchange=${options.onActionsSlotChange}></slot>
    ${downloadMenu}
  </div>`;

  // `nothing` is a truthy symbol, so an absent aside has to be tested for it
  // explicitly or every chart without one renders an empty wrapper.
  const hasAside = options.aside !== undefined && options.aside !== nothing;

  const titleLine = html`<div class="widget-title" part="title" title=${options.title}>
    ${dsText(displayTitle, { size: 'sm' })}
  </div>`;

  // Only charts that pass a subtitle get the extra wrapper, so every other
  // chart's header keeps the exact DOM (and flex behaviour) it had before.
  const heading = options.subtitle
    ? html`<div class="widget-heading">
        ${titleLine}
        <div class="widget-subtitle" part="subtitle" title=${options.subtitle}>
          ${dsText(options.subtitle, { size: 'xs' })}
        </div>
      </div>`
    : titleLine;

  // The aside shares a wrapping row with the heading, so it drops below the
  // title as one block when space runs out. The actions stay outside that row
  // and keep their place at the top right.
  const main = hasAside
    ? html`<div class="widget-header-main">
        ${heading}
        <div class="widget-aside">${options.aside}</div>
      </div>`
    : heading;

  return html`
    <div class="widget-header" part="header" data-variant=${variant}>
      ${main}
      ${actions}
    </div>
  `;
}

export function renderLabelTooltip(tooltip: LabelTooltipState): TemplateResult | typeof nothing {
  if (!tooltip) return nothing;
  return html`<div
    class="label-tooltip"
    part="label-tooltip"
    style="left:${tooltip.x}px;top:${tooltip.y}px"
  >
    ${dsText(tooltip.text, { size: 'sm' })}
  </div>`;
}

export function dispatchChartDownload(host: HTMLElement): void {
  host.dispatchEvent(new CustomEvent('ui9000-download', { bubbles: true, composed: true }));
}
