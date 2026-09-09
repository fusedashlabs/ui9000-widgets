import { describe, expect, it } from 'vitest';

import { axisFieldLabel, formatValueWithUnit } from './axis-units.js';

describe('formatValueWithUnit', () => {
  it('passes the value through without axis details', () => {
    expect(formatValueWithUnit('12', undefined)).toBe('12');
    expect(formatValueWithUnit(null)).toBe('');
  });

  it('leads with the currency symbol', () => {
    expect(
      formatValueWithUnit('1,500', {
        measure_unit_type: 'currency',
        measure_unit_symbol: '€',
      }),
    ).toBe('€1,500');
  });

  it('scales a 0–1 decimal percentage and appends the unit', () => {
    expect(
      formatValueWithUnit(0.42, {
        measure_unit_type: 'percentage',
        measure_unit_symbol: '%',
      }),
    ).toBe('42.00 %');
  });

  it('leaves an already-scaled percentage alone', () => {
    expect(
      formatValueWithUnit(42, {
        measure_unit_type: 'percentage',
        measure_unit_symbol: '%',
      }),
    ).toBe('42 %');
  });

  it('appends a plain measure unit', () => {
    expect(formatValueWithUnit('9', { measure_unit: 'kg' })).toBe('9 kg');
    expect(formatValueWithUnit('9', { measure_unit: '  ' })).toBe('9');
  });
});

describe('axisFieldLabel', () => {
  it('prefers the declared label over the raw field name', () => {
    expect(axisFieldLabel('md_status', { md_status: { label: 'Status' } })).toBe('Status');
    expect(axisFieldLabel('md_status', {})).toBe('md_status');
    expect(axisFieldLabel('md_status', null)).toBe('md_status');
  });
});
