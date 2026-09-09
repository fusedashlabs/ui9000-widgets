# Map widget: lazy Mapbox entry (ADR)

**Status:** Accepted (updated 2026-09-03)  
**Date:** 2026-08-24  
**Tasks:** MVP-P35 (FUS-3959), CHART-MapBox (FUS-4000)

## Context

FuseDash map widgets (`MapBox`, `LeafletMap`, `AlbersMap`, `RealEstateMapWidget`) depend on Mapbox GL, PMTiles, GeoJSON layers, and large tile payloads. MCP App resources have strict bundle size limits (~500 KB gzipped for the **combined D3 chart set**).

Bundle measurement for D3 charts stays under budget when Mapbox and GeoJSON stay out of those entries. Inlining `mapbox-gl` into the shared D3 bundle would exceed limits by an order of magnitude. Mapbox GL is also not an Apache-2.0 production dependency of `@fusedashlabs/widgets`.

## Decision

1. **D3 charts stay Tier B** — inlined web components, no Mapbox.
2. **MapBox is a separate lazy entry** (`@fusedashlabs/widgets/map-chart` / `lazy/map-chart`) that hosts load only when `chartType` is `mapChart` / `UniversalMap`.
3. **`mapbox-gl` is an optional peer dependency** — not listed in `dependencies`, not counted in the D3 budget, not pulled in by `registerAllCharts()` hosts that never load the map entry.
4. **GeoJSON / PMTiles stay out of the npm tarball.** The component fetches `{geojson-base-url}/country.json` (centroids for the data-join / bubbles / spikes) and `{pmtiles-base-url}/world-countries.pmtiles` (polygon fills) at runtime. Inline polygon FeatureCollections still take the GeoJSON fill path. Storybook serves `src/stories/fixtures/geojson/` and `src/stories/fixtures/pmtiles/`.
5. **Mapbox access token** is a host concern (`mapbox-token` attribute or `window.__RUNTIME_CONFIG__.MAPBOX_TOKEN`). Licensing stays with the host.

| Tier | Rendering | Widgets |
|------|-----------|---------|
| A / lazy map | `<ui9000-map-chart>` + host-provided token + GeoJSON centroids + PMTiles | MapBox / UniversalMap |
| B | Inline D3 web components | bar, line, pie, scatter, KPI, … |

FuseDash `apps/charts` iframe remains a valid host. `canRenderChartType('mapChart')` is **true** (`usageConditions.hostReady`). Hosts must pass `mapbox-token` / `geojson-base-url` / `pmtiles-base-url` (or `__RUNTIME_CONFIG__`) or the widget fails closed with an empty-state reason. `resolveChartTarget` returns `<ui9000-map-chart>`; the renderer forwards those attributes.

## Consequences

### Positive

- Combined D3 resource bundle stays within size budget.
- Map licensing (Mapbox token, usage) stays in the charts / MCP host.
- No Mapbox transitive deps in the Apache-2.0 production dependency set (`license-check --production`).

### Negative

- Hosts must install `mapbox-gl` (or provide it) and a token to render maps.
- Country/state/county **centroid** GeoJSON is not shipped in the package; the host must serve it for the join / bubbles / spikes.
- Choropleth **polygon** geometry is not in those GeoJSON files (they were replaced by points). Hosts must serve `{pmtiles-base-url}/world-countries.pmtiles` (same archives as `client/apps/charts/public/pmtiles`). mapbox-gl ≥ 3.21 native `provider: "pmtiles"`.

## Implementation notes

1. Do **not** `import 'mapbox-gl'` from D3 chart entries, `src/index.ts` eager path is acceptable only because Vite marks `mapbox-gl` external and the map module is a separate entry.
2. Prefer `@fusedashlabs/widgets/lazy/map-chart` in MCP hosts — do not call `registerAllCharts()` just to get the map.
3. Choropleth fills use PMTiles (`provider: "pmtiles"`) keyed on `iso_a3` / `GID_*`, matching FuseDash `MapLayers`. Centroid GeoJSON cannot paint as a fill layer.
4. Leaflet / Albers / RealEstate maps are out of scope for FUS-4000.

## References

- `reports/UI9000_MVP_Plan.md` — P6, task 35
- `client/libs/shared/components/src/Widgets/MapBox/`
- `client/apps/charts/`
- FUS-4000 `[ui9000-widgets / CHART-MapBox]`
