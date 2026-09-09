import {
  pickQualitativePalette,
  QUALITATIVE_2,
  resolveFormattingColor,
} from '../../../utils/fuse-palette.js';
import { resolveWidgetFormatting } from '../../../utils/chart-formatting/index.js';
import {
  filterTruthyValues,
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type {
  AreaGroupedBarChartInput,
  AreaGroupedBarGroup,
  AreaGroupedBarModel,
} from './types.js';

const EMPTY: AreaGroupedBarModel = {
  categories: [],
  groups: [],
  barsByCategory: {},
  linePoints: [],
  lineColor: QUALITATIVE_2[0],
  lineLabel: '',
  lineField: '',
  barField: '',
  xField: '',
  groupField: '',
};

type WidgetWithDisplay = FuseWidgetLike & {
  display?: string | string[] | null;
};

function toNumberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveYKeys(widget: WidgetWithDisplay): string[] {
  const fromDisplay = Array.isArray(widget.display)
    ? widget.display
    : widget.display
      ? [widget.display]
      : [];
  const fromY = Array.isArray(widget.yAxe)
    ? widget.yAxe
    : widget.yAxe
      ? [widget.yAxe]
      : [];
  const keys = (fromDisplay.length ? fromDisplay : fromY)
    .map(String)
    .filter(Boolean);
  return keys;
}

function xCategories(
  rows: Record<string, unknown>[],
  widget: FuseWidgetLike,
  xKey: string,
): string[] {
  const allX = Array.from(
    new Set(rows.map((r) => String(r[xKey] ?? '').trim()).filter(Boolean)),
  );
  const hint = widget.uniqueValues?.[xKey]?.map(String).filter((v) => allX.includes(v));
  if (hint?.length) return hint;
  return resolveUniqueValuesOrder(allX, widget.uniqueValues, xKey);
}

function groupKeys(
  rows: Record<string, unknown>[],
  widget: FuseWidgetLike,
  groupBy: string,
): string[] {
  const fromUv = widget.uniqueValues?.[groupBy];
  const raw = fromUv?.length
    ? fromUv.map(String)
    : Array.from(
        new Set(rows.map((r) => String(r[groupBy] ?? '')).filter(Boolean)),
      );
  return filterTruthyValues(raw);
}

function resolveLineColor(
  formatting: ReturnType<typeof resolveWidgetFormatting>,
  lineField: string,
  hasFormatting: boolean,
): string {
  if (hasFormatting) {
    return resolveFormattingColor(formatting, lineField, formatting.length || 1);
  }
  return resolveFormattingColor([{ key: lineField, color: '1' }], lineField, 1);
}

function resolveGroupColor(
  formatting: ReturnType<typeof resolveWidgetFormatting>,
  groupKey: string,
  groupIndex: number,
  groupCount: number,
  hasFormatting: boolean,
): string {
  if (hasFormatting) {
    return resolveFormattingColor(formatting, groupKey, groupCount);
  }
  const palette = pickQualitativePalette(3, groupCount);
  return palette[(groupIndex + 1) % palette.length] ?? QUALITATIVE_2[1];
}

function fromFuseWidget(widget: WidgetWithDisplay): AreaGroupedBarModel {
  const rows = rowsOf(widget);
  const xField = firstField(widget.xAxe) ?? '';
  const groupField = firstField(widget.groupBy) ?? '';
  const yKeys = resolveYKeys(widget);
  const lineField = yKeys[0] || firstField(widget.yAxe) || '';
  const barField = yKeys[1] || yKeys[0] || '';

  if (!rows.length || !xField || !lineField) return EMPTY;

  const categories = xCategories(rows, widget, xField);
  const gKeys = groupField ? groupKeys(rows, widget, groupField) : [];
  const formatting = resolveWidgetFormatting(widget);
  const hasFormatting = Array.isArray(widget.formatting) && (widget.formatting?.length ?? 0) > 0;

  const groups: AreaGroupedBarGroup[] = gKeys.map((key, i) => ({
    key,
    label: key,
    color: resolveGroupColor(formatting, key, i, gKeys.length, hasFormatting),
  }));

  const barsByCategory: Record<string, Record<string, number>> = Object.create(null);
  if (groupField && gKeys.length) {
    for (const d of rows) {
      const xKey = String(d[xField] ?? '').trim();
      const gKey = String(d[groupField] ?? '').trim();
      if (!xKey || !gKey || gKey === 'null' || gKey === 'undefined') continue;
      const useValueFromGroup = yKeys.includes(gKey) && d[gKey] != null;
      const v = toNumberValue(useValueFromGroup ? d[gKey] : d[barField]);
      if (!barsByCategory[xKey]) barsByCategory[xKey] = Object.create(null);
      barsByCategory[xKey][gKey] = (barsByCategory[xKey][gKey] ?? 0) + v;
    }
  }

  // Line/area: explicit yAxe[0] when finite; else sum(bars) per category.
  const byX: Record<string, { line?: number; barsSum: number }> = Object.create(null);
  for (const d of rows) {
    const rawX = String(d[xField] ?? '').trim();
    if (!rawX) continue;
    if (!byX[rawX]) byX[rawX] = { barsSum: 0 };
    const lineV = toNumberValue(d[lineField]);
    if (Number.isFinite(lineV)) byX[rawX].line = lineV;
    byX[rawX].barsSum += toNumberValue(d[barField]);
  }

  const linePoints = categories
    .map((rawX) => {
      const acc = byX[rawX];
      if (!acc) return null;
      const rawY = Number.isFinite(acc.line as number)
        ? Number(acc.line)
        : Number(acc.barsSum);
      if (!Number.isFinite(rawY)) return null;
      return { x: rawX, y: rawY };
    })
    .filter((p): p is { x: string; y: number } => p != null);

  const lineLabel =
    widget.axisDetails?.[lineField]?.label ?? lineField;

  const hasPlot =
    linePoints.length > 0 ||
    Object.keys(barsByCategory).length > 0;

  if (!hasPlot) return EMPTY;

  return {
    categories,
    groups,
    barsByCategory,
    linePoints,
    lineColor: resolveLineColor(formatting, lineField, hasFormatting),
    lineLabel,
    lineField,
    barField,
    xField,
    groupField,
    axisDetails: widget.axisDetails ?? undefined,
  };
}

/** Normalize FuseDash / chat payloads into area+grouped-bar model. */
export function normalizeAreaGroupedBarData(
  input: AreaGroupedBarChartInput,
): AreaGroupedBarModel {
  if (!input) return EMPTY;

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input as WidgetWithDisplay);
  }

  if (
    typeof input === 'object' &&
    Array.isArray((input as AreaGroupedBarModel).categories) &&
    Array.isArray((input as AreaGroupedBarModel).linePoints)
  ) {
    return input as AreaGroupedBarModel;
  }

  return EMPTY;
}

export { areaGroupedBarYDomain } from './domain.js';
export { formatAgbAxisTick, formatAgbValue } from './format.js';
