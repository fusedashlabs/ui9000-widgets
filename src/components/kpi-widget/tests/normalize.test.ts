import { describe, expect, it } from 'vitest';

import { formatKpiValue, splitFormattedKpiValue } from '../lib/format.js';
import {
  getAdvancedSplitLayout,
  getKpiGridColumns,
  getKpiGridScrollAxis,
} from '../lib/grid.js';
import { extractGroupId, normalizeKpiData } from '../lib/normalize.js';

import kpisFixture from '../../../stories/fixtures/kpis.fusedash.json';
import kpiHighLowFixture from '../../../stories/fixtures/kpi-high-low.fusedash.json';
import kpiSingleFixture from '../../../stories/fixtures/kpi-single.fusedash.json';
import kpiTrendFixture from '../../../stories/fixtures/kpi-trend.fusedash.json';
import kpiComparisonFixture from '../../../stories/fixtures/kpi-comparison.fusedash.json';
import kpiAdvancedLineFixture from '../../../stories/fixtures/kpi-advanced-line.fusedash.json';

describe('formatKpiValue', () => {
  it('formats compact numbers', () => {
    expect(formatKpiValue(11137)).toBe('11.14K');
  });

  it('returns em dash for invalid values', () => {
    expect(formatKpiValue('n/a')).toBe('—');
  });

  it('splits scientific notation', () => {
    const formatted = formatKpiValue(0.00042);
    expect(formatted).toContain('×10⁻');
    const split = splitFormattedKpiValue(formatted);
    expect(split.suffix.startsWith('×10⁻')).toBe(true);
    expect(split.value).not.toContain('×10⁻');
  });
});

describe('normalizeKpiData', () => {
  it('kpis.fusedash.json → four single_value cards', () => {
    const model = normalizeKpiData(kpisFixture as never);
    expect(model.layout).toBe('grid');
    expect(model.cards.length).toBe(4);
    expect(model.cards[0].name).toBe('Total Check-ins');
    expect(model.cards[0].value).toBe('11.14K');
  });

  it('kpi-high-low.fusedash.json → high and low cards', () => {
    const model = normalizeKpiData(kpiHighLowFixture as never);
    expect(model.layout).toBe('grid');
    expect(model.cards.length).toBe(2);
    expect(model.cards.map((c) => c.subtitle)).toEqual(['2491', '2733']);
    expect(model.cards[0].value).toBe('5');
    expect(model.cards[1].value).toBe('1.5');
  });

  it('single_value → single layout with section title', () => {
    const model = normalizeKpiData(kpiSingleFixture as never);
    expect(model.layout).toBe('single');
    expect(model.title).toBe('Total Check-ins');
    expect(model.cards[0]?.hideName).toBe(true);
  });

  it('trend with showPercentage → indicator', () => {
    const model = normalizeKpiData(kpiTrendFixture as never);
    expect(model.layout).toBe('single');
    expect(model.cards[0]?.indicator).toBe('12.40%');
    expect(model.cards[0]?.showPercentage).toBe(true);
  });

  it('comparison → current value vs previous subtitle', () => {
    const model = normalizeKpiData(kpiComparisonFixture as never);
    expect(model.cards[0]?.value).toBe('1.84K');
    expect(model.cards[0]?.subtitle).toMatch(/^vs /);
    expect(model.cards[0]?.indicator).toBe('21.69%');
  });

  it('currency axis → unit on the left', () => {
    const model = normalizeKpiData({
      type: 'single_value',
      column: 'revenue',
      name: 'Revenue',
      aggregations: 'sum',
      axisDetails: {
        revenue: { measure_unit_type: 'currency', measure_unit_symbol: '$' },
      },
      data: [{ value: { sum_revenue: '1842500' } }],
    });
    expect(model.cards[0]?.label).toEqual({ position: 'left', text: '$' });
  });

  it('tiny value → scientific suffix', () => {
    const model = normalizeKpiData({
      type: 'single_value',
      column: 'error_rate',
      name: 'Error rate',
      aggregations: 'avg',
      data: [{ value: { avg_error_rate: '0.00042' } }],
    });
    expect(model.cards[0]?.suffix).toMatch(/^×10⁻/);
  });

  it('advanced line fixture → main + supporting KPIs', () => {
    const model = normalizeKpiData(kpiAdvancedLineFixture as never);
    expect(model.layout).toBe('advanced');
    expect(model.main?.name).toBe('Total Revenue');
    expect(model.visualisation?.chartType).toBe('lineChart');
    expect(model.supporting.length).toBe(3);
    expect(model.supporting.map((c) => c.name)).toEqual([
      'New customers',
      'ARPU',
      'Churn',
    ]);
  });

  it('returns empty for invalid payload', () => {
    expect(normalizeKpiData(null).cards).toEqual([]);
    expect(normalizeKpiData(null).layout).toBe('empty');
  });

  it('unwraps a signed data-link envelope so KPI cards still render', () => {
    const model = normalizeKpiData({
      id: 'abc',
      config: {
        type: 'KPIs',
        name: 'By state',
        chartType: 'KPIs',
        items: [
          {
            type: 'single_value',
            name: 'California',
            column: 'estimated_iphone_users',
            aggregations: 'sum',
            data: [{ value: { sum_estimated_iphone_users: '22826079' } }],
          },
          {
            type: 'single_value',
            name: 'Texas',
            column: 'estimated_iphone_users',
            aggregations: 'sum',
            data: [{ value: { sum_estimated_iphone_users: '18391696' } }],
          },
        ],
      },
      data: {
        name: 'By state',
        chartType: 'KPIs',
        items: [
          {
            type: 'single_value',
            name: 'California',
            column: 'estimated_iphone_users',
            aggregations: 'sum',
            data: [{ value: { sum_estimated_iphone_users: '22826079' } }],
          },
          {
            type: 'single_value',
            name: 'Texas',
            column: 'estimated_iphone_users',
            aggregations: 'sum',
            data: [{ value: { sum_estimated_iphone_users: '18391696' } }],
          },
        ],
      },
    } as never);
    expect(model.layout).toBe('grid');
    expect(model.cards.map((c) => c.name)).toEqual(['California', 'Texas']);
    expect(model.cards[0]?.value).toBe('22.83M');
  });
});

describe('kpi grid helpers', () => {
  it('prefers even columns for four KPIs when width allows two', () => {
    expect(getKpiGridColumns(200, 4)).toBe(2);
    expect(getKpiGridScrollAxis(2, 4)).toBe('both');
  });

  it('uses single column when narrow', () => {
    expect(getKpiGridColumns(120, 4)).toBe(1);
    expect(getKpiGridScrollAxis(1, 4)).toBe('vertical');
  });

  it('stacks advanced layout when the value column is too narrow', () => {
    expect(getAdvancedSplitLayout(160, 200, 'horizontal')).toBe('stacked');
    expect(getAdvancedSplitLayout(640, 280, 'horizontal')).toBe('horizontal');
  });
});

describe('extractGroupId', () => {
  it('strips the backend group suffix', () => {
    expect(extractGroupId('Revenue overview-group-kpi-ids-rev-main')).toBe(
      'Revenue overview',
    );
  });
});
