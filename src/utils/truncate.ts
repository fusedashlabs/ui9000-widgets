/** Mirrors client `truncateString`. */
export function truncateString(
  value: string | number,
  length: number = Infinity,
): string {
  const stringValue = String(value);
  if (!Number.isFinite(length) || length === Infinity) return stringValue;
  if (stringValue.length <= length) return stringValue;
  return `${stringValue.slice(0, length)}...`;
}

/** Max characters that fit a band slot (FuseDash ~0.55× fontSize per char). */
export function maxCharsForSlot(
  slotWidth: number,
  fontSize = 11,
  fallback = 25,
): number {
  if (!Number.isFinite(slotWidth) || slotWidth <= 0) return fallback;
  return Math.max(3, Math.floor(slotWidth / (fontSize * 0.55)));
}

export function effectiveLabelLimit(
  slotWidth: number | undefined,
  maxLength = 25,
  fontSize = 11,
): number {
  if (slotWidth == null) return maxLength;
  return Math.min(maxLength, maxCharsForSlot(slotWidth, fontSize, maxLength));
}

export function isTruncated(full: string, limit: number): boolean {
  return full.length > limit;
}
