import type { UniversalFormattingInput } from './types.js';

/**
 * Derives the list of keys used for formatting/markers from groupBy, uniqueValues, or data.
 * Single source of truth for all chart tools (ported from mcp-ui).
 */
export function getFormattingKeys(input: UniversalFormattingInput): string[] {
  const { chartType, groupByField, uniqueValues, data, xAxeField } = input;
  const uv = uniqueValues ?? {};
  const dataArr = Array.isArray(data) ? data : [];

  if (chartType === 'parallelCoordinatesChart') {
    return ['defaultMin', 'defaultMax'];
  }

  if (groupByField && uv[groupByField]?.length) {
    return uv[groupByField].filter((k) => String(k).trim().length > 0);
  }

  if (
    (chartType === 'pieChart' || chartType === 'donutChart') &&
    xAxeField
  ) {
    if (uv[xAxeField]?.length) {
      return uv[xAxeField].filter((k) => String(k).trim().length > 0);
    }
    if (dataArr.length) {
      const set = new Set(
        dataArr.map((row) => String(row[xAxeField] ?? '').trim()).filter(Boolean),
      );
      return Array.from(set);
    }
  }

  if (groupByField && dataArr.length) {
    const set = new Set(
      dataArr.map((row) => String(row[groupByField!] ?? '').trim()).filter(Boolean),
    );
    return Array.from(set);
  }

  const firstKey = Object.keys(uv)[0];
  if (firstKey && uv[firstKey]?.length) {
    return uv[firstKey].filter((k) => String(k).trim().length > 0);
  }

  return [];
}
