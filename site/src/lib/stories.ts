/**
 * Reads Storybook story modules (src/stories/*.stories.ts) so the site shows the same elements with the same
 * fixture data as Storybook, without copying either.
 */
import { render, type TemplateResult } from 'lit';

export type StoryArgs = Record<string, unknown>;

/** The bits of a Storybook context our stories read (FlowSankey reads `globals.theme`). */
export interface StoryContextLike {
  globals: { theme: 'light' | 'dark'; motion?: string };
  args: StoryArgs;
  viewMode: 'story';
}

export interface StoryLike {
  name?: string;
  args?: StoryArgs;
  render?(args: StoryArgs, context: StoryContextLike): unknown;
}

export interface StoryMetaLike extends StoryLike {
  title?: string;
  component?: string;
}

export interface StoryModule {
  default: StoryMetaLike;
  [exportName: string]: unknown;
}

/** Story modules are typed with Storybook's own types; the site only relies on the loose shape above. */
export function asStoryModule(mod: Promise<unknown>): Promise<StoryModule> {
  return mod as Promise<StoryModule>;
}

function storyOf(mod: StoryModule, exportName: string): StoryLike {
  const story = mod[exportName];
  if (!story || typeof story !== 'object') throw new Error(`Story "${exportName}" not found in ${mod.default.title}`);
  return story as StoryLike;
}

/** Story args the way Storybook merges them: meta args, then the story's own. */
export function storyArgs(mod: StoryModule, exportName: string): StoryArgs {
  return { ...(mod.default.args ?? {}), ...(storyOf(mod, exportName).args ?? {}) };
}

/** The sidebar name Storybook shows: the story's `name`, else the export name in plain words. */
export function storyName(mod: StoryModule, exportName: string): string {
  const explicit = storyOf(mod, exportName).name;
  if (explicit) return explicit;
  const words = exportName.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Renders a story with its own render function and returns the ui9000-* element it produced, detached from the
 * story's wrapper div (whose inline size belongs to the Storybook canvas).
 */
export function renderStoryElement(mod: StoryModule, exportName: string, theme: 'light' | 'dark'): HTMLElement | null {
  const story = storyOf(mod, exportName);
  const renderFn = story.render ?? mod.default.render;
  if (!renderFn) return null;
  const args = storyArgs(mod, exportName);
  const template = renderFn(args, { globals: { theme }, args, viewMode: 'story' }) as TemplateResult;
  const scratch = document.createElement('div');
  render(template, scratch);
  const element = [...scratch.querySelectorAll<HTMLElement>('*')].find((node) =>
    node.localName.startsWith('ui9000-'),
  );
  return element ?? null;
}
