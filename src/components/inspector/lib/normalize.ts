import {
  TRACE_RISK_BANDS,
  type InspectorModel,
  type NormalizedTrace,
  type TraceCandidate,
  type TraceProfileEntry,
  type TraceRejection,
  type TraceRiskBand,
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
  const model: InspectorModel = {
    objective,
    profile: profileEntries(trace.profile),
    candidates: candidates(trace.candidates),
    winner: text(trace.winner) || null,
    rejections: rejections(trace.rejections),
    actions: stringList(trace.actions),
    ...readRiskBand(trace.riskBand),
    outcome: text(trace.outcome) || null,
    tieBreak: text(trace.tieBreak) || null,
  };
  return { ok: true, model };
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
