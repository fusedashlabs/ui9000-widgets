import { describe, expect, it } from 'vitest';

import spatialTrace from '../../../stories/fixtures/spatial.trace.json';
import spatialTraceV2 from '../../../stories/fixtures/spatial.trace.v2.json';
import { normalizeTrace, traceHasRows } from '../lib/index.js';

function model(raw: unknown) {
  const result = normalizeTrace(raw);
  if (!result.ok) throw new Error(`blocked: ${result.blocked}`);
  return result.model;
}

describe('normalizeTrace', () => {
  it('reads the S3-21 spatial trace and leaves the v2-only fields null', () => {
    const trace = model(spatialTrace);

    expect(trace.objective).toBe('spatial');
    expect(trace.profile).toContainEqual({ key: 'hasGeo', value: 'yes' });
    expect(trace.profile).toContainEqual({ key: 'hasTemporal', value: 'no' });
    expect(trace.profile).toContainEqual({ key: 'rowCount', value: '10' });
    expect(trace.profile).toHaveLength(Object.keys(spatialTrace.profile).length);
    expect(trace.candidates).toEqual([
      { id: 'map-chart', score: 15, reasons: spatialTrace.candidates[0].reasons },
    ]);
    expect(trace.rejections).toHaveLength(spatialTrace.rejections.length);
    expect(trace.rejections[0].reason).toBe('Component intents do not include this objective.');
    expect(trace.actions).toEqual(['hover', 'resize']);
    expect(trace.tieBreak).toBe('highest score 15 (map-chart)');

    expect(trace.winner).toBeNull();
    expect(trace.riskBand).toBeNull();
    expect(trace.outcome).toBeNull();
  });

  it('reads winner, risk band and outcome from a v2 trace', () => {
    const trace = model(spatialTraceV2);

    expect(trace.winner).toBe('map-chart');
    expect(trace.riskBand).toBe('low');
    expect(trace.outcome).toBe('rendered');
  });

  it('keeps riskBand closed to the contract enum', () => {
    expect(model({ ...spatialTraceV2, riskBand: 'HIGH' }).riskBand).toBe('high');
    expect(model({ ...spatialTraceV2, riskBand: 'catastrophic' }).riskBand).toBeNull();
  });

  it('refuses a trace carrying dataset rows, however deep', () => {
    expect(normalizeTrace({ ...spatialTrace, rows: [{ region: 'North' }] })).toEqual({
      ok: false,
      blocked: 'Trace must not contain dataset rows',
    });
    expect(
      normalizeTrace({ ...spatialTrace, outcome: { data: [{ region: 'North' }] } }),
    ).toEqual({ ok: false, blocked: 'Trace must not contain dataset rows' });
  });

  it('refuses a non-object and a trace with no objective', () => {
    expect(normalizeTrace(null)).toEqual({ ok: false, blocked: 'Trace required' });
    expect(normalizeTrace([spatialTrace])).toEqual({ ok: false, blocked: 'Trace required' });
    expect(normalizeTrace({ ...spatialTrace, objective: '' })).toEqual({
      ok: false,
      blocked: 'Trace objective required',
    });
  });

  it('drops malformed candidates and rejections instead of throwing', () => {
    const trace = model({
      ...spatialTrace,
      candidates: [{ id: 'table', score: 'high', reasons: ['ok', 7] }, { score: 3 }, null],
      rejections: [{ id: 'text' }, 'nope'],
    });

    expect(trace.candidates).toEqual([{ id: 'table', score: 0, reasons: ['ok'] }]);
    expect(trace.rejections).toEqual([{ id: 'text', reason: 'No reason recorded' }]);
  });
});

describe('traceHasRows', () => {
  it('passes the Storybook fixtures', () => {
    expect(traceHasRows(spatialTrace)).toBe(false);
    expect(traceHasRows(spatialTraceV2)).toBe(false);
  });

  it('finds rows nested in an array', () => {
    expect(traceHasRows({ candidates: [{ id: 'table', data: [{ a: 1 }] }] })).toBe(true);
  });

  it('ignores a non-array value on a row key', () => {
    expect(traceHasRows({ outcome: 'rows: 10', profile: { rowCount: 10 } })).toBe(false);
  });
});
