import {
  bubbleRadiusForValue,
  generateBubbleColorRanges,
  resolveFormattingColor,
} from '../../../utils/fuse-palette.js';
import { resolveWidgetFormatting } from '../../../utils/chart-formatting/index.js';
import {
  filterTruthyValues,
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import { bubbleXDomain, bubbleYDomain } from './domain.js';
import type { BubbleChartData, BubbleGroup, BubbleModel, BubblePoint } from './types.js';

const EMPTY: BubbleModel = {
  points: [],
  xField: '',
  yField: '',
  groups: [],
  colorRanges: [],
};

type WidgetWithAxes = FuseWidgetLike & {
  arrangeBy?: string | string[] | null;
  display?: string | string[] | null;
  palette?: { range?: number[] | null } | null;
};

function isNumericField(rows: Record<string, unknown>[], field: string): boolean {
  return Boolean(field) && rows.some((row) => Number.isFinite(Number(row[field])));
}

function resolveNumericField(
  rows: Record<string, unknown>[],
  preferred: string | undefined,
  exclude: string,
  groupField?: string,
): string {
  if (preferred && isNumericField(rows, preferred)) return preferred;
  if (!rows.length) return preferred ?? '';
  for (const key of Object.keys(rows[0] ?? {})) {
    if (key === exclude || key === groupField) continue;
    if (isNumericField(rows, key)) return key;
  }
  return preferred ?? '';
}

function resolveBubbleAxes(widget: WidgetWithAxes): { xField: string; yField: string } {
  const xField = firstField(widget.arrangeBy) || firstField(widget.xAxe) || '';
  const yField = firstField(widget.display) || firstField(widget.yAxe) || '';
  return { xField, yField };
}

function fromChatPoints(
  rows: Array<{ x: number; y: number; group?: string; color?: string }>,
): BubbleModel {
  const points = rows
    .map((row) => {
      const x = Number(row.x);
      const y = Number(row.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const groupKey = row.group != null ? String(row.group) : 'default';
      const point: BubblePoint = {
        x,
        y,
        groupKey,
        color: row.color ?? resolveFormattingColor(undefined, groupKey, rows.length),
        row: { x, y, group: groupKey },
      };
      return point;
    })
    .filter((p): p is BubblePoint => p != null);

  const groupKeys = [...new Set(points.map((p) => p.groupKey))];
  const groups: BubbleGroup[] = groupKeys.map((key) => ({
    key,
    label: key,
    color: points.find((p) => p.groupKey === key)?.color ?? resolveFormattingColor(undefined, key, groupKeys.length),
  }));

  const yValues = points.map((p) => p.y);
  return {
    points,
    xField: 'x',
    yField: 'y',
    groupField: points.some((p) => p.groupKey !== 'default') ? 'group' : undefined,
    groups,
    colorRanges: generateBubbleColorRanges(yValues),
  };
}

function fromFuseWidget(widget: WidgetWithAxes): BubbleModel {
  const rows = rowsOf(widget);
  const { xField: configuredX, yField: configuredY } = resolveBubbleAxes(widget);
  const groupField = firstField(widget.groupBy ?? undefined);

  const xField = resolveNumericField(rows, configuredX, configuredY ?? '', groupField);
  const yField = resolveNumericField(rows, configuredY, xField, groupField);
  if (!xField || !yField) return EMPTY;

  const formatting = resolveWidgetFormatting(widget);
  const groupKeys = groupField
    ? resolveUniqueValuesOrder(
        rows.map((row) => String(row[groupField] ?? '')).filter(Boolean),
        widget.uniqueValues,
        groupField,
      )
    : ['default'];

  const cleanGroups = groupField ? filterTruthyValues(groupKeys) : ['default'];
  const groups: BubbleGroup[] = cleanGroups.map((key) => ({
    key,
    label: key,
    color: resolveFormattingColor(formatting, key, cleanGroups.length),
  }));

  const colorByGroup = new Map(groups.map((g) => [g.key, g.color]));
  const points: BubblePoint[] = [];
  for (const row of rows) {
    const x = Number(row[xField]);
    const y = Number(row[yField]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const groupKey = groupField ? String(row[groupField] ?? 'default') : 'default';
    points.push({
      x,
      y,
      groupKey,
      color: colorByGroup.get(groupKey) ?? resolveFormattingColor(formatting, groupKey, groups.length),
      row,
    });
  }

  const yValues = points.map((p) => p.y);
  const paletteRange = widget.palette?.range ?? null;

  return {
    points,
    xField,
    yField,
    groupField: groupField ?? undefined,
    groups,
    colorRanges: generateBubbleColorRanges(yValues, paletteRange),
    axisDetails: widget.axisDetails ?? undefined,
  };
}

/** Normalize chat / FuseDash WidgetItem payloads into bubble points + radius bands. */
export function normalizeBubbleData(input: BubbleChartData): BubbleModel {
  if (!input) return EMPTY;

  if (Array.isArray(input)) {
    if (!input.length) return EMPTY;
    if ('x' in input[0] && 'y' in input[0]) {
      return fromChatPoints(input as Array<{ x: number; y: number; group?: string; color?: string }>);
    }
    return EMPTY;
  }

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input as WidgetWithAxes);
  }

  if (typeof input === 'object' && Array.isArray((input as BubbleModel).points)) {
    return input as BubbleModel;
  }

  return EMPTY;
}

export { bubbleRadiusForValue, bubbleXDomain, bubbleYDomain };
