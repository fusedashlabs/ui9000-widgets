/**
 * "Data format" section: describes the current preset's data, field by field. The shape is read from the data
 * itself; what each FuseDash field does comes from the chart config (`dataFields`), so a field the chart does
 * not read is marked as unused instead of being explained.
 */

export interface FieldRow {
  field: string;
  /** Short rendering of the value in this preset. */
  example: string;
  meaning: string;
  used: boolean;
}

export interface DataFormat {
  /** One sentence on the shape as a whole. */
  summary: string;
  fields: FieldRow[];
  /** Fields of one item of the list the chart draws (a FuseDash row, a point). */
  item?: { title: string; fields: FieldRow[] };
}

const UNUSED = 'Not read by this chart. The settings control this.';
/** Fields every FuseDash payload carries whose meaning is the same for every chart. */
const COMMON: Record<string, string> = {
  chartType: 'Picks the element when the payload goes through ui9000-chart-renderer. A chart placed directly ignores it.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** `["year"]`, `12 rows`, `{ 2 keys }`, `"Average price"`: enough to recognise the field. */
export function shortValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length > 3 || value.some((v) => v && typeof v === 'object')) return `${value.length} item${value.length === 1 ? '' : 's'}`;
    return JSON.stringify(value);
  }
  if (isRecord(value)) {
    const keys = Object.keys(value);
    return keys.length ? `{ ${keys.length} key${keys.length === 1 ? '' : 's'} }` : '{}';
  }
  const text = JSON.stringify(value) ?? 'undefined';
  return text.length > 48 ? `${text.slice(0, 45)}…"` : text;
}

const first = (value: unknown): string | undefined => (Array.isArray(value) ? value[0] : value) as string | undefined;

export function describeData(data: unknown, dataFields: Record<string, string>): DataFormat {
  // FuseDash payload: rows plus field names that say which column is what.
  if (isRecord(data) && Array.isArray(data.data) && ('xAxe' in data || 'chartType' in data)) {
    const fields = Object.entries(data).map(([field, value]) => ({
      field,
      example: field === 'data' ? `${(value as unknown[]).length} rows` : shortValue(value),
      meaning: dataFields[field] ?? COMMON[field] ?? UNUSED,
      used: field in dataFields,
    }));
    const row = (data.data as unknown[])[0];
    const roles: Record<string, string> = {};
    const x = first(data.xAxe);
    const y = Array.isArray(data.yAxe) ? data.yAxe : [data.yAxe];
    const group = first(data.groupBy);
    if (x) roles[x] = 'The category: the field named in xAxe.';
    y.forEach((field, i) => {
      if (typeof field === 'string') roles[field] = y.length > 1 ? `Value ${i + 1}: named in yAxe[${i}].` : 'The value: the field named in yAxe.';
    });
    if (group) roles[group] = 'The series: the field named in groupBy.';
    return {
      summary:
        'A FuseDash widget payload: the rows are in data, and xAxe, yAxe and groupBy name the fields of a row that the chart reads.',
      fields,
      item: isRecord(row)
        ? {
            title: 'Each row in data',
            fields: Object.entries(row).map(([field, value]) => ({
              field,
              example: shortValue(value),
              meaning: roles[field] ?? 'Not read: no axis names this field.',
              used: field in roles,
            })),
          }
        : undefined,
    };
  }
  const pointFields = (point: unknown): FieldRow[] =>
    isRecord(point)
      ? Object.entries(point).map(([field, value]) => ({
          field,
          example: shortValue(value),
          meaning: dataFields[`points.${field}`] ?? UNUSED,
          used: `points.${field}` in dataFields,
        }))
      : [];
  if (isRecord(data) && Array.isArray(data.series)) {
    const series = data.series as Record<string, unknown>[];
    return {
      summary: `Series given directly: ${series.length} series, each with its own points.`,
      fields: Object.entries(series[0] ?? {}).map(([field, value]) => ({
        field: `series[].${field}`,
        example: field === 'points' ? `${(value as unknown[]).length} points` : shortValue(value),
        meaning: dataFields[`series.${field}`] ?? UNUSED,
        used: `series.${field}` in dataFields,
      })),
      item: { title: 'Each point', fields: pointFields(series[0]?.points && (series[0].points as unknown[])[0]) },
    };
  }
  if (isRecord(data) && Array.isArray(data.points)) {
    const points = data.points as unknown[];
    return {
      summary: `One series given directly: ${points.length} points.`,
      fields: [{ field: 'points', example: `${points.length} points`, meaning: dataFields.points ?? UNUSED, used: 'points' in dataFields }],
      item: { title: 'Each point', fields: pointFields(points[0]) },
    };
  }
  if (Array.isArray(data)) {
    return {
      summary: `A list of ${data.length} items, one per category.`,
      fields: [],
      item: { title: 'Each item', fields: pointFields(data[0]) },
    };
  }
  return { summary: 'No data.', fields: [] };
}
