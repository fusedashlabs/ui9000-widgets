/**
 * Shapes the inspector renders, per `trace.v2.json` in this folder.
 * S4-03 publishes the real trace shape; until then that contract is the source
 * of truth and v1 traces (no winner / riskBand / outcome) still render.
 */

export const TRACE_RISK_BANDS = ['low', 'medium', 'high'] as const;

export type TraceRiskBand = (typeof TRACE_RISK_BANDS)[number];

export type TraceCandidate = {
  id: string;
  score: number;
  reasons: string[];
};

export type TraceRejection = {
  id: string;
  reason: string;
};

/** One closed-profile key with its value already formatted for display. */
export type TraceProfileEntry = {
  key: string;
  value: string;
};

/** Everything the panel renders. Text only — no rows, no markup. */
export type InspectorModel = {
  objective: string;
  profile: TraceProfileEntry[];
  candidates: TraceCandidate[];
  winner: string | null;
  rejections: TraceRejection[];
  actions: string[];
  riskBand: TraceRiskBand | null;
  /** Present when the trace sent a riskBand outside low | medium | high. */
  unrecognizedRiskBand: string | null;
  outcome: string | null;
  tieBreak: string | null;
};

/** Fail-closed: a trace the panel refuses says why instead of rendering. */
export type NormalizedTrace =
  | { ok: true; model: InspectorModel }
  | { ok: false; blocked: string };
