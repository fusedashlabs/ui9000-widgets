import { resolveFormattingColor, type FuseFormattingEntry } from '../../../utils/fuse-palette.js';
import { firstField } from '../../../utils/fuse-widget.js';
import type {
  ParallelCoordinatesFusePayload,
  ParallelCoordinatesInput,
  ParallelCoordinatesModel,
  ParallelCoordinatesOrientation,
  ParallelCoordinatesRow,
  ParallelCoordinatesRowsPayload,
} from './types.js';

/**
 * One SVG path per row, so a raw dataset is capped before it reaches the draw
 * layer. 2000 polylines already saturate the plot at chat sizes.
 */
export const MAX_PARALLEL_LINES = 2000;

/**
 * Client `getParallelCoordinatesChartFormatting` — the settings panel writes
 * these two entries onto every parallelCoordinatesChart widget, so a mock that
 * carries no `formatting` still resolves a two-ended ramp instead of one flat
 * colour.
 */
export function resolveParallelFormatting(
  formatting: FuseFormattingEntry[] | null | undefined,
): FuseFormattingEntry[] {
  const existing = Array.isArray(formatting) ? formatting : [];
  return ['defaultMin', 'defaultMax'].map(
    (key, index) =>
      existing.find((entry) => entry.key === key) ?? { key, color: String(index + 1) },
  );
}

const EMPTY_MODEL: ParallelCoordinatesModel = {
  orientation: 'horizontal',
  axes: [],
  rows: [],
  idKey: '',
  colorKey: '',
  minColor: '#473DD9',
  maxColor: '#36C4A5',
  lineColor: '#473DD9',
};

function toOrientation(value: unknown): ParallelCoordinatesOrientation {
  return value === 'vertical' ? 'vertical' : 'horizontal';
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Mirrors d3-array `ascending`: nullish sorts last, otherwise natural order. */
function compareAscending(a: unknown, b: unknown): number {
  if (a == null) return b == null ? 0 : 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/**
 * Client axis-key derivation: flatten every `uniqueValues` list and keep the
 * non-empty strings. The widget's `yAxe` names the *field* holding the
 * dimension list, never an axis itself.
 */
function axesFromUniqueValues(
  uniqueValues: ParallelCoordinatesFusePayload['uniqueValues'],
): string[] {
  const source = Array.isArray(uniqueValues) ? uniqueValues[0] : uniqueValues;
  if (!isRecord(source)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of Object.values(source)) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (typeof entry !== 'string' || !entry) continue;
      if (seen.has(entry)) continue;
      seen.add(entry);
      out.push(entry);
    }
  }
  return out;
}

/** Chat fallback: every key that holds a finite number in at least one row. */
function axesFromRows(rows: Array<Record<string, unknown>>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (seen.has(key) || toNumber(value) == null) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/** Chat fallback: first key that is never numeric — the natural line label. */
function idKeyFromRows(
  rows: Array<Record<string, unknown>>,
  axes: string[],
): string {
  const axisSet = new Set(axes);
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!axisSet.has(key)) return key;
    }
  }
  return '';
}

function buildRows(
  raw: Array<Record<string, unknown>>,
  axes: string[],
  idKey: string,
): ParallelCoordinatesRow[] {
  const sorted = idKey
    ? raw.slice().sort((a, b) => compareAscending(a[idKey], b[idKey]))
    : raw.slice();

  const rows: ParallelCoordinatesRow[] = [];
  for (const row of sorted) {
    const values: Record<string, number | null> = {};
    let hasValue = false;
    for (const axis of axes) {
      const value = toNumber(row[axis]);
      values[axis] = value;
      if (value != null) hasValue = true;
    }
    if (!hasValue) continue;
    rows.push({ id: idKey ? String(row[idKey] ?? '') : String(rows.length + 1), values });
    if (rows.length >= MAX_PARALLEL_LINES) break;
  }
  return rows;
}

function buildModel(options: {
  orientation: ParallelCoordinatesOrientation;
  axes: string[];
  rows: ParallelCoordinatesRow[];
  idKey: string;
  colorKeyHint?: string;
  formatting?: FuseFormattingEntry[] | null;
}): ParallelCoordinatesModel {
  const { orientation, axes, rows, idKey } = options;
  if (!axes.length || !rows.length) return { ...EMPTY_MODEL, orientation };

  const formatting = resolveParallelFormatting(options.formatting);
  const minColor = resolveFormattingColor(formatting, 'defaultMin', formatting.length);
  const maxColor = resolveFormattingColor(formatting, 'defaultMax', formatting.length);
  // Client: `yAxe` wins only when it is itself one of the dimensions.
  const hint = options.colorKeyHint;
  const colorKey = hint && axes.includes(hint) ? hint : axes[0];

  return {
    orientation,
    axes,
    rows,
    idKey,
    colorKey,
    minColor,
    maxColor,
    lineColor: minColor,
  };
}

function fromFuse(payload: ParallelCoordinatesFusePayload): ParallelCoordinatesModel {
  const orientation = toOrientation(payload.orientation);
  const axes = axesFromUniqueValues(payload.uniqueValues);
  const raw = payload.data.filter(isRecord);
  const idKey = firstField(payload.xAxe ?? undefined) ?? '';
  if (!axes.length) return { ...EMPTY_MODEL, orientation };

  return buildModel({
    orientation,
    axes,
    rows: buildRows(raw, axes, idKey),
    idKey,
    colorKeyHint: firstField(payload.yAxe ?? undefined),
    formatting: payload.formatting,
  });
}

function fromRows(payload: ParallelCoordinatesRowsPayload): ParallelCoordinatesModel {
  const orientation = toOrientation(payload.orientation);
  const raw = payload.rows.filter(isRecord);
  const axes = payload.axes?.length ? payload.axes.map(String) : axesFromRows(raw);
  if (!axes.length) return { ...EMPTY_MODEL, orientation };
  const idKey = payload.idKey ? String(payload.idKey) : idKeyFromRows(raw, axes);

  return buildModel({
    orientation,
    axes,
    rows: buildRows(raw, axes, idKey),
    idKey,
  });
}

function isFusePayload(input: unknown): input is ParallelCoordinatesFusePayload {
  return isRecord(input) && Array.isArray(input.data);
}

function isRowsPayload(input: unknown): input is ParallelCoordinatesRowsPayload {
  return isRecord(input) && Array.isArray(input.rows);
}

/**
 * Normalize chat / FuseDash payloads into a ParallelCoordinatesModel.
 * Accepts:
 * 1. `Record<string, unknown>[]` — plain rows, numeric keys become the axes
 * 2. `{ orientation?, axes?, idKey?, rows: [...] }`
 * 3. FuseDash `{ orientation?, xAxe?, yAxe?, uniqueValues, data: [...] }`
 */
export function normalizeParallelCoordinatesData(
  input: ParallelCoordinatesInput | null | undefined,
): ParallelCoordinatesModel {
  if (!input) return { ...EMPTY_MODEL };
  if (Array.isArray(input)) return fromRows({ rows: input });
  if (isRowsPayload(input)) return fromRows(input);
  if (isFusePayload(input)) return fromFuse(input);
  return { ...EMPTY_MODEL };
}
