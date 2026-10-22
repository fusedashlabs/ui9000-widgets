/** `chat` = MCP / charts iframe. `dash` = FuseDash dashboard widget. */
export type WidgetHeaderVariant = 'chat' | 'dash';

export function resolveHeaderVariant(
  value: string | null | undefined,
): WidgetHeaderVariant {
  return value === 'dash' ? 'dash' : 'chat';
}
