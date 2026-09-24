import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import type {
  HistogramBin,
  HistogramBinInput,
  HistogramBinsPayload,
  HistogramChartData,
  HistogramFusePayload,
  HistogramFuseRow,
  HistogramLabelValue,
  HistogramModel,
  HistogramStack,
} from './types.js';

function isLabelValueArray(input: unknown): input is HistogramLabelValue[] {
  if (!Array.isArray(input) || input.length === 0) return false;
  const first = input[0] as Record<string, unknown>;
  return (
    first != null &&
    typeof first === 'object' &&
    'label' in first &&
    'value' in first
  );
}

function isBinsPayload(input: unknown): input is HistogramBinsPayload {
  return (
    input != null &&
    typeof input === 'object' &&
    Array.isArray((input as HistogramBinsPayload).bins)
  );
}

function isFusePayload(input: unknown): input is HistogramFusePayload {
  return (
    input != null &&
    typeof input === 'object' &&
    Array.isArray((input as HistogramFusePayload).data) &&
    'xMin' in (input as object) &&
    'xMax' in (input as object)
  );
}

function stackWithOffsets(
  items: Array<{ group: string; count: number; color?: string }>,
): HistogramStack[] {
  let cursor = 0;
  return items.map((item) => {
    const count = Number(item.count) || 0;
    const start = cursor;
    const end = start + count;
    cursor = end;
    return {
      group: item.group,
      count,
      color: item.color,
      start,
      end,
    };
  });
}

function resolveGroup(row: HistogramFuseRow, groupsHint?: string[]): string {
  if (row.group != null && String(row.group) !== '') return String(row.group);
  if (typeof row._id === 'string' && row._id !== '') return row._id;
  if (row._id && typeof row._id === 'object') {
    const keys = Object.keys(row._id);
    if (groupsHint?.length) {
      for (const g of groupsHint) {
        if (g in row._id) return String(row._id[g] ?? '');
      }
    }
    if (keys.length === 1) return String(row._id[keys[0]] ?? '');
    // Prefer non-bucketIndex keys
    for (const k of keys) {
      if (k !== 'bucketIndex') return String(row._id[k] ?? '');
    }
  }
  return 'default';
}

function fromLabelValue(rows: HistogramLabelValue[]): HistogramModel {
  const bins: HistogramBin[] = rows
    .map((row, index) => {
      const count = Number(row.value);
      if (!Number.isFinite(count)) return null;
      const stacks = stackWithOffsets([
        { group: 'Series', count, color: row.color },
      ]);
      return {
        index,
        x0: index,
        x1: index + 1,
        stacks,
      };
    })
    .filter((b): b is HistogramBin => b != null);

  return {
    bins,
    groups: bins.length ? ['Series'] : [],
    xMin: 0,
    xMax: Math.max(bins.length, 1),
  };
}

function fromBinsPayload(payload: HistogramBinsPayload): HistogramModel {
  const groupOrder: string[] = [];
  const seen = new Set<string>();

  const bins: HistogramBin[] = (payload.bins ?? []).map(
    (bin: HistogramBinInput, index: number) => {
      const rawStacks = (bin.stacks ?? [])
        .map((s) => ({
          group: String(s.group ?? 'default'),
          count: Number(s.count) || 0,
          color: s.color,
        }))
        .filter((s) => Number.isFinite(s.count));

      for (const s of rawStacks) {
        if (!seen.has(s.group)) {
          seen.add(s.group);
          groupOrder.push(s.group);
        }
      }

      return {
        index,
        x0: Number(bin.x0),
        x1: Number(bin.x1),
        stacks: stackWithOffsets(rawStacks),
      };
    },
  );

  const finiteX0 = bins.map((b) => b.x0).filter(Number.isFinite);
  const finiteX1 = bins.map((b) => b.x1).filter(Number.isFinite);
  const xMin =
    payload.xMin != null && Number.isFinite(payload.xMin)
      ? Number(payload.xMin)
      : finiteX0.length
        ? Math.min(...finiteX0)
        : 0;
  const xMax =
    payload.xMax != null && Number.isFinite(payload.xMax)
      ? Number(payload.xMax)
      : finiteX1.length
        ? Math.max(...finiteX1)
        : 1;

  return { bins, groups: groupOrder, xMin, xMax };
}

