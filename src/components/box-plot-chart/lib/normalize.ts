import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import type {
  BoxPlotBox,
  BoxPlotBoxesPayload,
  BoxPlotModel,
  BoxPlotOrientation,
  FuseDashBoxPlotPayload,
  FuseDashBoxPlotRow,
} from './types.js';

function firstField(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isBoxPlotBox(v: unknown): v is BoxPlotBox {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.label === 'string' &&
    isFiniteNumber(o.q1) &&
    isFiniteNumber(o.median) &&
    isFiniteNumber(o.q3) &&
    isFiniteNumber(o.smallestNonOutlier) &&
    isFiniteNumber(o.biggestNonOutlier)
  );
}

function normalizeBox(raw: BoxPlotBox): BoxPlotBox | null {
  if (!isBoxPlotBox(raw)) return null;
  const outliers = Array.isArray(raw.outliers)
    ? raw.outliers.filter(isFiniteNumber)
    : [];
  return {
    label: String(raw.label),
    group: raw.group != null && raw.group !== '' ? String(raw.group) : undefined,
    color: raw.color,
    min: isFiniteNumber(raw.min) ? raw.min : undefined,
    q1: raw.q1,
    median: raw.median,
    q3: raw.q3,
    max: isFiniteNumber(raw.max) ? raw.max : undefined,
    smallestNonOutlier: raw.smallestNonOutlier,
    biggestNonOutlier: raw.biggestNonOutlier,
    outliers,
  };
}

function collectGroups(boxes: BoxPlotBox[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of boxes) {
    const g = b.group ?? 'default';
    if (!seen.has(g)) {
      seen.add(g);
      out.push(g);
    }
  }
  return out;
}

function filterTruthy(values: string[]): string[] {
  return values.filter(
    (v) => v != null && v !== '' && v !== 'null' && v !== 'undefined',
  );
}

function resolveGroupOrder(
  boxes: BoxPlotBox[],
  groupBy: string | undefined,
  uniqueValues?: Record<string, string[]>,
): string[] {
  const fromUv =
    groupBy && uniqueValues?.[groupBy]?.length
      ? filterTruthy(uniqueValues[groupBy].map(String))
      : null;
  if (fromUv?.length) {
    const dataGroups = new Set(boxes.map((b) => b.group ?? 'default'));
    return fromUv.filter((g) => dataGroups.has(g));
  }
  return collectGroups(boxes);
}

function resolveCategoryLabels(
  boxes: BoxPlotBox[],
  xAxe: string,
  uniqueValues?: Record<string, string[]>,
): string[] {
  const fromUv =
    uniqueValues?.[xAxe]?.length
      ? filterTruthy(uniqueValues[xAxe].map(String))
      : null;
  if (fromUv?.length) {
    const dataLabels = new Set(boxes.map((b) => b.label));
    return fromUv.filter((l) => dataLabels.has(l));
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of boxes) {
    if (!seen.has(b.label)) {
      seen.add(b.label);
      out.push(b.label);
    }
  }
  return out;
}

function fromBoxes(
  boxes: BoxPlotBox[],
  orientation: BoxPlotOrientation = 'vertical',
  meta?: { categoryLabels?: string[]; groups?: string[] },
): BoxPlotModel {
  const normalized = boxes
    .map(normalizeBox)
    .filter((b): b is BoxPlotBox => b != null);
  const groups = meta?.groups?.length ? meta.groups : collectGroups(normalized);
  const categoryLabels =
    meta?.categoryLabels?.length
      ? meta.categoryLabels
      : resolveCategoryLabels(normalized, '', undefined);
  return {
    orientation,
    boxes: normalized,
    groups,
    categoryLabels,
  };
}

function isFuseDashPayload(input: unknown): input is FuseDashBoxPlotPayload {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const o = input as Record<string, unknown>;
  return Array.isArray(o.data);
}

function isBoxesPayload(input: unknown): input is BoxPlotBoxesPayload {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const o = input as Record<string, unknown>;
  return Array.isArray(o.boxes);
}

function fromFuseDash(payload: FuseDashBoxPlotPayload): BoxPlotModel {
  const orientation: BoxPlotOrientation =
    payload.orientation === 'horizontal' ? 'horizontal' : 'vertical';
  const xAxe = firstField(payload.xAxe) || 'year';
  const groupBy = firstField(payload.groupBy);
  const formatting = (
    payload as FuseDashBoxPlotPayload & {
      formatting?: Array<{ key?: string; color?: string | number }>;
    }
  ).formatting;

  const boxes: BoxPlotBox[] = [];
  for (const row of payload.data as FuseDashBoxPlotRow[]) {
    if (!row) continue;
    const id = row._id ?? {};
    const label = String(id[xAxe] ?? '');
    if (!label) continue;
    if (
      !isFiniteNumber(row.q1) ||
      !isFiniteNumber(row.median) ||
      !isFiniteNumber(row.q3) ||
      !isFiniteNumber(row.smallestNonOutlier) ||
      !isFiniteNumber(row.biggestNonOutlier)
    ) {
      continue;
    }
    const group =
      groupBy && id[groupBy] != null && String(id[groupBy]) !== ''
        ? String(id[groupBy])
        : undefined;
    boxes.push({
      label,
      group,
      min: isFiniteNumber(row.min) ? row.min : undefined,
      q1: row.q1,
      median: row.median,
      q3: row.q3,
      max: isFiniteNumber(row.max) ? row.max : undefined,
      smallestNonOutlier: row.smallestNonOutlier,
      biggestNonOutlier: row.biggestNonOutlier,
      outliers: Array.isArray(row.outliers)
        ? row.outliers.filter(isFiniteNumber)
        : [],
    });
  }

  const model = fromBoxes(boxes, orientation, {
    categoryLabels: resolveCategoryLabels(boxes, xAxe, payload.uniqueValues),
    groups: resolveGroupOrder(boxes, groupBy, payload.uniqueValues),
  });
  if (formatting?.length) {
    for (const box of model.boxes) {
      const key = box.group ?? 'default';
      box.color = resolveFormattingColor(formatting, key, model.groups.length);
    }
  }
  return model;
}

/**
 * Normalize chat / FuseDash payloads into a BoxPlotModel.
 * Accepts:
 * 1. `{ orientation?, boxes: BoxPlotBox[] }`
 * 2. `BoxPlotBox[]`
 * 3. FuseDash `{ orientation?, xAxe?, groupBy?, data: [...] }`
 */
export function normalizeBoxPlotData(
  input:
    | BoxPlotBox[]
    | BoxPlotBoxesPayload
    | FuseDashBoxPlotPayload
    | null
    | undefined,
): BoxPlotModel {
  if (!input) {
    return { orientation: 'vertical', boxes: [], groups: [], categoryLabels: [] };
  }

  if (Array.isArray(input)) {
    return fromBoxes(input);
  }

  if (isBoxesPayload(input)) {
    const orientation: BoxPlotOrientation =
      input.orientation === 'horizontal' ? 'horizontal' : 'vertical';
    return fromBoxes(input.boxes, orientation);
  }

  if (isFuseDashPayload(input)) {
    return fromFuseDash(input);
  }

  return { orientation: 'vertical', boxes: [], groups: [], categoryLabels: [] };
}
