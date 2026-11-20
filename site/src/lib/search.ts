/**
 * Search index and matching. The index is built from the same catalog the sidebar and routes use (catalog.ts,
 * charts/index.ts) and the chart configs' own settings, so new pages and settings show up without edits here.
 * The token group comes back with the Color page.
 */
import { CATEGORIES, FOUNDATIONS } from '../catalog.js';
import { chartConfig, isChartReady } from '../charts/index.js';
import { chartControls } from './controls.js';
import { recentPaths } from './recent.js';
import type { ThemeMode } from './theme.js';

export type SearchGroupId = 'recent' | 'pages' | 'charts' | 'sections' | 'settings' | 'tokens';

export interface SearchEntry {
  /** Unique within its group. */
  id: string;
  group: Exclude<SearchGroupId, 'recent'>;
  label: string;
  /** Shown before the label: the section of a page, the category of a chart, the chart of a setting. */
  context?: string;
  /** Other words that find this entry; not shown. */
  keywords?: string[];
  /** Page to open. Absent for pages that are not built yet ("Soon"). */
  path?: string;
  /** Chart pages: the section to open (`?section=`), added to the page's current settings when it is already open. */
  section?: string;
  /**
   * Element to bring into view on that page, and what inside it takes focus. `fallback`: what to show instead when the
   * page has no such element (a setting the preset's data hides: the preset tiles).
   */
  reveal?: { selector: string; focus?: string; fallback?: string };
  /** Tokens: the CSS variable that paints the swatch, and the value in the current theme. */
  swatch?: string;
  hex?: string;
  /** Catalog order, for ties. */
  order: number;
}

export interface SearchGroup {
  id: SearchGroupId;
  title: string;
  entries: SearchEntry[];
}

const TITLES: Record<SearchGroupId, string> = {
  recent: 'Recent',
  pages: 'Pages',
  charts: 'Charts',
  sections: 'Sections',
  settings: 'Settings',
  tokens: 'Tokens',
};

/** At most this many per group, so a short query does not list two hundred tokens. */
const LIMITS: Partial<Record<SearchGroupId, number>> = { charts: 12, sections: 8, settings: 8, tokens: 8 };

