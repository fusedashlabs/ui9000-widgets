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

/** Categories that define an axis: the declared list, plus any value a row actually carries. */
function categoryDomain(listed: unknown, seen: unknown[]): string[] {
  const fromList = Array.isArray(listed) ? listed : [];
  return sortAxisDomain(
    [...new Set([...fromList, ...seen])].filter((v) => v != null && v !== '') as (
      | string
      | number
    )[],
  ).map(String);
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
 * - columns = `uniqueValues[xAxe]` unioned with every x value on the rows
 * - rows = `uniqueValues[categoryKey]` unioned with every category value on the rows
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
  // A category with no measurement stays on the axis so the plot can paint it empty.
  // Row values are unioned in so a measurement never falls off the scale.
  const yDomain = categoryDomain(
    uniqueValues[categoryKey],
    rows.map((row) => row[categoryKey]),
  );
  const xDomain = categoryDomain(
    uniqueValues[xKey],
    rows.map((row) => row[xKey]),
  );

  const cells: MatrixCell[] = [];
  for (const row of rows) {
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
