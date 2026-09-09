export type FormFieldKind =
  | 'text-input'
  | 'number-input'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'date-input';

export type FormField = {
  id: string;
  kind: FormFieldKind;
  label: string;
  value: string;
  options: string[];
};

export type FormModel = {
  label: string;
  fields: FormField[];
};

const KINDS = new Set<string>([
  'text-input',
  'number-input',
  'select',
  'multi-select',
  'checkbox',
  'date-input',
]);

export function normalizeForm(raw: unknown): FormModel | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const label = typeof o.label === 'string' ? o.label.trim() : 'Form';
  const fieldsRaw = Array.isArray(o.fields) ? o.fields : [];
  const fields: FormField[] = [];
  for (const item of fieldsRaw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const f = item as Record<string, unknown>;
    const fieldLabel = typeof f.label === 'string' ? f.label.trim() : '';
    if (!fieldLabel) continue;
    const kind = typeof f.kind === 'string' && KINDS.has(f.kind) ? (f.kind as FormFieldKind) : 'text-input';
    const id = typeof f.id === 'string' && f.id.trim() ? f.id.trim() : fieldLabel;
    fields.push({
      id,
      kind,
      label: fieldLabel,
      value: f.value == null ? '' : String(f.value),
      options: Array.isArray(f.options) ? f.options.map((x) => String(x)) : [],
    });
  }
  if (!fields.length) return null;
  return { label, fields };
}
