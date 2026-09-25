# Changelog

## 0.6.0 — 2026-09-25

### Added

- `<ui9000-inspector>` (`@fusedashlabs/widgets/inspector`) renders one frozen decision trace: objective, profile keys, candidates, winner, rejections, actions, risk band, and outcome. Dataset rows in the trace are refused. v1 traces still render; an out-of-enum risk band is shown as itself.
- `<ui9000-status-gauge-widget>` (`@fusedashlabs/widgets/status-gauge-widget`) renders one gauge plus metric cards in light and dark themes, on the shared chart palette.
- Chart headers and tooltips match the FuseDash client: the same header actions, and a hover tip that stays visible inside the page cell.

### Changed

- Bar objects keep distinct axes and grouping. A series column becomes `groupBy` only when it is not the category, and long category lists flip horizontal.
- Histogram, map, KPI, and network follow the mcp-ui field rules: axes stay unique, histogram bins use an object id, and network links drop self-edges.
- Fixtures, stories, and traces fail closed when they carry raw dataset rows.

### Fixed

- Hosted Storybook (`/storybook/`) no longer tree-shakes custom-element registrations, so charts and engine playground widgets render. Map stories load GeoJSON/PMTiles from the Storybook base path, not origin `/pmtiles` (404 on mcp.ui9000.com).

### Bundle

- Engine catalog lazy entries (19 ids, map excluded): **4.32 KB gz**. `map-chart` is **0.38 KB gz**. Combined entry set: 13.46 KB gz / all dist JS 386.53 KB gz — **GO** (500 KB budget).

## 0.5.0 — 2026-09-09

### Added

- **Engine catalog** (`@fusedashlabs/widgets/catalog`): `loadEngineCatalog()` / `ENGINE_TARGET_IDS`. Twenty beachhead ids carry eligibility, disqualify reasons, closed `DataProfile` eval cases, and a11y notes. BI charts stay `substrate`; `custom-widget` and `chart-renderer` are `host`.
- Primitives **table**, **text**, **image** as standalone elements. Custom widget panes mount them (no duplicated markup).
- Cyber surfaces: **event-timeline**, **evidence-panel**, **entity-detail**.
- Form controls: text/number/select/multi-select/checkbox/date, **form** (`ui9000-submit`), **button** / **approval-bar** (`ui9000-action`). Unlabelled controls do not render. Approval bar is display-only in a foreign host.

### Changed

- README documents engine vs substrate vs host. Storybook `Engine/Playground` has one story per engine id (20).

### Bundle

- Engine catalog lazy entries (19 ids, map excluded): **4.33 KB gz**. `map-chart` is **0.39 KB gz** and stays out of the D3 500 KB budget (`MAP_DECISION.md`). Combined entry set: 13.02 KB gz / all dist JS 371.11 KB gz — **GO**.

## 0.4.5 — 2026-09-08

### Added

- Custom widget panes now render **table**, **text**, and **image** (plus existing KPI band and chart panes). Table columns follow FuseDash `headers[].contains.source` (`dataset` via `tablePreviewRows`, `chart` via `data`, `static` via `tableData`). Text is read-only markdown; images require an `http(s)` URL.

## 0.4.4 — 2026-09-08

### Fixed

- Country join indexes `Czechia` against Natural Earth `Czech Rep.` / `Czech Republic`.

## 0.4.3 — 2026-09-07

### Fixed

- KPI widget unwraps signed data-link envelopes (`data.items` / `config.items`) instead of treating the persist wrapper as a single empty KPI.

## 0.4.2 — 2026-09-07

### Fixed

- Map chart: set host attrs before connecting the custom element, read `MAP_GEOJSON_BASE_URL` from `__RUNTIME_CONFIG__`, and do not cache failed GeoJSON fetches. Empty state distinguishes a failed boundaries download from a missing host URL.

## 0.4.1 — 2026-09-07

### Added

- KPI widget layouts now match FuseDash: **single**, **grid**, and **advanced** (nested chart + supporting KPIs underneath). Storybook stories are the client types: `single_value`, `trend`, `overall`, `comparison`, `high/low`, `high/low_overall`, `high/low_trend`, plus advanced with supporting KPIs.
- `<ui9000-partial-dependence-chart>` — D3 port of FuseDash PartialDependenceChart (ICE curves + dashed average) for MCP chat (FUS-4004).

