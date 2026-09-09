import { describe, expect, it } from 'vitest';

import fixture from '../../../stories/fixtures/custom-widget.fusedash.json';
import {
  isContentChartType,
  MAX_PANES,
  normalizeCustomWidget,
  paneFlexDirection,
  panesFromSlots,
  limitSelectedPanes,
  isPaneSlotDisabled,
} from '../lib/index.js';

describe('normalizeCustomWidget', () => {
  it('normalizes the FuseDash custom widget fixture', () => {
    const model = normalizeCustomWidget(fixture);

    expect(model.title).toBe('Check-ins Overview');
    expect(model.direction).toBe('vertical');
    expect(model.hasKpi).toBe(true);
    expect(model.isEmpty).toBe(false);
    expect(model.panes).toHaveLength(1);
    expect(model.panes[0]).toMatchObject({ kind: 'chartWidget', renderable: true });
    expect(model.widget).toBe(fixture);
    expect(model.widget?.isCustom).toBe(true);
    expect(model.widget?.chartType).toBe('lineChart');
  });

  it('defaults direction to vertical and reports the default state', () => {
    const model = normalizeCustomWidget({ name: 'Untitled' });

    expect(model.direction).toBe('vertical');
    expect(model.hasKpi).toBe(false);
    expect(model.panes).toEqual([]);
    expect(model.isEmpty).toBe(true);
  });

  it('keeps a horizontal direction and the KPI band without panes', () => {
    const model = normalizeCustomWidget({
      arranging: { widgets: [], hasKpi: true, direction: 'horizontal' },
    });

    expect(model.direction).toBe('horizontal');
    expect(model.isEmpty).toBe(false);
  });

  it('drops unknown pane kinds and caps panes at the client maximum', () => {
    const model = normalizeCustomWidget({
      id: 'w1',
      chartType: 'lineChart',
      arranging: {
        widgets: ['chartWidget', 'mapWidget', 'tableWidget', 'textWidget'],
      },
    });

    expect(model.panes).toHaveLength(MAX_PANES);
    expect(model.panes.map((pane) => pane.kind)).toEqual(['chartWidget', 'tableWidget']);
    expect(model.panes[0].key).toBe('w1-chartWidget-0');
  });

  it('renders chart panes empty for content chart types', () => {
    const model = normalizeCustomWidget({
      chartType: 'textChart',
      arranging: { widgets: ['chartWidget'] },
    });

    expect(model.panes[0].renderable).toBe(false);
    expect(model.panes[0].emptyTitle).toBe('Custom Chart');
  });

  it('marks empty table and text panes as not renderable', () => {
    const model = normalizeCustomWidget({
      chartType: 'lineChart',
      arranging: { widgets: ['tableWidget', 'textWidget'] },
    });

    expect(model.panes.every((pane) => !pane.renderable)).toBe(true);
    expect(model.panes[0].emptyTitle).toBe('No table columns yet');
    expect(model.panes[1].emptyTitle).toBe('Add text');
  });

  it('builds a table pane from chart-sourced headers and widget.data', () => {
    const model = normalizeCustomWidget({
      id: 'w1',
      data: [
        { timestamp__m: '01', count: 10 },
        { timestamp__m: '02', count: 20 },
      ],
      headers: [
        {
          label: 'Month',
          contains: [{ key: 'timestamp__m__chart', source: { type: 'chart', field: 'timestamp__m' } }],
        },
        {
          label: 'Check-ins',
          contains: [{ key: 'count__chart', source: { type: 'chart', field: 'count' } }],
        },
      ],
      arranging: { widgets: ['tableWidget'] },
    });

    expect(model.panes[0].renderable).toBe(true);
    expect(model.panes[0].table?.columns.map((c) => c.label)).toEqual(['Month', 'Check-ins']);
    expect(model.panes[0].table?.cells).toEqual([
      [{ text: '01' }, { text: '10' }],
      [{ text: '02' }, { text: '20' }],
    ]);
  });

  it('builds text and image panes from payload fields', () => {
    const text = normalizeCustomWidget({
      text: 'Hello **team**',
      arranging: { widgets: ['textWidget'] },
    });
    expect(text.panes[0]).toMatchObject({ kind: 'textWidget', renderable: true, text: 'Hello **team**' });

    const image = normalizeCustomWidget({
      imageUrl: 'https://example.com/store.png',
      alt: 'Store',
      arranging: { widgets: ['imageWidget'] },
    });
    expect(image.panes[0]).toMatchObject({
      kind: 'imageWidget',
      renderable: true,
      image: { src: 'https://example.com/store.png', alt: 'Store' },
    });

    const rejected = normalizeCustomWidget({
      imageUrl: 'javascript:alert(1)',
      arranging: { widgets: ['imageWidget'] },
    });
    expect(rejected.panes[0].renderable).toBe(false);
  });

  it('returns the empty model for unusable payloads', () => {
    for (const input of [null, undefined, 'nope', 42, []]) {
      const model = normalizeCustomWidget(input);
      expect(model.widget).toBeNull();
      expect(model.isEmpty).toBe(true);
    }
  });
});

describe('paneFlexDirection', () => {
  it('inverts FuseDash arranging semantics like the client WidgetContent', () => {
    expect(paneFlexDirection('vertical')).toBe('row');
    expect(paneFlexDirection('horizontal')).toBe('column');
  });
});

describe('panesFromSlots', () => {
  it('keeps at most two panes and ignores KPI', () => {
    expect(
      panesFromSlots({ kpi: true, chart: true, table: true, text: true, image: true }),
    ).toEqual(['chartWidget', 'tableWidget']);
    expect(panesFromSlots({ kpi: true, text: true })).toEqual(['textWidget']);
    expect(panesFromSlots({})).toEqual([]);
  });
});

describe('limitSelectedPanes', () => {
  it('always keeps KPI and rejects a third pane in favor of the previous pair', () => {
    const previous = { kpi: false, chart: true, table: true, text: false, image: false };
    expect(
      limitSelectedPanes(
        { kpi: true, chart: true, table: true, text: true, image: false },
        previous,
      ),
    ).toEqual({ kpi: true, chart: true, table: true, text: false, image: false });
  });

  it('allows any two-pane pair and a lone KPI', () => {
    expect(limitSelectedPanes({ kpi: true, text: true, image: true })).toEqual({
      kpi: true,
      chart: false,
      table: false,
      text: true,
      image: true,
    });
    expect(limitSelectedPanes({ kpi: true })).toEqual({
      kpi: true,
      chart: false,
      table: false,
      text: false,
      image: false,
    });
  });

  it('disables unselected pane switches once two panes are on', () => {
    const pair = { chart: true, table: true, text: false, image: false };
    expect(isPaneSlotDisabled(pair, 'chart')).toBe(false);
    expect(isPaneSlotDisabled(pair, 'table')).toBe(false);
    expect(isPaneSlotDisabled(pair, 'text')).toBe(true);
    expect(isPaneSlotDisabled(pair, 'image')).toBe(true);
    expect(isPaneSlotDisabled({ kpi: true, ...pair }, 'text')).toBe(true);
    expect(isPaneSlotDisabled({ chart: true }, 'table')).toBe(false);
  });
});

describe('isContentChartType', () => {
  it('matches the client CONTENT_WIDGET_TYPES list', () => {
    expect(['tableChart', 'textChart', 'imageChart'].every(isContentChartType)).toBe(true);
    expect(isContentChartType('lineChart')).toBe(false);
    expect(isContentChartType(undefined)).toBe(false);
  });
});
