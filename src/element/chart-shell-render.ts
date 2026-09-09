import { html, nothing, type TemplateResult } from 'lit';

import type { LabelTooltipState } from '../utils/chart-shell.js';
import { headerTitleDisplay } from '../utils/chart-shell.js';

export function renderWidgetHeader(options: {
  title: string;
  menuOpen: boolean;
  onMenuToggle: (e: Event) => void;
  onMenuClose: () => void;
  onDownload?: () => void;
}): TemplateResult | typeof nothing {
  const displayTitle = headerTitleDisplay(options.title);
  return html`
    <div class="widget-header" part="header">
      <div class="widget-title" part="title" title=${options.title}>
        ${displayTitle}
      </div>
      <div class="widget-actions">
        <button
          class="menu-btn"
          part="menu-button"
          type="button"
          aria-label="Chart menu"
          aria-expanded=${options.menuOpen ? 'true' : 'false'}
          @click=${options.onMenuToggle}
        >
          ⋮
        </button>
        ${options.menuOpen
          ? html`<div class="menu-dropdown" part="menu">
              <button
                class="menu-item"
                type="button"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  options.onDownload?.();
                  options.onMenuClose();
                }}
              >
                Download image
              </button>
            </div>`
          : nothing}
      </div>
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
  host.dispatchEvent(
    new CustomEvent('ui9000-download', { bubbles: true, composed: true }),
  );
}
