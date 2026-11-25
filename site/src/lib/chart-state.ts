/**
 * Chart page state: which preset supplies the data, and the value of every generated control.
 * One state drives three outputs that must agree: the live element, the URL and the embed snippet.
 */
import { coerce, defaultValues, type ControlSpec, type ControlValue, type ControlValues } from './controls.js';

export interface ChartPreset {
  /** URL id, e.g. `horizontal-stacked`. */
  id: string;
  label: string;
  /** Loaded with the page (presets import their data lazily). */
  data: unknown;
  /** Control values the preset sets; the rest stay at the element defaults. */
  values: ControlValues;
}

export interface ChartState {
  presetId: string;
  values: ControlValues;
}

/** What a chart page knows about the preset's data when it decides whether a control is shown (hiddenWhen). */
export interface DataContext {
  /** Series in the current data, counted by the chart's own normalizer. */
  seriesCount: number;
  /** The preset's data. */
  data: unknown;
}

/** What a chart page knows when it decides whether a control has any effect (inertWhen): the data and the values. */
export interface AvailabilityContext extends DataContext {
  values: ControlValues;
}

/** Controls the preset's data rules out (their hiddenWhen holds): the panel leaves them out. */
export function hiddenControls(controls: ControlSpec[], ctx: DataContext): string[] {
  return controls.filter((control) => control.hiddenWhen?.(ctx)).map((control) => control.name);
}

/** Controls another setting rules out (their inertWhen holds): the panel leaves them out as well. */
export function inertControls(controls: ControlSpec[], ctx: AvailabilityContext): string[] {
  return controls.filter((control) => control.inertWhen?.(ctx)).map((control) => control.name);
}

/**
 * What the chart and the snippet get: a hidden control, which has no effect, falls back to the element's default, so a
 * choice made in another state (cumulative line on, then horizontal) does not leak into this one. The state and the
 * URL keep an inert control's choice, so it comes back with the state it applies to.
 */
export function effectiveValues(controls: ControlSpec[], values: ControlValues, hidden: string[] = []): ControlValues {
  const out = { ...values };
  for (const control of controls) {
    if (hidden.includes(control.name)) out[control.name] = control.defaultValue;
  }
  return out;
}

/** Old preset id → the preset and settings that draw the same chart. */
export type LegacyPresets = Record<string, { preset: string; values?: ControlValues }>;

/** Control values a preset starts from: element defaults, then the preset's own. */
export function presetValues(controls: ControlSpec[], preset: ChartPreset): ControlValues {
  return { ...defaultValues(controls), ...preset.values };
}

export function stateFromParams(
  controls: ControlSpec[],
  presets: ChartPreset[],
  params: URLSearchParams,
  legacy: LegacyPresets = {},
): ChartState {
  const requested = params.get('preset') ?? '';
  const old = !presets.some((p) => p.id === requested) && Object.hasOwn(legacy, requested) ? legacy[requested] : undefined;
  const preset = presets.find((p) => p.id === (old?.preset ?? requested)) ?? presets[0];
  const values = { ...presetValues(controls, preset), ...old?.values };
  for (const control of controls) {
    if (!params.has(control.name)) continue;
    const value = coerce(control, params.get(control.name));
    if (value !== undefined) values[control.name] = value;
  }
  return { presetId: preset.id, values };
}

/**
 * Only what differs from the preset goes in the URL, so links stay short and readable. The value of a control the data
 * hides (`hidden`) is left out: only another preset shows the control again, and a preset starts from its own values,
 * so the choice could never come back. An inert control's value stays.
 */
export function paramsFromState(controls: ControlSpec[], presets: ChartPreset[], state: ChartState, hidden: string[] = []): URLSearchParams {
  const params = new URLSearchParams();
  const preset = presets.find((p) => p.id === state.presetId) ?? presets[0];
  if (preset !== presets[0]) params.set('preset', preset.id);
  const base = presetValues(controls, preset);
  for (const control of controls) {
    const value = state.values[control.name];
    if (value !== base[control.name] && !hidden.includes(control.name)) params.set(control.name, String(value));
  }
  return params;
}

/** A shown control differs from the preset: "Modified", and Reset is enabled. */
export function differsFromPreset(controls: ControlSpec[], preset: ChartPreset, values: ControlValues, hidden: string[] = []): boolean {
  const base = presetValues(controls, preset);
  return controls.some((c) => values[c.name] !== base[c.name] && !hidden.includes(c.name));
}

