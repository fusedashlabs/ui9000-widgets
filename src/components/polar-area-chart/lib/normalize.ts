import { resolveWidgetFormatting } from '../../../utils/chart-formatting/index.js';
import {
  pickQualitativePalette,
  resolveFormattingColor,
} from '../../../utils/fuse-palette.js';
import {
  filterTruthyValues,
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import { polarMaxValue } from './domain.js';
import type {
  PolarAreaChartData,
  PolarAreaLabelValue,
  PolarAreaLegendEntry,
  PolarAreaModel,
  PolarAreaPoint,
  PolarAreaSector,
} from './types.js';

const EMPTY: PolarAreaModel = { sectors: [], categories: [], legend: [], maxValue: 0 };

function isLabelValueArray(input: unknown): input is PolarAreaLabelValue[] {
  if (!Array.isArray(input) || input.length === 0) return false;
  const first = input[0] as Record<string, unknown>;
  return first != null && typeof first === 'object' && 'label' in first && 'value' in first;
}

function isPointsPayload(input: unknown): input is { points: PolarAreaPoint[] } {
  return (
    !!input &&
    typeof input === 'object' &&
    Array.isArray((input as { points?: unknown }).points)
  );
}

/**
 * Legend keys — client reads `uniqueValues[Object.keys(uniqueValues)[0]]` and
 * drops null-ish entries. On the polar mock that first key is the x-axis field,
 * so legend keys and sector keys line up.
 */
function legendKeysOf(widget: FuseWidgetLike): string[] {
  const uniqueValues = widget.uniqueValues ?? {};
  const firstKey = Object.keys(uniqueValues)[0];
  if (!firstKey) return [];
  return filterTruthyValues((uniqueValues[firstKey] ?? []).map(String));
}

function buildLegend(
  keys: string[],
  formatting: FuseWidgetLike['formatting'],
): PolarAreaLegendEntry[] {
  return keys.map((key) => ({
    key,
    label: key,
    color: resolveFormattingColor(formatting, key, keys.length),
  }));
}

function modelFromRows(
  rows: Array<{ key: string; value: number }>,
  categories: string[],
  legend: PolarAreaLegendEntry[],
  formatting: FuseWidgetLike['formatting'],
): PolarAreaModel {
  const colorByKey = new Map(legend.map((entry) => [entry.key, entry.color]));
  const fallbackColor = resolveFormattingColor(formatting, 'default', legend.length || 1);

  const sectors: PolarAreaSector[] = rows.map((row) => ({
    key: row.key,
    label: row.key,
    value: row.value,
    color: colorByKey.get(row.key) ?? fallbackColor,
  }));

  return { sectors, categories, legend, maxValue: polarMaxValue(sectors) };
}

function categoriesOf(
  widget: FuseWidgetLike,
  xKey: string,
  dataKeys: string[],
): string[] {
  const fromUniqueValues = (widget.uniqueValues?.[xKey] ?? [])
    .map(String)
    .filter((v) => dataKeys.includes(v));
  return fromUniqueValues.length ? fromUniqueValues : dataKeys;
}

function fromGroupedFuseWidget(
  widget: FuseWidgetLike,
  xKey: string,
  yKey: string,
  groupBy: string,
): PolarAreaModel {
  const parsed: Array<{ key: string; group: string; value: number }> = [];
  for (const row of rowsOf(widget)) {
    const x = row[xKey];
    const y = Number(row[yKey]);
    const group = row[groupBy];
    if (x == null || x === '' || group == null || group === '' || !Number.isFinite(y)) {
      continue;
    }
    parsed.push({ key: String(x), group: String(group), value: y });
  }
  if (!parsed.length) return EMPTY;

  const categories = categoriesOf(
    widget,
    xKey,
    Array.from(new Set(parsed.map((row) => row.key))),
  );
  const groupKeys = resolveUniqueValuesOrder(
    parsed.map((row) => row.group),
    widget.uniqueValues,
    groupBy,
  );
  const formatting = resolveWidgetFormatting(widget);
  const colorByGroup = new Map(
    groupKeys.map((key) => [key, resolveFormattingColor(formatting, key, groupKeys.length)]),
  );

  const totals = new Map<string, number>();
  for (const row of parsed) {
    const id = `${row.key}\0${row.group}`;
    totals.set(id, (totals.get(id) ?? 0) + row.value);
  }

  const sectors: PolarAreaSector[] = [];
  for (const category of categories) {
    for (const group of groupKeys) {
      const value = totals.get(`${category}\0${group}`);
      if (value == null) continue;
      sectors.push({
        key: category,
        group,
        label: category,
        value,
        color: colorByGroup.get(group) ?? resolveFormattingColor(formatting, group, groupKeys.length),
      });
    }
  }

  return {
    sectors,
    categories,
    legend: buildLegend(groupKeys, formatting),
    maxValue: polarMaxValue(sectors),
    grouped: true,
    xField: xKey,
    yField: yKey,
    groupField: groupBy,
    axisDetails: widget.axisDetails ?? undefined,
  };
}

function fromFuseWidget(widget: FuseWidgetLike): PolarAreaModel {
  const xKey = firstField(widget.xAxe);
  const yKey = firstField(widget.yAxe);
  if (!xKey || !yKey) return EMPTY;

  const groupBy = firstField(widget.groupBy);
  if (groupBy) return fromGroupedFuseWidget(widget, xKey, yKey, groupBy);

  const parsed: Array<{ key: string; value: number }> = [];
  for (const row of rowsOf(widget)) {
    const x = row[xKey];
    const y = Number(row[yKey]);
    if (x == null || x === '' || !Number.isFinite(y)) continue;
    parsed.push({ key: String(x), value: y });
  }
  if (!parsed.length) return EMPTY;

  const categories = categoriesOf(
    widget,
    xKey,
    Array.from(new Set(parsed.map((row) => row.key))),
  );

  // Colors come from resolved formatting so a widget that ships without a
  // `formatting` array still gets the shared default palette (as scatter does).
  const formatting = resolveWidgetFormatting(widget);

  // Client aggregates the rows per category once the widget carries more than
  // one formatting entry — otherwise every row keeps its own wedge. This gate
  // reads the widget's own formatting, not the resolved one: generated entries
  // would flip a formatting-less widget into aggregated mode.
  let rows = parsed;
  if ((widget.formatting?.length ?? 0) > 1) {
    const totals = new Map<string, number>();
    for (const row of parsed) {
      totals.set(row.key, (totals.get(row.key) ?? 0) + row.value);
    }
    rows = Array.from(totals, ([key, value]) => ({ key, value }));
  }

  // Client `categories.flatMap(...)`: category order first, extras dropped.
  const sorted = categories.flatMap((category) =>
    rows.filter((row) => row.key === category),
  );

  const model = modelFromRows(
    sorted,
    categories,
    buildLegend(legendKeysOf(widget), formatting),
    formatting,
  );

  return {
    ...model,
    xField: xKey,
    yField: yKey,
    axisDetails: widget.axisDetails ?? undefined,
  };
}

function fromLabelValue(input: PolarAreaLabelValue[]): PolarAreaModel {
  const rows = input
    .map((row) => ({
      key: String(row.label),
      value: Number(row.value),
      color: row.color,
    }))
    .filter((row) => row.key && Number.isFinite(row.value));
  if (!rows.length) return EMPTY;

  const palette = pickQualitativePalette(0, rows.length);
  const sectors: PolarAreaSector[] = rows.map((row, index) => ({
    key: row.key,
    label: row.key,
    value: row.value,
    color: row.color ?? palette[index % palette.length],
  }));

  return {
    sectors,
    categories: sectors.map((sector) => sector.key),
    legend: sectors.map(({ key, label, color }) => ({ key, label, color })),
    maxValue: polarMaxValue(sectors),
  };
}

/** Normalize chat / FuseDash WidgetItem payloads into polar-area sectors. */
export function normalizePolarAreaData(input: PolarAreaChartData): PolarAreaModel {
  if (!input) return EMPTY;

  if (Array.isArray(input)) {
    return isLabelValueArray(input) ? fromLabelValue(input) : EMPTY;
  }

  if (isFuseWidgetPayload(input)) return fromFuseWidget(input);

  if (isPointsPayload(input)) {
    return fromLabelValue(
      input.points.map((point) => ({ label: String(point.x), value: Number(point.y) })),
    );
  }

  if (Array.isArray((input as PolarAreaModel).sectors)) return input as PolarAreaModel;

  return EMPTY;
}
