# NetworkGraph — D3 port (FUS-4001, FUS-4301)

## Source → target

| FuseDash | ui9000-widgets |
|----------|----------------|
| `Widgets/NetworkGraph` (`useForceGraph`, Redux, fixed 2000×1375 canvas) | `<ui9000-network-graph>` |
| `components/GraphSvg.tsx`, `hooks/useForceGraph.ts` | `render/draw.ts` |
| `components/Legend/Legends.tsx` (two-thumb size filter) | HTML legend in `element/ui9000-network-graph.ts` |
| `components/FocusView.tsx` | `render/focus-view.ts`, `renderFocusHeader` in `element/panels.ts` |
| `components/panels/MetricChart.tsx` | `render/metric-chart.ts` |
| `components/panels/*` (topics, timeline, sidebar, node card) | Lit templates in `element/panels.ts`, CSS in `element/panel-styles.ts` |
| `components/NetworkPanels.styles.ts` colours | `lib/theme.ts` (`GRAPH_PANEL_COLORS`, `GRAPH_FOCUS_COLORS`) |
| `utils/{graphUtils,nodeUtils,linkUtils,filterUtils}.ts` | `lib/domain.ts`, `lib/fit.ts` |
| `utils/{timeline,topics,nodeDetails,series,initials,formatMetric}.ts` | `lib/timeline.ts`, `lib/topics.ts` |
| `components/ProjectDatasetNetwork.tsx`, `DatasetPicker.tsx` | Stay in the host: it fills the `data-control` slot and sets `message` |

## Stack

**D3 only** — `d3-force`, `d3-drag`, `d3-zoom`, `d3-selection`, `d3-scale`, `d3-shape`. No Visx, no `import * as d3`.
Charts are drawn by D3 under `render/`; the panels around them are Lit templates fed by props.

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

| Attribute / slot | Purpose |
|------------------|---------|
| `wheel-zoom` | A plain wheel zooms. Set it on dashboards, never in the chat |
| `plain-background` | The background of the other widgets instead of the design's |
| `message` | Text over the stage while the host has no graph to give |
| `slot="data-control"` | Host control in the top row, between the view toggle and the zoom buttons; left out when there is no room |

## Panels

Each panel appears only when the data has what it shows. The full shape is in
`propsSchema` of `metadata.json`.

| Payload | Adds |
|---------|------|
| none | Topic list from the node types, with their link counts |
| `topics` | Topic list with values and trends; `selected` picks one on open |
| `topics[].metrics`, `ranking` | Details column: metric tiles, chart by period, ranking |
| `date` on nodes or links, two or more dates | Timeline; the graph opens on the latest date |
| `events`, `metrics`, `bio`, `role` on nodes | Focus view arcs and the node card |
| `labels` | The data's own words, and node types in the legend |

| Width of the widget | Layout |
|---------------------|--------|
| 900 px and up | Details in a column beside the graph |
| below 900 px | Details under the graph, folded to one line; the topic list folds to its header |
| below 560 px | Topic list over the graph instead of in the timeline row |
| below 400 px | Topic list above the legend |

## Visual parity (plot)

- Nodes fill a dashed circle on a fixed canvas that the SVG view box scales to the widget
- Node radius from quantile breakpoints over node values (`NODE_SIZES`, 7 buckets)
- Small nodes are rings, larger ones filled; group colours follow `NETWORK_GROUP_PALETTE`
- Every node is named under its circle; names do not overlap each other or other nodes
- A selected node dims the rest, gets a "+" badge and lists its connections beside the graph
- Legend: half-bubble buckets over a tinted track, two-thumb size filter, folded on open

## Layout: fixed canvas

As in the client, the graph is laid out on a fixed canvas and the view box scales
it to the widget, so a resize never touches the layout. A card is read at a glance
rather than watched, so the simulation is stepped to rest before the first paint;
dragging a node restarts it, and a released node eases back inside the circle.

## Interaction never rebuilds the plot

Per the [port-chart skill](../.cursor/skills/port-chart/SKILL.md), only data,
theme and public property changes go through a full render. Everything else is
applied in place through the controller returned by `renderNetworkGraph`:

| Interaction | Path | Cost |
|-------------|------|------|
| Hover / select | `setNetworkGraphActive()` → `refresh()` | attribute writes |
| Legend size filter, timeline | `updateNetworkGraphVisibility()` → `setVisible()` | opacity + `pointer-events` |
| Container resize | `resizeNetworkGraph()` | none: the view box scales |
| Drag / zoom | `d3-drag` / `d3-zoom` | simulation `alphaTarget` |
| Heatmap, focus view | drawn over the graph, which stays laid out underneath | their own draw |

Filtered-out nodes and links **stay in the simulation** — hiding them is a paint
change only, so the layout holds steady and the camera does not jump (client
parity). A resize re-frames the settled layout and never re-runs the force ticks.

`_activeNodeId`, `_range`, `_date` and the other panel state are `@state` because
the panels re-render with them; `chartPropsChanged()` keeps them out of the redraw
path. The heatmap, the focus view and the metric charts redraw only when what they
show changes.

## Chat-safe zoom

By default a plain wheel scrolls the transcript and zoom needs ctrl/cmd + wheel;
hosts opt in to plain-wheel zoom with `wheel-zoom`. Drag-to-pan is ignored over a
node so node dragging still works.

## Host wiring

The client already maps `networkGraphChart` to this element, and `mcp-ui` renders
it in the chat. To take the panels up, hosts pass the graph with its `topics`,
`ranking` and `labels` in `data[0]` and set `wheel-zoom` on dashboards. The dataset
picker of a blank-page network goes in the `data-control` slot.
