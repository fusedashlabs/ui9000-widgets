import {
  TRACE_CHOOSERS,
  TRACE_RISK_BANDS,
  type InspectorModel,
  type NormalizedTrace,
  type RejectionGroup,
  type TraceCandidate,
  type TraceChoice,
  type TraceChooser,
  type TraceProfileEntry,
  type TraceRejection,
  type TraceRiskBand,
  type TraceRiskItem,
} from './types.js';

/** Mirrors `assertTraceHasNoRows` in packages/core — a trace is a decision, never data. */
const ROW_KEYS = new Set(['rows', 'data']);

export function traceHasRows(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(traceHasRows);
  if (!value || typeof value !== 'object') return false;
  for (const [key, child] of Object.entries(value)) {
    if (ROW_KEYS.has(key) && Array.isArray(child)) return true;
    if (traceHasRows(child)) return true;
  }
  return false;
}

export function normalizeTrace(raw: unknown): NormalizedTrace {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, blocked: 'Trace required' };
  }
  if (traceHasRows(raw)) {
    return { ok: false, blocked: 'Trace must not contain dataset rows' };
  }
  const trace = raw as Record<string, unknown>;
  const objective = text(trace.objective);
  if (!objective) {
    return { ok: false, blocked: 'Trace objective required' };
  }
  const listed = candidates(trace.candidates);
  const tieBreak = text(trace.tieBreak) || null;
  const winner = text(trace.winner) || listed[0]?.id || null;
  const model: InspectorModel = {
    objective,
    profile: profileEntries(trace.profile),
    candidates: listed,
    winner,
    chosen: readChoice(trace.chosen, winner, tieBreak, listed[0]?.reasons[0] ?? ''),
    rejections: rejections(trace.rejections),
    rejectionGroups: groupRejections(rejections(trace.rejections)),
    actions: stringList(trace.actions),
    ...readRiskBand(trace.riskBand),
    risks: riskItems(trace.risk),
    outcome: text(trace.outcome) || null,
    tieBreak,
  };
  return { ok: true, model };
}

function readChoice(
  raw: unknown,
  winner: string | null,
  tieBreak: string | null,
  firstReason: string,
): TraceChoice | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const choice = raw as Record<string, unknown>;
    const id = text(choice.id) || winner;
    const by = chooser(choice.by);
    const why = text(choice.why) || tieBreak || firstReason;
    if (id && by) return { id, by, why };
  }
  if (!winner) return null;
  const why = tieBreak || firstReason;
  return { id: winner, by: inferChooser(why), why };
}

function chooser(raw: unknown): TraceChooser | null {
  const value = text(raw);
  return (TRACE_CHOOSERS as readonly string[]).includes(value) ? (value as TraceChooser) : null;
}

function inferChooser(why: string): TraceChooser {
  if (/^Jev selected\b/.test(why)) return 'jev';
  if (/\bYou asked for\b|\bYou selected\b/.test(why)) return 'named';
  return 'engine';
}

function groupRejections(items: TraceRejection[]): RejectionGroup[] {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const ids = groups.get(item.reason) ?? [];
    ids.push(item.id);
    groups.set(item.reason, ids);
  }
  return [...groups.entries()]
    .map(([reason, ids]) => ({ reason, ids }))
    .sort((left, right) => left.ids.length - right.ids.length || left.reason.localeCompare(right.reason));
}

function riskItems(raw: unknown): TraceRiskItem[] {
  if (!Array.isArray(raw)) return [];
  const out: TraceRiskItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const risk = item as Record<string, unknown>;
    const action = text(risk.action);
    const band = text(risk.band);
    if (!action || !band) continue;
    out.push({ action, band });
  }
  return out;
}

function profileEntries(raw: unknown): TraceProfileEntry[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const entries: TraceProfileEntry[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'boolean') entries.push({ key, value: value ? 'yes' : 'no' });
    else if (typeof value === 'number' && Number.isFinite(value)) {
      entries.push({ key, value: String(value) });
    } else if (typeof value === 'string' && value.trim()) {
      entries.push({ key, value: value.trim() });
    }
  }
  return entries;
}

function candidates(raw: unknown): TraceCandidate[] {
  if (!Array.isArray(raw)) return [];
  const out: TraceCandidate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const candidate = item as Record<string, unknown>;
    const id = text(candidate.id);
    if (!id) continue;
    const score = typeof candidate.score === 'number' && Number.isFinite(candidate.score)
      ? candidate.score
      : 0;
    out.push({ id, score, reasons: stringList(candidate.reasons) });
  }
  return out;
}

function rejections(raw: unknown): TraceRejection[] {
  if (!Array.isArray(raw)) return [];
  const out: TraceRejection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const rejection = item as Record<string, unknown>;
    const id = text(rejection.id);
    if (!id) continue;
    out.push({ id, reason: text(rejection.reason) || 'No reason recorded' });
  }
  return out;
}

function readRiskBand(raw: unknown): Pick<InspectorModel, 'riskBand' | 'unrecognizedRiskBand'> {
  const recorded = text(raw);
  if (!recorded) return { riskBand: null, unrecognizedRiskBand: null };
  const band = recorded.toLowerCase();
  if ((TRACE_RISK_BANDS as readonly string[]).includes(band)) {
    return { riskBand: band as TraceRiskBand, unrecognizedRiskBand: null };
  }
  return { riskBand: null, unrecognizedRiskBand: recorded };
}

function stringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(text).filter((value) => value.length > 0);
}

function text(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}
