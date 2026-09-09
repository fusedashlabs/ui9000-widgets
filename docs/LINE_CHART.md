# LineChart — D3 chat port (FUS-3978)

## Folder layout

```
src/components/line-chart/
  index.ts              # public exports
  metadata.json         # props JSON Schema + MCP metadata
  element/
    ui9000-line-chart.ts
    styles.ts
  render/
    draw.ts             # D3 renderer
    index.ts
  lib/
    types.ts
    normalize.ts
    domain.ts
    format.ts
    index.ts
  tests/
    normalize.test.ts
```

## Source → target

| FuseDash | ui9000-widgets |
|----------|----------------|
| `Widgets/LineChart/SingleLineChart` (Visx + Redux) | `<ui9000-line-chart>` (D3 + props) |
| `Widgets/LineChart/GroupedLineChart` | same component via `series[]` |
| Redux: theme, scale, styleId | `WidgetContext` CSS vars / attributes |

## Scope (v1 — chat only)

- Display in MCP chat / playground — **not** wired into FuseDash editor
- No WidgetHeader, settings, storytelling, legend chrome from FuseDash
- Pure D3 (`d3-axis`, `d3-scale`, `d3-selection`, `d3-shape`) — Visx removed

## Visual parity (plot)

Matches FuseDash new-design LineChart:

- Margins `{ top: 10, right: 1, bottom: 21, left: 40 }`
- `scaleBand` padding `-1`, points at band center
- Series `#473DD9`, stroke alpha 80%, width 2, glow filter
- Default markers: **donut** (hollow)
- Grid/axes `#afb3bb` dashed, labels `#6c7584` / 11px
- Default curve: **linear** (Visx `LinePath` default)

Tokens live in `src/utils/fusedash-visual.ts`.

## API

```html
<!-- single series (legacy) -->
<ui9000-line-chart
  data='[{"label":"Jan","value":42},{"label":"Feb","value":58}]'
  curve="linear"
  marker="donut"
  show-grid
  y-label="Revenue"
></ui9000-line-chart>

<!-- multi-series -->
<ui9000-line-chart
  data='{"series":[{"id":"a","name":"A","points":[{"x":"Jan","y":10},{"x":"Feb","y":14}]},{"id":"b","name":"B","points":[{"x":"Jan","y":8},{"x":"Feb","y":11}]}]}'
></ui9000-line-chart>
```

## Optimizations vs FuseDash Visx

1. Tree-shakeable modular D3 imports (no full Visx axis/group/shape tree)
2. `requestAnimationFrame` throttle on resize
3. No Redux subscriptions / ChartWidgetShell
4. Compact tick formatting (K/M/B)
5. Optional area fill only for single series (cheaper path)
6. Metadata JSON Schema for MCP tool authors

## Metadata

See `src/components/line-chart/metadata.json`.
