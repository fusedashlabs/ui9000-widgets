/**
 * Hash routing: `#/charts/bar?preset=grouped&showGrid=false`.
 * The part before `?` picks the page; the query holds page state (the chart settings), so a copied link
 * reproduces the exact view.
 */
export interface Route {
  /** Normalised path, always starting with `/`, e.g. `/charts/bar`. */
  path: string;
  segments: string[];
  params: URLSearchParams;
}

export function parseHash(hash: string = location.hash): Route {
  const raw = hash.replace(/^#/, '');
  const [pathPart = '', query = ''] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  return { path: `/${segments.join('/')}`, segments, params: new URLSearchParams(query) };
}

export function href(path: string, params?: URLSearchParams | Record<string, string>): string {
  const query = params ? new URLSearchParams(params).toString() : '';
  return `#${path}${query ? `?${query}` : ''}`;
}

/** Rewrites the query of the current route without adding a history entry or firing `hashchange`. */
export function replaceParams(params: URLSearchParams): void {
  const { path } = parseHash();
  history.replaceState(history.state, '', href(path, params));
}
