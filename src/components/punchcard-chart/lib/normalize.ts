import type {
  PunchcardCell,
  PunchcardInput,
  PunchcardModel,
} from './types.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveGroupByKey,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';

function isCell(d: unknown): d is PunchcardCell {
  if (!d || typeof d !== 'object') return false;
  const o = d as Record<string, unknown>;
  return 'x' in o && 'y' in o && 'value' in o;
}

function toCell(raw: PunchcardCell): PunchcardCell | null {
  const x = String(raw.x ?? '');
  const y = String(raw.y ?? '');
  const value = Number(raw.value);
  if (!x || !y || !Number.isFinite(value)) return null;
  return {
    x,
    y,
    value,
    color: raw.color,
  };
}

function uniqueInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function modelFromCells(
  cells: PunchcardCell[],
  xDomain?: string[],
  yDomain?: string[],
): PunchcardModel {
  const cleaned = cells
    .map(toCell)
    .filter((c): c is PunchcardCell => c != null);
  return {
    cells: cleaned,
    xDomain: xDomain?.length ? xDomain : uniqueInOrder(cleaned.map((c) => c.x)),
    yDomain: yDomain?.length ? yDomain : uniqueInOrder(cleaned.map((c) => c.y)),
  };
}

/**
 * Mirror client PunchcardChart:
 * - x = row[xAxe]
 * - y category = row[groupBy ?? uniqueValuesKeys[0]]
 * - value/radius = row[yAxe]
 */
function fromFuseWidget(widget: FuseWidgetLike): PunchcardModel {
  const rows = rowsOf(widget);
  const xKey = firstField(widget.xAxe) ?? 'x';
  const valueKey = firstField(widget.yAxe) ?? 'value';
  const yCatKey = resolveGroupByKey(widget);

  const xDomainHint = widget.uniqueValues?.[xKey];
  const yDomainHint = yCatKey ? widget.uniqueValues?.[yCatKey] : undefined;

  const cells: PunchcardCell[] = [];
  for (const row of rows) {
    const x = row[xKey];
    const value = Number(row[valueKey]);
    if (x == null || !Number.isFinite(value)) continue;

    // Client falls back to uniqueValues[0] as groupByKey even when groupBy is null
    // (DEFAULT_PUNCHCARD → y category = year, same as x — diagonal bubbles).
    const yRaw = yCatKey ? row[yCatKey] : 'default';
    if (yRaw == null) continue;

    cells.push({
      x: String(x),
      y: String(yRaw),
      value,
      color: typeof row.color === 'string' ? row.color : undefined,
    });
  }

  return modelFromCells(cells, xDomainHint, yDomainHint);
}

/** Normalize chat / FuseDash WidgetItem payloads into a punchcard model. */
export function normalizePunchcardData(
  input: PunchcardInput | FuseWidgetLike | null | undefined,
): PunchcardModel {
  const empty: PunchcardModel = { cells: [], xDomain: [], yDomain: [] };
  if (!input) return empty;

  if (Array.isArray(input)) {
    if (input.length === 0) return empty;
    if (isCell(input[0])) {
      return modelFromCells(input as PunchcardCell[]);
    }
    return empty;
  }

  if ('cells' in input && Array.isArray((input as { cells: unknown }).cells)) {
    const payload = input as {
      cells: PunchcardCell[];
      xDomain?: string[];
      yDomain?: string[];
    };
    return modelFromCells(payload.cells, payload.xDomain, payload.yDomain);
  }

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input);
  }

  return empty;
}
