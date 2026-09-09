import {
  firstField,
  isFuseWidgetPayload,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import { sortAxisDomain } from './domain.js';
import type {
  MatrixCell,
  MatrixCellsPayload,
  MatrixInput,
  MatrixModel,
} from './types.js';

/**
 * Zero-filling a dense grid is quadratic in the two domains. Past this many
 * cells the chat host would be asked to paint more rects than it can afford,
 * so the grid stays sparse (real rows only) instead.
 */
const MAX_FILLED_CELLS = 10_000;

const EMPTY: MatrixModel = {
  cells: [],
  xDomain: [],
  yDomain: [],
  rawValues: [],
  categoryKey: '',
  valueKey: '',
};

type Row = Record<string, unknown>;

function isCell(d: unknown): d is MatrixCell {
  if (!d || typeof d !== 'object') return false;
  const o = d as Row;
  return 'x' in o && 'y' in o && 'value' in o;
}

function toCell(raw: MatrixCell): MatrixCell | null {
  const x = String(raw.x ?? '');
  const y = String(raw.y ?? '');
  const value = Number(raw.value);
  if (!x || !y) return null;
  return { x, y, value: Number.isFinite(value) ? value : 0 };
}

function uniqueInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function modelFromCells(
  cells: MatrixCell[],
  xDomain?: string[],
  yDomain?: string[],
): MatrixModel {
  const cleaned = cells.map(toCell).filter((c): c is MatrixCell => c != null);
  return {
    cells: cleaned,
    xDomain: xDomain?.length ? xDomain : uniqueInOrder(cleaned.map((c) => c.x)),
    yDomain: yDomain?.length ? yDomain : uniqueInOrder(cleaned.map((c) => c.y)),
    rawValues: cleaned.map((c) => c.value),
    categoryKey: '',
    valueKey: '',
  };
}

/** Mirrors client `getAdditionalKeys` — data keys that are not an axis. */
function additionalKeysOf(rows: Row[], xKey: string, valueKey: string): string[] {
  const reserved = new Set([xKey, valueKey]);
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!reserved.has(key)) keys.add(key);
    }
  }
  return [...keys];
}

/** Mirrors client `normalizeValue` — the zero-fill join key. */
function joinValue(value: unknown): string | number {
  if (typeof value === 'number') return value;
  return String(value).replace(/\s+/g, '');
}

/** Mirrors client `normalizeLocationValue` — "State, County" → "County". */
function normalizeLocationValue(value: unknown): string | number {
  if (value == null) return '';
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return String(value);

  const trimmed = value.trim();
  if (trimmed === '') return '';

  const numValue = Number(trimmed);
  if (Number.isFinite(numValue)) return numValue;

  const commaIndex = trimmed.indexOf(', ');
  if (commaIndex !== -1) return trimmed.substring(commaIndex + 2).trim();

  return trimmed;
}

/**
 * Mirrors client `filledArrayWithZeroData`: every (column × row) combination
 * exists, missing ones carrying a zero so the grid paints a "no data" cell.
 */
function fillWithZeroData(
  widget: FuseWidgetLike,
  rows: Row[],
  xKey: string,
  valueKey: string,
  fillKey: string,
): Row[] {
  const uniqueValues = widget.uniqueValues ?? {};

  const passthrough = (): Row[] =>
    rows.map((row) => ({
      ...row,
      ...(fillKey ? { [fillKey]: normalizeLocationValue(row[fillKey]) } : {}),
    }));

  const xValues = uniqueValues[xKey] ?? [];
  const yValues = fillKey ? (uniqueValues[fillKey] ?? []) : [];
  const total = xValues.length * yValues.length;

  if (!total || total === rows.length || total > MAX_FILLED_CELLS) {
    return passthrough();
  }

  const byKey = new Map<string, Row>();
  for (const row of rows) {
    byKey.set(`${joinValue(row[xKey])}-${joinValue(row[fillKey])}`, row);
  }

  const filled: Row[] = [];
  for (const xValue of xValues) {
    for (const yValue of yValues) {
      const matched = byKey.get(`${joinValue(xValue)}-${joinValue(yValue)}`);
      filled.push(
        matched ?? { [xKey]: xValue, [fillKey]: yValue, [valueKey]: 0 },
      );
    }
  }
  return filled;
}

