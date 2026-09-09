import { extractCardsFromKpi, isAdvancedKpiItem } from './extract.js';
import type { KpiWidgetData, KpiWidgetModel, RawKpiItem } from './types.js';

const EMPTY: KpiWidgetModel = { layout: 'empty', cards: [], supporting: [] };

function isRawKpiItem(input: unknown): input is RawKpiItem {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) return false;
  const obj = input as Record<string, unknown>;
  if (Array.isArray(obj.items) || Array.isArray(obj.kpis)) return false;
  const nested = obj.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    if (Array.isArray(inner.items) || Array.isArray(inner.kpis)) return false;
  }
  return 'column' in obj || 'type' in obj || Array.isArray(obj.data);
}

function asItemList(input: object): RawKpiItem[] | null {
  const obj = input as {
    items?: unknown;
    kpis?: unknown;
    data?: unknown;
    config?: unknown;
  };
  if (Array.isArray(obj.items) && obj.items.every((row) => row && typeof row === 'object')) {
    return obj.items as RawKpiItem[];
  }
  if (Array.isArray(obj.kpis) && obj.kpis.every((row) => row && typeof row === 'object')) {
    return obj.kpis as RawKpiItem[];
  }
  for (const candidate of [obj.data, obj.config]) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const nested = asItemList(candidate);
    if (nested) return nested;
  }
  return null;
}

function isNormalizedModel(input: object): input is KpiWidgetModel {
  return Array.isArray((input as KpiWidgetModel).cards) && 'layout' in input;
}

/** Client `extractGroupId` — groupName is `{label}-group-kpi-ids-{id}`. */
export function extractGroupId(value?: string | null): string {
  return value?.split('-group-kpi-ids-')?.[0] ?? '';
}

function sortItems(items: RawKpiItem[]): RawKpiItem[] {
  return [...items].sort((a, b) => {
    if (isAdvancedKpiItem(a) && !isAdvancedKpiItem(b)) return -1;
    if (!isAdvancedKpiItem(a) && isAdvancedKpiItem(b)) return 1;
    return 0;
  });
}

function footerFrom(items: RawKpiItem[]): Pick<
  KpiWidgetModel,
  'target' | 'showTimestamp' | 'updatedAt'
> {
  const first = items[0];
  return {
    target: first?.target,
    showTimestamp: first?.showTimestamp,
    updatedAt: first?.updatedAt,
  };
}

function sectionTitle(
  items: RawKpiItem[],
  advanced: boolean,
  topName?: string,
): string | undefined {
  if (advanced) return undefined;
  if (items.length === 1) return items[0]?.name;
  const grouped = extractGroupId(items[0]?.groupName);
  if (grouped) return grouped;
  return topName?.trim() || undefined;
}

function buildFromItems(items: RawKpiItem[], topName?: string): KpiWidgetModel {
  if (!items.length) return EMPTY;
  const sorted = sortItems(items);
  const advancedIndex = sorted.findIndex(isAdvancedKpiItem);
  const advanced = advancedIndex >= 0;
  const footer = footerFrom(sorted);

  if (advanced) {
    const mainItem = sorted[advancedIndex]!;
    const mainCards = extractCardsFromKpi(mainItem);
    const main = mainCards[0];
    const supporting = sorted
      .filter((_, i) => i !== advancedIndex)
      .flatMap((item) => extractCardsFromKpi(item));
    const viz =
      mainItem.visualisation && typeof mainItem.visualisation === 'object'
        ? (mainItem.visualisation as Record<string, unknown>)
        : null;
    return {
      layout: 'advanced',
      title: sectionTitle(sorted, true, topName),
      cards: main ? [main, ...supporting] : supporting,
      main,
      supporting,
      visualisation: viz,
      ...footer,
    };
  }

  const cards = sorted.flatMap((item) => extractCardsFromKpi(item));
  const hideNames = sorted.length === 1 && cards.length >= 1;
  const titledCards = hideNames
    ? cards.map((card) => ({ ...card, hideName: true }))
    : cards;
  const layout: KpiWidgetModel['layout'] =
    titledCards.length === 0 ? 'empty' : titledCards.length === 1 ? 'single' : 'grid';

  return {
    layout,
    title: sectionTitle(sorted, false, topName),
    cards: titledCards,
    supporting: [],
    ...footer,
  };
}

/** Normalize chat / FuseDash KPI payloads into display cards. */
export function normalizeKpiData(input: KpiWidgetData): KpiWidgetModel {
  if (!input) return EMPTY;

  if (Array.isArray(input)) {
    if (!input.length) return EMPTY;
    return buildFromItems(input);
  }

  if (typeof input === 'object') {
    if (isNormalizedModel(input)) return input;
    const topName = typeof (input as { name?: unknown }).name === 'string'
      ? (input as { name: string }).name
      : undefined;
    const items = asItemList(input);
    if (items) return buildFromItems(items, topName);
    if (isRawKpiItem(input)) {
      return buildFromItems([input], topName);
    }
  }

  return EMPTY;
}
