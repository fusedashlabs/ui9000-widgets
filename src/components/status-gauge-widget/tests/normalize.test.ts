import { describe, expect, it } from 'vitest';

import { normalizeStatusGauge } from '../lib/normalize.js';
import antenna from '../../../stories/fixtures/status-gauge.mock.json';

describe('normalizeStatusGauge', () => {
  it('reads the gauge row and the remaining cards from WidgetItem data', () => {
    const model = normalizeStatusGauge(antenna);
    expect(model.title).toBe('Active Antenna Unit');
    expect(model.subtitle).toBe('Internal Component View');
    expect(model.gauge?.key).toBe('unitHealth');
    expect(model.gauge?.label).toBe('Unit Health');
    expect(model.gauge?.unit).toBe('%');
    expect(model.gauge?.status).toBe('Degraded');
    expect(model.gauge?.level).toBe('warning');
    expect(model.gauge?.ratio).toBeCloseTo(0.728);
    expect(model.metrics.map((row) => row.key)).toEqual([
      'txPower',
      'temp',
      'vswr',
      'avgLatency',
    ]);
    expect(model.metrics[0]?.label).toBe('Tx Power');
    expect(model.metrics[0]?.unit).toBe('dBm');
  });

  it('treats every extra data row as another card', () => {
    const model = normalizeStatusGauge({
      ...antenna,
      data: [
        ...antenna.data,
        { key: 'uptime', value: 99.2, level: 'ok', min: 0, max: 100 },
        { key: 'alarms', value: 3, level: 'critical', min: 0, max: 10 },
      ],
      axisDetails: {
        ...antenna.axisDetails,
        uptime: { label: 'Uptime', measure_unit: '%' },
        alarms: { label: 'Alarms', measure_unit: '' },
      },
    });
    expect(model.metrics).toHaveLength(6);
    expect(model.metrics.at(-1)?.label).toBe('Alarms');
  });

  it('uses the first row as the gauge when no role is set', () => {
    const model = normalizeStatusGauge({
      name: 'Pump',
      data: [
        { key: 'health', value: 40, min: 0, max: 100 },
        { key: 'flow', value: 12, min: 0, max: 20 },
      ],
    });
    expect(model.gauge?.key).toBe('health');
    expect(model.metrics.map((row) => row.key)).toEqual(['flow']);
    expect(model.metrics[0]?.ratio).toBeCloseTo(0.6);
  });

  it('derives the bar when ratio is omitted and keeps an explicit ratio', () => {
    const model = normalizeStatusGauge({
      data: [
        { key: 'health', role: 'gauge', value: 10, min: 0, max: 50 },
        { key: 'a', value: 5, min: 0, max: 10 },
        { key: 'b', value: 1, ratio: 0.25, min: 0, max: 10 },
      ],
    });
    expect(model.gauge?.ratio).toBeCloseTo(0.2);
    expect(model.metrics[0]?.ratio).toBeCloseTo(0.5);
    expect(model.metrics[1]?.ratio).toBeCloseTo(0.25);
  });

  it('draws cards only when every row is a metric', () => {
    const model = normalizeStatusGauge({
      name: 'Shelf',
      data: [
        { key: 'load', role: 'metric', value: 64, min: 0, max: 100 },
        { key: 'temp', role: 'metric', value: 41, min: 0, max: 90 },
      ],
    });
    expect(model.gauge).toBeNull();
    expect(model.empty).toBe(false);
    expect(model.metrics.map((row) => row.key)).toEqual(['load', 'temp']);
  });

  it('is empty when data has no numeric rows', () => {
    expect(normalizeStatusGauge({ name: 'Empty', data: [] }).empty).toBe(true);
    expect(normalizeStatusGauge(null).empty).toBe(true);
  });
});
