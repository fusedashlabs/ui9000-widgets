import { describe, expect, it } from 'vitest';

import figma from '../../../stories/fixtures/power-path.figma.json';
import { formatPowerPathMeasure, normalizePowerPath } from '../lib/index.js';

describe('normalizePowerPath', () => {
  it('reads the Figma sample', () => {
    const model = normalizePowerPath(figma);

    expect(model.title).toBe('Sector 1 Power Path');
    expect(model.badge).toBe('5G-TX-303');
    expect(model.health).toMatchObject({
      label: 'Electricity Health',
      value: 69.9,
      display: '69.9%',
      level: 'critical',
    });
    expect(model.health?.points).toHaveLength(13);
    expect(model.fault).toEqual({
      level: 'critical',
      text: 'Critical fault detected · Circuit L2 · RF Line 3 · Downtime 24 sec',
    });
    expect(model.metrics.map((m) => [m.label, m.display, m.status?.label, m.status?.level])).toEqual([
      ['Input Voltage', '48.1 V', 'Stable', 'ok'],
      ['Output Voltage', '36.4 V', 'Critical', 'critical'],
      ['Current Draw', '18.7 A', 'Critical', 'critical'],
      ['Power Loss', '24.3%', 'High', 'warning'],
      ['Connector Temperature', '63°C', 'Critical', 'critical'],
    ]);
    expect(model.empty).toBe(false);
  });

  it('never invents a health score', () => {
    const { health: _health, ...rest } = figma;
    void _health;
    expect(normalizePowerPath(rest).health).toBeNull();
    expect(normalizePowerPath({ ...figma, health: { label: 'Electricity Health', points: [1, 2] } }).health).toBeNull();
  });

  it('keeps the score when points are missing', () => {
    const model = normalizePowerPath({ ...figma, health: { value: 69.9 } });
    expect(model.health?.display).toBe('69.9%');
    expect(model.health?.points).toEqual([]);
  });

  it('shows a fault only while it is active', () => {
    expect(normalizePowerPath({ ...figma, fault: null }).fault).toBeNull();
    expect(normalizePowerPath({ ...figma, fault: { ...figma.fault, active: false } }).fault).toBeNull();
    expect(normalizePowerPath({ ...figma, fault: { message: ' ', details: [] } }).fault).toBeNull();
    expect(normalizePowerPath({ ...figma, fault: 'Breaker tripped' }).fault).toEqual({
      level: 'critical',
      text: 'Breaker tripped',
    });
    expect(
      normalizePowerPath({ ...figma, fault: { level: 'warning', message: 'Fan degraded' } }).fault?.level,
    ).toBe('warning');
  });

  it('shows a status only when the metric has a level, status or thresholds', () => {
    const model = normalizePowerPath({
      data: [
        { label: 'Module Count', value: 6 },
        { label: 'Load Current', value: 41.8, unit: 'A', thresholds: { warning: 40, critical: 48 } },
        { label: 'Bus Voltage', value: 48.5, unit: 'V', thresholds: { warning: 51, critical: 49, direction: 'below' } },
        { label: 'Temp', value: 20, thresholds: { warning: 35 } },
        { label: 'Ripple', value: 2, status: 'Elevated' },
        { label: 'Breaker', value: 'Open', level: 'critical' },
      ],
    });
    expect(model.metrics.map((m) => m.status)).toEqual([
      null,
      { label: 'High', level: 'warning' },
      { label: 'Critical', level: 'critical' },
      { label: 'Stable', level: 'ok' },
      { label: 'Elevated', level: 'warning' },
      { label: 'Critical', level: 'critical' },
    ]);
    expect(model.metrics[5]?.display).toBe('Open');
  });

  it('colours the health from the worst row when it has no level', () => {
    const model = normalizePowerPath({
      health: { value: 91 },
      data: [
        { label: 'A', value: 1, level: 'ok' },
        { label: 'B', value: 2, status: 'High' },
      ],
    });
    expect(model.health?.level).toBe('warning');
  });

  it('drops rows without a label or value and survives junk', () => {
    expect(normalizePowerPath({ data: [{ label: 'A' }, { value: 3 }, null, 'x'] }).metrics).toEqual([]);
    for (const junk of [null, undefined, 3, 'text', [], { data: 'nope' }]) {
      expect(normalizePowerPath(junk).empty).toBe(true);
    }
  });
});

describe('formatPowerPathMeasure', () => {
  it('spaces units except % and degrees', () => {
    expect(formatPowerPathMeasure(48.1, 'V')).toBe('48.1 V');
    expect(formatPowerPathMeasure(24.3, '%')).toBe('24.3%');
    expect(formatPowerPathMeasure(63, '°C')).toBe('63°C');
    expect(formatPowerPathMeasure(1.23456, '')).toBe('1.23');
  });
});
