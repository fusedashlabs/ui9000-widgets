import {
  firstField,
  isFuseWidgetPayload,
  resolveUniqueValuesOrder,
  rowsOf,
  type FuseWidgetLike,
} from '../../../utils/fuse-widget.js';
import type { FuseFormattingEntry } from '../../../utils/fuse-palette.js';
import { FD } from '../../../utils/fusedash-visual.js';
import type {
  WaterfallChartData,
  WaterfallColors,
  WaterfallKind,
  WaterfallModel,
  WaterfallOrientation,
  WaterfallSourcePath,
  WaterfallStep,
  WaterfallStepInput,
  WaterfallStepsPayload,
  WaterfallVector,
} from './types.js';

/**
 * Resolve positive/negative/total fills.
 * Client hard-codes `#938CFF` / `#FF8C47` / `#BDBCC8` and ignores formatting for
 * paint — pass `preferHardcodes` for FuseDash fixture parity. Otherwise allow
 * hex overrides from formatting keys `positive` | `negative` | `total`.
 */
function resolveColors(
  formatting: FuseFormattingEntry[] | null | undefined,
  preferHardcodes = false,
): WaterfallColors {
  const hard = {
    positive: FD.waterfallPositive,
    negative: FD.waterfallNegative,
    total: FD.waterfallTotal,
  };
  if (preferHardcodes) return hard;

  const pick = (key: string, fallback: string): string => {
    const raw = formatting?.find((f) => String(f.key) === key)?.color;
    if (typeof raw === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) {
      return raw;
    }
    return fallback;
  };
  return {
    positive: pick('positive', hard.positive),
    negative: pick('negative', hard.negative),
    total: pick('total', hard.total),
  };
}

const EMPTY: WaterfallModel = {
  steps: [],
  orientation: 'horizontal',
  colors: resolveColors(undefined, true),
  sourcePath: 'client-levels',
};

function vectorOf(difference: number): WaterfallVector {
  return difference >= 0 ? 'positive' : 'negative';
}

function kindFromVector(vector: WaterfallVector, isTotal: boolean): WaterfallKind {
  if (isTotal) return 'total';
  return vector === 'positive' ? 'increase' : 'decrease';
}

function rowHasDeltaFlags(row: Record<string, unknown>): boolean {
  return (
    'isTotal' in row ||
    'isPositive' in row ||
    'isNegative' in row
  );
}

/**
 * Build draw steps from cumulative levels (client formula):
 *   start[i] = i === 0 ? 0 : levels[i-1]
 *   end[i]   = levels[i]
 */
function stepsFromLevels(
  items: Array<{ label: string; level: number; kind?: WaterfallKind }>,
  opts: { totalsFromZero: boolean },
): WaterfallStep[] {
  const steps: WaterfallStep[] = [];
  let prevLevel = 0;

  for (let i = 0; i < items.length; i++) {
    const { label, level, kind: hint } = items[i];
    const isTotal = hint === 'total' || (i === 0 && hint == null);
    let start: number;
    let end: number;

    if (opts.totalsFromZero && hint === 'total') {
      start = 0;
      end = level;
    } else if (i === 0) {
      start = 0;
      end = level;
    } else {
      start = prevLevel;
      end = level;
    }

    const difference = end - start;
    const vector = vectorOf(difference);
    const kind = hint ?? kindFromVector(vector, isTotal && i === 0);

    steps.push({
      label,
      start,
      end,
      difference,
      vector,
      kind,
      level,
      index: i,
    });
    prevLevel = level;
  }

  return steps;
}

/**
 * Convert signed-delta rows (isTotal / isPositive / isNegative) into cumulative levels.
 * Totals use the absolute value; deltas accumulate onto the running total.
 */
function levelsFromDeltaRows(
  rows: Array<{ label: string; value: number; kind: WaterfallKind }>,
): Array<{ label: string; level: number; kind: WaterfallKind }> {
  let running = 0;
  return rows.map((row) => {
    if (row.kind === 'total') {
      running = row.value;
      return { label: row.label, level: running, kind: 'total' };
    }
    running += row.value;
    return { label: row.label, level: running, kind: row.kind };
  });
}

function kindFromFlags(row: Record<string, unknown>, value: number): WaterfallKind {
  if (row.isTotal === true) return 'total';
  if (row.isPositive === true) return 'increase';
  if (row.isNegative === true) return 'decrease';
  return value >= 0 ? 'increase' : 'decrease';
}

function levelsFromStepInputs(
  inputs: WaterfallStepInput[],
): Array<{ label: string; level: number; kind: WaterfallKind }> {
  let running = 0;
  return inputs.map((s) => {
    const value = Number(s.value);
    const kind: WaterfallKind =
      s.kind ?? (value >= 0 ? 'increase' : 'decrease');
    if (kind === 'total') {
      running = value;
      return { label: String(s.label), level: running, kind };
    }
    running += value;
    return { label: String(s.label), level: running, kind };
  });
}

function orientationOf(
  raw: unknown,
  fallback: WaterfallOrientation = 'horizontal',
): WaterfallOrientation {
  return raw === 'vertical' ? 'vertical' : raw === 'horizontal' ? 'horizontal' : fallback;
}

