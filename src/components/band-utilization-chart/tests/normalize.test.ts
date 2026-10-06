import { describe, expect, it } from 'vitest';

import { BAND_WHOLE, normalizeBandUtilization } from '../lib/index.js';
import fixture from '../../../stories/fixtures/band-utilization.json';

describe('normalizeBandUtilization', () => {
  it('reads the widget axes, not a parallel series list', () => {
    const model = normalizeBandUtilization(fixture);
    expect(model.empty).toBe(false);
    expect(model.title).toBe('Band Utilization by Sector');
    expect(model.unit).toBe('Percent (%)');
    expect(model.series.map((item) => item.name)).toEqual(['Low', 'Medium', 'High']);
    expect(model.series.map((item) => item.color)).toEqual(['#473DD9', '#36C4A5', '#FF8C47']);
    expect(model.rows.map((row) => row.label)).toEqual(['A1', 'B1', 'C1', 'C2']);
    expect(model.rows[0].segments.map((segment) => segment.value)).toEqual([22, 48, 30]);
    expect(model.rows[0].segments.map((segment) => segment.text)).toEqual(['22%', '48%', '30%']);
    expect(model.rows.every((row) => row.complete)).toBe(true);
  });

  it('keeps uniqueValues order when the rows arrive in another order', () => {
    const model = normalizeBandUtilization({
      ...fixture,
      data: [...fixture.data].reverse(),
    });
    expect(model.rows.map((row) => row.label)).toEqual(['A1', 'B1', 'C1', 'C2']);
    expect(model.rows[0].segments.map((segment) => segment.name)).toEqual([
      'Low',
      'Medium',
      'High',
    ]);
  });

  it('does not rescale a row that does not sum to 100', () => {
    const model = normalizeBandUtilization({
      ...fixture,
      uniqueValues: { sector: ['E1'], band: ['Low', 'Medium', 'High'] },
      data: [
        { sector: 'E1', band: 'Low', share: 40 },
        { sector: 'E1', band: 'Medium', share: 25 },
        { sector: 'E1', band: 'High', share: 10 },
      ],
    });
    const row = model.rows[0];
    expect(row.sum).toBe(75);
    expect(row.complete).toBe(false);
    expect(row.segments.map((segment) => segment.span)).toEqual([0.4, 0.25, 0.1]);
    const filled = row.segments.reduce((acc, segment) => acc + segment.span, 0);
    expect(filled).toBeCloseTo(75 / BAND_WHOLE);
    expect(filled).not.toBeCloseTo(1);
  });

  it('drops a segment that the data does not contain', () => {
    const model = normalizeBandUtilization({
      ...fixture,
      uniqueValues: { sector: ['A1'], band: ['Low', 'High'] },
      data: [
        { sector: 'A1', band: 'Low', share: 40 },
        { sector: 'A1', band: 'High', share: 60 },
      ],
    });
    expect(model.series.map((item) => item.name)).toEqual(['Low', 'High']);
    expect(model.rows[0].segments.map((segment) => segment.value)).toEqual([40, 60]);
  });

  it('reads a wide row from xAxe plus several yAxe columns', () => {
    const model = normalizeBandUtilization({
      name: 'Band Utilization by Sector',
      xAxe: ['sector'],
      yAxe: ['Low', 'Medium', 'High'],
      axisDetails: {
        Low: {
          label: 'Percent',
          type: 'number',
          subtype: 'percentage',
          measure_unit_symbol: '%',
        },
      },
      data: [{ sector: 'A1', Low: 22, Medium: 48, High: 30 }],
    });
    expect(model.rows[0].segments.map((segment) => segment.value)).toEqual([22, 48, 30]);
    expect(model.unit).toBe('Percent (%)');
  });

  it('keeps a negative share in the sum and gives it no width', () => {
    const model = normalizeBandUtilization({
      yAxe: ['sector'],
      xAxe: ['share'],
      groupBy: ['band'],
      data: [
        { sector: 'E1', band: 'Low', share: 50 },
        { sector: 'E1', band: 'Medium', share: 50 },
        { sector: 'E1', band: 'Adjust', share: -10 },
      ],
    });
    const row = model.rows[0];
    expect(row.sum).toBe(90);
    expect(row.complete).toBe(false);
    const adjust = row.segments.find((segment) => segment.name === 'Adjust');
    expect(adjust?.value).toBe(-10);
    expect(adjust?.span).toBe(0);
    expect(model.series.map((item) => item.name)).toContain('Adjust');
  });

  it('keeps a negative wide column in the sum and gives it no width', () => {
    const model = normalizeBandUtilization({
      xAxe: ['sector'],
      yAxe: ['Low', 'Medium', 'Adjust'],
      data: [{ sector: 'E1', Low: 50, Medium: 50, Adjust: -10 }],
    });
    const row = model.rows[0];
    expect(row.sum).toBe(90);
    expect(row.complete).toBe(false);
    const adjust = row.segments.find((segment) => segment.name === 'Adjust');
    expect(adjust?.value).toBe(-10);
    expect(adjust?.span).toBe(0);
  });

  it('reads a wide column unit from that column, not from the first one', () => {
    const model = normalizeBandUtilization({
      xAxe: ['sector'],
      yAxe: ['Low', 'Medium', 'High'],
      axisDetails: { High: { label: 'Percent', type: 'number', subtype: 'number' } },
      axisLabels: [{ key: 'High', suffix: '%' }],
      data: [{ sector: 'A1', Low: 22, Medium: 48, High: 30 }],
    });
    expect(model.rows[0].segments.map((segment) => segment.text)).toEqual(['22', '48', '30%']);
    expect(model.unit).toBe('Percent (%)');
  });

  it('uses the axisLabels suffix when axisDetails has no unit mark', () => {
    const model = normalizeBandUtilization({
      yAxe: ['sector'],
      xAxe: ['share'],
      groupBy: ['band'],
      axisDetails: { share: { label: 'Percent', type: 'number', subtype: 'number' } },
      axisLabels: [{ key: 'share', suffix: '%' }],
      data: [
        { sector: 'A1', band: 'Low', share: 40 },
        { sector: 'A1', band: 'High', share: 60 },
      ],
    });
    expect(model.unit).toBe('Percent (%)');
    expect(model.rows[0].segments.map((segment) => segment.text)).toEqual(['40%', '60%']);
  });

  it('ignores fields that are not on the widget', () => {
    const model = normalizeBandUtilization({
      ...fixture,
      unit: 'MOCK',
      series: ['Nope'],
      rows: [{ label: 'Z', shares: [1] }],
    });
    expect(model.unit).toBe('Percent (%)');
    expect(model.rows.map((row) => row.label)).toEqual(['A1', 'B1', 'C1', 'C2']);
  });
});
