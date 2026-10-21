/**
 * Page style ids the charts understand. Hosts pass the page value through;
 * this is the only allowlist, so a new palette is added here alone.
 */
export const CHART_STYLE_IDS = ['default', 'palette1', 'palette2', 'palette3', 'palette4'] as const;

export type ChartStyleId = (typeof CHART_STYLE_IDS)[number];

export function parseChartStyleId(value: string | null | undefined): ChartStyleId {
  const id = (value ?? '').trim();
  return (CHART_STYLE_IDS as readonly string[]).includes(id) ? (id as ChartStyleId) : 'default';
}