### Changed

- Map `usageConditions.hostReady` is now `true`. `canRenderChartType('mapChart' | 'UniversalMap')` is open so MCP hosts can inline `<ui9000-map-chart>` once they pass `mapbox-token` / `geojson-base-url` / `pmtiles-base-url`.

### Fixed

- Keep every `lit` / `lit/*` import external in the published dist. KPI's `style-map` directive was missing from the Rollup externals list, so Vite rewrote it to `../../../node_modules/lit-html/...` and FuseDash / pnpm hosts failed to resolve it.

## 0.4.0 — 2026-09-04

### Removed

- `<ui9000-donut-group-chart>` — port of an unwired client widget (`DonutGroupChart` is not in `WIDGETS`). Use `<ui9000-donut-chart>` for a donut.

### Added

- `<ui9000-map-chart>` — FuseDash MapBox / UniversalMap as a Shadow DOM web component (choropleth, bubbles, markers, spikes). `mapbox-gl` is an optional peer, loaded only from the map entry. Centroid GeoJSON is fetched at runtime (`geojson-base-url`); choropleth polygon fills come from PMTiles (`pmtiles-base-url`), not from those GeoJSON files. Overlay legend lists every layer (name, checkbox, average) with dual thumbs that filter value zones without rebuilding the map.
- Lazy entry `@fusedashlabs/widgets/lazy/map-chart`; `resolveChartTarget` routes `mapChart` / `UniversalMap`. `canRenderChartType` stays false until host wiring (`usageConditions.hostReady`).
- Storybook stories with `map.fusedash.json` (FuseDash `DEFAULT_MAP`).
- `<ui9000-matrix-chart>` — D3 port of FuseDash MatrixChart (heatmap) for MCP chat (FUS-3992).
- `<ui9000-treemap-chart>` on `main` (FUS-3989) — already documented under 0.3.0; now shipped in this release.

### Fixed

- Map host gate stays closed so mcp-ui does not inline an empty map before token / GeoJSON / PMTiles are wired. `<ui9000-chart-renderer>` forwards `mapbox-token`, `geojson-base-url`, and `pmtiles-base-url`.
- Missing `mapbox-gl` peer fails closed with an empty-state reason instead of a blank chart root.

## 0.3.1 — 2026-09-01

### Fixed

- Publish to `https://registry.npmjs.org` (`npmPublishRegistry`). `v0.3.0` tagged but never reached npm (still 0.2.0).

## 0.3.0 — 2026-09-01

### Fixed

- Chart shell and per-chart plot layouts use explicit min-heights so MCP/chat hosts that only set `:host { min-height }` no longer collapse the plot to zero.
- Package `sideEffects` lists custom-element / lazy entrypoints so bundlers do not tree-shake `customElements.define` (blank host).

### Changed

- Package manager is Yarn Berry 4.x only (`yarn.lock`); npm/pnpm lockfiles removed.
- npm package renamed to `@fusedashlabs/widgets` (custom element tags remain `ui9000-*`).

### Added

