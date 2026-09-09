import { firstField, rowsOf, type FuseWidgetLike } from '../fuse-widget.js';
import { getUniversalFormatting } from './getUniversalFormatting.js';
import { getUniversalMarkers } from './getUniversalMarkers.js';
import type {
  ChartFormattingItem,
  ChartMarkerItem,
  ChartMarkerShape,
  UniversalFormattingInput,
} from './types.js';

/** Build mcp-ui UniversalFormattingInput from a FuseDash widget payload. */
export function formattingInputFromWidget(
  widget: FuseWidgetLike,
): UniversalFormattingInput {
  return {
    chartType: widget.chartType ?? '',
    groupByField: firstField(widget.groupBy ?? undefined) ?? null,
    uniqueValues: widget.uniqueValues ?? undefined,
    data: rowsOf(widget),
    xAxeField: firstField(widget.xAxe ?? undefined),
    existingFormatting: widget.formatting?.map((f) => ({
      key: String(f.key ?? 'default'),
      color: String(f.color ?? '1'),
    })),
    existingMarkers: widget.markers?.map((m) => ({
      key: String(m.key ?? 'default'),
      shape: String(m.shape ?? 'donut'),
    })),
  };
}

/** Resolve formatting for a FuseDash widget (generates or preserves existing). */
export function resolveWidgetFormatting(
  widget: FuseWidgetLike,
): ChartFormattingItem[] {
  return getUniversalFormatting(formattingInputFromWidget(widget));
}

/** Resolve markers for a FuseDash widget (generates or preserves existing). */
export function resolveWidgetMarkers(widget: FuseWidgetLike): ChartMarkerItem[] {
  const input = formattingInputFromWidget(widget);
  const markers = getUniversalMarkers(input);
  return markers.map((m) => ({
    ...m,
    shape: m.shape as ChartMarkerShape,
  }));
}
