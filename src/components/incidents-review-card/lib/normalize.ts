import { formatIncidentCount, formatIncidentCountFull, isDistanceLabel } from './format.js';
import type {
  IncidentsReviewCount,
  IncidentsReviewCountInput,
  IncidentsReviewFilter,
  IncidentsReviewModel,
  IncidentsReviewPayload,
  IncidentsReviewTone,
  IncidentsReviewTotal,
} from './types.js';

const TONES = new Set<IncidentsReviewTone>(['green', 'red', 'amber', 'blue', 'violet', 'grey']);
const TONE_ALIASES: Record<string, IncidentsReviewTone> = {
  ok: 'green',
  success: 'green',
  critical: 'red',
  error: 'red',
  danger: 'red',
  warning: 'amber',
  info: 'blue',
  neutral: 'grey',
  gray: 'grey',
};
/** Figma order: Active green, In progress red, then the rest. */
const TONE_ORDER: IncidentsReviewTone[] = ['green', 'red', 'amber', 'blue', 'violet'];
const SCALE_KINDS = new Set(['radius', 'distance', 'proximity']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function readTone(value: unknown, index: number): IncidentsReviewTone {
  const name = text(value).toLowerCase();
  if (TONES.has(name as IncidentsReviewTone)) return name as IncidentsReviewTone;
  return TONE_ALIASES[name] ?? TONE_ORDER[index % TONE_ORDER.length]!;
}

/** A number formats; any other non-empty cell prints as given. */
function readValue(raw: unknown): { value: number | null; display: string; full: string } | null {
  const value = num(raw);
  if (value !== undefined) {
    return { value, display: formatIncidentCount(value), full: formatIncidentCountFull(value) };
  }
  const shown = text(raw);
  return shown ? { value: null, display: shown, full: shown } : null;
}

function readFilter(input: unknown): IncidentsReviewFilter | null {
  if (!isRecord(input)) {
    const label = text(input);
    return label ? { label, scale: isDistanceLabel(label) } : null;
  }
  const value = text(input.value);
  const unit = text(input.unit);
  const label = text(input.label) || [value, unit].filter(Boolean).join(' ');
  if (!label) return null;
  const kind = text(input.kind).toLowerCase();
  return { label, scale: kind ? SCALE_KINDS.has(kind) : isDistanceLabel(label) };
}

function readCounts(input: unknown): IncidentsReviewCount[] {
  if (!Array.isArray(input)) return [];
  const counts: IncidentsReviewCount[] = [];
  for (const entry of input) {
    if (!isRecord(entry)) continue;
    const item = entry as IncidentsReviewCountInput;
    const value = readValue(item.value ?? item.count);
    const label = text(item.label) || text(item.state);
    if (!value || !label) continue;
    counts.push({ label, ...value, tone: readTone(item.tone, counts.length) });
  }
  return counts;
}

function readTotal(input: unknown): IncidentsReviewTotal | null {
  const total = isRecord(input) ? input : { value: input };
  const value = readValue(total.value);
  return value ? { label: text(total.label) || 'Total', ...value } : null;
}

/**
 * Incidents payload → card model. Counts are headlines: nothing is summed or
 * checked against the total. Invalid input yields an empty model, never a throw.
 */
export function normalizeIncidentsReview(input: unknown): IncidentsReviewModel {
  const payload: IncidentsReviewPayload = isRecord(input) ? (input as IncidentsReviewPayload) : {};
  const title = text(payload.title);
  const counts = readCounts(payload.counts);
  const total = readTotal(payload.total);
  const track = typeof payload.track === 'boolean' ? payload.track : counts.length >= 2;

  return {
    title,
    filter: readFilter(payload.filter),
    counts,
    total,
    track: track && counts.length > 0,
    empty: counts.length === 0 && !total,
  };
}
