import { html, nothing, type TemplateResult } from 'lit';

import type { LabelTooltipState } from '../utils/chart-shell.js';
import { headerTitleDisplay } from '../utils/chart-shell.js';
import {
  iconChat,
  iconDownload,
  iconFeedback,
  iconOverflow,
  iconPage,
  iconRemove,
  iconSettings,
  iconTable,
} from './header-icons.js';
import {
  headerMenuHandler,
  resolveHeaderChrome,
  type HeaderMenuItem,
  type WidgetHeaderHandlers,
  type WidgetHeaderVariant,
} from './widget-header.js';

const DASH_ITEM_ICONS: Record<string, TemplateResult> = {
  'view-table': iconTable,
  'provide-feedback': iconFeedback,
  'save-report': iconPage,
  'download-image': iconDownload,
};

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
   * Set false to drop the actions block entirely — for a chart whose host owns
   * the chrome, or that has no action worth offering.
   */
  showActions?: boolean;
  variant?: WidgetHeaderVariant;
  menuOpen: boolean;
  handlers?: WidgetHeaderHandlers;
  onMenuToggle: (e: Event) => void;
  onMenuClose: () => void;
  onDownload?: () => void;
}): TemplateResult | typeof nothing {
  const displayTitle = headerTitleDisplay(options.title);
  const handlers = options.handlers ?? {};
  const chrome = resolveHeaderChrome(options.variant ?? 'chat', handlers);
  const runItem = (item: HeaderMenuItem) => {
    headerMenuHandler(item, handlers)?.();
    if (item.fallbackDownload) options.onDownload?.();
    options.onMenuClose();
  };

  const menu = chrome.showMenu
    ? html`<div class="menu-anchor">
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
              ${chrome.items.map(
                (item) => html`<button
                  class="menu-item"
                  type="button"
                  data-action=${item.id}
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    runItem(item);
                  }}
                >
                  ${DASH_ITEM_ICONS[item.id] ?? nothing}
                  ${item.label}
                </button>`,
              )}
              ${chrome.showRemove
                ? html`<div class="menu-divider"></div>
                    <button
                      class="menu-item menu-item--remove"
                      type="button"
                      data-action="remove"
                      @click=${(e: Event) => {
                        e.stopPropagation();
                        handlers.onRemove?.();
                        options.onMenuClose();
                      }}
                    >
                      ${iconRemove} Remove
                    </button>`
                : nothing}
            </div>`
          : nothing}
      </div>`
    : nothing;

  const chatButton = chrome.showChat
    ? html`<button
        class="icon-btn"
        part="chat-button"
        type="button"
        aria-label="Open chat"
        @click=${(e: Event) => {
          e.stopPropagation();
          handlers.onOpenChat?.();
        }}
      >
        ${iconChat}
      </button>`
    : nothing;

  const settingsButton = chrome.showSettings
    ? html`<button
        class="settings-btn"
        part="settings-button"
        type="button"
        aria-label="Widget settings"
        @click=${(e: Event) => {
          e.stopPropagation();
          handlers.onOpenSettings?.();
        }}
      >
        ${iconSettings}
      </button>`
    : nothing;

  const actions =
    chrome.variant === 'dash'
      ? html`<div class="widget-actions" data-screenshot-ignore>
          ${chrome.showChat || chrome.showMenu
            ? html`<div class="hover-actions" data-open=${options.menuOpen ? 'true' : 'false'}>
                ${chatButton} ${menu}
              </div>`
            : nothing}
          ${settingsButton}
        </div>`
      : html`<div class="widget-actions" data-screenshot-ignore>${menu}</div>`;

  // `nothing` is a truthy symbol, so an absent aside has to be tested for it
  // explicitly or every chart without one renders an empty wrapper.
  const hasAside = options.aside !== undefined && options.aside !== nothing;

  const titleLine = html`<div class="widget-title" part="title" title=${options.title}>
    ${displayTitle}
  </div>`;

  // Only charts that pass a subtitle get the extra wrapper, so every other
  // chart's header keeps the exact DOM (and flex behaviour) it had before.
  const heading = options.subtitle
    ? html`<div class="widget-heading">
        ${titleLine}
        <div class="widget-subtitle" part="subtitle" title=${options.subtitle}>
          ${options.subtitle}
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
    <div class="widget-header" part="header" data-variant=${chrome.variant}>
      ${main}
      ${options.showActions === false ? nothing : actions}
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
    ${tooltip.text}
  </div>`;
}

export function dispatchChartDownload(host: HTMLElement): void {
  host.dispatchEvent(new CustomEvent('ui9000-download', { bubbles: true, composed: true }));
}
