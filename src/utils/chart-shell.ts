import { dismissLabelTooltip, presentLabelTooltip } from '../element/chart-tooltip-portal.js';
import type { AxisLabelTooltipHandlers } from './axis-labels.js';
import { parseJsonAttr } from './chart-helpers.js';
import { truncateString } from './truncate.js';

export type LabelTooltipState = {
  x: number;
  y: number;
  text: string;
} | null;

/** Read FuseDash widget `name` from JSON data attribute. */
export function extractWidgetTitle(
  dataJson: string,
  explicitTitle?: string,
): string {
  const trimmed = explicitTitle?.trim();
  if (trimmed) return trimmed;

  const raw = parseJsonAttr<unknown>(dataJson, null);
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const name = (raw as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return '';
}

export function resolveHeaderTitle(
  chartTitle: string,
  dataJson: string,
  showHeader: boolean,
): string {
  if (!showHeader) return '';
  return extractWidgetTitle(dataJson, chartTitle);
}

/** Axis-label chip, same placement as the client LabelTooltip (page coords, 25px above). */
export function createAxisLabelHandlers(
  host: HTMLElement,
  setTooltip: (value: LabelTooltipState) => void,
): AxisLabelTooltipHandlers {
  return {
    onAxisLabelHover: (text: string, event: MouseEvent) => {
      presentLabelTooltip(host, event, text);
      setTooltip(null);
    },
    onAxisLabelLeave: () => {
      dismissLabelTooltip(host);
      setTooltip(null);
    },
  };
}

export function headerTitleDisplay(title: string, maxLength = 48): string {
  return truncateString(title, maxLength);
}
