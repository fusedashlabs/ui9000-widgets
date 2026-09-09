export const MIN_KPI_CELL_WIDTH = 90;

export const ADVANCED_KPI_VALUE_PERCENT = 25;
export const ADVANCED_KPI_CHART_PERCENT = 75;

export type AdvancedSplitLayout = 'horizontal' | 'stacked';

/** Port of client `getAdvancedSplitLayout` (KpiFlexibleComponent/styles). */
export function getAdvancedSplitLayout(
  width: number,
  height: number,
  previousLayout: AdvancedSplitLayout = 'horizontal',
): AdvancedSplitLayout {
  if (width <= 0 || height <= 0) return previousLayout;

  const valueColWidth = width * (ADVANCED_KPI_VALUE_PERCENT / 100);
  const aspectRatio = height / width;

  if (previousLayout === 'stacked') {
    if (valueColWidth >= 64 && width >= 200 && aspectRatio <= 1.45) {
      return 'horizontal';
    }
    return 'stacked';
  }

  if (valueColWidth < 52 || width < 170 || aspectRatio > 1.62) {
    return 'stacked';
  }

  return 'horizontal';
}

export const getPreferredKpiColumnCounts = (kpiCount: number): number[] => {
  if (kpiCount <= 1) return [1];

  const divisors: number[] = [];
  for (let i = kpiCount; i >= 1; i -= 1) {
    if (kpiCount % i === 0) divisors.push(i);
  }

  if (kpiCount % 2 !== 0 && kpiCount > 2 && !divisors.includes(2)) {
    divisors.push(2);
    divisors.sort((a, b) => b - a);
  }

  return divisors;
};

export const getKpiGridColumns = (
  containerWidth: number,
  kpiCount: number,
  minCellWidth: number = MIN_KPI_CELL_WIDTH,
): number => {
  if (kpiCount <= 1) return 1;
  if (containerWidth <= 0) return 1;

  const maxColumns = Math.max(
    1,
    Math.min(kpiCount, Math.floor(containerWidth / minCellWidth)),
  );

  const preferred = getPreferredKpiColumnCounts(kpiCount);
  return preferred.find((cols) => cols <= maxColumns) ?? 1;
};

export type KpiGridScrollAxis = 'vertical' | 'horizontal' | 'both';

export const getKpiGridScrollAxis = (
  gridColumns: number,
  kpiCount: number,
): KpiGridScrollAxis => {
  if (kpiCount <= 1) return 'vertical';

  const columns = Math.max(1, gridColumns);
  const gridRows = Math.ceil(kpiCount / columns);

  if (columns === 1) return 'vertical';
  if (gridRows === 1) return 'horizontal';

  return 'both';
};
