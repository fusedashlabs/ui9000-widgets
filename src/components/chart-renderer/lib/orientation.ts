import type { ChartTarget } from './types.js';

export type ChartOrientation = 'horizontal' | 'vertical';

/** Charts whose layout follows the payload `orientation` (as on the dashboard). */
const ORIENTABLE_KINDS = new Set<string>(['bar-chart', 'lollipop']);

/**
 * Orientation to apply to the mounted chart, taken from the widget payload.
 * FuseDash sends a horizontal bar as `chartType: "barChart"` with
 * `orientation: "horizontal"`; the registry maps `barChart` to vertical, so
 * without this the chat preview drew it vertical while the dashboard drew it
 * horizontal (FUS-4138). Chart types that name the orientation themselves
 * (`barHorizontal*`) keep their own.
 */
export function resolvePayloadOrientation(
  chartType: string,
  target: Pick<ChartTarget, 'kind'>,
  widget: unknown,
): ChartOrientation | undefined {
  if (!ORIENTABLE_KINDS.has(target.kind)) return undefined;
  if (/horizontal/i.test(chartType)) return undefined;
  const orientation =
    widget && typeof widget === 'object'
      ? (widget as { orientation?: unknown }).orientation
      : undefined;
  return orientation === 'horizontal' || orientation === 'vertical' ? orientation : undefined;
}