function fromFusePayload(payload: HistogramFusePayload): HistogramModel {
  const xMin = Number(payload.xMin);
  const xMax = Number(payload.xMax);
  const rows = payload.data ?? [];
  if (!rows.length || !Number.isFinite(xMin) || !Number.isFinite(xMax)) {
    return { bins: [], groups: [], xMin: 0, xMax: 1 };
  }

  const bucketMap = new Map<number, HistogramFuseRow[]>();
  let maxBucket = -1;
  for (const row of rows) {
    const bi = Number(row.bucketIndex);
    if (!Number.isFinite(bi)) continue;
    maxBucket = Math.max(maxBucket, bi);
    const list = bucketMap.get(bi) ?? [];
    list.push(row);
    bucketMap.set(bi, list);
  }

  const binsCount = maxBucket + 1;
  if (binsCount <= 0) {
    return { bins: [], groups: payload.groups ?? [], xMin, xMax };
  }

  const binWidth = (xMax - xMin) / binsCount;

  // Discover group order
  const groupOrder: string[] = [];
  const seen = new Set<string>();
  if (payload.groups?.length) {
    for (const g of payload.groups) {
      if (!seen.has(g)) {
        seen.add(g);
        groupOrder.push(g);
      }
    }
  }
  for (const row of rows) {
    const g = resolveGroup(row, payload.groups);
    if (!seen.has(g)) {
      seen.add(g);
      groupOrder.push(g);
    }
  }

  const bins: HistogramBin[] = [];
  for (let i = 0; i < binsCount; i++) {
    const bucketRows = bucketMap.get(i) ?? [];
    const byGroup = new Map<string, HistogramFuseRow>();
    for (const row of bucketRows) {
      byGroup.set(resolveGroup(row, payload.groups), row);
    }

    const ordered: Array<{ group: string; count: number; color?: string }> = [];
    for (const g of groupOrder) {
      const row = byGroup.get(g);
      if (!row) continue;
      ordered.push({
        group: g,
        count: Number(row.count) || 0,
        color: row.color,
      });
    }

    bins.push({
      index: i,
      x0: xMin + i * binWidth,
      x1: xMin + (i + 1) * binWidth,
      stacks: stackWithOffsets(ordered),
    });
  }

  return { bins, groups: groupOrder, xMin, xMax };
}

/** Peel nested FuseDash widget `{ data: [{ min, max, histogramResults }] }`. */
function fromNestedWidget(input: Record<string, unknown>): HistogramModel | null {
  const rows = input.data;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const first = rows[0] as Record<string, unknown> | null;
  if (!first || typeof first !== 'object') return null;
  const results = first.histogramResults;
  if (!Array.isArray(results)) return null;

  const uniqueValues = (input.uniqueValues ?? {}) as Record<string, string[]>;
  const groupBy = Array.isArray(input.groupBy)
    ? String(input.groupBy[0] ?? '')
    : typeof input.groupBy === 'string'
      ? input.groupBy
      : '';
  // Empty groupBy is one series. uniqueValues then lists bucket labels, not stacks.
  const groups =
    groupBy && Array.isArray(uniqueValues[groupBy])
      ? uniqueValues[groupBy]
      : undefined;

  const model = fromFusePayload({
    xMin: Number(first.min ?? input.xMin ?? 0),
    xMax: Number(first.max ?? input.xMax ?? 1),
    data: results as HistogramFuseRow[],
    groups,
  });

  // Apply FuseDash formatting → Qualitative palette hex per stack group
  const formatting = Array.isArray(input.formatting)
    ? (input.formatting as Array<{ key?: string; color?: string | number }>)
    : undefined;
  if (formatting?.length && model.groups.length) {
    for (const bin of model.bins) {
      for (const stack of bin.stacks) {
        stack.color = resolveFormattingColor(
          formatting,
          stack.group,
          model.groups.length,
        );
      }
    }
  }

  return model;
}

/** Normalize chat / FuseDash-ish payloads into stacked histogram model. */
export function normalizeHistogramData(
  input: HistogramChartData | null | undefined,
): HistogramModel {
  if (!input) {
    return { bins: [], groups: [], xMin: 0, xMax: 1 };
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      return { bins: [], groups: [], xMin: 0, xMax: 1 };
    }
    if (isLabelValueArray(input)) {
      return fromLabelValue(input);
    }
    return { bins: [], groups: [], xMin: 0, xMax: 1 };
  }

  if (isBinsPayload(input)) {
    return fromBinsPayload(input);
  }

  if (isFusePayload(input)) {
    return fromFusePayload(input);
  }

  if (typeof input === 'object') {
    const nested = fromNestedWidget(input as Record<string, unknown>);
    if (nested && nested.bins.length) return nested;
  }

  return { bins: [], groups: [], xMin: 0, xMax: 1 };
}