- `<ui9000-network-graph>` — D3 force-directed network graph (nodes, links, drag, hover tooltips).
- Lazy entry `@fusedashlabs/widgets/lazy/network-graph`; `networkGraphChart` dispatch in `<ui9000-chart-renderer>`.
- `<ui9000-sankey-chart>` — D3 port of FuseDash SankeyChart (node/link flow, horizontal layout).
- Lazy entry `@fusedashlabs/widgets/lazy/sankey-chart`.
- `<ui9000-radial-bar-chart>` — D3 port of FuseDash RadialBarChart (one ring per category over a 270° sweep, negative values run back from zero).
- Lazy entry `@fusedashlabs/widgets/lazy/radial-bar-chart`.
- Storybook stories with `radial-bar.fusedash.json` fixture.
- `formatCapitalizedWords` / `formatFuseNumber` / `formatValueWithUnit` moved to shared `utils/format-text.ts` (sankey now re-exports them).
- `<ui9000-bias-variance-tradeoff-chart>` — D3 port of FuseDash BiasVarianceTradeoffChart (continuous x, monotone curves, crosshair hover that dims sibling curves, `domainsLimits` reference bands).
- Lazy entry `@fusedashlabs/widgets/lazy/bias-variance-tradeoff-chart`.
- Storybook stories with the `bias-variance-tradeoff.fusedash.json` and `bias-variance-tradeoff-limits.fusedash.json` fixtures.
- `<ui9000-gini-impurity-entropy-chart>` — D3 port of FuseDash GiniImpurityEntropyChart (entropy / Gini / misclassification curves over the class probability p, optional p-hat, confidence-interval and split annotations).
- Lazy entry `@fusedashlabs/widgets/lazy/gini-impurity-entropy-chart`, and `giniImpurityEntropyChart` dispatch in `<ui9000-chart-renderer>`.
- Storybook stories with `gini-impurity-entropy.fusedash.json` fixture.
- `<ui9000-spark-line-chart>` — D3 port of FuseDash SparkLineChart (datetime x, multi-series groupBy, crosshair hover).
- Lazy entry `@fusedashlabs/widgets/lazy/spark-line-chart`.
- Storybook stories with `spark-line.fusedash.json` fixture.
- `<ui9000-spark-area-chart>` — D3 port of FuseDash SparkAreaChart (SparkLine + area fill to y=0 at opacity 0.1).
- Lazy entry `@fusedashlabs/widgets/lazy/spark-area-chart`.
- Storybook stories with `spark-area.fusedash.json` fixture.
- `<ui9000-scatter-sparkline-chart>` — D3 port of FuseDash ScatterSparklineChart (aggregated datetime line + gradient fill + jittered scatter markers).
- Lazy entry `@fusedashlabs/widgets/lazy/scatter-sparkline-chart`.
- Storybook stories with `scatter-sparkline.fusedash.json` fixture.
- `<ui9000-chart-renderer>` — FuseDash ChartRenderer dispatcher (chartType → lazy chart mount).
- Lazy entry `@fusedashlabs/widgets/lazy/chart-renderer`.
- Storybook stories dispatching line, pie, spark-line, and scatter-sparkline fixtures.
- `<ui9000-radar-chart>` — D3 port of FuseDash RadarChart (single + grouped, polar grid, marker hover).
- Lazy entry `@fusedashlabs/widgets/lazy/radar-chart`.
- Storybook stories with `radar.fusedash.json` and `radar-grouped.fusedash.json` fixtures.
- `<ui9000-waterfall-chart>` — D3 port of FuseDash WaterfallChart (horizontal/vertical, cumulative levels + delta-flag fixtures).
- Lazy entry `@fusedashlabs/widgets/lazy/waterfall-chart`.
- Storybook stories with `waterfall.fusedash.json` fixture.
- `<ui9000-violin-chart>` — D3 port of FuseDash ViolinChart (horizontal/vertical KDE + box overlay).
- Lazy entry `@fusedashlabs/widgets/lazy/violin-chart`.
- Storybook stories with `violin.fusedash.json` fixture.
- `<ui9000-area-grouped-bar-chart>` — D3 port of FuseDash AreaGroupedBarChart (grouped bars + area/line overlay, vertical).
- Lazy entry `@fusedashlabs/widgets/lazy/area-grouped-bar-chart`.
- Storybook stories with `area-grouped-bar.fusedash.json` fixture.
- `<ui9000-treemap-chart>` — D3 port of FuseDash Treemap (`treemapBinary` tiles, single area-proportional layout or the grouped card mosaic when `subgroup` adds a second dimension, magnitude color bands, `Low → High` palette legend).
- Lazy entry `@fusedashlabs/widgets/lazy/treemap-chart`, and `treemapChart` dispatch in `<ui9000-chart-renderer>`.
- Storybook stories with `treemap.fusedash.json` fixture.
- `<ui9000-area-chart>` — D3 port of FuseDash AreaChart (grouped + stacked, gradient fill).
- Lazy entry `@fusedashlabs/widgets/lazy/area-chart`.
- Storybook stories with `area.fusedash.json` fixture.
- `<ui9000-donut-chart>` — D3 port of FuseDash DonutChart (pie + inner hole, 30% / min 25px ring).
- Lazy entry `@fusedashlabs/widgets/lazy/donut-chart`.
- Storybook stories with `donut.fusedash.json` fixture.
- `<ui9000-kpi-widget>` — Lit port of FuseDash KPI cards (`single_value` grid + `high/low_overall`).
- Lazy entry `@fusedashlabs/widgets/lazy/kpi-widget`.
- Storybook stories with `kpis.fusedash.json` and `kpi-high-low.fusedash.json` fixtures.
- `<ui9000-pie-chart>` — D3 port of FuseDash PieChart (full disc + donut via `inner-radius-ratio`).
- Lazy entry `@fusedashlabs/widgets/lazy/pie-chart`.
- Storybook stories with `pie.fusedash.json` fixture.
- `<ui9000-polar-area-chart>` — D3 port of FuseDash PolarAreaChart (equal-angle wedges on a five-ring radial grid).
- Lazy entry `@fusedashlabs/widgets/lazy/polar-area-chart`.
- Storybook stories with `polar-area.fusedash.json` fixture.
- `<ui9000-scatter-plot>` — D3 port of FuseDash ScatterPlot (groupBy markers, optional reference line).
- Lazy entry `@fusedashlabs/widgets/lazy/scatter-plot-chart`.
- Storybook stories with `scatter.fusedash.json` fixture.
- `<ui9000-bubble-chart>` — D3 port of FuseDash BubbleChart (linear X/Y, abs(y) radius bands, groupBy fill).
- Lazy entry `@fusedashlabs/widgets/lazy/bubble-chart`.
- Storybook stories with `bubble.fusedash.json` fixture.
- `<ui9000-donut-group-chart>` — D3 port of FuseDash DonutGroupChart (KPI gauges against `maximalValue`, breakdown donuts, status badges).
- Lazy entry `@fusedashlabs/widgets/lazy/donut-group-chart`.
- Storybook stories, playground panel and `docs/DONUT_GROUP_CHART.md`.
- `<ui9000-parallel-coordinates-chart>` — D3 port of FuseDash ParallelCoordinatesChart (one linear axis per dimension, a polyline per record, horizontal and vertical orientations, click an axis to move the colour ramp onto it).
- Lazy entry `@fusedashlabs/widgets/lazy/parallel-coordinates-chart`.
- Storybook stories (Horizontal, Vertical, ChatRows) and the FuseDash Iris fixture `src/stories/fixtures/parallel-coordinates.fusedash.json`.

