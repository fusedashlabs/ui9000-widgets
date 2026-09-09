import { resolveWidgetFormatting } from '../../../utils/chart-formatting/index.js';
import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type {
  RadialBarChartData,
  RadialBarDatum,
  RadialBarLabelValue,
  RadialBarModel,
  RadialBarPoints,
} from './types.js';

const EMPTY: RadialBarModel = { bars: [], legend: [] };

type ParsedRow = { key: string; label: string; value: number };

function isLabelValueArray(input: unknown): input is RadialBarLabelValue[] {
  if (!Array.isArray(input) || !input.length) return false;
  const first = input[0] as Record<string, unknown> | null;
  return !!first && typeof first === 'object' && 'label' in first && 'value' in first;
}

function isPointsPayload(input: unknown): input is RadialBarPoints {
  return (
    !!input &&
    typeof input === 'object' &&
    Array.isArray((input as RadialBarPoints).points)
  );
}

function parseRows(
  rows: Array<{ key: unknown; value: unknown }>,
): ParsedRow[] {
  const parsed: ParsedRow[] = [];
  for (const row of rows) {
    const key = row.key;
    const value = Number(row.value);
    if (key == null || key === '' || !Number.isFinite(value)) continue;
    parsed.push({ key: String(key), label: String(key), value });
  }
  return parsed;
}

/**
 * Rings sit in `uniqueValues` order reversed (client sorts then `.reverse()`),
 * while the legend keeps the original order.
 */
function buildModel(
  parsed: ParsedRow[],
  orderedKeys: string[],
  colorFor: (key: string, count: number) => string,
): RadialBarModel {
  if (!parsed.length) return EMPTY;

  const byKey = new Map(parsed.map((row) => [row.key, row]));
  const legend: RadialBarDatum[] = orderedKeys
    .map((key) => byKey.get(key))
    .filter((row): row is ParsedRow => row != null)
    .map((row) => ({ ...row, color: colorFor(row.key, orderedKeys.length) }));

  return { bars: [...legend].reverse(), legend };
}

function fromFuseWidget(widget: FuseWidgetLike): RadialBarModel {
  const xKey = firstField(widget.xAxe ?? undefined);
  const yKey = firstField(widget.yAxe ?? undefined);
  if (!xKey || !yKey) return EMPTY;

  const parsed = parseRows(
    rowsOf(widget).map((row) => ({ key: row[xKey], value: row[yKey] })),
  );
  // Client reads the category order from `uniqueValues[xAxe]` and falls back to
  // the first `uniqueValues` key for the legend.
  const orderKey = widget.uniqueValues?.[xKey]?.length
    ? xKey
    : Object.keys(widget.uniqueValues ?? {})[0];
  const orderedKeys = resolveUniqueValuesOrder(
    parsed.map((row) => row.key),
    widget.uniqueValues,
    orderKey,
  );

  const formatting = resolveWidgetFormatting(widget);
  const model = buildModel(parsed, orderedKeys, (key, count) =>
    resolveFormattingColor(formatting, key, count),
  );

  return {
    ...model,
    xField: xKey,
    yField: yKey,
    axisDetails: widget.axisDetails ?? undefined,
  };
}

function fromLabelValue(rows: RadialBarLabelValue[]): RadialBarModel {
  const parsed = parseRows(
    rows.map((row) => ({ key: row.label, value: row.value })),
  );
  const colorByKey = new Map(
    rows
      .filter((row) => row.color)
      .map((row) => [String(row.label), row.color as string]),
  );
  // Chat payloads carry no formatting, so generate the same 1-based color
  // indices `getUniversalFormatting` would have produced for a widget.
  const formatting = parsed.map((row, index) => ({
    key: row.key,
    color: String((index % 12) + 1),
  }));

  return buildModel(
    parsed,
    parsed.map((row) => row.key),
    (key, count) => colorByKey.get(key) ?? resolveFormattingColor(formatting, key, count),
  );
}

/** Normalize chat / FuseDash WidgetItem payloads into radial bar rings. */
export function normalizeRadialBarData(
  input: RadialBarChartData,
): RadialBarModel {
  if (!input) return EMPTY;

  if (Array.isArray(input)) {
    return isLabelValueArray(input) ? fromLabelValue(input) : EMPTY;
  }

  if (isFuseWidgetPayload(input)) return fromFuseWidget(input);

  if (isPointsPayload(input)) {
    return fromLabelValue(
      input.points.map((point) => ({ label: String(point.x), value: point.y })),
    );
  }

  if (Array.isArray((input as RadialBarModel).bars)) {
    return input as RadialBarModel;
  }

  return EMPTY;
}
