export interface WidgetItemDto {
// identity
id: string;
pageId: string;
userId: string;
datasetId: string;
blockId?: string;
canvasBlockId?: string;
sectionType?: string;

createdAt: string;
updatedAt: string;

// chrome
name: string;
description: string;
insights: string;
insightsList?: string[];
recommendations?: string[];
text?: string;
imageUrl?: string;
alt?: string;
query?: string;

chartType: WidgetChartType;
layout: string;
background: string;
orientation?: string;
display?: string[];

legend: boolean;
tooltip: boolean;
search: boolean;
timeline: boolean;
terrain: boolean;
stacked?: boolean;
isCustom?: boolean;
isReport?: boolean;
runModal?: boolean;

// bindings — column names from the dataset
xAxe?: string[];
yAxe?: string[];
groupBy?: string[];
arrangeBy?: string[];
metric?: string[];
subgroup?: string;
aggregationFunction?: string;
uniqueValues?: UniqueValuesDto;
axisLabels?: AxisLabelDto[];
axisDetails?: AxisDetailsDto;

// rows
data?: Array<Record<string, unknown>>;
/\*_ Static rows for tableWidget. Separate from chart `data`. _/
tableData?: Array<Record<string, string | number | boolean | null>>;
dataFormat?: unknown;
headers?: WidgetItemHeaderDto[];

// look
colors?: string[];
paletteId?: string;
palette?: PaletteDto;
formatting?: FormattingDto[];
markers?: MarkerDto[];
apparitionConfig?: ApparitionConfigDto;
limitsDomains?: Array<[number?, number?]>;
domainsLimits?: DomainLimitDto[];

// map
layers: MarkersVisualisationDto[];

// kpi / canvas grouping
arranging?: ArrangingConfigDto;
kpis?: AiKpiDto[];
interchangeableWidgetCount?: number;
}

export interface WidgetItemHeaderDto {
label: string;
position?: string;
contains: HeaderContainsEntryDto[];
}

export type HeaderContainsEntryDto = {
key: string;
kpiId?: string;
source?: TableColumnSourceDto;
};

export type TableColumnSourceDto =
| { type: "dataset"; datasetId: string; field: string }
| { type: "chart"; field: string }
| { type: "static"; field: string };

export type UniqueValuesDto = Record<string, string[]>;

export interface AxisLabelDto {
key: string;
suffix: string;
}

export interface AxisDetailDto {
label: string;
type: string;
subtype: string;
[key: string]: unknown;
}

export type AxisDetailsDto = Record<string, AxisDetailDto>;

export interface PaletteDto {
paletteId?: string;
customColors?: { key: number; hex: string }[];
range?: number[];
autoRange?: boolean;
}

export interface FormattingDto {
color: string;
key: string;
}

export type MarkerShape =
| "donut"
| "circle"
| "square"
| "rhombus"
| "triangle"
| "disabled"
| "cross";

export interface MarkerDto {
shape: MarkerShape;
key: string;
}

export interface ApparitionConfigDto {
textAlignment?: string;
background?: string;
border?: string;
descriptionDisabled?: boolean;
insightsDisabled?: boolean;
}

export interface DomainLimitDto {
values: [number?, number?];
color: string;
orientation: "horizontal" | "vertical";
}

export interface ArrangingConfigDto {
hasKpi: boolean;
direction: "vertical" | "horizontal";
widgets: string[];
}

export type VisualisationType = "choropleth" | "bubbles" | "spike" | "markers";

export interface MarkersVisualisationDto {
name: string;
layerId: string;
datasetId: string;
query: string;
description: string | null;
geospatialData: string[];
arrangeByMetric: string[];
analytics: "disabled" | "median" | "average";
tooltip: boolean;
visualisationType: VisualisationType;
possibleVisualisationTypes: string[];
format: string;
colour: string;
color?: string;
colors?: string[];
dataRange?: string;
geoTarget: { type: string; value: string }[];
timePeriod: { type: string; field: string; values: string[] } | undefined;
palette: PaletteDto;
formatting: FormattingDto[];
markers: MarkerDto[];
data?: Array<Record<string, unknown>>;
hideLayer?: boolean;
dataPoints?: {
intervalValue: 0;
isAutoInterval: boolean;
customBrakePoints: number[];
};
labelTemplate?: {
title: string;
metrics: { title: string; template: string }[];
representation: {
chart_type: string;
geospatial_data: string[];
arrange_by_metric: string[];
aggregation_function: string;
};
};
}

export interface AiKpiDto {
id: string;
type: string;
name: string;
pageId: string;
userId: string;
datasetId: string;
query: string;
column?: string;
aggregations?: string;
groupBy?: string;
subgroup?: string;
filter?: unknown;
trend?: unknown;
data?: Array<Record<string, unknown>>;
chartType?: string;
blockId?: string;
canvasBlockId?: string;
createdAt: Date;
updatedAt: Date;
apparitionConfig?: ApparitionConfigDto;
axisDetails?: AxisDetailsDto;
showPercentage?: boolean;
showVisualisation?: boolean;
supportingKpis?: boolean;
groupName?: string;
timeline?: string;
status?: string;
target?: string;
showTimestamp?: boolean;
kpiKind?: "mission" | "goal";
targetStatus?: "on_target" | "off_target";
score?: number;
mainBlocker?: string;
insightsList?: string[];
recommendations?: string[];
}
