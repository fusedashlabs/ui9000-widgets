export { ENGINE_TARGET_IDS, ENGINE_TARGET_ID_SET, type EngineTargetId } from './engine.js';
export {
  collectPortMetadata,
  catalogTierOf,
  loadEngineCatalog,
  missingEngineIds,
} from './load.js';
export { assertEngineMetadata, isEngineMetadata } from './schema.js';
export { evalWhen, assertWhenUsesClosedProfile, profileKeysInWhen } from './when.js';
export { evaluateCatalog, type CatalogMatch } from './evaluate.js';
export type {
  AccessibilityBlock,
  AllowedAction,
  CatalogRule,
  CatalogTier,
  DataProfile,
  DataProfileKey,
  DataRole,
  EngineMetadata,
  EvalCase,
  Intent,
  PortMetadata,
} from './types.js';
export { ALLOWED_ACTIONS, CATALOG_TIERS, DATA_PROFILE_KEYS, INTENTS } from './types.js';