/**
 * Row-category field. `groupBy[0]` wins whenever the rows actually carry it —
 * the client instead takes the first non-axis key in `Object.keys` order,
 * which silently picks up a stray field (`datasetId`, a passthrough column)
 * and leaves every cell outside the `uniqueValues[groupBy]` domain, painting
 * an empty grid. Falling back to a key that has a `uniqueValues` entry keeps
 * the domain and the cells on the same field.
 */
function resolveCategoryKey(
  widget: FuseWidgetLike,
  additionalKeys: string[],
): string {
  const uniqueValues = widget.uniqueValues ?? {};
  const groupField = firstField(widget.groupBy);
  if (groupField && additionalKeys.includes(groupField)) return groupField;
  return (
    additionalKeys.find((key) => uniqueValues[key]) ?? additionalKeys[0] ?? 'y'
  );
}

/**
 * Mirrors client `MatrixChart` `processedData`:
 * - columns = `xAxe[0]`, ordered by `sortAxisDomain`
 * - rows = `uniqueValues[categoryKey]`, else the categoryKey values on the rows
 * - value = `row.value ?? row[yAxe[0]]`
 */
function fromFuseWidget(widget: FuseWidgetLike): MatrixModel {
  const rows = rowsOf(widget);
  if (!rows.length) return EMPTY;

  const xKey = firstField(widget.xAxe) ?? 'x';
  const valueKey = firstField(widget.yAxe) ?? 'y';

  const rawValues = rows.map((row) => {
    const value = Number(row.value ?? row[valueKey]);
    return Number.isFinite(value) ? value : 0;
  });

  const additionalKeys = additionalKeysOf(rows, xKey, valueKey);
  const categoryKey = resolveCategoryKey(widget, additionalKeys);

  const uniqueValues = widget.uniqueValues ?? {};
  // Domain and cells must read the same field, or every cell misses the scale.
  const yValuesRaw = Array.isArray(uniqueValues[categoryKey])
    ? uniqueValues[categoryKey]
    : rows.map((row) => row[categoryKey]);

  const yDomain = sortAxisDomain(
    [...new Set(yValuesRaw)].filter(Boolean) as (string | number)[],
  ).map(String);

  const xDomain = sortAxisDomain(
    [...new Set(rows.map((row) => row[xKey]))].filter(Boolean) as (
      | string
      | number
    )[],
  ).map(String);

  const filled = fillWithZeroData(widget, rows, xKey, valueKey, categoryKey);

  const cells: MatrixCell[] = [];
  for (const row of filled) {
    const x = row[xKey];
    const y = row[categoryKey];
    if (x == null || y == null) continue;
    const value = Number(row.value ?? row[valueKey] ?? 0);
    cells.push({
      x: String(x),
      y: String(y),
      value: Number.isFinite(value) ? value : 0,
    });
  }

  return {
    cells,
    xDomain,
    yDomain,
    rawValues,
    categoryKey,
    valueKey,
    axisDetails: widget.axisDetails ?? undefined,
  };
}

/** Normalize chat cells or a FuseDash WidgetItem into a matrix model. */
export function normalizeMatrixData(
  input: MatrixInput | FuseWidgetLike | null | undefined,
): MatrixModel {
  if (!input) return EMPTY;

  if (Array.isArray(input)) {
    if (!input.length || !isCell(input[0])) return EMPTY;
    return modelFromCells(input as MatrixCell[]);
  }

  const payload = input as MatrixCellsPayload;
  if (Array.isArray(payload.cells)) {
    return modelFromCells(payload.cells, payload.xDomain, payload.yDomain);
  }

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input);
  }

  return EMPTY;
}
