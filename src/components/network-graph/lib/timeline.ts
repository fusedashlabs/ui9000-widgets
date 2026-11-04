import type { NetworkGraphModel } from './types.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Room at the ends of a scale with a single date: half a week each side. */
const SINGLE_DATE_ROOM = 3.5 * DAY_MS;
export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function toTime(value: string | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

/** Dates of the nodes and links, each once, earliest first. */
export function getDataDates(data: Pick<NetworkGraphModel, 'nodes' | 'links'>): number[] {
  return Array.from(
    new Set(
      [...data.nodes.map((node) => toTime(node.date)), ...data.links.map((link) => toTime(link.date))].filter(
        (time): time is number => time != null,
      ),
    ),
  ).sort((a, b) => a - b);
}

/** The graph as it stood on `date`: later nodes and links are left out, undated ones stay. */
export function filterGraphByDate<T extends Pick<NetworkGraphModel, 'nodes' | 'links'>>(
  data: T,
  date: number,
): T {
  const visible = (value: string | undefined): boolean => {
    const time = toTime(value);
    return time == null || time <= date;
  };
  const nodes = data.nodes.filter((node) => visible(node.date));
  const ids = new Set(nodes.map((node) => node.id));
  const links = data.links.filter(
    (link) => visible(link.date) && ids.has(link.source) && ids.has(link.target),
  );
  return { ...data, nodes, links };
}

/** The date of `dates` nearest to `time`; the earlier one on a tie. */
export function nearestDate(dates: number[], time: number): number {
  return dates.reduce(
    (best, date) => (Math.abs(date - time) < Math.abs(best - time) ? date : best),
    dates[0],
  );
}

export const yearOf = (time: number): number => new Date(time).getUTCFullYear();

export interface DateScale {
  start: number;
  end: number;
}

/** Scale from the first to the last date, with half a step of room at both ends. */
export function getDateScale(dates: number[]): DateScale {
  const first = dates[0] ?? 0;
  const last = dates[dates.length - 1] ?? first;
  const room = last > first ? (last - first) / (dates.length - 1) / 2 : SINGLE_DATE_ROOM;
  return { start: first - room, end: last + room };
}

/** Position of `time` on the scale, 0 (start) to 1 (end). */
export function getScaleShare(time: number, scale: DateScale): number {
  return Math.min(Math.max((time - scale.start) / (scale.end - scale.start), 0), 1);
}

/** Months the scale covers: where each starts (null for the first) and the middle of its part. */
export function getScaleMonths(
  scale: DateScale,
): Array<{ label: string; share: number | null; middle: number; width: number }> {
  const months: Array<{ label: string; share: number | null; middle: number; width: number }> = [];
  const first = new Date(scale.start);
  let year = first.getUTCFullYear();
  let month = first.getUTCMonth();
  let start = Date.UTC(year, month, 1);
  while (start < scale.end) {
    const next = Date.UTC(year, month + 1, 1);
    const from = Math.max(start, scale.start);
    const to = Math.min(next, scale.end);
    months.push({
      label: MONTHS[month],
      share: start > scale.start ? getScaleShare(start, scale) : null,
      middle: getScaleShare((from + to) / 2, scale),
      width: getScaleShare(to, scale) - getScaleShare(from, scale),
    });
    start = next;
    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
  }
  return months;
}

/** "Jul, 17" */
export function formatTimelineDate(time: number): string {
  const date = new Date(time);
  return `${MONTHS[date.getUTCMonth()]}, ${date.getUTCDate()}`;
}

/** "Jul 20, 2026" */
export function formatPointDate(time: number): string {
  const date = new Date(time);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}
