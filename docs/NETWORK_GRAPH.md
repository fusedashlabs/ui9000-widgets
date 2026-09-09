# NetworkGraph — D3 chat port (FUS-4001)

## Source → target

| FuseDash | ui9000-widgets |
|----------|----------------|
| `Widgets/NetworkGraph` (`useForceGraph`, Redux, fixed 2000×1375 canvas) | `<ui9000-network-graph>` |
| `components/GraphSvg.tsx` | `render/draw.ts` |
| `components/Legend/Legends.tsx` (two-thumb size filter) | HTML legend in `element/ui9000-network-graph.ts` |
| `utils/{graphUtils,nodeUtils,linkUtils,filterUtils}.ts` | `lib/domain.ts` |
| `data/const.ts` | `lib/domain.ts` colour/size tokens |

## Stack

**D3 only** — `d3-force`, `d3-drag`, `d3-zoom`, `d3-selection`. No Visx, no `import * as d3`.

## API

```html
<ui9000-network-graph
  data='{"nodes":[{"id":"a","label":"A","value":10,"type":"cloud"}],
         "links":[{"source":"a","target":"b","value":1200}]}'
  chart-title="Exposure network"
  show-legend
  show-tooltip
></ui9000-network-graph>
```

Also accepts a FuseDash widget payload (graph in `data[0]`) and a bare links array,
from which the nodes are derived. Caps: `MAX_NETWORK_NODES` 250, `MAX_NETWORK_LINKS` 600.

## Visual parity (plot)

- Node radius from quantile breakpoints over node values (`NODE_SIZES`, 7 buckets)
- Blue bloom + dark radial shadow under each node, white inner / `#473DD9` outer ring
- Labels always shown above `md`; otherwise on hover, selection, or adjacency
- Selected node fills black, its neighbours bold, its links weighted by value
- Link value pills rotate upright along the stroke
- Legend: half-bubble buckets over a tinted track, two-thumb size filter

## Layout: fixed canvas → chat container

The client lays out on a fixed 2000×1375 canvas and zooms into it. Chat gives the
chart its container instead, so the simulation runs in **container coordinates**
with the spatial forces scaled against `FORCE_CANVAS_REFERENCE`. A chat card is
read at a glance rather than watched, so the simulation is stepped to rest
(`PRESETTLE_TICKS`) before the first paint and then left idle; dragging a node
restarts it, as in the client.

## Interaction never rebuilds the plot

Per the [port-chart skill](../.cursor/skills/port-chart/SKILL.md), only data,
theme and public property changes go through a full render. Everything else is
applied in place through the controller returned by `renderNetworkGraph`:

| Interaction | Path | Cost |
|-------------|------|------|
| Hover / select | draw-closure state → `applyState()` | attribute writes |
| Legend size filter | `updateNetworkGraphVisibility()` → `applyVisibility()` | opacity + `pointer-events` |
| Container resize | `resizeNetworkGraph()` → `resize()` | `viewBox`, force targets, camera |
| Drag / zoom | `d3-drag` / `d3-zoom` | simulation `alphaTarget` |

Filtered-out nodes and links **stay in the simulation** — hiding them is a paint
change only, so the layout holds steady and the camera does not jump (client
parity). A resize re-frames the settled layout and never re-runs the force ticks.

`_activeNodeId` on the element is a plain field, not `@state`, so selection
cannot trigger a Lit update; `_range` is `@state` because the legend chrome has
to re-render, and `chartPropsChanged()` keeps it out of the redraw path.

## Chat-safe zoom

Plain wheel scrolls the transcript; zoom needs ctrl/cmd + wheel. Drag-to-pan is
ignored over a node so node dragging still works.

## Follow-up — host wiring (not in this PR)

`networkGraphChart` is registered in this package (`metadata.json`,
`src/lazy/index.ts`, package exports, and `chart-renderer` registry) but is
**not yet wired into the FuseDash host**, so it will not render inline until the
client side lands. That change belongs in the `fusedash` / `mcp-ui` repos, not
here:

- `mcp-ui/src/mcp-app/chartMeta.ts` — add the `networkGraphChart` entry
- `Widgets/chartTypeRegistry.ts` — map the chart type to the package element
- `mapWidgetToPackageData.ts` — pass the widget graph through as `data`
- `Ui9000PackageChartHost.tsx` — no change expected; the element is self-sizing
- Package-side dispatcher: already covered by `chart-renderer` once hosts load
  `@fusedashlabs/widgets` chart-renderer / lazy entry

Tracked as a follow-up to FUS-4001.
