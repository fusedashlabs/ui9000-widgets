import type { DataProfile, EngineMetadata } from './types.js';
import { evalWhen } from './when.js';

export type CatalogMatch = {
  status: 'eligible' | 'disqualified';
  reason: string;
};

/**
 * Fail-closed: the first matching disqualify rule wins, then eligibility.
 * No match → disqualified.
 */
export function evaluateCatalog(meta: EngineMetadata, profile: DataProfile): CatalogMatch {
  for (const rule of meta.disqualify) {
    if (evalWhen(rule.when, profile)) {
      return { status: 'disqualified', reason: rule.reason };
    }
  }
  for (const rule of meta.eligibility) {
    if (evalWhen(rule.when, profile)) {
      return { status: 'eligible', reason: rule.reason };
    }
  }
  return { status: 'disqualified', reason: 'no eligibility rule matched' };
}
