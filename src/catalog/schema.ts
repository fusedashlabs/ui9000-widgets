import {
  ALLOWED_ACTIONS,
  INTENTS,
  type AllowedAction,
  type DataProfile,
  type EngineMetadata,
  type EvalCase,
  type Intent,
} from './types.js';
import { assertProfileUsesClosedKeys, assertWhenUsesClosedProfile } from './when.js';

const INTENT_SET = new Set<string>(INTENTS);
const ACTION_SET = new Set<string>(ALLOWED_ACTIONS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`);
}

function requireString(obj: Record<string, unknown>, key: string, path: string): string {
  const value = asString(obj[key]);
  if (!value) fail(`${path}.${key}`, 'required non-empty string');
  return value;
}

function requireArray(obj: Record<string, unknown>, key: string, path: string): unknown[] {
  const value = obj[key];
  if (!Array.isArray(value)) fail(`${path}.${key}`, 'required array');
  return value;
}

/** Validate engine metadata. Throws with a path if incomplete. */
export function assertEngineMetadata(raw: unknown, path = 'metadata'): EngineMetadata {
  if (!isRecord(raw)) fail(path, 'expected object');
  if (raw.tier !== 'engine') fail(`${path}.tier`, 'must be "engine"');

  const id = requireString(raw, 'id', path);
  const tag = requireString(raw, 'tag', path);
  if (!tag.startsWith('ui9000-')) fail(`${path}.tag`, 'must start with ui9000-');

  const intentsRaw = requireArray(raw, 'intents', path);
  if (!intentsRaw.length) fail(`${path}.intents`, 'minItems 1');
  const intents: Intent[] = intentsRaw.map((item, i) => {
    if (typeof item !== 'string' || !INTENT_SET.has(item)) {
      fail(`${path}.intents[${i}]`, `unknown intent ${String(item)}`);
    }
    return item as Intent;
  });

  const dataRoles = requireArray(raw, 'dataRoles', path).map((item, i) => {
    if (!isRecord(item)) fail(`${path}.dataRoles[${i}]`, 'expected object');
    const rolePath = `${path}.dataRoles[${i}]`;
    if (typeof item.required !== 'boolean') fail(`${rolePath}.required`, 'boolean');
    return {
      id: requireString(item, 'id', rolePath),
      required: item.required,
      description: requireString(item, 'description', rolePath),
      cardinality: typeof item.cardinality === 'string' ? item.cardinality : undefined,
      type: typeof item.type === 'string' ? item.type : undefined,
    };
  });
  if (!dataRoles.length) fail(`${path}.dataRoles`, 'minItems 1');

  const eligibility = requireArray(raw, 'eligibility', path).map((item, i) => {
    if (!isRecord(item)) fail(`${path}.eligibility[${i}]`, 'expected object');
    const rulePath = `${path}.eligibility[${i}]`;
    const when = requireString(item, 'when', rulePath);
    const reason = requireString(item, 'reason', rulePath);
    assertWhenUsesClosedProfile(when);
    return { when, reason };
  });
  if (!eligibility.length) fail(`${path}.eligibility`, 'minItems 1');

  const disqualify = requireArray(raw, 'disqualify', path).map((item, i) => {
    if (!isRecord(item)) fail(`${path}.disqualify[${i}]`, 'expected object');
    const rulePath = `${path}.disqualify[${i}]`;
    const when = requireString(item, 'when', rulePath);
    const reason = requireString(item, 'reason', rulePath);
    assertWhenUsesClosedProfile(when);
    return { when, reason };
  });
  if (!disqualify.length) fail(`${path}.disqualify`, 'minItems 1');
  for (const rule of disqualify) {
    if (!rule.reason.trim()) fail(`${path}.disqualify`, 'reason required');
  }

  const allowedActions = requireArray(raw, 'allowedActions', path).map((item, i) => {
    if (typeof item !== 'string' || !ACTION_SET.has(item)) {
      fail(`${path}.allowedActions[${i}]`, `unknown action ${String(item)}`);
    }
    return item as AllowedAction;
  });

  if (!isRecord(raw.accessibility)) fail(`${path}.accessibility`, 'required object');
  const accessibility = {
    nameFrom: requireString(raw.accessibility, 'nameFrom', `${path}.accessibility`),
    keyboard: Array.isArray(raw.accessibility.keyboard)
      ? raw.accessibility.keyboard.map((k, i) => {
          if (typeof k !== 'string') fail(`${path}.accessibility.keyboard[${i}]`, 'string');
          return k;
        })
      : fail(`${path}.accessibility.keyboard`, 'required array'),
    shadowBoundary: requireString(raw.accessibility, 'shadowBoundary', `${path}.accessibility`),
  };

  const evalCases = requireArray(raw, 'evalCases', path).map((item, i) => {
    if (!isRecord(item)) fail(`${path}.evalCases[${i}]`, 'expected object');
    const casePath = `${path}.evalCases[${i}]`;
    const intent = requireString(item, 'intent', casePath);
    if (!INTENT_SET.has(intent)) fail(`${casePath}.intent`, `unknown intent ${intent}`);
    const expect = item.expect;
    if (expect !== 'eligible' && expect !== 'disqualified') {
      fail(`${casePath}.expect`, 'eligible | disqualified');
    }
    if (!isRecord(item.profile)) fail(`${casePath}.profile`, 'required object');
    assertProfileUsesClosedKeys(item.profile as DataProfile);
    const evalCase: EvalCase = {
      id: requireString(item, 'id', casePath),
      intent: intent as Intent,
      profile: item.profile as DataProfile,
      expect,
      reasonIncludes: requireString(item, 'reasonIncludes', casePath),
    };
    return evalCase;
  });
  if (evalCases.length < 2) fail(`${path}.evalCases`, 'minItems 2');

  if (!isRecord(raw.propsSchema)) fail(`${path}.propsSchema`, 'required object');

  return {
    id,
    tag,
    title: requireString(raw, 'title', path),
    description: typeof raw.description === 'string' ? raw.description : '',
    entry: requireString(raw, 'entry', path),
    lazyImport: requireString(raw, 'lazyImport', path),
    propsSchema: raw.propsSchema,
    tier: 'engine',
    intents,
    dataRoles,
    eligibility,
    disqualify,
    allowedActions,
    accessibility,
    evalCases,
    chartTypeKeys: Array.isArray(raw.chartTypeKeys)
      ? raw.chartTypeKeys.filter((k): k is string => typeof k === 'string')
      : undefined,
    source: typeof raw.source === 'string' ? raw.source : undefined,
    stack: typeof raw.stack === 'string' ? raw.stack : undefined,
    usageConditions: isRecord(raw.usageConditions) ? raw.usageConditions : undefined,
  };
}

export function isEngineMetadata(raw: unknown): raw is EngineMetadata {
  try {
    assertEngineMetadata(raw);
    return true;
  } catch {
    return false;
  }
}
