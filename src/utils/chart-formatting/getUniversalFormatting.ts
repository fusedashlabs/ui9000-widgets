import { getFormattingKeys } from './getFormattingKeys.js';
import type {
  ChartFormattingItem,
  UniversalFormattingInput,
} from './types.js';

const DEFAULT_FORMATTING: ChartFormattingItem[] = [
  { key: 'default', color: '1' },
];

function isSameFormatting(
  existing: { key: string }[],
  keys: string[],
): boolean {
  if (!Array.isArray(existing) || existing.length !== keys.length) {
    return false;
  }
  const existingKeys = new Set(existing.map((e) => e.key));
  return keys.every((k) => existingKeys.has(k));
}

/**
 * Returns formatting (key + color index 1–12) for a chart.
 * Uses groupBy/uniqueValues/data from input; preserves existingFormatting when keys match.
 */
export function getUniversalFormatting(
  input: UniversalFormattingInput,
): ChartFormattingItem[] {
  const keys = getFormattingKeys(input);

  if (keys.length === 0) {
    return DEFAULT_FORMATTING;
  }

  const existing = input.existingFormatting;
  if (existing?.length && isSameFormatting(existing, keys)) {
    return existing;
  }

  return keys.map((key, index) => ({
    key,
    color: String((index % 12) + 1),
  }));
}
