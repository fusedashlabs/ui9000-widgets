import { parseJsonAttr } from '../utils/chart-helpers.js';

export type LabelledField = {
  label: string;
  name: string;
  value: string;
  options: string[];
};

export function parseLabelledField(
  dataJson: string,
  attrs: { label?: string; name?: string; value?: string },
): LabelledField | null {
  const fromJson = parseJsonAttr<Record<string, unknown>>(dataJson, {});
  const label =
    (typeof attrs.label === 'string' && attrs.label.trim()) ||
    (typeof fromJson.label === 'string' ? fromJson.label.trim() : '');
  if (!label) return null;
  const name =
    (typeof attrs.name === 'string' && attrs.name.trim()) ||
    (typeof fromJson.name === 'string' && fromJson.name.trim()) ||
    'field';
  // Unset host property (undefined) must not mask JSON. Empty string is a real clear.
  const value =
    typeof attrs.value === 'string'
      ? attrs.value
      : fromJson.value == null
        ? ''
        : String(fromJson.value);
  const options = Array.isArray(fromJson.options)
    ? fromJson.options.map((o) => String(o))
    : [];
  return { label, name, value, options };
}
