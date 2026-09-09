import {
  formatKpiValue,
  splitFormattedKpiValue,
} from './format.js';
import type {
  KpiCardModel,
  KpiStatusBadge,
  KpiStatusVariant,
  KpiValueLabel,
  RawKpiItem,
  RawKpiVisualisation,
} from './types.js';

type AxisInfo = NonNullable<RawKpiItem['axisDetails']>[string];

const HIGH_LOW_TYPES = new Set(['high/low', 'high/low_overall', 'high/low_trend']);

function valueLabel(axisInfo: AxisInfo | undefined): KpiValueLabel | undefined {
  if (!axisInfo || typeof axisInfo !== 'object') return undefined;
  const info = axisInfo;
  return {
    position: info.measure_unit_type === 'currency' ? 'left' : 'right',
    text:
      info.measure_unit_type === 'currency'
        ? (info.measure_unit_symbol ?? '')
        : (info.measure_unit ?? ''),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function formatDisplay(raw: unknown): { value: string; suffix?: string } {
  const formatted = formatKpiValue(raw as number | string);
  const split = splitFormattedKpiValue(formatted);
  return split.suffix ? split : { value: formatted };
}

function percentLabel(raw: unknown): string | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return undefined;
  return `${n.toFixed(2)}%`;
}

function statusFromKpi(kpi: RawKpiItem): KpiStatusBadge | undefined {
  if (kpi.kpiKind === 'mission') {
    return { text: 'Mission', variant: 'Mission' };
  }
  if (kpi.kpiKind === 'goal') {
    return kpi.targetStatus === 'on_target'
      ? { text: 'On target', variant: 'OnTarget' }
      : { text: 'Off target', variant: 'OffTarget' };
  }
  const raw = kpi.status?.trim();
  if (!raw) return undefined;
  const text = raw.split('=')[0]?.trim() || raw;
  const lower = raw.toLowerCase();
  const variant: KpiStatusVariant = lower.includes('good')
    ? 'Good'
    : lower.includes('low')
      ? 'Low'
      : 'Normal';
  return { text, variant };
}

function withMeta(
  card: Omit<KpiCardModel, 'status' | 'showPercentage'>,
  kpi: RawKpiItem,
): KpiCardModel {
  const scoreValue =
    kpi.kpiKind && typeof kpi.score === 'number' ? `${kpi.score.toFixed(1)}%` : undefined;
  return {
    ...card,
    ...(scoreValue ? { value: scoreValue, suffix: undefined } : {}),
    status: statusFromKpi(kpi),
    showPercentage: Boolean(kpi.showPercentage),
  };
}

export function isAdvancedKpiItem(kpi: RawKpiItem): boolean {
  return Boolean(
    kpi.supportingKpis ||
      kpi.showVisualisation ||
      (kpi.variant === 'advanced' && kpi.visualisation),
  );
}

export function visualisationChartType(kpi: {
  visualisation?: RawKpiVisualisation | null;
}): string | undefined {
  const viz = kpi.visualisation;
  if (!viz || typeof viz !== 'object') return undefined;
  const type = viz.chartType ?? viz.chart_type;
  return typeof type === 'string' && type.trim() ? type.trim() : undefined;
}

/** Map one FuseDash / MCP KPI item to display cards (mirrors KPIComponentWrapper). */
export function extractCardsFromKpi(kpi: RawKpiItem): KpiCardModel[] {
  const column = kpi.column ?? 'value';
  const aggregation = kpi.aggregations ?? 'sum';
  const fieldKey = `${aggregation}_${column}`;
  const dataRow = Array.isArray(kpi.data) ? asRecord(kpi.data[0]) : null;
  if (!dataRow) return [];

  const axisInfo = kpi.axisDetails?.[column];
  const label = valueLabel(axisInfo);
  const type = kpi.type ?? 'single_value';
  const baseId = kpi.id ?? kpi.name ?? column;
  const baseName = kpi.name ?? column;
  const showPct = Boolean(kpi.showPercentage);

  if (type === 'trend' || type === 'overall') {
    const display = formatDisplay(dataRow[fieldKey] ?? dataRow[column]);
    const subtitle = typeof dataRow.subtitle === 'string' ? dataRow.subtitle : undefined;
    return [
      withMeta(
        {
          id: String(baseId),
          name: baseName,
          value: display.value,
          suffix: display.suffix,
          indicator: showPct ? percentLabel(dataRow.percentage) : undefined,
          subtitle,
          label,
        },
        kpi,
      ),
    ];
  }

  if (type === 'comparison') {
    const current = asRecord(dataRow.current);
    const previous = asRecord(dataRow.previous);
    const display = formatDisplay(current?.[fieldKey] ?? current?.[column]);
    const prevRaw = previous?.[fieldKey] ?? previous?.[column];
    const subtitle =
      prevRaw != null && prevRaw !== '' ? `vs ${formatKpiValue(prevRaw as number | string)}` : undefined;
    return [
      withMeta(
        {
          id: String(baseId),
          name: baseName,
          value: display.value,
          suffix: display.suffix,
          indicator: showPct ? percentLabel(dataRow.percentage) : undefined,
          subtitle,
          label,
        },
        kpi,
      ),
    ];
  }

  if (type === 'single_value') {
    const valueBucket = asRecord(dataRow.value) ?? dataRow;
    const raw =
      valueBucket[fieldKey] ?? valueBucket[column] ?? Object.values(valueBucket)[0];
    const display = formatDisplay(raw);
    return [
      withMeta(
        {
          id: String(baseId),
          name: baseName,
          value: display.value,
          suffix: display.suffix,
          indicator: showPct ? percentLabel(dataRow.percentage) : undefined,
          label,
        },
        kpi,
      ),
    ];
  }

  const cards: KpiCardModel[] = [];
  for (const key of Object.keys(dataRow)) {
    if (key === 'percentage' || key === 'value') continue;
    const local = asRecord(dataRow[key]);
    if (!local) continue;
    const subtitle = kpi.groupBy
      ? String(local[kpi.groupBy] ?? key)
      : HIGH_LOW_TYPES.has(type)
        ? key
        : undefined;
    const raw = local[fieldKey] ?? local[column];
    const display = formatDisplay(raw);
    cards.push(
      withMeta(
        {
          id: `${baseId}-${key}`,
          name: baseName,
          value: display.value,
          suffix: display.suffix,
          indicator: showPct ? percentLabel(local.percentage) : undefined,
          subtitle,
          label,
        },
        kpi,
      ),
    );
  }

  return cards;
}
