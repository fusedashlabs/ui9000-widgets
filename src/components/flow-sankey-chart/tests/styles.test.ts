import { describe, expect, it } from 'vitest';

import componentStyles from '../element/styles.ts?raw';
import shellStyles from '../../../element/chart-shell-styles.ts?raw';

/**
 * A backtick inside a css`` template closes the template early and turns the
 * rest of the stylesheet into JavaScript. The module then fails to parse, so
 * every test in the importing file is reported as skipped rather than failed -
 * easy to miss, and easy to reintroduce from a comment.
 *
 * Read as raw source (not through `node:fs`, which this package has no types
 * for) so the check runs the same way in any environment Vite builds.
 */
const STYLE_SOURCES: Array<[string, string]> = [
  ['flow-sankey styles', componentStyles],
  ['chart shell styles', shellStyles],
];

describe('style modules', () => {
  it.each(STYLE_SOURCES)('keeps %s free of backticks inside its css template', (_name, source) => {
    // Splitting on the first backtick after the opening tag returns the whole
    // stylesheet only when none appears inside it.
    const body = source.split('css`')[1]?.split('`')[0] ?? '';

    expect(body.length).toBeGreaterThan(500);
    expect(body.trimEnd().endsWith('}')).toBe(true);
  });
});
