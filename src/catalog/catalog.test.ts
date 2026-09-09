import { describe, expect, it } from 'vitest';

import incomplete from './fixtures/incomplete-engine.json';
import engineSchema from './engine-metadata.schema.json';
import {
  ALLOWED_ACTIONS,
  catalogTierOf,
  collectPortMetadata,
  ENGINE_TARGET_IDS,
  evaluateCatalog,
  evalWhen,
  INTENTS,
  loadEngineCatalog,
  missingEngineIds,
} from './index.js';
import { assertEngineMetadata } from './schema.js';

const ENGINE_SPECIFIER = '@ui9000/widgets';

describe('engine catalog loader', () => {
  it('never returns host or substrate ids', () => {
    const ids = new Set(loadEngineCatalog().map((m) => m.id));
    for (const meta of collectPortMetadata()) {
      const tier = catalogTierOf(meta);
      if (tier === 'host' || tier === 'substrate') {
        expect(ids.has(meta.id), `${meta.id} leaked from loader`).toBe(false);
      }
    }
  });

  it('only emits ids from ENGINE_TARGET_IDS', () => {
    const target = new Set<string>(ENGINE_TARGET_IDS);
    for (const meta of loadEngineCatalog()) {
      expect(target.has(meta.id)).toBe(true);
      expect(meta.tier).toBe('engine');
    }
  });

  it('rejects engine metadata without a disqualify reason', () => {
    expect(() => assertEngineMetadata(incomplete, 'fixture')).toThrow(/reason/);
  });

  it('evaluates closed-profile when expressions', () => {
    expect(
      evalWhen(
        'profile.hasCategory && profile.hasNumericMetric && profile.categoryCardinality <= 30',
        { hasCategory: true, hasNumericMetric: true, categoryCardinality: 5 },
      ),
    ).toBe(true);
    expect(
      evalWhen('profile.hasGeo && !profile.hasCategory', {
        hasGeo: true,
        hasCategory: false,
      }),
    ).toBe(true);
    expect(() => evalWhen('profile.unknownFlag', {})).toThrow(/unknown DataProfile key/);
    expect(() => evalWhen('globalThis.alert(1)', {})).toThrow(/disallowed/);
    expect(() => evalWhen('profile.hasCategory()', { hasCategory: true })).toThrow(/calls/);
  });

  it('rejects unknown allowedActions', () => {
    expect(() =>
      assertEngineMetadata(
        {
          ...incomplete,
          disqualify: [{ when: 'profile.hasGeo', reason: 'geo' }],
          allowedActions: ['onclick'],
        },
        'fixture',
      ),
    ).toThrow(/unknown action/);
  });
});

describe('engine catalog completeness', () => {
  it('loads every ENGINE_TARGET_ID', () => {
    const loaded = loadEngineCatalog().map((m) => m.id);
    expect(missingEngineIds(), `missing: ${missingEngineIds().join(', ')}`).toEqual([]);
    expect(loaded).toEqual([...ENGINE_TARGET_IDS]);
  });

  it('evaluates every evalCase against eligibility and disqualify', () => {
    for (const meta of loadEngineCatalog()) {
      expect(meta.evalCases.length).toBeGreaterThanOrEqual(2);
      const statuses = new Set(meta.evalCases.map((c) => c.expect));
      expect(statuses.has('eligible'), `${meta.id} missing eligible case`).toBe(true);
      expect(statuses.has('disqualified'), `${meta.id} missing disqualified case`).toBe(true);
      for (const rule of [...meta.eligibility, ...meta.disqualify]) {
        expect(() => evalWhen(rule.when, {})).not.toThrow();
      }
      for (const testCase of meta.evalCases) {
        const result = evaluateCatalog(meta, testCase.profile);
        expect(result.status, `${meta.id}/${testCase.id}`).toBe(testCase.expect);
        expect(
          result.reason.toLowerCase().includes(testCase.reasonIncludes.toLowerCase()),
          `${meta.id}/${testCase.id}: "${result.reason}" should include "${testCase.reasonIncludes}"`,
        ).toBe(true);
      }
    }
  });

  it('uses one import specifier and the published JSON schema enums', () => {
    expect(engineSchema.properties.intents.items.enum).toEqual([...INTENTS]);
    expect(engineSchema.properties.allowedActions.items.enum).toEqual([...ALLOWED_ACTIONS]);
    expect(engineSchema.required).toEqual(
      expect.arrayContaining([
        'id',
        'tag',
        'tier',
        'intents',
        'eligibility',
        'disqualify',
        'allowedActions',
        'evalCases',
      ]),
    );
    for (const meta of loadEngineCatalog()) {
      expect(meta.entry.startsWith(`${ENGINE_SPECIFIER}/`), meta.entry).toBe(true);
      expect(meta.lazyImport.startsWith(`${ENGINE_SPECIFIER}/lazy/`), meta.lazyImport).toBe(true);
    }
  });
});
