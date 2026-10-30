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

/** Categories that differ only in spaces ("Red" and "Red  ") are one category. */
function axisKey(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, '');
}

/**
 * Categories that define an axis: the declared list, plus any value a row
 * actually carries. `canonical` gives the category as the axis lists it.
 */
function categoryAxis(
  listed: unknown,
  seen: unknown[],
): { domain: string[]; canonical: Map<string, string> } {
  const fromList = Array.isArray(listed) ? listed : [];
  const canonical = new Map<string, string>();
  for (const value of [...fromList, ...seen]) {
    if (value == null || value === '') continue;
    const key = axisKey(value);
    if (key && !canonical.has(key)) canonical.set(key, String(value).trim());
  }
  return {
    domain: sortAxisDomain([...canonical.values()]).map(String),
    canonical,
  };
}

/** Values of rows that fall on one cell, combined the way the widget aggregates. */
function combinerFor(
  aggregation: unknown,
): (current: number, next: number, count: number) => number {
  const name = String(aggregation ?? '').trim().toLowerCase();
  if (name === 'min') return (current, next) => Math.min(current, next);
  if (name === 'max') return (current, next) => Math.max(current, next);
  if (['avg', 'average', 'mean'].includes(name)) {
    return (current, next, count) => (current * count + next) / (count + 1);
  }
  return (current, next) => current + next;
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
  const yAxis = categoryAxis(
    uniqueValues[categoryKey],
    rows.map((row) => row[categoryKey]),
  );
  const xAxis = categoryAxis(
    uniqueValues[xKey],
    rows.map((row) => row[xKey]),
  );

  const combine = combinerFor(
    (widget as { aggregationFunction?: unknown }).aggregationFunction,
  );
  const cellsByKey = new Map<string, { cell: MatrixCell; count: number }>();
  for (const row of rows) {
    const rawX = row[xKey];
    const rawY = row[categoryKey];
    if (rawX == null || rawY == null) continue;
    const x = xAxis.canonical.get(axisKey(rawX)) ?? String(rawX);
    const y = yAxis.canonical.get(axisKey(rawY)) ?? String(rawY);
    const number = Number(row.value ?? row[valueKey] ?? 0);
    const value = Number.isFinite(number) ? number : 0;
    const key = `${x}\0${y}`;
    const existing = cellsByKey.get(key);
    if (existing) {
      existing.cell.value = combine(existing.cell.value, value, existing.count);
      existing.count += 1;
    } else {
      cellsByKey.set(key, { cell: { x, y, value }, count: 1 });
    }
  }

  return {
    cells: [...cellsByKey.values()].map(({ cell }) => cell),
    xDomain: xAxis.domain,
    yDomain: yAxis.domain,
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
