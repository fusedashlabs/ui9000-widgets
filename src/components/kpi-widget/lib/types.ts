export interface KpiValueLabel {
  position: 'left' | 'right';
  text: string;
}

export type KpiStatusVariant =
  | 'Good'
  | 'Low'
  | 'Normal'
  | 'OnTarget'
  | 'OffTarget'
  | 'Mission';

export interface KpiStatusBadge {
  text: string;
  variant: KpiStatusVariant;
}

export type KpiCardRole = 'single' | 'grid' | 'main' | 'supporting';

export interface KpiCardModel {
  id: string;
  name: string;
  value: string;
  suffix?: string;
  indicator?: string;
  subtitle?: string;
  label?: KpiValueLabel;
  status?: KpiStatusBadge;
  showPercentage?: boolean;
  hideName?: boolean;
}

export type KpiWidgetLayout = 'empty' | 'single' | 'grid' | 'advanced';

export interface KpiWidgetModel {
  layout: KpiWidgetLayout;
  title?: string;
  cards: KpiCardModel[];
  main?: KpiCardModel;
  supporting: KpiCardModel[];
  visualisation?: Record<string, unknown> | null;
  target?: string;
  showTimestamp?: boolean;
  updatedAt?: string;
}

export interface RawKpiVisualisation {
  chartType?: string;
  chart_type?: string;
  name?: string;
  data?: unknown[];
  [key: string]: unknown;
}

export interface RawKpiItem {
  id?: string;
  name?: string;
  type?: string;
  variant?: string;
  column?: string;
  aggregations?: string;
  groupBy?: string;
  groupName?: string;
  data?: unknown[];
  status?: string;
  target?: string;
  showTimestamp?: boolean;
  showPercentage?: boolean;
  showVisualisation?: boolean;
  supportingKpis?: boolean;
  visualisation?: RawKpiVisualisation | null;
  updatedAt?: string;
  kpiKind?: 'mission' | 'goal' | string;
  targetStatus?: 'on_target' | 'off_target' | string;
  score?: number;
  axisDetails?: Record<
    string,
    {
      label?: string;
      measure_unit_type?: string;
      measure_unit?: string;
      measure_unit_symbol?: string;
    }
  >;
}

export type KpiWidgetData =
  | RawKpiItem
  | RawKpiItem[]
  | {
      items?: RawKpiItem[];
      kpis?: RawKpiItem[];
      chartType?: string;
      name?: string;
      count?: number;
    }
  | KpiWidgetModel
  | null
  | undefined;
