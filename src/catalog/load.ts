import { assertEngineMetadata } from './schema.js';
import { ENGINE_TARGET_ID_SET, ENGINE_TARGET_IDS } from './engine.js';
import type { CatalogTier, EngineMetadata, PortMetadata } from './types.js';

const metadataModules = import.meta.glob('../components/*/metadata.json', {
  eager: true,
});

function unwrap(mod: unknown): PortMetadata {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default: PortMetadata }).default;
  }
  return mod as PortMetadata;
}

/** Every component metadata.json in the package. */
export function collectPortMetadata(): PortMetadata[] {
  return Object.values(metadataModules).map(unwrap);
}

export function catalogTierOf(meta: PortMetadata): CatalogTier {
  if (meta.tier === 'engine' || meta.tier === 'host' || meta.tier === 'substrate') {
    return meta.tier;
  }
  return 'substrate';
}

/**
 * Engine catalog: target ∩ files that pass the engine schema.
 * Incomplete / missing ids are omitted — completeness is the S2-7 test.
 */
export function loadEngineCatalog(): EngineMetadata[] {
  const byId = new Map<string, EngineMetadata>();
  for (const raw of collectPortMetadata()) {
    if (raw.tier !== 'engine') continue;
    if (!ENGINE_TARGET_ID_SET.has(raw.id)) {
      throw new Error(
        `metadata id "${raw.id}" is tier engine but not in ENGINE_TARGET_IDS`,
      );
    }
    const parsed = assertEngineMetadata(raw, raw.id);
    byId.set(parsed.id, parsed);
  }
  return ENGINE_TARGET_IDS.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
}

export function missingEngineIds(): string[] {
  const loaded = new Set(loadEngineCatalog().map((m) => m.id));
  return ENGINE_TARGET_IDS.filter((id) => !loaded.has(id));
}
