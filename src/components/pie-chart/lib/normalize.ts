import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import {
  firstField,
  filterTruthyValues,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  xDomainHintFromWidget,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type { PieChartData, PieLabelValue, PieModel, PieSlice } from './types.js';

const EMPTY: PieModel = { slices: [], total: 0 };

function isLabelValueArray(input: unknown): input is PieLabelValue[] {
  if (!Array.isArray(input) || input.length === 0) return false;
  const first = input[0] as Record<string, unknown>;
  return first != null && typeof first === 'object' && 'label' in first && 'value' in first;
}

function finalizeSlices(
  rows: Array<{ key: string; label: string; value: number }>,
  formatting: FuseWidgetLike['formatting'],
  uniqueValues?: Record<string, string[]> | null,
  xKey?: string,
): PieModel {
  if (!rows.length) return EMPTY;

  const keys = resolveUniqueValuesOrder(
    rows.map((r) => r.key),
    uniqueValues,
    xKey,
  );

  const byKey = new Map(rows.map((r) => [r.key, r]));
  const ordered = keys
    .map((key) => byKey.get(key))
    .filter((r): r is { key: string; label: string; value: number } => r != null);

  for (const row of rows) {
    if (!ordered.some((s) => s.key === row.key)) ordered.push(row);
  }

  const total = ordered.reduce((acc, row) => acc + row.value, 0);
  const slices: PieSlice[] = ordered.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    color: resolveFormattingColor(formatting, row.key, ordered.length),
    percentage: total > 0 ? (row.value / total) * 100 : 0,
  }));

  return {
    slices,
    total,
  };
}

function fromLabelValue(rows: PieLabelValue[]): PieModel {
  const cleaned = rows
    .map((row) => ({
      key: String(row.label),
      label: String(row.label),
      value: Number(row.value),
      color: row.color,
    }))
    .filter((row) => row.label && Number.isFinite(row.value));

  const total = cleaned.reduce((acc, row) => acc + row.value, 0);
  const slices: PieSlice[] = cleaned.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    color: row.color ?? resolveFormattingColor(undefined, row.key, cleaned.length),
    percentage: total > 0 ? (row.value / total) * 100 : 0,
  }));

  return { slices, total };
}

function fromFuseWidget(widget: FuseWidgetLike): PieModel {
  const xKey = firstField(widget.xAxe);
  const yKey = firstField(widget.yAxe);
  if (!xKey || !yKey) return EMPTY;

  const rows = rowsOf(widget);
  const parsed: Array<{ key: string; label: string; value: number }> = [];
  for (const row of rows) {
    const x = row[xKey];
    const y = Number(row[yKey]);
    if (x == null || x === '' || !Number.isFinite(y)) continue;
    parsed.push({ key: String(x), label: String(x), value: y });
  }

  const xHint = xDomainHintFromWidget(widget);
  const model = finalizeSlices(parsed, widget.formatting, widget.uniqueValues, xKey);
  return {
    ...model,
    xField: xKey,
    yField: yKey,
    axisDetails: (widget as FuseWidgetLike & {
      axisDetails?: PieModel['axisDetails'];
    }).axisDetails,
    uniqueValuesHint: xHint,
  };
}

/** Normalize chat / FuseDash WidgetItem payloads into pie slices. */
export function normalizePieData(input: PieChartData): PieModel {
  if (!input) return EMPTY;

  if (Array.isArray(input)) {
    if (!input.length) return EMPTY;
    if (isLabelValueArray(input)) return fromLabelValue(input);
    return EMPTY;
  }

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input);
  }

  if (typeof input === 'object' && Array.isArray((input as PieModel).slices)) {
    return input as PieModel;
  }

  return EMPTY;
}

/** Legend keys in FuseDash order: pie segment order filtered by uniqueValues membership. */
export function legendSlicesFromPieOrder(
  model: PieModel,
  pieOrderKeys: string[],
): PieSlice[] {
  const byKey = new Map(model.slices.map((s) => [s.key, s]));
  const hint = model.uniqueValuesHint?.length
    ? filterTruthyValues(model.uniqueValuesHint)
    : null;

  const orderedKeys = pieOrderKeys.filter((key) => byKey.has(key));
  const filtered = hint?.length
    ? orderedKeys.filter((key) => hint.includes(key))
    : orderedKeys;

  return filtered
    .map((key) => byKey.get(key))
    .filter((slice): slice is PieSlice => slice != null);
}
