/**
 * The last pages opened on this site, newest first, kept in localStorage. Storage can be blocked or full;
 * then the list is simply empty.
 */
const STORAGE_KEY = 'ui9000-docs-recent';
const LIMIT = 5;

export function recentPaths(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string').slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

/** Records a page path such as `/charts/bar` (no query). */
export function rememberPath(path: string): void {
  try {
    const next = [path, ...recentPaths().filter((p) => p !== path)].slice(0, LIMIT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: nothing to remember.
  }
}
