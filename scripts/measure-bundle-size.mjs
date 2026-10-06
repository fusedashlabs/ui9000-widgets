#!/usr/bin/env node
/**
 * Measures gzipped bundle size per chart entry point.
 * Run after `yarn build`.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const CHART_ENTRIES = [
  'components/bar-chart/index.js',
  'components/line-chart/index.js',
  'components/area-chart/index.js',
  'components/area-grouped-bar-chart/index.js',
  'components/lollipop/index.js',
  'components/step-line-chart/index.js',
  'components/spark-line-chart/index.js',
  'components/spark-area-chart/index.js',
  'components/scatter-sparkline-chart/index.js',
  'components/chart-renderer/index.js',
  'components/histogram-chart/index.js',
  'components/punchcard-chart/index.js',
  'components/matrix-chart/index.js',
  'components/box-plot-chart/index.js',
  'components/violin-chart/index.js',
  'components/waterfall-chart/index.js',
  'components/sankey-chart/index.js',
  'components/parallel-coordinates-chart/index.js',
  'components/pie-chart/index.js',
  'components/donut-chart/index.js',
  'components/polar-area-chart/index.js',
  'components/scatter-plot-chart/index.js',
  'components/network-graph/index.js',
  'components/bias-variance-tradeoff-chart/index.js',
  'components/bubble-chart/index.js',
  'components/radar-chart/index.js',
  'components/radial-bar-chart/index.js',
  'components/treemap-chart/index.js',
  'components/partial-dependence-chart/index.js',
  'components/kpi-widget/index.js',
  'components/incidents-review-card/index.js',
  'components/status-gauge-widget/index.js',
  'components/gini-impurity-entropy-chart/index.js',
  'components/custom-widget/index.js',
  'components/inspector/index.js',
  'components/table/index.js',
  'components/text/index.js',
  'components/image/index.js',
  'components/event-timeline/index.js',
  'components/evidence-panel/index.js',
  'components/entity-detail/index.js',
  'components/text-input/index.js',
  'components/number-input/index.js',
  'components/select/index.js',
  'components/multi-select/index.js',
  'components/checkbox/index.js',
  'components/date-input/index.js',
  'components/button/index.js',
  'components/form/index.js',
  'components/approval-bar/index.js',
  'context/index.js',
];
// map-chart is a lazy Mapbox entry (MAP_DECISION.md) — not in the combined D3 500 KB budget.
/** Stage 2 engine catalog minus map-chart (measured separately). */
const ENGINE_ENTRIES = [
  'components/network-graph/index.js',
  'components/kpi-widget/index.js',
  'components/bar-chart/index.js',
  'components/histogram-chart/index.js',
  'components/table/index.js',
  'components/text/index.js',
  'components/image/index.js',
  'components/event-timeline/index.js',
  'components/evidence-panel/index.js',
  'components/entity-detail/index.js',
  'components/text-input/index.js',
  'components/number-input/index.js',
  'components/select/index.js',
  'components/multi-select/index.js',
  'components/checkbox/index.js',
  'components/date-input/index.js',
  'components/button/index.js',
  'components/form/index.js',
  'components/approval-bar/index.js',
];
const MAP_ENTRY = 'components/map-chart/index.js';

function collectFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, acc);
    else if (full.endsWith('.js')) acc.push(full);
  }
  return acc;
}

function gzipSize(bytes) {
  return gzipSync(bytes).length;
}

function measureEntry(entry) {
  const file = join(DIST, entry);
  let raw = 0;
  let gz = 0;
  try {
    const buf = readFileSync(file);
    raw = buf.length;
    gz = gzipSize(buf);
  } catch {
    return { entry, raw: 0, gz: 0, missing: true };
  }
  return { entry, raw, gz, missing: false };
}

const perEntry = CHART_ENTRIES.map(measureEntry);
const engineEntries = ENGINE_ENTRIES.map(measureEntry);
const mapEntry = measureEntry(MAP_ENTRY);
const engineGz = engineEntries.reduce((s, e) => s + e.gz, 0);
const allJs = collectFiles(DIST);
let totalRaw = 0;
let totalGz = 0;
for (const f of allJs) {
  const buf = readFileSync(f);
  totalRaw += buf.length;
  totalGz += gzipSize(buf);
}

const perEntryGz = perEntry.reduce((s, e) => s + e.gz, 0);
const BUDGET_KB = 500;
const goNoGo = perEntryGz / 1024 <= BUDGET_KB ? 'GO' : 'NO-GO';

const report = {
  measuredAt: new Date().toISOString(),
  budgetGzKb: BUDGET_KB,
  decision: goNoGo,
  note: 'Per-entry sizes exclude peer deps (d3, lit). Host must account for shared deps once.',
  entries: perEntry.map((e) => ({
    ...e,
    rawKb: +(e.raw / 1024).toFixed(2),
    gzKb: +(e.gz / 1024).toFixed(2),
  })),
  totals: {
    allJsFiles: allJs.length,
    rawKb: +(totalRaw / 1024).toFixed(2),
    gzKb: +(totalGz / 1024).toFixed(2),
    entriesOnlyGzKb: +(perEntryGz / 1024).toFixed(2),
    engineCatalogGzKb: +(engineGz / 1024).toFixed(2),
    mapChartGzKb: mapEntry.missing ? null : +(mapEntry.gz / 1024).toFixed(2),
  },
};

const outPath = join(ROOT, 'docs', 'BUNDLE_SIZE_REPORT.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log('UI9000 Widgets — Bundle Size Report');
console.log('====================================');
for (const e of report.entries) {
  const rel = relative(DIST, join(DIST, e.entry));
  console.log(`${rel.padEnd(40)} ${e.gzKb.toFixed(2)} KB gz (${e.rawKb.toFixed(2)} KB raw)`);
}
console.log('------------------------------------');
console.log(`Entries total (gz): ${report.totals.entriesOnlyGzKb} KB`);
console.log(
  `Engine catalog (19 ids, map excluded): ${report.totals.engineCatalogGzKb} KB gz`,
);
console.log(
  `map-chart (not in D3 budget): ${report.totals.mapChartGzKb ?? 'missing'} KB gz`,
);
console.log(`All dist JS (gz):   ${report.totals.gzKb} KB`);
console.log(`Budget:             ${BUDGET_KB} KB per combined chart set`);
console.log(`Decision:           ${goNoGo}`);
