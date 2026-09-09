# Host wiring — after every chart port

Do **not** do this per chart PR. Ports land in `@fusedashlabs/widgets` first. When the last CHART-* port is merged, wire MCP chat + FuseDash package host in **one** follow-up (two PRs: `mcp-ui` + `client`).

Maps: `<ui9000-map-chart>` is a **lazy** entry (`mapbox-gl` optional peer). Host wiring for mcp-ui / client still waits for the follow-up in this doc. Until then, chat may keep the charts iframe for maps.

---

## Why wait

Today each host grows a per-family `if` tree (`chart-app.ts`, `Ui9000PackageChartHost.tsx`, `chartMeta.ts`, `chartTypeRegistry.ts`). `<ui9000-chart-renderer>` already dispatches `chartType` → lazy tag. After all ports, hosts should use the dispatcher instead of another dozen branches.

Until then, chat still shows **empty state** (mcp-ui) or **Visx iframe** (client) for any type not in the tables below. That is expected.

---

## What to change (one pass)

### 1. `mcp-ui` — MCP App View (`src/mcp-app/`)

| File | Work |
|------|------|
| `chart-app.ts` | Mount `<ui9000-chart-renderer>` (or lazy `loadChart` + tag from metadata). Stop adding `registerX` + `showXWidget` per type. Keep `register*()` calls **or** `moduleSideEffects: true` — bare imports were tree-shaken once (`sideEffects: false` → blank host). |
| `chartMeta.ts` | `canRenderInlineWidget` = union of every `metadata.json` `chartTypeKeys` (plus aliases). Drop `WIDGET_INLINE_*` / `WIDGET_DIST_*` sets once the renderer owns dispatch. |
| `chartMeta.test.ts` | One case per `chartTypeKey`; fail-closed for unknown types (empty state, not iframe). |
| `README.md` | Replace the “Supported” table with “all `@fusedashlabs/widgets` keys via chart-renderer”. |
| `generated/chart-app.html` | Rebuild mcp-ui app bundle so the singlefile includes the new entries. |

Payload: keep `mapDataLinkPayloadToFuseWidget` — pass the peeled widget JSON on `data`. Dedicated mappers (`mapDataLinkPayloadToPoints`, step-line series peel) become unnecessary once each chart `normalize()` accepts the FuseDash mock.

### 2. `client` — package host (base `microfront`)

| File | Work |
|------|------|
| `Widgets/chartTypeRegistry.ts` | `UI9000_PACKAGE_CHART_TYPES` = every ported key + aliases. Extend `Ui9000PackageKind` **or** collapse to `"chart-renderer"` / metadata `id`. `resolveUi9000PackageKind` must not return `null` for a ported type. |
| `Widgets/Ui9000PackageChartHost.tsx` | One path: lazy-load `@fusedashlabs/widgets/lazy/<id>` (or chart-renderer), set `data` to the widget JSON. Delete the bar / dist / line / step-line special cases. |
| `Widgets/mapWidgetToPackageData.ts` | Only needed if a host still sends `{label,value}[]`. Prefer full widget JSON; then this helper can go. |
| `Widgets/mapWidgetToPackageData.spec.ts` + registry specs | Assert every ported `chartType` resolves and mounts. |

### 3. Hygiene (optional, same follow-up)

- `fuse-fixtures.test.ts`: every `*.fusedash.json` in the “dispatches via registry” loop (gini was added as a normalize-only test).
- Area: mcp-ui still mounts `areaChart` on `<ui9000-line-chart show-area>`. Point it at `<ui9000-area-chart>` once hosts switch.

---

## Coverage snapshot (2026-08-28)

**In chat today** (mcp-ui `canRenderInlineWidget` ∩ client `UI9000_PACKAGE_CHART_TYPES`):

`barChart` (+ grouped/stacked/cumulative aliases) · `lineChart` / `lineGroupedChart` · `lollipop*` · `areaChart` / `areaStackedChart` (via line + `show-area`) · `ksPlotChart` / `rocCurveChart` · `histogramChart` · `punchcardChart` · `boxplotChart`

**Ported in `@fusedashlabs/widgets`, not wired in hosts yet:**

| Package id | `chartTypeKeys` |
|------------|-----------------|
| `area-chart` | `areaChart`, `areaStackedChart` (widget exists; host still uses line) |
| `area-grouped-bar-chart` | `areaGroupedBarChart` |
| `spark-line-chart` | `sparkLineChart` |
| `spark-area-chart` | `sparkAreaChart` |
| `scatter-sparkline-chart` | `scatterSparklineChart` |
| `pie-chart` | `pieChart` |
| `donut-chart` | `donutChart` |
| `scatter-plot-chart` | `scatterplotChart`, `qqPlot` |
| `bubble-chart` | `bubbleChart` |
| `radar-chart` | `radarChart`, `radarGroupedChart` |
| `waterfall-chart` | `waterfallChart` |
| `violin-chart` | `violinChart` |
| `sankey-chart` | `sankeyChart` |
| `kpi-widget` | `KPI`, `KPIs` |
| `gini-impurity-entropy-chart` | `giniImpurityEntropyChart` (PR widgets#6) |
| `matrix-chart` | `matrixChart` (FUS-3992) |
| `treemap-chart` | `treemapChart` (FUS-3989) |
| `map-chart` | `mapChart`, `UniversalMap` — **ported, `hostReady: true`**. Hosts must pass `mapbox-token` / `geojson-base-url` / `pmtiles-base-url` (or `__RUNTIME_CONFIG__`). |
| `partial-dependence-chart` | `partialDependenceChart` (FUS-4004) |

**Still client-only (no package port, or host-gated):**

non-charts (`textButtonChart`, `customWidget`, `imageChart`, `tableChart`, `userProfile`, `realEstateMap`)

Re-check this table against `src/components/*/metadata.json` before starting the follow-up.

---

## Done when

- [ ] MCP App View renders every ported `chartType` from the data-link widget JSON (no empty state for those keys).
- [ ] FuseDash `apps/charts` uses `@fusedashlabs/widgets` for the same keys (`canRenderWithUi9000Package`).
- [ ] Unknown / unported types still fail closed (empty state / Visx fallback). `mapChart` is ported in the package (`<ui9000-map-chart>`) but hosts may still iframe until this follow-up.
- [ ] `yarn --cwd ../ui9000-widgets build` then rebuild mcp-ui app; client package-host tests green.
- [ ] No leftover per-chart `registerX` / `showXWidget` / `isDistKind` branches in the two hosts.
