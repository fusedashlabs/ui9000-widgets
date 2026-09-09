import { resolveFormattingColor, type FuseFormattingEntry } from '../../../utils/fuse-palette.js';
import { seriesColor } from '../../../utils/fusedash-visual.js';
import {
  firstField,
  isFuseWidgetPayload,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import {
  hasLightColor,
  treemapColorForValue,
  treemapRangeColors,
  treemapValueRanges,
} from './color.js';
import type {
  TreemapChartData,
  TreemapGroupCard,
  TreemapLabelValue,
  TreemapModel,
  TreemapPoint,
  TreemapSeries,
  TreemapTile,
} from './types.js';

type RawRow = Record<string, unknown>;

const EMPTY: TreemapModel = { mode: 'single', tiles: [], groups: [], rangeColors: [] };

/** Client `normalizeCategoryKey` — case- and whitespace-insensitive group key. */
function normalizeKey(raw: unknown): string {
  return displayLabel(raw).toLowerCase();
}

/** First-seen trimmed spelling, kept for display (client `aggregateByCategory`). */
function displayLabel(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

type Aggregate = { key: string; label: string; value: number };

/**
 * Mirrors client `aggregateByCategory`: one entry per normalized category with
 * the metric summed, sorted by value desc then label asc so the layout is
 * stable whatever order the payload arrives in (FUS-3836 / FUS-3868).
 */
function aggregateByCategory(
  rows: RawRow[],
  categoryKey: string | undefined,
  getValue: (row: RawRow) => number,
): Aggregate[] {
  const byKey = new Map<string, Aggregate>();
  for (const row of rows) {
    const raw = categoryKey ? row?.[categoryKey] : '';
    const key = normalizeKey(raw);
    const existing = byKey.get(key);
    if (existing) {
      existing.value += getValue(row);
    } else {
      byKey.set(key, { key, label: displayLabel(raw), value: getValue(row) });
    }
  }
  return [...byKey.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/** Paint one set of leaves with the seven magnitude bands of `baseColor`. */
function tilesFrom(
  entries: Aggregate[],
  baseColor: string,
  paletteRange?: number[] | null,
): { tiles: TreemapTile[]; rangeColors: string[] } {
  const rangeColors = treemapRangeColors(baseColor);
  const ranges = treemapValueRanges(
    entries.map((entry) => entry.value),
    paletteRange,
  );
  const tiles = entries.map((entry) => {
    const color = treemapColorForValue(entry.value, ranges, rangeColors, baseColor);
    return {
      key: entry.key,
      label: entry.label,
      value: entry.value,
      color,
      lightFill: hasLightColor(color),
    };
  });
  return { tiles, rangeColors };
}

/**
 * Client `TreemapSingle` reads the widget's own formatting and asks for the
 * `default` key, so a single-dimension treemap always ramps one palette color.
 */
function singleBaseColor(formatting: FuseFormattingEntry[] | null | undefined): string {
  return resolveFormattingColor(formatting, 'default', formatting?.length ?? 1);
}

/**
 * Client `getFormattingByGroupName` narrows formatting to the entry matching the
 * group, so each card ramps its own qualitative color. A group with no matching
 * entry falls back to the default palette color (the client's own fallback there
 * is a raw blue, which reads as a rendering bug in chat).
 */
function groupBaseColor(
  formatting: FuseFormattingEntry[] | null | undefined,
  groupLabel: string,
): string {
  if (!formatting?.length || !groupLabel) {
    return resolveFormattingColor([{ key: 'default', color: '1' }], 'default', 1);
  }
  const matched = formatting.filter((entry) => String(entry.key) === groupLabel);
  if (!matched.length) return resolveFormattingColor(undefined, 'default', 1);
  return resolveFormattingColor(matched, String(matched[0].key ?? 'default'), 1);
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fromFuseWidget(widget: FuseWidgetLike): TreemapModel {
  const categoryField = firstField(widget.groupBy ?? undefined) ?? firstField(widget.xAxe ?? undefined);
  const valueField = firstField(widget.metric ?? undefined) ?? firstField(widget.yAxe ?? undefined);
  const rawSubgroup = widget.subgroup ? String(widget.subgroup) : undefined;
  // Grouped only makes sense with a *second*, distinct dimension to nest —
  // otherwise the area-by-value encoding is lost to equal-height bands (FUS-3868).
  const subgroupField =
    rawSubgroup && rawSubgroup !== categoryField ? rawSubgroup : undefined;

  const rows = rowsOf(widget);
  const getValue = (row: RawRow) => (valueField ? toNumber(row?.[valueField]) : 0);
  const axisDetails = widget.axisDetails ?? undefined;
  const paletteRange = widget.palette?.range;

  if (!subgroupField) {
    const entries = categoryField
      ? aggregateByCategory(rows, categoryField, getValue)
      : // Without a category dimension the client keeps the raw per-row nodes.
        rows.map((row, i) => ({ key: String(i), label: '', value: getValue(row) }));
    const { tiles, rangeColors } = tilesFrom(entries, singleBaseColor(widget.formatting), paletteRange);
    return {
      mode: 'single',
      tiles,
      groups: [],
      rangeColors,
      categoryField,
      valueField,
      axisDetails,
    };
  }

  const grouped = new Map<string, { label: string; rows: RawRow[] }>();
  for (const row of rows) {
    if (!categoryField) continue;
    const label = displayLabel(row?.[categoryField]);
    if (!label) continue;
    const key = label.toLowerCase();
    const bucket = grouped.get(key);
    if (bucket) bucket.rows.push(row);
    else grouped.set(key, { label, rows: [row] });
  }

  const groups: TreemapGroupCard[] = [...grouped.entries()]
    .sort(([, a], [, b]) => a.label.localeCompare(b.label))
    .map(([key, { label, rows: groupRows }]) => ({
      key,
      label,
      tiles: tilesFrom(
        aggregateByCategory(groupRows, subgroupField, getValue),
        groupBaseColor(widget.formatting, label),
        paletteRange,
      ).tiles,
    }));

  return {
    mode: 'grouped',
    tiles: [],
    groups,
    rangeColors: [],
    categoryField,
    valueField,
    subgroupField,
    axisDetails,
  };
}

function fromLabelValue(rows: TreemapLabelValue[]): TreemapModel {
  const entries = rows
    .map((row) => ({
      key: normalizeKey(row.label),
      label: displayLabel(row.label),
      value: Number(row.value),
    }))
    .filter((row) => Number.isFinite(row.value));
  if (!entries.length) return EMPTY;

  const { tiles, rangeColors } = tilesFrom(
    entries.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)),
    singleBaseColor(undefined),
  );
  // An explicit per-row color wins over the magnitude band.
  const overrides = new Map(
    rows
      .filter((row) => row.color)
      .map((row) => [normalizeKey(row.label), row.color as string]),
  );
  return {
    mode: 'single',
    tiles: tiles.map((tile) => {
      const override = overrides.get(tile.key);
      return override ? { ...tile, color: override, lightFill: hasLightColor(override) } : tile;
    }),
    groups: [],
    rangeColors,
  };
}

function fromPoints(points: TreemapPoint[]): TreemapModel {
  return fromLabelValue(points.map((point) => ({ label: String(point.x), value: Number(point.y) })));
}

function fromSeries(series: TreemapSeries[]): TreemapModel {
  const groups = series
    .map((entry, index): TreemapGroupCard => {
      const label = entry.name ?? entry.id;
      const entries = aggregateByCategory(
        (entry.points ?? []) as unknown as RawRow[],
        'x',
        (row) => toNumber(row.y),
      );
      return {
        key: normalizeKey(label),
        label: displayLabel(label),
        tiles: tilesFrom(entries, entry.color ?? seriesColor(index)).tiles,
      };
    })
    .filter((group) => group.tiles.length > 0);

  if (!groups.length) return EMPTY;
  return { mode: 'grouped', tiles: [], groups, rangeColors: [] };
}

function isLabelValueArray(input: unknown): input is TreemapLabelValue[] {
  if (!Array.isArray(input) || !input.length) return false;
  const first = input[0] as RawRow;
  return first != null && typeof first === 'object' && 'label' in first && 'value' in first;
}

/** Normalize chat payloads and FuseDash widget mocks into treemap leaves. */
export function normalizeTreemapData(input: TreemapChartData): TreemapModel {
  if (!input) return EMPTY;

  if (Array.isArray(input)) {
    return isLabelValueArray(input) ? fromLabelValue(input) : EMPTY;
  }

  if (isFuseWidgetPayload(input)) return fromFuseWidget(input);

  const shorthand = input as { points?: TreemapPoint[]; series?: TreemapSeries[] };
  if (Array.isArray(shorthand.series) && shorthand.series.length) {
    return fromSeries(shorthand.series);
  }
  if (Array.isArray(shorthand.points) && shorthand.points.length) {
    return fromPoints(shorthand.points);
  }

  return EMPTY;
}