/**
 * Writes the state onto the live element. Every control is written as an attribute (switches present or
 * absent) and also as a property: a Lit boolean that defaults to true ignores a missing attribute on first
 * render, so the property is what guarantees the state.
 */
export function applyState(element: HTMLElement, controls: ControlSpec[], values: ControlValues, data: unknown): void {
  const props = element as unknown as Record<string, unknown>;
  for (const control of controls) {
    if (control.dataField) continue; // written into the data (dataWithControls)
    const value = values[control.name];
    if (control.kind === 'switch') {
      element.toggleAttribute(control.attribute, value === true);
    } else if (value === '' || value === undefined) {
      element.removeAttribute(control.attribute);
    } else {
      element.setAttribute(control.attribute, String(value));
    }
    props[control.name] = value;
  }
  const json = JSON.stringify(dataWithControls(controls, values, data));
  if (element.getAttribute('data') !== json) element.setAttribute('data', json);
}

/**
 * The preset's data with the fields that data-target controls set (Layout → `stacked`). Only an object payload
 * has fields to set; other shapes pass through.
 */
export function dataWithControls(controls: ControlSpec[], values: ControlValues, data: unknown): unknown {
  const targets = controls.filter((c) => c.dataField);
  if (!targets.length || !data || typeof data !== 'object' || Array.isArray(data)) return data;
  const out: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  for (const control of targets) {
    const value = values[control.name];
    out[control.dataField!] = control.dataValues ? control.dataValues[String(value)] : value;
  }
  return out;
}

function escapeDoubleQuoted(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeSingleQuoted(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/'/g, '&#39;');
}

function jsValue(value: ControlValue): string {
  return typeof value === 'string' ? `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : String(value);
}

/** The package the code block imports. The only place it is spelled out. */
export const PACKAGE_NAME = '@fusedashlabs/widgets';

/** Package entries not named after their element (package.json `exports`); every other `ui9000-<name>` is `/<name>`. */
const ENTRY_FOR_TAG: Record<string, string> = { 'ui9000-scatter-plot': 'scatter-plot-chart' };

/** The import that registers the element, from its own package entry. */
export function snippetImport(tag: string): string {
  const entry = ENTRY_FOR_TAG[tag] ?? tag.replace(/^ui9000-/, '');
  return `<script type="module">import '${PACKAGE_NAME}/${entry}';</script>`;
}

/**
 * Embed snippet for the current state: the element, the attributes that differ from its defaults, and the
 * data as readable JSON in a single-quoted attribute.
 *
 * A switch that defaults to on cannot be turned off from HTML (any present boolean attribute reads as on), so
 * those, and only those, are set from a short module script after the element.
 */
export function embedSnippet(
  tag: string,
  controls: ControlSpec[],
  values: ControlValues,
  data: unknown,
  setup: Array<{ attribute: string; code: string }> = [],
): string {
  const attributes: string[] = setup.map((s) => `${s.attribute}="${escapeDoubleQuoted(s.code)}"`);
  const scripted: string[] = [];
  for (const control of controls) {
    const value = values[control.name];
    if (control.dataField || value === control.defaultValue) continue;
    if (control.kind === 'switch') {
      if (value === true) attributes.push(control.attribute);
      else if (control.falseAttribute) attributes.push(`${control.attribute}="false"`);
      else scripted.push(`chart.${control.name} = ${jsValue(value)};`);
      continue;
    }
    if (value === '' || value === undefined) continue;
    attributes.push(`${control.attribute}="${escapeDoubleQuoted(String(value))}"`);
  }
  const json = JSON.stringify(dataWithControls(controls, values, data), null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n');
  attributes.push(`data='${escapeSingleQuoted(json)}'`);

  const lines = [snippetImport(tag), `<${tag}`, ...attributes.map((a) => `  ${a}`), `></${tag}>`];
  if (scripted.length) {
    lines.push(
      '<script type="module">',
      '  // These options are on by default, and an HTML attribute can only switch them on.',
      `  const chart = document.querySelector('${tag}');`,
      ...scripted.map((s) => `  ${s}`),
      '</script>',
    );
  }
  return lines.join('\n');
}
