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

  return html`
    <div class="widget-header" part="header" data-variant=${chrome.variant}>
      <div class="widget-title" part="title" title=${options.title}>${displayTitle}</div>
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
    ${tooltip.text}
  </div>`;
}

export function dispatchChartDownload(host: HTMLElement): void {
  host.dispatchEvent(new CustomEvent('ui9000-download', { bubbles: true, composed: true }));
}
