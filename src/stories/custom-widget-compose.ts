import {
  panesFromSlots,
  type ArrangingDirection,
  type CustomWidgetSlots,
} from "../components/custom-widget/lib/index.js";
import fixture from "./fixtures/custom-widget.fusedash.json";
import textFixture from "./fixtures/custom-widget-text.fusedash.json";
import imageFixture from "./fixtures/custom-widget-image.fusedash.json";

/** Chart-sourced columns for the fixture line-chart `data` rows */
export const CHART_TABLE_HEADERS = [
  {
    label: "Month",
    contains: [
      {
        key: "timestamp__m__chart",
        source: { type: "chart", field: "timestamp__m" },
      },
    ],
  },
  {
    label: "Check-ins",
    contains: [
      { key: "count__chart", source: { type: "chart", field: "count" } },
    ],
  },
];

export type CustomWidgetStorySlots = Required<CustomWidgetSlots>;

export const DEFAULT_SLOTS: CustomWidgetStorySlots = {
  kpi: false,
  chart: true,
  table: true,
  text: false,
  image: false,
};

/**
 * Build a FuseDash custom-widget payload from slot toggles.
 * At most two panes are kept (chart → table → text → image); KPI is a separate band.
 */
export function composeCustomWidgetData(
  slots: CustomWidgetSlots,
  direction: ArrangingDirection = "vertical",
  swap = false,
): Record<string, unknown> {
  const widgets = panesFromSlots(slots);
  if (swap && widgets.length === 2) widgets.reverse();
  const hasTable = widgets.includes("tableWidget");
  const hasText = widgets.includes("textWidget");
  const hasImage = widgets.includes("imageWidget");

  return {
    ...fixture,
    ...(hasText ? { text: textFixture.text } : {}),
    ...(hasImage
      ? { imageUrl: imageFixture.imageUrl, alt: imageFixture.alt }
      : {}),
    ...(hasTable ? { headers: CHART_TABLE_HEADERS } : {}),
    arranging: {
      widgets,
      hasKpi: !!slots.kpi,
      direction,
    },
  };
}
