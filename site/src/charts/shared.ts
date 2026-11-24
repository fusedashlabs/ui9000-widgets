import type { DataContext } from '../lib/chart-state.js';
import type { ControlConfig, HiddenControl } from './types.js';

/** hiddenWhen for a control that does something only with two or more series (Layout, Show legend). */
export const oneSeries = ({ seriesCount }: DataContext) => seriesCount < 2;

/** hiddenWhen for a control that does something only with one series (Bar's cumulative line). */
export const severalSeries = ({ seriesCount }: DataContext) => seriesCount > 1;

/**
 * hiddenWhen for a legend that lists groups: the payload has no `groupBy` field to split it (Histogram, Box plot,
 * Bubble, Radar). The generic series count misses Histogram's groups, so these pages read the field itself.
 */
export const noGroupBy = ({ data }: DataContext) => {
  const group = data && typeof data === 'object' ? (data as { groupBy?: unknown }).groupBy : undefined;
  const first = Array.isArray(group) ? group[0] : group;
  return typeof first !== 'string' || !first;
};

/** A FuseDash payload's own title (`name`), shown when chart-title is empty. */
function payloadName(data: unknown): string {
  const name = data && typeof data === 'object' ? (data as { name?: unknown }).name : undefined;
  return typeof name === 'string' ? name.trim() : '';
}

/**
 * The "Header" group every chart page ends with (base class `Ui9000ChartElement`). `header-variant` is left
 * out: `dash` only matters with host handlers, which a docs page has none of.
 */
export const HEADER_CONTROLS: ControlConfig[] = [
  {
    property: 'chartTitle',
    attribute: 'chart-title',
    type: 'string',
    default: '',
    group: 'Header',
    description: 'Title in the header. Empty: the name in the data, if it has one.',
  },
  {
    property: 'showHeader',
    attribute: 'show-header',
    type: 'boolean',
    default: true,
    falseAttribute: true,
    group: 'Header',
    description: 'The header: title and download menu. show-header="false" turns it off.',
    inertWhen: ({ values, data }) => !String(values.chartTitle ?? '').trim() && !payloadName(data),
  },
];

/** `scale` on a chart that never reads it: the plot and its gutter are the same at all three values (rendered). */
export const SCALE_INERT: HiddenControl = {
  property: 'scale',
  attribute: 'scale',
  reason: 'The chart never reads it: compact, default and comfortable render the same chart (rendered).',
};
