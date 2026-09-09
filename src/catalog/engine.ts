/**
 * Frozen Stage 2 engine catalog.
 * Close-out tables list 20 ids (plan prose said 19). Do not add a 21st
 * without removing another. Completeness is asserted in catalog.test.ts.
 */
export const ENGINE_TARGET_IDS = [
  'network-graph',
  'map-chart',
  'kpi-widget',
  'bar-chart',
  'histogram-chart',
  'table',
  'text',
  'image',
  'event-timeline',
  'evidence-panel',
  'entity-detail',
  'text-input',
  'number-input',
  'select',
  'multi-select',
  'checkbox',
  'date-input',
  'button',
  'form',
  'approval-bar',
] as const;

export type EngineTargetId = (typeof ENGINE_TARGET_IDS)[number];

export const ENGINE_TARGET_ID_SET = new Set<string>(ENGINE_TARGET_IDS);
