import { describe, expect, it } from 'vitest';

import { widgetFromPastedJson } from './json-playground.js';

describe('widgetFromPastedJson', () => {
  it('keeps a widget that already has chartType, including an empty dataUrl', () => {
    const widget = widgetFromPastedJson(
      JSON.stringify({
        chartType: 'barChart',
        dataUrl: '',
        data: [{ pharmacy: 'A', compensated_sum: 1 }],
      }),
    );
    expect(widget.chartType).toBe('barChart');
    expect(widget.dataUrl).toBe('');
    expect(widget.data).toHaveLength(1);
  });

  it('peels a data-link envelope down to the widget', () => {
    const widget = widgetFromPastedJson(
      JSON.stringify({
        config: { type: 'barChart' },
        data: { chartType: 'barChart', data: [{ pharmacy: 'A', compensated_sum: 2 }] },
        meta: { source: 'mcp' },
      }),
    );
    expect(widget.chartType).toBe('barChart');
    expect(widget.data).toHaveLength(1);
  });

  it('rejects a JSON array', () => {
    expect(() => widgetFromPastedJson('[]')).toThrow(/object/);
  });

  it('rejects a JavaScript object that is not JSON', () => {
    expect(() => widgetFromPastedJson('{ chartType: "barChart" }')).toThrow(/JSON/);
  });
});
