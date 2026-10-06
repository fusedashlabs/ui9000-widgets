/** Track and dot colours. Unnamed states take them in this order. */
export type IncidentsReviewTone = 'green' | 'red' | 'amber' | 'blue' | 'violet' | 'grey';

/**
 * The scope the counts were taken over. `radius` and `distance` draw the scale
 * mark from the design; any other kind (site, region, unit, time, category,
 * severity) prints the label alone.
 */
export interface IncidentsReviewFilterInput {
  label?: string;
  value?: number | string;
  unit?: string;
  kind?: string;
}

/** One incident state and its count, e.g. `{ label: 'Active', value: 89 }`. */
export interface IncidentsReviewCountInput {
  label?: string;
  state?: string;
  value?: number | string;
  count?: number | string;
  /** A tone name, or `ok`, `warning`, `critical`, `info`, `neutral`. */
  tone?: string;
}

export interface IncidentsReviewTotalInput {
  label?: string;
  value?: number | string;
}

export interface IncidentsReviewPayload {
  chartType?: string;
  title?: string;
  filter?: string | IncidentsReviewFilterInput | null;
  /** Aggregated counts by state, in lifecycle order. They need not sum to the total. */
  counts?: IncidentsReviewCountInput[] | null;
  total?: number | string | IncidentsReviewTotalInput | null;
  /**
   * Draw the lifecycle track. Omitted, it shows when there are two or more
   * states, since one state is not a lifecycle.
   */
  track?: boolean | null;
}

export interface IncidentsReviewFilter {
  label: string;
  /** Distance filters draw the scale mark. */
  scale: boolean;
}

export interface IncidentsReviewCount {
  label: string;
  /** The count, or null when the cell is text. Sizes the track segment. */
  value: number | null;
  /** Ready to print: `89`, `1,204`, `12.4K`. */
  display: string;
  /** Full value for assistive text and the tooltip. */
  full: string;
  tone: IncidentsReviewTone;
}

export interface IncidentsReviewTotal {
  label: string;
  value: number | null;
  display: string;
  full: string;
}

export interface IncidentsReviewModel {
  title: string;
  filter: IncidentsReviewFilter | null;
  counts: IncidentsReviewCount[];
  total: IncidentsReviewTotal | null;
  track: boolean;
  empty: boolean;
}
