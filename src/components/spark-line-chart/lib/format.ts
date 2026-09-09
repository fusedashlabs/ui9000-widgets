import { formatCompactNumber } from '../../../utils/fusedash-visual.js';

export function formatCompact(value: number): string {
  const decimals = Number.isInteger(value) && Math.abs(value) < 1000 ? 0 : 2;
  return formatCompactNumber(value, decimals);
}

/** Chat stand-in for FuseDash `formatDatetimeTypeLabel`. */
export function makeDateLabelFormatter(dates: Date[]): (date: Date) => string {
  const years = new Set(dates.map((d) => d.getFullYear()));
  const hasTime = dates.some(
    (d) => d.getHours() || d.getMinutes() || d.getSeconds(),
  );

  const dateOpts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    ...(years.size > 1 ? { year: 'numeric' } : {}),
  };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

  return (date: Date) => {
    const datePart = date.toLocaleDateString(undefined, dateOpts);
    return hasTime ? `${datePart} ${date.toLocaleTimeString(undefined, timeOpts)}` : datePart;
  };
}

export function selectTickIndices(
  labels: string[],
  positions: number[],
  charWidth = 6.2,
  gap = 8,
): number[] {
  const n = labels.length;
  if (n <= 1) return n === 1 ? [0] : [];

  const extent = (i: number): [number, number] => {
    const w = labels[i].length * charWidth;
    const x = positions[i];
    if (i === 0) return [x, x + w];
    if (i === n - 1) return [x - w, x];
    return [x - w / 2, x + w / 2];
  };

  const kept: number[] = [];
  let prevRight = -Infinity;
  for (let i = 0; i < n - 1; i++) {
    if (!Number.isFinite(positions[i])) continue;
    const [left, right] = extent(i);
    if (left >= prevRight + gap) {
      kept.push(i);
      prevRight = right;
    }
  }

  if (!Number.isFinite(positions[n - 1])) return kept;

  const [lastLeft] = extent(n - 1);
  while (kept.length && extent(kept[kept.length - 1])[1] + gap > lastLeft) {
    kept.pop();
  }
  kept.push(n - 1);

  return kept;
}
