function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Accept a widget, or a data-link envelope whose `data` is the widget. */
export function widgetFromPastedJson(text: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) {
    throw new Error('JSON must be an object.');
  }
  const inner = parsed.data;
  if (
    !parsed.chartType &&
    isRecord(inner) &&
    (typeof inner.chartType === 'string' || Array.isArray(inner.data))
  ) {
    return inner;
  }
  return parsed;
}
