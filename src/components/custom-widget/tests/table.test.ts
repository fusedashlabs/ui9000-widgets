import { describe, expect, it } from 'vitest';

import {
  buildLiveTableRowsFromSources,
  formatTableCell,
  normalizeTableModel,
} from '../lib/table.js';

describe('buildLiveTableRowsFromSources', () => {
  it('reads static columns from tableData', () => {
    const rows = buildLiveTableRowsFromSources({
      headers: [
        {
          label: 'Region',
          contains: [{ key: 'Region__static', source: { type: 'static', field: 'Region' } }],
        },
        {
          label: 'Sales',
          contains: [{ key: 'Sales__static', source: { type: 'static', field: 'Sales' } }],
        },
      ],
      datasetRows: [],
      chartRows: [],
      tableDataRows: [
        { Region: 'North', Sales: '1000' },
        { Region: 'South', Sales: '1500' },
      ],
    });

    expect(rows).toEqual([
      { Region__static: 'North', Sales__static: '1000' },
      { Region__static: 'South', Sales__static: '1500' },
    ]);
  });

  it('zips static and chart columns by index', () => {
    const rows = buildLiveTableRowsFromSources({
      headers: [
        {
          label: 'Region',
          contains: [{ key: 'Region__static', source: { type: 'static', field: 'Region' } }],
        },
        {
          label: 'Value',
          contains: [{ key: 'value__chart', source: { type: 'chart', field: 'value' } }],
        },
      ],
      datasetRows: [],
      chartRows: [{ value: 10 }, { value: 20 }],
      tableDataRows: [{ Region: 'North' }, { Region: 'South' }],
    });

    expect(rows).toEqual([
      { Region__static: 'North', value__chart: 10 },
      { Region__static: 'South', value__chart: 20 },
    ]);
  });

  it('uses tablePreviewRows as dataset rows for MCP snapshots', () => {
    const model = normalizeTableModel({
      headers: [
        {
          label: 'Name',
          contains: [
            {
              key: 'name__ds1',
              source: { type: 'dataset', datasetId: 'ds1', field: 'name' },
            },
          ],
        },
      ],
      tablePreviewRows: [{ name__ds1: 'Ada' }, { name__ds1: 'Grace' }],
    });

    expect(model?.cells.map((row) => row.map((c) => c.text))).toEqual([['Ada'], ['Grace']]);
  });
});

describe('formatTableCell', () => {
  it('badges Findings as success when Optimal', () => {
    const cell = formatTableCell(
      { label: 'Findings', contains: [{ key: 'findings', source: { type: 'static', field: 'findings' } }] },
      { findings: 'Optimal' },
    );
    expect(cell).toEqual({ text: 'Optimal', badge: 'success' });
  });
});
