/** Closed intent enum — Stage 3 must not rename these. */
export const INTENTS = [
  'spatial',
  'comparison',
  'summary',
  'form',
  'evidence',
  'graph',
] as const;

export type Intent = (typeof INTENTS)[number];

export const CATALOG_TIERS = ['engine', 'substrate', 'host'] as const;

export type CatalogTier = (typeof CATALOG_TIERS)[number];

/** Closed action types declared in engine metadata — not JS handler names. */
export const ALLOWED_ACTIONS = [
  'hover',
  'resize',
  'select',
  'submit',
  'approve',
  'reject',
  'pan',
  'zoom',
  'drag',
  'filter',
] as const;

export type AllowedAction = (typeof ALLOWED_ACTIONS)[number];

/** Closed DataProfile keys — evalCases.profile and `when` strings may use only these. */
export const DATA_PROFILE_KEYS = [
  'hasCategory',
  'hasNumericMetric',
  'categoryCardinality',
  'hasGeo',
  'hasTemporal',
  'hasNodes',
  'hasLinks',
  'hasTabularRows',
  'rowCount',
  'hasEntityId',
  'hasClaim',
  'hasEvents',
  'controlCount',
  'allControlsLabelled',
  'hasMapToken',
] as const;

export type DataProfileKey = (typeof DATA_PROFILE_KEYS)[number];

export type DataProfile = {
  hasCategory?: boolean;
  hasNumericMetric?: boolean;
  categoryCardinality?: number;
  hasGeo?: boolean;
  hasTemporal?: boolean;
  hasNodes?: boolean;
  hasLinks?: boolean;
  hasTabularRows?: boolean;
  rowCount?: number;
  hasEntityId?: boolean;
  hasClaim?: boolean;
  hasEvents?: boolean;
  controlCount?: number;
  allControlsLabelled?: boolean;
  hasMapToken?: boolean;
};

export type DataRole = {
  id: string;
  required: boolean;
  description: string;
  cardinality?: string;
  type?: string;
};

export type CatalogRule = {
  when: string;
  reason: string;
};

export type AccessibilityBlock = {
  nameFrom: string;
  keyboard: string[];
  shadowBoundary: string;
};

export type EvalCase = {
  id: string;
  intent: Intent;
  profile: DataProfile;
  expect: 'eligible' | 'disqualified';
  reasonIncludes: string;
};

export type EngineMetadata = {
  id: string;
  tag: string;
  title: string;
  description: string;
  entry: string;
  lazyImport: string;
  propsSchema: Record<string, unknown>;
  tier: 'engine';
  intents: Intent[];
  dataRoles: DataRole[];
  eligibility: CatalogRule[];
  disqualify: CatalogRule[];
  allowedActions: AllowedAction[];
  accessibility: AccessibilityBlock;
  evalCases: EvalCase[];
  chartTypeKeys?: string[];
  source?: string;
  stack?: string;
  usageConditions?: Record<string, unknown>;
};

export type PortMetadata = {
  id: string;
  tag: string;
  title?: string;
  description?: string;
  entry?: string;
  lazyImport?: string;
  tier?: CatalogTier;
  [key: string]: unknown;
};
