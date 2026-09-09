/**
 * Mirrors client `MatrixChart/utils/sortAxisDomain` — axis categories are
 * ordered by detected type (numbers, dates, weekdays, then locale strings),
 * not by `uniqueValues` order.
 */

const WEEKDAY_ORDER: Record<string, number> = {
  monday: 0,
  mon: 0,
  tuesday: 1,
  tue: 1,
  wednesday: 2,
  wed: 2,
  thursday: 3,
  thu: 3,
  friday: 4,
  fri: 4,
  saturday: 5,
  sat: 5,
  sunday: 6,
  sun: 6,
};

function weekdayIndex(value: string): number {
  const key = value.trim().toLowerCase();
  return key in WEEKDAY_ORDER ? WEEKDAY_ORDER[key] : -1;
}

function isAllNumeric(values: (string | number)[]): boolean {
  return values.every((v) => {
    const n = Number(v);
    return String(v).trim() === '' || Number.isFinite(n);
  });
}

function isAllDates(values: (string | number)[]): boolean {
  return values.every((v) => !Number.isNaN(new Date(v).getTime()));
}

function isAllWeekdays(values: (string | number)[]): boolean {
  return values.every((v) => weekdayIndex(String(v)) >= 0);
}

export function sortAxisDomain(
  values: (string | number)[],
): (string | number)[] {
  const normalized = values.map((v) =>
    typeof v === 'number' ? v : String(v ?? ''),
  );
  if (!normalized.length) return [];

  if (isAllNumeric(normalized)) {
    return [...normalized].sort((a, b) => Number(a) - Number(b));
  }
  if (isAllDates(normalized)) {
    return [...normalized].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );
  }
  if (isAllWeekdays(normalized)) {
    return [...normalized].sort(
      (a, b) => weekdayIndex(String(a)) - weekdayIndex(String(b)),
    );
  }
  return [...normalized].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true }),
  );
}
