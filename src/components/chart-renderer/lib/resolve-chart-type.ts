import { parseJsonAttr } from '../../../utils/chart-helpers.js';

/** Read chartType from explicit prop or FuseDash WidgetItem payload. */
export function resolveWidgetChartType(
  dataJson: string,
  explicitChartType?: string,
): string | undefined {
  const fromProp = explicitChartType?.trim();
  if (fromProp) return fromProp;

  const widget = parseJsonAttr<{ chartType?: string; isCustom?: boolean } | null>(
    dataJson,
    null,
  );
  if (!widget || typeof widget !== 'object') return undefined;
  if (widget.isCustom) return 'customWidget';
  return typeof widget.chartType === 'string' ? widget.chartType.trim() : undefined;
}