### Changed

- `<ui9000-parallel-coordinates-chart>` renders its colour ramp as an SVG gutter legend rather than the usual HTML legend above the plot — a documented exception to the house rule, kept so the widget matches the client's layout. Recorded in the chart's `metadata.json` under `divergences`.

### Fixed

- `<ui9000-parallel-coordinates-chart>` vertical orientation puts the axis maximum at the top. The client's `VerticalParallelCoordinatesChart` transposed the horizontal variant without flipping the SVG y range, so its axes ran inverted and contradicted its own colour ramp. Horizontal is the acceptance path; the vertical divergence is deliberate.

### Changed

- `docs/BUNDLE_SIZE_REPORT.json` is no longer tracked in git. `npm run build` still
  writes it locally and CI uploads it as a workflow artifact.

### Publish

Push tag `v0.3.0` on `main` to run `.github/workflows/release.yml` (`yarn npm publish`).

## 0.2.0 — 2026-08-26

### Added

- `<ui9000-step-line-chart>` — D3 port of FuseDash StepLineChart (KS/ROC overlays, multi-series, time/categorical x).
- Lazy entry `@fusedashlabs/widgets/lazy/step-line-chart`.
- Storybook stories and `docs/STEP_LINE_CHART.md`.

### Fixed

- ESLint flat config: browser/vitest/node globals (CI `lint` step).
- `yarn build` now refreshes `docs/BUNDLE_SIZE_REPORT.json`.

### Publish

Requires `NPM_TOKEN` in GitHub repo secrets. Push tag `v0.2.0` on `main` to run `.github/workflows/release.yml`.

## 0.1.0 — 2026-08-24

- Initial publish: line chart, lollipop, context, lazy loaders.
