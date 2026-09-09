import type { CustomTableModel } from './table.js';

/** Pane types a FuseDash CustomWidget can arrange (`arranging.widgets`). */
export type CustomPaneKind = 'chartWidget' | 'tableWidget' | 'textWidget' | 'imageWidget';

/**
 * Flex direction of the pane row, using FuseDash semantics:
 * `vertical` lays panes out side by side, `horizontal` stacks them.
 */
export type ArrangingDirection = 'vertical' | 'horizontal';

export interface CustomWidgetArranging {
  widgets?: string[];
  hasKpi?: boolean;
  direction?: ArrangingDirection;
}

/** FuseDash `WidgetItem` subset the shell reads; the rest is forwarded to panes. */
export interface CustomWidgetPayload {
  id?: string;
  name?: string;
  chartType?: string;
  arranging?: CustomWidgetArranging;
  kpis?: unknown[];
  text?: string;
  imageUrl?: string;
  alt?: string;
  headers?: unknown[];
  data?: unknown;
  tableData?: unknown;
  tablePreviewRows?: unknown;
  [key: string]: unknown;
}

export interface CustomPane {
  /** Stable key for list rendering — mirrors the client `${id}-${chartType}-${index}` */
  key: string;
  kind: CustomPaneKind;
  /** true when the pane mounts content; false renders the pane empty state */
  renderable: boolean;
  emptyTitle: string;
  emptySubtitle: string;
  table?: CustomTableModel;
  text?: string;
  image?: { src: string; alt: string };
}

export interface CustomWidgetModel {
  title: string;
  direction: ArrangingDirection;
  hasKpi: boolean;
  panes: CustomPane[];
  /** Payload handed to chart / KPI panes, or null when the input was unusable */
  widget: CustomWidgetPayload | null;
  /** No panes and no KPI band — the client `WidgetDefaultState` */
  isEmpty: boolean;
}
