import { describe, expect, it } from 'vitest';

import { normalizeSparkLineData } from '../../spark-line-chart/lib/index.js';
import sparkAreaFixture from '../../../stories/fixtures/spark-area.fusedash.json';

describe('normalizeSparkLineData (spark area fixture)', () => {
  it('spark-area.fusedash.json → five weather series', () => {
    const series = normalizeSparkLineData(sparkAreaFixture as never);
    expect(series.length).toBe(5);
    expect(series.every((s) => s.points.length === 7)).toBe(true);
    expect(series.map((s) => s.id)).toEqual(
      sparkAreaFixture.uniqueValues.weather_main,
    );
    expect(series[0].color).toBe('#473DD9');
  });
});
