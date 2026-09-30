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

export const TRACE_CHOOSERS = ['jev', 'engine', 'named'] as const;

export type TraceChooser = (typeof TRACE_CHOOSERS)[number];

/** The chart that was drawn. */
export type TraceChoice = {
  id: string;
  by: TraceChooser;
  why: string;
};

/** Rejections that share one reason, so the panel does not repeat the sentence. */
export type RejectionGroup = {
  reason: string;
  ids: string[];
};

export type TraceRiskItem = {
  action: string;
  band: string;
};

/** Everything the panel renders. Text only — no rows, no markup. */
export type InspectorModel = {
  objective: string;
  profile: TraceProfileEntry[];
  candidates: TraceCandidate[];
  /** Drawn chart. Falls back to the top candidate when the trace has no winner. */
  winner: string | null;
  chosen: TraceChoice | null;
  rejections: TraceRejection[];
  rejectionGroups: RejectionGroup[];
  actions: string[];
  riskBand: TraceRiskBand | null;
  /** Present when the trace sent a riskBand outside low | medium | high. */
  unrecognizedRiskBand: string | null;
  /** Per-action bands from `trace.risk`. */
  risks: TraceRiskItem[];
  outcome: string | null;
  tieBreak: string | null;
};

/** Fail-closed: a trace the panel refuses says why instead of rendering. */
export type NormalizedTrace =
  | { ok: true; model: InspectorModel }
  | { ok: false; blocked: string };
