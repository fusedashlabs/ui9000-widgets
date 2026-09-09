/** Client CustomWidget TableWidget — sources, zip-by-index rows, MCP preview fallback. */

export type TableColumnSource =
  | { type: 'dataset'; datasetId: string; field: string }
  | { type: 'chart'; field: string }
  | { type: 'static'; field: string };

export interface TableHeaderContains {
  key?: string;
  source?: TableColumnSource;
}

export interface TableHeader {
  label: string;
  contains?: TableHeaderContains[];
}

export type DataRow = Record<string, string | number | boolean | null | undefined>;

export interface TableCellModel {
  text: string;
  badge?: 'success' | 'error';
}

export interface CustomTableModel {
  columns: { key: string; label: string }[];
  cells: TableCellModel[][];
}

export function stripDataPrefix(field: string): string {
  return field.startsWith('data.') ? field.slice('data.'.length) : field;
}

export function buildQualifiedDatasetColumnKey(datasetId: string, field: string): string {
  return `${field}__${datasetId}`;
}

export function buildQualifiedChartColumnKey(field: string): string {
  return `${field}__chart`;
}

export function buildQualifiedStaticColumnKey(field: string): string {
  return `${field}__static`;
}

function parseSource(raw: unknown): TableColumnSource | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const field = typeof o.field === 'string' ? stripDataPrefix(o.field.trim()) : '';
  if (!field) return undefined;
  if (o.type === 'chart' || o.type === 'static') return { type: o.type, field };
  if (o.type === 'dataset') {
    const datasetId = typeof o.datasetId === 'string' ? o.datasetId.trim() : '';
    if (!datasetId) return undefined;
    return { type: 'dataset', datasetId, field };
  }
  return undefined;
}

export function getSourceFromContains(header: TableHeader): TableColumnSource | undefined {
  return header.contains?.[0]?.source;
}

export function parseTableHeaders(input: unknown): TableHeader[] {
  if (!Array.isArray(input)) return [];
  const headers: TableHeader[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const label = typeof raw.label === 'string' ? raw.label : '';
    const containsRaw = Array.isArray(raw.contains) ? raw.contains : [];
    const contains: TableHeaderContains[] = containsRaw.flatMap((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
      const e = entry as Record<string, unknown>;
      return [
        {
          key: typeof e.key === 'string' ? e.key : undefined,
          source: parseSource(e.source),
        },
      ];
    });
    headers.push({ label, contains });
  }
  return headers;
}

export function asDataRows(input: unknown): DataRow[] {
  if (!Array.isArray(input)) return [];
  return input.filter(
    (row): row is DataRow => !!row && typeof row === 'object' && !Array.isArray(row),
  ) as DataRow[];
}

/** Client `buildLiveTableRowsFromSources` — zip sources by row index, not a join. */
export function buildLiveTableRowsFromSources({
  headers,
  datasetRows,
  chartRows,
  tableDataRows = [],
}: {
  headers: TableHeader[];
  datasetRows: DataRow[];
  chartRows: DataRow[];
  tableDataRows?: DataRow[];
}): DataRow[] {
  const sourcedHeaders = headers.filter((header) => Boolean(getSourceFromContains(header)));
  if (!sourcedHeaders.length) return [];

  const needsDataset = sourcedHeaders.some((h) => getSourceFromContains(h)?.type === 'dataset');
  const needsChart = sourcedHeaders.some((h) => getSourceFromContains(h)?.type === 'chart');
  const needsStatic = sourcedHeaders.some((h) => getSourceFromContains(h)?.type === 'static');

  const rowCount = Math.max(
    needsDataset ? datasetRows.length : 0,
    needsChart ? chartRows.length : 0,
    needsStatic ? tableDataRows.length : 0,
    0,
  );

  const rows: DataRow[] = [];
  for (let index = 0; index < rowCount; index += 1) {
    const row: DataRow = {};
    for (const header of sourcedHeaders) {
      const contains = header.contains?.[0];
      const source = getSourceFromContains(header);
      if (!contains || !source) continue;

      if (source.type === 'chart') {
        const chartField = stripDataPrefix(source.field);
        const outputKey = contains.key || buildQualifiedChartColumnKey(chartField);
        row[outputKey] =
          chartRows[index]?.[chartField] ?? chartRows[index]?.[source.field] ?? null;
        continue;
      }

      if (source.type === 'static') {
        const staticField = stripDataPrefix(source.field);
        const outputKey = contains.key || buildQualifiedStaticColumnKey(staticField);
        row[outputKey] =
          tableDataRows[index]?.[staticField] ??
          tableDataRows[index]?.[source.field] ??
          tableDataRows[index]?.[outputKey] ??
          null;
        continue;
      }

      const bareField = stripDataPrefix(source.field);
      const outputKey = contains.key || buildQualifiedDatasetColumnKey(source.datasetId, bareField);
      const qualifiedKey = buildQualifiedDatasetColumnKey(source.datasetId, bareField);
      const legacyQualified = buildQualifiedDatasetColumnKey(source.datasetId, source.field);
      row[outputKey] =
        datasetRows[index]?.[qualifiedKey] ??
        datasetRows[index]?.[legacyQualified] ??
        datasetRows[index]?.[bareField] ??
        datasetRows[index]?.[source.field] ??
        null;
    }
    rows.push(row);
  }
  return rows;
}

function formatJsonToReadable(value: unknown): string | undefined {
  if (!value) return undefined;
  let obj: Record<string, unknown> | null = null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    obj = value as Record<string, unknown>;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return undefined;
    try {
      obj = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
  if (!obj) return undefined;
  return Object.entries(obj)
    .map(([key, val]) => `${key} : ${String(val)}`)
    .join(', ');
}

/** Client `getCellValue` — stringify + Findings badge. */
export function formatTableCell(header: TableHeader, row: DataRow): TableCellModel {
  const contains = header.contains?.[0];
  const source = getSourceFromContains(header);
  const bareField = (source?.field ?? '').replace(/^data\./, '');
  const keyField =
    contains?.key ||
    (source?.type === 'dataset'
      ? `${bareField}__${source.datasetId}`
      : source?.type === 'chart'
        ? `${bareField}__chart`
        : source?.type === 'static'
          ? `${bareField}__static`
          : '');
  if (!keyField) return { text: '-' };

  const rawValue = row[keyField];
  const modelValue = formatJsonToReadable(rawValue);
  const cellValue =
    modelValue ??
    (rawValue == null
      ? undefined
      : typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean'
        ? String(rawValue)
        : JSON.stringify(rawValue));
  const text = cellValue ?? '-';

  if (keyField.toLowerCase() === 'findings') {
    return { text, badge: text === 'Optimal' ? 'success' : 'error' };
  }
  return { text };
}

export function normalizeTableModel(widget: {
  headers?: unknown;
  data?: unknown;
  tableData?: unknown;
  tablePreviewRows?: unknown;
}): CustomTableModel | null {
  const headers = parseTableHeaders(widget.headers);
  if (!headers.length) return null;
  if (headers.some((header) => !getSourceFromContains(header))) return null;

  const rows = buildLiveTableRowsFromSources({
    headers,
    datasetRows: asDataRows(widget.tablePreviewRows),
    chartRows: asDataRows(widget.data),
    tableDataRows: asDataRows(widget.tableData),
  });

  const columns = headers.map((header, index) => ({
    key: header.contains?.[0]?.key || `col-${index}`,
    label: header.label || header.contains?.[0]?.key || `Column ${index + 1}`,
  }));

  return {
    columns,
    cells: rows.map((row) => headers.map((header) => formatTableCell(header, row))),
  };
}
