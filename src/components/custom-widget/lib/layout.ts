import type { ArrangingDirection, CustomPaneKind } from './types.js';

/** Client `WIDGET_DIMENSIONS.KPI_HEIGHT` — fixed band above the panes */
export const KPI_ROW_HEIGHT = 104;

/** Client renders a 10px spacer between two panes in MCP chat */
export const PANE_GAP = 10;

/** `useWidgetToolbar` disables adding past two panes */
export const MAX_PANES = 2;

/** Story / playground toggles — KPI is a band, not a pane */
export interface CustomWidgetSlots {
  kpi?: boolean;
  chart?: boolean;
  table?: boolean;
  text?: boolean;
  image?: boolean;
}

export const PANE_SLOT_KEYS = ['chart', 'table', 'text', 'image'] as const;

export type CustomWidgetPaneSlot = (typeof PANE_SLOT_KEYS)[number];

const SLOT_PANES: readonly { key: CustomWidgetPaneSlot; kind: CustomPaneKind }[] = [
  { key: 'chart', kind: 'chartWidget' },
  { key: 'table', kind: 'tableWidget' },
  { key: 'text', kind: 'textWidget' },
  { key: 'image', kind: 'imageWidget' },
];

function selectedPaneSlots(slots: CustomWidgetSlots): CustomWidgetPaneSlot[] {
  return PANE_SLOT_KEYS.filter((key) => !!slots[key]);
}

function slotsFromPaneKeys(
  slots: CustomWidgetSlots,
  panes: readonly CustomWidgetPaneSlot[],
): CustomWidgetSlots {
  const keep = new Set(panes);
  return {
    kpi: !!slots.kpi,
    chart: keep.has('chart'),
    table: keep.has('table'),
    text: keep.has('text'),
    image: keep.has('image'),
  };
}

/**
 * First two enabled pane slots, in chart → table → text → image order.
 * KPI is ignored here — it is not a main widget.
 */
export function panesFromSlots(slots: CustomWidgetSlots): CustomPaneKind[] {
  return SLOT_PANES.filter(({ key }) => !!slots[key])
    .slice(0, MAX_PANES)
    .map(({ kind }) => kind);
}

/**
 * At most two pane switches stay on. KPI is never capped.
 * A third pane is rejected so the previous pair stays selected.
 */
export function limitSelectedPanes(
  slots: CustomWidgetSlots,
  previous: CustomWidgetSlots = {},
): CustomWidgetSlots {
  const selected = selectedPaneSlots(slots);
  if (selected.length <= MAX_PANES) return slotsFromPaneKeys(slots, selected);

  const previousSelected = selectedPaneSlots(previous);
  if (previousSelected.length === MAX_PANES) {
    return slotsFromPaneKeys(slots, previousSelected);
  }
  return slotsFromPaneKeys(slots, selected.slice(0, MAX_PANES));
}

/**
 * Client `WidgetContent` maps direction onto flex-direction inverted:
 * `vertical` → row, `horizontal` → column.
 */
export function paneFlexDirection(direction: ArrangingDirection): 'row' | 'column' {
  return direction === 'vertical' ? 'row' : 'column';
}

/** Unselected pane switches disable once two panes are already on. KPI is not a pane. */
export function isPaneSlotDisabled(
  slots: CustomWidgetSlots,
  key: CustomWidgetPaneSlot,
): boolean {
  if (slots[key]) return false;
  return selectedPaneSlots(slots).length >= MAX_PANES;
}
