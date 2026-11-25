import type { PresetIconId } from '../components/preset-icons.js';
import type { AvailabilityContext, DataContext, LegacyPresets } from '../lib/chart-state.js';
import type { ControlValue, ControlValues } from '../lib/controls.js';

/**
 * One chart page = one config file in charts/configs/. The page, the settings panel, the code block, the
 * Data format and Attributes sections, the sidebar, the routes and the search index are all generated from it.
 *
 * A config must stay light: it is loaded with the site shell. The element and the sample data are imported
 * lazily (`load`, `presets[].data`), so each chart page downloads only its own component.
 */
export interface ChartConfig {
  /** Route id and catalog id, e.g. `bar`. */
  id: string;
  title: string;
  /** Catalog category id, e.g. `comparison`. */
  category: string;
  /** One line under the title. */
  description: string;
  tag: string;
  /** Other words people use for this chart, for search: "column" finds Bar. */
  keywords: string[];
  /** Height of the chart in px, for a chart that needs more room than the usual 420. */
  stageHeight?: number;
  /**
   * Attributes the page sets that are not settings: where the element loads its files from. Set on the live element
   * and listed under Attributes; the code block shows `code`, the value a page of your own would set.
   */
  setup?: SetupAttribute[];
  /** Imports and registers the element; may return helpers that need the chart's own code. */
  load: () => Promise<ChartRuntime | void>;
  /** The first preset is the default. */
  presets: PresetConfig[];
  /** In panel order. A control's `group` starts a titled group; controls without one come first, untitled. */
  controls: ControlConfig[];
  /**
   * Element properties that exist but are left out of the panel because they change nothing on this chart in
   * any state. Kept here so they can come back once the bug in src/ is fixed.
   */
  hidden?: HiddenControl[];
  /** Preset ids from older links, mapped to a preset plus settings, so those links still open the same chart. */
  legacyPresets?: LegacyPresets;
  /** FuseDash payload fields the chart reads, with what they do on this chart. Other fields show as unused. */
  dataFields: Record<string, string>;
  whenToUse: { useFor: string[]; avoid: string[] };
}

export interface ChartRuntime {
  /** Series in a preset's data, counted by the chart's own normalizer (for hiddenWhen and inertWhen). */
  countSeries?: (data: unknown) => number;
  /**
   * Data roles from the chart's metadata.json, listed under When to use. Loaded here, not imported by the config:
   * a static import would put the whole metadata file in the site shell.
   */
  dataRoles?: DataRole[];
}

export interface PresetConfig {
  /** URL id. */
  id: string;
  label: string;
  /** The picture of the data on the preset's tile (components/preset-icons.ts); presets on one page differ. */
  icon: PresetIconId;
  /** Sample data, imported lazily. */
  data: () => Promise<unknown>;
  /** Settings the preset starts from; the rest stay at the control defaults. */
  values?: ControlValues;
}

export interface ControlConfig {
  /** Element property, and the key in the URL. */
  property: string;
  /** HTML attribute the element reads. Leave out when `target` writes into the data instead. */
  attribute?: string;
  /**
   * `data.<field>`: the control sets that field of the payload instead of an attribute (the element reads the
   * payload, not an attribute, for this option). `dataValues` maps each option to the value written.
   */
  target?: `data.${string}`;
  dataValues?: Record<string, unknown>;
  type: 'enum' | 'boolean' | 'string' | 'number';
  /** Enum values, in order. */
  options?: string[];
  /** Labels for options whose value reads badly in words (`disabled` → "None"). Others: the value in words. */
  optionLabels?: Record<string, string>;
  /** The element's own default, so the code block can leave it out. */
  default: ControlValue;
  /** Defaults to the property name in words: `showGrid` → "Show grid". */
  label?: string;
  /** One sentence for the Attributes table and search. */
  description: string;
  /** Titled group in the panel, e.g. "Header". */
  group?: string;
  /**
   * The preset's data rules the control out: the panel leaves it out, and the chart and the code get its default.
   * Data only, never the settings, so nothing disappears because of a click in the panel; another preset brings it
   * back.
   */
  hiddenWhen?: (ctx: DataContext) => boolean;
  /**
   * Another setting (with the data, or alone) rules the control out: the panel leaves it out too, and the chart and
   * the code get its default. Its value stays in the state and the URL, so it comes back with the setting it needs.
   */
  inertWhen?: (ctx: AvailabilityContext) => boolean;
  /** A boolean the element also turns off with the attribute value "false" (show-header). */
  falseAttribute?: boolean;
}

export interface SetupAttribute {
  attribute: string;
  /** The value on this site, read when the chart is created. */
  value: () => string;
  /** The value the code block shows. */
  code: string;
  description: string;
}

export interface HiddenControl {
  property: string;
  attribute: string;
  /** Why it is hidden: what rendering it showed. */
  reason: string;
}

export interface DataRole {
  id: string;
  required?: boolean;
  description?: string;
}
