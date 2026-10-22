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
import { CSS_VARS, paintMode, readCssVar } from '../context/widget-context.js';
import type { ResolvedMode } from '../context/resolve-mode.js';
import { parseChartStyleId, type ChartStyleId } from '../utils/chart-theme.js';
import { useSeriesMode } from '../utils/fuse-palette.js';
import { resolveHeaderVariant, type WidgetHeaderVariant } from './widget-header.js';
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
   * `chat` (default) and `dash` share the header. With nothing in the
   * `actions` slot the header shows Download image. A host that appends an
   * element with `slot="actions"` replaces that menu with its own buttons.
   * On `dash`, those buttons stay hidden until the chart is hovered or
   * focused, or the slotted element sets `data-open` / `data-persist`.
   */
  @property({
    attribute: 'header-variant',
    converter: {
      fromAttribute: (value: string | null): WidgetHeaderVariant => resolveHeaderVariant(value),
    },
  })
  headerVariant: WidgetHeaderVariant = 'chat';

  @state()
  protected _hasHeaderActions = false;

  @state()
  protected _labelTooltip: LabelTooltipState = null;

  @state()
  protected _menuOpen = false;

  protected _onDocClick = (): void => {
    this._menuOpen = false;
  };

  private _resolvedMode: ResolvedMode = 'light';
  private _styleId: ChartStyleId = 'default';
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

  /** Page style (`default`, `palette1` …) from the host. Unknown values stay `default`. */
  protected styleId(): ChartStyleId {
    return parseChartStyleId(readCssVar(this, CSS_VARS.styleId, 'default'));
  }

  /** Qualitative and sequential colors follow this chart's mode and page style. */
  protected withSeriesMode<T>(run: () => T): T {
    return useSeriesMode(this.themeMode(), run, this.styleId());
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
    const styleId = this.styleId();
    if (next === this._resolvedMode && styleId === this._styleId) return;
    this._resolvedMode = next;
    this._styleId = styleId;
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

  protected renderShellHeader(
    title: string,
    extras: {
      subtitle?: string;
      aside?: unknown;
      showActions?: boolean;
      truncateTitle?: boolean;
    } = {},
  ) {
    if (!title && !extras.subtitle && !extras.aside) return nothing;
    return renderWidgetHeader({
      title,
      subtitle: extras.subtitle,
      aside: extras.aside,
      showActions: extras.showActions,
      truncateTitle: extras.truncateTitle,
      variant: this.headerVariant,
      customActions: this._hasHeaderActions,
      onActionsSlotChange: (event: Event) => this.onHeaderActionsSlotChange(event),
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

  /** Host buttons projected into `slot="actions"`. Hides Download while any are assigned. */
  protected onHeaderActionsSlotChange(event: Event): void {
    const slot = event.target;
    if (!(slot instanceof HTMLSlotElement)) return;
    const has = slot.assignedElements({ flatten: true }).length > 0;
    if (has === this._hasHeaderActions) return;
    this._hasHeaderActions = has;
  }

  protected renderShellLabelTooltip() {
    return renderLabelTooltip(this._labelTooltip);
  }
}

export { chartShellStyles };
