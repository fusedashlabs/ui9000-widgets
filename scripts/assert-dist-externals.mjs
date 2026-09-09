#!/usr/bin/env node
/**
 * Fail the package build if Vite inlined a sibling `node_modules/*` path
 * for packages marked Rollup-external (`lit` / `lit/*`, `d3` / `d3-*`,
 * `mapbox-gl`). Hosts resolve the package specifiers, not that layout.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const FORBIDDEN = /node_modules\/(?:lit-html|lit|mapbox-gl|d3)(?:-|\/)/;

function collectJs(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectJs(full, acc);
    else if (full.endsWith('.js')) acc.push(full);
  }
  return acc;
}

const hits = [];
for (const file of collectJs(DIST)) {
  const src = readFileSync(file, 'utf8');
  if (FORBIDDEN.test(src)) hits.push(relative(ROOT, file));
}

if (hits.length) {
  console.error(
    'dist still imports node_modules/{lit,d3,mapbox-gl}* (mark them as rollup external):\n' +
      hits.map((h) => `  ${h}`).join('\n'),
  );
  process.exit(1);
}

console.log('assert-dist-externals: no bundled node_modules/{lit,d3,mapbox-gl}* imports');