export function buildSearchIndex(_theme: ThemeMode): SearchEntry[] {
  const entries: SearchEntry[] = [];
  let order = 0;
  const add = (entry: Omit<SearchEntry, 'order'>) => entries.push({ ...entry, order: order++ });

  add({ id: 'introduction', group: 'pages', label: 'Introduction', context: 'Get started', path: '/introduction' });
  for (const f of FOUNDATIONS) {
    add({ id: f.id, group: 'pages', label: f.label, context: 'Foundations', path: `/foundations/${f.id}` });
  }

  for (const category of CATEGORIES) {
    for (const type of category.types) {
      const config = chartConfig(type.id);
      add({
        id: type.id,
        group: 'charts',
        label: config?.title ?? type.label,
        context: category.label,
        keywords: config?.keywords ?? type.keywords,
        path: isChartReady(type.id) ? `/charts/${type.id}` : undefined,
      });
    }
  }

  // The chart pages' reference sections (not When to use, which is open by default).
  for (const category of CATEGORIES) {
    for (const type of category.types) {
      const config = chartConfig(type.id);
      if (!config) continue;
      for (const [section, label, keywords] of [
        ['data-format', 'Data format', ['data', 'fields', 'JSON']],
        ['attributes', 'Attributes', ['properties', config.tag]],
      ] as const) {
        add({
          id: `${config.id}-${section}`,
          group: 'sections',
          label,
          context: config.title,
          keywords: [...keywords],
          path: `/charts/${config.id}`,
          section,
        });
      }
    }
  }

  for (const category of CATEGORIES) {
    for (const type of category.types) {
      const config = chartConfig(type.id);
      if (!config) continue;
      for (const control of chartControls(config)) {
        add({
          id: `${config.id}-${control.name}`,
          group: 'settings',
          label: control.label,
          context: config.title,
          keywords: [control.name, control.attribute || `data.${control.dataField}`, control.description],
          path: `/charts/${config.id}`,
          reveal: {
            selector: `.settings-panel [data-setting="${control.name}"]`,
            focus: 'input:checked, input:not([type="radio"]), select',
            fallback: control.hiddenWhen || control.inertWhen ? '.settings-panel [data-setting="preset"]' : undefined,
          },
        });
      }
    }
  }

  return entries;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** 3: the text starts with the term; 2: a word in it does; 1: the term is somewhere inside; 0: no match. */
export function matchRank(text: string, term: string): number {
  const t = text.toLowerCase();
  if (t.startsWith(term)) return 3;
  let i = t.indexOf(term);
  if (i < 0) return 0;
  while (i >= 0) {
    if (!/[a-z0-9]/.test(t[i - 1])) return 2;
    i = t.indexOf(term, i + 1);
  }
  return 1;
}

/** A hex value only matches a term that looks like one: "#47…", or hex digits with at least one number. */
function hexRank(hex: string, term: string): number {
  const bare = term.replace(/^#/, '');
  if (!bare || !/^[0-9a-f]+$/.test(bare)) return 0;
  if (!term.startsWith('#') && (bare.length < 3 || !/[0-9]/.test(bare))) return 0;
  return matchRank(hex.replace(/^#/, ''), bare);
}

function termScore(entry: SearchEntry, term: string): number {
  let best = matchRank(entry.label, term) * 10;
  if (entry.context) best = Math.max(best, matchRank(entry.context, term) * 6);
  for (const keyword of entry.keywords ?? []) best = Math.max(best, matchRank(keyword, term) * 5);
  if (entry.hex) best = Math.max(best, hexRank(entry.hex, term) * 10);
  return best;
}

/**
 * Case-insensitive. The whole query is tried first; a query of several words also matches when every word
 * matches somewhere ("bar legend" → Bar › Show legend), ranked just below a whole-query match.
 */
export function scoreEntry(entry: SearchEntry, query: string): number {
  const whole = termScore(entry, query);
  if (whole > 0) return whole;
  const terms = query.split(' ');
  if (terms.length < 2) return 0;
  let min = Infinity;
  for (const term of terms) {
    const score = termScore(entry, term);
    if (!score) return 0;
    min = Math.min(min, score);
  }
  return min - 1;
}

/** Results for a query, grouped in the order Pages, Charts, Sections, Settings, Tokens. Empty groups are left out. */
export function search(entries: SearchEntry[], rawQuery: string): SearchGroup[] {
  const query = normalizeQuery(rawQuery);
  if (!query) return suggestions(entries);
  const scored = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
    .filter((r) => r.score > 0);
  const groups: SearchGroup[] = [];
  for (const id of ['pages', 'charts', 'sections', 'settings', 'tokens'] as const) {
    const ranked = scored
      .filter((r) => r.entry.group === id)
      .sort(
        (a, b) =>
          // Charts: built pages first, then the best match.
          (id === 'charts' ? Number(!!b.entry.path) - Number(!!a.entry.path) : 0) ||
          b.score - a.score ||
          a.entry.order - b.entry.order,
      )
      .map((r) => r.entry)
      .slice(0, LIMITS[id] ?? Infinity);
    if (ranked.length) groups.push({ id, title: TITLES[id], entries: ranked });
  }
  return groups;
}

/** Empty query: the last pages opened, then every page. */
export function suggestions(entries: SearchEntry[]): SearchGroup[] {
  const openable = entries.filter((e) => (e.group === 'pages' || e.group === 'charts') && e.path);
  const recent = recentPaths()
    .map((path) => openable.find((e) => e.path === path))
    .filter((e): e is SearchEntry => !!e);
  const groups: SearchGroup[] = [];
  if (recent.length) groups.push({ id: 'recent', title: TITLES.recent, entries: recent });
  groups.push({ id: 'pages', title: TITLES.pages, entries: entries.filter((e) => e.group === 'pages') });
  return groups;
}

/** Where the query (or, failing that, each of its words) first occurs in a label, for highlighting. */
export function matchRanges(label: string, rawQuery: string): [number, number][] {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];
  const text = label.toLowerCase();
  const whole = text.indexOf(query);
  if (whole >= 0) return [[whole, whole + query.length]];
  const ranges: [number, number][] = [];
  for (const term of query.split(' ')) {
    const i = text.indexOf(term);
    if (i >= 0) ranges.push([i, i + term.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  // Drop overlaps so the label is split cleanly.
  return ranges.filter((r, i) => i === 0 || r[0] >= ranges[i - 1][1]);
}
