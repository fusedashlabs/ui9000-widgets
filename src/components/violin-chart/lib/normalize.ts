import { resolveFormattingColor } from '../../../utils/fuse-palette.js';
import { resolveWidgetFormatting } from '../../../utils/chart-formatting/index.js';
import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type {
  FuseDashViolinPayload,
  ViolinChartData,
  ViolinGroup,
  ViolinGroupsPayload,
  ViolinModel,
  ViolinOrientation,
} from './types.js';

const EMPTY: ViolinModel = {
  orientation: 'vertical',
  groups: [],
  valueKey: '',
  categoryKey: '',
};

const NUMERIC_AXIS_THRESHOLD = 0.5;

function numericRatio(key: string, data: Record<string, unknown>[]): number {
  let numeric = 0;
  let total = 0;
  for (const row of data) {
    const v = row?.[key];
    if (v == null || v === '') continue;
    total += 1;
    if (Number.isFinite(Number(v))) numeric += 1;
  }
  return total ? numeric / total : 0;
}

/**
 * Client `resolveViolinAxes`: if x categorical & y numeric → value=y, category=x;
 * else value on x, category on y.
 */
export function resolveViolinAxes(
  xAxe: string | undefined,
  yAxe: string | undefined,
  data: Record<string, unknown>[],
): { valueKey: string; categoryKey: string } {
  const xKey = xAxe || 'x';
  const yKey = yAxe || 'y';

  if (Array.isArray(data) && data.length) {
    const xNumeric = numericRatio(xKey, data);
    const yNumeric = numericRatio(yKey, data);
    if (
      xNumeric < NUMERIC_AXIS_THRESHOLD &&
      yNumeric >= NUMERIC_AXIS_THRESHOLD
    ) {
      return { valueKey: yKey, categoryKey: xKey };
    }
  }

  return { valueKey: xKey, categoryKey: yKey };
}

function parseOrientation(
  value: string | null | undefined,
): ViolinOrientation {
  return value === 'horizontal' ? 'horizontal' : 'vertical';
}

function isGroupsPayload(input: unknown): input is ViolinGroupsPayload {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  return Array.isArray((input as ViolinGroupsPayload).groups);
}

function isViolinGroup(v: unknown): v is ViolinGroup {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && Array.isArray(o.samples);
}

function fromGroups(
  groups: ViolinGroup[],
  orientation: ViolinOrientation = 'vertical',
  valueKey = 'value',
  categoryKey = 'group',
): ViolinModel {
  const cleaned = groups
    .map((g) => ({
      id: String(g.id),
      samples: g.samples.filter((n) => Number.isFinite(n)),
      color: g.color,
    }))
    .filter((g) => g.samples.length > 0);
  return { orientation, groups: cleaned, valueKey, categoryKey };
}

function fromGroupsPayload(payload: ViolinGroupsPayload): ViolinModel {
  const orientation = parseOrientation(payload.orientation);
  const groups: ViolinGroup[] = [];
  for (const g of payload.groups) {
    const id = String(g.id ?? g.label ?? '');
    if (!id) continue;
    const samples = (g.samples ?? []).filter((n) => Number.isFinite(Number(n))).map(Number);
    if (!samples.length) continue;
    groups.push({ id, samples, color: g.color });
  }
  const n = groups.length;
  for (const g of groups) {
    if (!g.color) {
      g.color = resolveFormattingColor(undefined, g.id, n);
    }
  }
  return fromGroups(groups, orientation);
}

function buildGroupMap(
  rows: Record<string, unknown>[],
  categoryKey: string,
  valueKey: string,
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const row of rows) {
    const g = String(row[categoryKey] ?? '');
    if (!g || g === 'null' || g === 'undefined') continue;
    const y = Number(row[valueKey]);
    if (!Number.isFinite(y)) continue;
    let list = map.get(g);
    if (!list) {
      list = [];
      map.set(g, list);
    }
    list.push(y);
  }
  return map;
}

function fromFuseDash(payload: FuseDashViolinPayload): ViolinModel {
  const widget = payload as FuseWidgetLike;
  const rows = rowsOf(widget);
  const orientation = parseOrientation(
    payload.orientation != null ? String(payload.orientation) : undefined,
  );
  const { valueKey, categoryKey } = resolveViolinAxes(
    firstField(payload.xAxe ?? undefined),
    firstField(payload.yAxe ?? undefined),
    rows,
  );

  const map = buildGroupMap(rows, categoryKey, valueKey);
  const orderedIds = resolveUniqueValuesOrder(
    map.keys(),
    payload.uniqueValues ?? undefined,
    categoryKey,
  );
  const formatting = resolveWidgetFormatting(widget);
  const groups: ViolinGroup[] = [];
  for (const id of orderedIds) {
    const samples = map.get(id);
    if (!samples?.length) continue;
    groups.push({
      id,
      samples,
      color: resolveFormattingColor(formatting, id, orderedIds.length),
    });
  }
  return { orientation, groups, valueKey, categoryKey };
}

/**
 * Normalize chat / FuseDash payloads into a ViolinModel.
 * Accepts:
 * 1. `{ orientation?, groups: [{ id|label, samples }] }`
 * 2. `ViolinGroup[]`
 * 3. FuseDash `{ orientation?, xAxe?, yAxe?, uniqueValues?, data: [...] }`
 */
export function normalizeViolinData(
  input: ViolinChartData | null | undefined,
): ViolinModel {
  if (!input) return { ...EMPTY };

  if (Array.isArray(input)) {
    if (!input.length) return { ...EMPTY };
    if (isViolinGroup(input[0])) {
      return fromGroups(input as ViolinGroup[]);
    }
    return { ...EMPTY };
  }

  if (isGroupsPayload(input)) {
    return fromGroupsPayload(input);
  }

  if (isFuseWidgetPayload(input) && Array.isArray(input.data)) {
    return fromFuseDash(input as FuseDashViolinPayload);
  }

  return { ...EMPTY };
}
