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
import { paintMode } from '../context/widget-context.js';
import type { ResolvedMode } from '../context/resolve-mode.js';
import {
  resolveHeaderVariant,
  type WidgetHeaderHandlers,
  type WidgetHeaderVariant,
} from './widget-header.js';
import { subscribeHostTheme } from './theme-watch.js';

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

  private _resolvedMode: ResolvedMode = 'light';
  private _unwatchTheme: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this._onDocClick);
    this._resolvedMode = this.themeMode();
    if (this.getAttribute('data-mode') !== this._resolvedMode) {
      this.setAttribute('data-mode', this._resolvedMode);
    }
    this._unwatchTheme?.();
    this._unwatchTheme = subscribeHostTheme(() => this.syncHostTheme());
  }

  override disconnectedCallback(): void {
    this._unwatchTheme?.();
    this._unwatchTheme = null;
    document.removeEventListener('click', this._onDocClick);
    dismissTooltips(this);
    super.disconnectedCallback();
  }

  /**
   * Light or dark for SVG paint. Stays light until a host writes
   * `--ui9000-color-surface`, so `data-theme` alone cannot put light ink
   * on the white card fallback.
   */
  protected themeMode(): ResolvedMode {
    return paintMode(this);
  }

  /**
   * Host theme changed. Default re-renders chrome; charts that paint into
   * SVG override this and call their draw.
   */
  protected onThemeChange(): void {
    this.requestUpdate();
  }

  private syncHostTheme(): void {
    const next = this.themeMode();
    if (next === this._resolvedMode) return;
    this._resolvedMode = next;
    if (this.getAttribute('data-mode') !== next) this.setAttribute('data-mode', next);
    this.onThemeChange();
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
