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

/** Build axis-label hover callbacks that position a Lit label tooltip. */
export function createAxisLabelHandlers(
  host: HTMLElement,
  setTooltip: (value: LabelTooltipState) => void,
): AxisLabelTooltipHandlers {
  return {
    onAxisLabelHover: (text: string, event: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        text,
      });
    },
    onAxisLabelLeave: () => {
      setTooltip(null);
    },
  };
}

export function headerTitleDisplay(title: string, maxLength = 48): string {
  return truncateString(title, maxLength);
}