function modelOf(
  steps: WaterfallStep[],
  orientation: WaterfallOrientation,
  colors: WaterfallColors,
  sourcePath: WaterfallSourcePath,
): WaterfallModel {
  return { steps, orientation, colors, sourcePath };
}

function fromLabelValue(
  rows: Array<{ label: string; value: number }>,
  orientation: WaterfallOrientation,
  colors: WaterfallColors,
): WaterfallModel {
  const items = rows
    .map((r) => ({
      label: String(r.label),
      level: Number(r.value),
    }))
    .filter((r) => r.label !== '' && Number.isFinite(r.level));
  return modelOf(
    stepsFromLevels(items, { totalsFromZero: false }),
    orientation,
    colors,
    'label-value',
  );
}

function fromStepsPayload(
  payload: WaterfallStepsPayload,
  colors: WaterfallColors,
): WaterfallModel {
  const inputs = (payload.steps ?? []).filter(
    (s) => s && Number.isFinite(Number(s.value)) && s.label != null,
  );
  const levels = levelsFromStepInputs(inputs);
  return modelOf(
    stepsFromLevels(levels, { totalsFromZero: true }),
    orientationOf(payload.orientation),
    colors,
    'steps-payload',
  );
}

function fromFuseWidget(widget: FuseWidgetLike): WaterfallModel {
  const rows = rowsOf(widget);
  const labelKey = firstField(widget.xAxe) ?? 'category';
  const valueKey = firstField(widget.yAxe) ?? 'value';
  const orientation = orientationOf(widget.orientation, 'horizontal');
  // Match client paint (hard-codes); mock formatting colors differ and are ignored by client.
  const colors = resolveColors(widget.formatting ?? undefined, true);

  const hasFlags = rows.some(rowHasDeltaFlags);

  const labelOrder = resolveUniqueValuesOrder(
    rows.map((r) => String(r[labelKey] ?? '')),
    widget.uniqueValues,
    labelKey,
  );

  const orderedRows =
    labelOrder.length > 0
      ? labelOrder
          .map((lab) => rows.find((r) => String(r[labelKey] ?? '') === lab))
          .filter((r): r is Record<string, unknown> => r != null)
      : rows;

  if (hasFlags) {
    // DEFAULT_WATERFALL values are signed deltas with isTotal/isPositive/isNegative.
    // Client ignores flags and treats metrics as levels (broken visually). We convert
    // deltas → cumulative levels so Storybook shows a proper waterfall.
    const deltaRows = orderedRows
      .map((row) => {
        const label = String(row[labelKey] ?? '');
        const value = Number(row[valueKey]);
        if (!label || !Number.isFinite(value)) return null;
        return { label, value, kind: kindFromFlags(row, value) };
      })
      .filter((r): r is { label: string; value: number; kind: WaterfallKind } => r != null);

    const levels = levelsFromDeltaRows(deltaRows);
    return modelOf(
      stepsFromLevels(levels, { totalsFromZero: true }),
      orientation,
      colors,
      'delta-flags',
    );
  }

  // Client parity: metric values are cumulative levels.
  const items = orderedRows
    .map((row) => {
      const label = String(row[labelKey] ?? '');
      const level = Number(row[valueKey]);
      if (!label || !Number.isFinite(level)) return null;
      return { label, level };
    })
    .filter((r): r is { label: string; level: number } => r != null);

  return modelOf(
    stepsFromLevels(items, { totalsFromZero: false }),
    orientation,
    colors,
    'client-levels',
  );
}

function isStepsPayload(input: unknown): input is WaterfallStepsPayload {
  return (
    input != null &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    Array.isArray((input as WaterfallStepsPayload).steps)
  );
}

function isLabelValueArray(
  input: unknown,
): input is Array<{ label: string; value: number }> {
  if (!Array.isArray(input) || input.length === 0) return false;
  const first = input[0] as Record<string, unknown>;
  return (
    first != null &&
    typeof first === 'object' &&
    'label' in first &&
    'value' in first &&
    !('kind' in first && 'isTotal' in first)
  );
}

function isStepInputArray(input: unknown): input is WaterfallStepInput[] {
  if (!Array.isArray(input) || input.length === 0) return false;
  const first = input[0] as Record<string, unknown>;
  return (
    first != null &&
    typeof first === 'object' &&
    'label' in first &&
    'value' in first &&
    'kind' in first
  );
}

/** Normalize chat / FuseDash WidgetItem payloads into waterfall steps. */
export function normalizeWaterfallData(
  input: WaterfallChartData | null | undefined,
): WaterfallModel {
  if (!input) return { ...EMPTY };

  if (Array.isArray(input)) {
    if (input.length === 0) return { ...EMPTY };
    if (isStepInputArray(input)) {
      return fromStepsPayload({ steps: input }, resolveColors(undefined));
    }
    if (isLabelValueArray(input)) {
      return fromLabelValue(input, 'horizontal', resolveColors(undefined));
    }
    return { ...EMPTY };
  }

  if (isStepsPayload(input)) {
    return fromStepsPayload(input, resolveColors(undefined));
  }

  if (isFuseWidgetPayload(input)) {
    return fromFuseWidget(input);
  }

  return { ...EMPTY };
}
