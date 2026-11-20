/**
 * Settings generator: turns a chart config's `controls` into control descriptions for the panel, the URL, the
 * chart and the code block. Nothing here knows about a particular chart, so every chart page reuses it as is.
 *
 *   enum    → segmented control (up to 3 options, 20 characters in all) or select
 *   boolean → switch
 *   string  → text input
 *   number  → number input
 */
import type { ChartConfig, ControlConfig } from '../charts/types.js';
import type { AvailabilityContext, DataContext } from './chart-state.js';

export type ControlKind = 'segmented' | 'select' | 'switch' | 'text' | 'number';

export interface ControlOption {
  value: string;
  label: string;
}

export interface ControlSpec {
  /** Property name on the element and key in the URL, e.g. `showGrid`. */
  name: string;
  /** HTML attribute, e.g. `show-grid`. Empty for a control that writes into the data. */
  attribute: string;
  /** `stacked` for a control that sets `data.stacked` instead of an attribute. */
  dataField?: string;
  dataValues?: Record<string, unknown>;
  label: string;
  description: string;
  kind: ControlKind;
  options?: ControlOption[];
  /** The element's own default, so the snippet can leave it out. */
  defaultValue: string | number | boolean;
  group?: string;
  /** Turned off with attribute value "false" as well (show-header). */
  falseAttribute?: boolean;
  hiddenWhen?: (ctx: DataContext) => boolean;
  inertWhen?: (ctx: AvailabilityContext) => boolean;
  min?: number;
  max?: number;
  step?: number;
}

export type ControlValue = string | number | boolean;
export type ControlValues = Record<string, ControlValue>;

/** Shared wording for prop names that read badly when split mechanically. Applies to every chart. */
const LABELS: Record<string, string> = {
  showTooltip: 'Show tooltips',
  xLabel: 'X axis title',
  yLabel: 'Y axis title',
};

const WORDS: Record<string, string> = {
  x: 'X-axis',
  y: 'Y-axis',
};

/** `showGrid` → "Show grid", `xLabel` → "X-axis label". */
export function humanize(name: string): string {
  if (LABELS[name]) return LABELS[name];
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => WORDS[word.toLowerCase()] ?? word.toLowerCase());
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function specFromConfig(control: ControlConfig): ControlSpec {
  const base = {
    name: control.property,
    attribute: control.target ? '' : control.attribute ?? kebab(control.property),
    dataField: control.target?.slice('data.'.length),
    dataValues: control.dataValues,
    label: control.label ?? humanize(control.property),
    description: control.description,
    defaultValue: control.default,
    group: control.group,
    falseAttribute: control.falseAttribute,
    hiddenWhen: control.hiddenWhen,
    inertWhen: control.inertWhen,
  };
  switch (control.type) {
    case 'enum': {
      const options = (control.options ?? []).map((value) => ({ value, label: control.optionLabels?.[value] ?? humanize(value) }));
      // The segmented control sits beside its label (about 224px): more text than this is cut off there.
      const short = options.length <= 3 && options.reduce((sum, o) => sum + o.label.length, 0) <= 20;
      return { ...base, kind: short ? 'segmented' : 'select', options };
    }
    case 'boolean':
      return { ...base, kind: 'switch' };
    case 'number':
      return { ...base, kind: 'number' };
    case 'string':
      return { ...base, kind: 'text' };
  }
}

/** The settings a chart page shows, in config order. The page and the search index both read them from here. */
export function chartControls(config: ChartConfig): ControlSpec[] {
  return config.controls.map(specFromConfig);
}

export function defaultValues(controls: ControlSpec[]): ControlValues {
  return Object.fromEntries(controls.map((c) => [c.name, c.defaultValue]));
}

/** Parses a raw value (URL, preset) for a control; returns undefined when it does not fit. */
export function coerce(control: ControlSpec, raw: unknown): ControlValue | undefined {
  if (raw === undefined || raw === null) return undefined;
  switch (control.kind) {
    case 'switch':
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true' || raw === '1') return true;
      if (raw === 'false' || raw === '0') return false;
      return undefined;
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) return undefined;
      if (control.min !== undefined && n < control.min) return undefined;
      if (control.max !== undefined && n > control.max) return undefined;
      return n;
    }
    case 'segmented':
    case 'select': {
      const value = String(raw);
      return control.options?.some((o) => o.value === value) ? value : undefined;
    }
    case 'text':
      return String(raw);
  }
}
