import { LitElement, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

import {
  dismissChartTooltip,
  dismissTooltips,
  presentChartTooltip,
  type ChartTooltipContent,
} from './chart-tooltip-portal.js';
import { chartShellStyles } from './chart-shell-styles.js';
import {
  dispatchChartDownload,
  renderLabelTooltip,
  renderWidgetHeader,
} from './chart-shell-render.js';
import {
  createAxisLabelHandlers,
  resolveHeaderTitle,
  type LabelTooltipState,
} from '../utils/chart-shell.js';
import {
  resolveHeaderVariant,
  type WidgetHeaderHandlers,
  type WidgetHeaderVariant,
} from './widget-header.js';

/** Shared widget chrome: header, axis-label tooltip, menu. */
export abstract class Ui9000ChartElement extends LitElement {
  @property({ type: String, attribute: 'data' })
  dataJson = '[]';

  @property({ type: String, attribute: 'chart-title' })
  chartTitle = '';

  /**
   * On by default; `show-header="false"` turns it off. A plain `type: Boolean`
   * property would read any present attribute as true, so hosts that embed a
   * chart inside their own chrome could not suppress the header.
   */
  @property({
    converter: {
      fromAttribute: (value: string | null): boolean => value !== null && value !== 'false',
      toAttribute: (value: boolean): string => (value ? '' : 'false'),
    },
    attribute: 'show-header',
  })
  showHeader = true;

  /**
   * `chat` (default): title + download menu, always visible.
   * `dash`: dashboard chrome — chat, overflow actions, settings — shown only
   * when the matching handler is set. Chat and overflow appear on hover.
   */
  @property({
    attribute: 'header-variant',
    converter: {
      fromAttribute: (value: string | null): WidgetHeaderVariant => resolveHeaderVariant(value),
    },
  })
  headerVariant: WidgetHeaderVariant = 'chat';

  /**
   * Host callbacks. Not a Lit property, so assigning them re-renders the
   * header without redrawing the plot.
   */
  private _headerHandlers: WidgetHeaderHandlers = {};

  get headerHandlers(): WidgetHeaderHandlers {
    return this._headerHandlers;
  }

  set headerHandlers(value: WidgetHeaderHandlers) {
    const next = value ?? {};
    if (next === this._headerHandlers) return;
    this._headerHandlers = next;
    this.requestUpdate();
  }

  @state()
  protected _labelTooltip: LabelTooltipState = null;

  @state()
  protected _menuOpen = false;

  protected _onDocClick = (): void => {
    this._menuOpen = false;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this._onDocClick);
  }

  override disconnectedCallback(): void {
    document.removeEventListener('click', this._onDocClick);
    dismissTooltips(this);
    super.disconnectedCallback();
  }

  /** Hover card on document.body. Matches the client chart tooltip. */
  protected openTooltip(event: MouseEvent, content: ChartTooltipContent): void {
    presentChartTooltip(this, event, content);
  }

  protected closeTooltip(): void {
    dismissChartTooltip(this);
  }

  protected closeAllTooltips(): void {
    dismissTooltips(this);
  }

  protected headerTitle(): string {
    return resolveHeaderTitle(this.chartTitle, this.dataJson, this.showHeader);
  }

  protected axisLabelHandlers() {
    return createAxisLabelHandlers(this, (t) => {
      this._labelTooltip = t;
    });
  }

  protected renderShellHeader(title: string) {
    if (!title) return nothing;
    return renderWidgetHeader({
      title,
      variant: this.headerVariant,
      handlers: this._headerHandlers,
      menuOpen: this._menuOpen,
      onMenuToggle: (e: Event) => {
        e.stopPropagation();
        this._menuOpen = !this._menuOpen;
      },
      onMenuClose: () => {
        this._menuOpen = false;
      },
      onDownload: () => dispatchChartDownload(this),
    });
  }

  protected renderShellLabelTooltip() {
    return renderLabelTooltip(this._labelTooltip);
  }
}

export { chartShellStyles };
