import { normalizeImageContent, normalizeTextContent } from './content.js';
import { MAX_PANES } from './layout.js';
import { getSourceFromContains, normalizeTableModel, parseTableHeaders } from './table.js';
import type {
  ArrangingDirection,
  CustomPane,
  CustomPaneKind,
  CustomWidgetModel,
  CustomWidgetPayload,
} from './types.js';

const PANE_KINDS: readonly CustomPaneKind[] = [
  'chartWidget',
  'tableWidget',
  'textWidget',
  'imageWidget',
];

/** Client `CONTENT_WIDGET_TYPES` — chart panes fall back to the empty state for these */
const CONTENT_CHART_TYPES = ['tableChart', 'textChart', 'imageChart'];

/** Copy lifted from the client `ChartWidget` empty state */
const CHART_EMPTY_TITLE = 'Custom Chart';
const CHART_EMPTY_SUBTITLE =
  'Choose a chart from recommended or configure it by your own.';

const PANE_EMPTY_TITLES: Record<CustomPaneKind, string> = {
  chartWidget: CHART_EMPTY_TITLE,
  tableWidget: 'Table',
  textWidget: 'Text',
  imageWidget: 'Image',
};

const EMPTY_MODEL: CustomWidgetModel = {
  title: '',
  direction: 'vertical',
  hasKpi: false,
  panes: [],
  widget: null,
  isEmpty: true,
};

function isPaneKind(value: unknown): value is CustomPaneKind {
  return typeof value === 'string' && PANE_KINDS.includes(value as CustomPaneKind);
}

/** Chart panes whose widget `chartType` is a content type render empty, as in the client */
export function isContentChartType(chartType: string | undefined): boolean {
  return !!chartType && CONTENT_CHART_TYPES.includes(chartType);
}

function emptyPane(
  kind: CustomPaneKind,
  index: number,
  widgetId: string,
  title: string,
  subtitle: string,
): CustomPane {
  return {
    key: `${widgetId}-${kind}-${index}`,
    kind,
    renderable: false,
    emptyTitle: title,
    emptySubtitle: subtitle,
  };
}

function buildPane(kind: CustomPaneKind, index: number, widget: CustomWidgetPayload): CustomPane {
  const widgetId = typeof widget.id === 'string' ? widget.id : '';
  const chartType = widget.chartType;

  if (kind === 'chartWidget') {
    const renderable = !isContentChartType(chartType);
    return {
      key: `${widgetId}-${kind}-${index}`,
      kind,
      renderable,
      emptyTitle: PANE_EMPTY_TITLES.chartWidget,
      emptySubtitle: CHART_EMPTY_SUBTITLE,
    };
  }

  if (kind === 'tableWidget') {
    const headers = parseTableHeaders(widget.headers);
    if (!headers.length) {
      return emptyPane(
        kind,
        index,
        widgetId,
        'No table columns yet',
        'Use MCP chat to describe which dataset fields, chart fields, or personal table data to show in this table.',
      );
    }
    if (headers.some((header) => !getSourceFromContains(header))) {
      return emptyPane(
        kind,
        index,
        widgetId,
        'Table columns need sources',
        'Each column must specify a dataset, chart, or static (tableData) field via MCP chat.',
      );
    }
    const table = normalizeTableModel(widget);
    return {
      key: `${widgetId}-${kind}-${index}`,
      kind,
      renderable: true,
      emptyTitle: PANE_EMPTY_TITLES.tableWidget,
      emptySubtitle: '',
      table: table ?? { columns: [], cells: [] },
    };
  }

  if (kind === 'textWidget') {
    const text = normalizeTextContent(widget);
    if (!text) {
      return emptyPane(
        kind,
        index,
        widgetId,
        'Add text',
        'Click to write your own text or use AI to generate content',
      );
    }
    return {
      key: `${widgetId}-${kind}-${index}`,
      kind,
      renderable: true,
      emptyTitle: PANE_EMPTY_TITLES.textWidget,
      emptySubtitle: '',
      text,
    };
  }

  const image = normalizeImageContent(widget);
  if (!image) {
    return emptyPane(
      kind,
      index,
      widgetId,
      'Upload or Generate an Image',
      'The image should reflect the presented information',
    );
  }
  return {
    key: `${widgetId}-${kind}-${index}`,
    kind,
    renderable: true,
    emptyTitle: PANE_EMPTY_TITLES.imageWidget,
    emptySubtitle: '',
    image,
  };
}

/** Build the shell model from a FuseDash CustomWidget payload. */
export function normalizeCustomWidget(input: unknown): CustomWidgetModel {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return EMPTY_MODEL;

  const widget = input as CustomWidgetPayload;
  const arranging = widget.arranging ?? {};
  const direction: ArrangingDirection =
    arranging.direction === 'horizontal' ? 'horizontal' : 'vertical';
  const hasKpi = !!arranging.hasKpi;

  const panes = (Array.isArray(arranging.widgets) ? arranging.widgets : [])
    .filter(isPaneKind)
    .slice(0, MAX_PANES)
    .map((kind, index) => buildPane(kind, index, widget));

  return {
    title: typeof widget.name === 'string' ? widget.name.trim() : '',
    direction,
    hasKpi,
    panes,
    widget,
    isEmpty: panes.length === 0 && !hasKpi,
  };
}
