# StepLineChart — D3 chat port

## Folder layout

```
src/components/step-line-chart/
  index.ts              # public exports
  metadata.json         # props JSON Schema + MCP metadata
  element/
    ui9000-step-line-chart.ts
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
    draw.test.ts
```

## Source → target

| FuseDash | ui9000-widgets |
|----------|----------------|
| `Widgets/StepLineChart/index.tsx` (Visx + Redux) | `<ui9000-step-line-chart>` (D3 + props) |
| `Widgets/StepLineChart/KSPlotChart.tsx` (`grafType="curve"`) | `graf-type="curve"` |
| `Widgets/StepLineChart/ROCCurveChart.tsx` (`grafType="line"`) | `graf-type="line"` |
| `utils/getGroupData.ts` (`groupBy` → groups) | `lib/normalize.ts` (`series[]`) |
| Redux: theme, scale, styleId, `showTooltip` | `WidgetContext` CSS vars / attributes |

## Scope (chat only)

- Display in MCP chat / playground — **not** wired into FuseDash editor
- No `ChartWidgetShell`, WidgetHeader, settings, storytelling or `LimitsDomain`
- Pure D3 (`d3-axis`, `d3-scale`, `d3-selection`, `d3-shape`) — Visx removed

## Visual parity (plot)

- Margins `{ top: 10, right: 1, bottom: 21, left: 40 }`
- **Two x modes**, auto-detected exactly like FuseDash `isXDateMode` (every x
  parses as a date *and* there are ≥2 distinct instants):
  - time → `scaleTime` over the sorted date extent
  - category → `scaleBand` **padding `0.1`** (note: not the LineChart's `-1`),
    points at band centre
- Y domain `calculateScaleLinearDomain(values)` scaled by **1.2**, then `.nice()`
- Steps: `curveStepAfter`, stroke width **1.5**, full opacity, round caps —
  **no alpha, no glow, no markers** (this is what separates it from LineChart)
- Grid `#afb3bb` dashed `1,2` per x value + right edge + y ticks, plus a **solid
  zero baseline**
- Y axis line kept and dashed `1,2`, tick length 4; labels `#6c7584` / 11px
- Hover: dashed `5,2` crosshair in the first series' color, plus an `r=4`
  white-ringed dot per series at the hovered x
- `grafType="curve"` → `#2ecc71` Catmull-Rom "Ideal" curve (logistic ramp, k=10)
  \+ the max-deviation marker (`#2c2d33` pill, inward triangles)
- `grafType="line"` → dashed `5,5` "Random guessing" diagonal in `textMuted`

Tokens live in `src/utils/fusedash-visual.ts` (`FD.step*`).

## Deliberate deviations from FuseDash

1. **Reference overlay is not gated on date mode.** FuseDash returns `[]` from
   `idealData` unless x is a date, which leaves ROC/KS charts with categorical x
   — the common chat payload — with no reference line. Here it renders in both
   modes, deriving the logistic position from the index when x is categorical.
2. **Calendar dates are parsed in local time.** `new Date('2024-01-01')` is
   spec'd as UTC midnight and renders as the previous day west of Greenwich.
   `parseXDate` builds `YYYY-MM-DD` in local time so labels match the payload.
3. **X labels are thinned, not rotated.** `selectTickIndices` drops colliding
   labels and always keeps the last tick; FuseDash instead rotates and resizes
   via `useVisxDynamicAxisLabel`, which needs the editor's measuring pass.
4. **Y-unit label is horizontal, top-left** — same rule as the LineChart port,
   never rotated through the tick column.

## API

```html
<!-- single series (legacy label/value) -->
<ui9000-step-line-chart
  data='[{"label":"Q1","value":20},{"label":"Q2","value":45}]'
  y-label="Units"
></ui9000-step-line-chart>

<!-- multi-series, time axis -->
<ui9000-step-line-chart
  data='{"series":[
    {"id":"plan","name":"Plan","points":[{"x":"2024-01-01","y":20},{"x":"2024-02-01","y":45}]},
    {"id":"actual","name":"Actual","points":[{"x":"2024-01-01","y":14},{"x":"2024-02-01","y":31}]}
  ]}'
></ui9000-step-line-chart>

<!-- KS plot / ROC curve -->
<ui9000-step-line-chart data="…" graf-type="curve"></ui9000-step-line-chart>
<ui9000-step-line-chart data="…" graf-type="line"></ui9000-step-line-chart>
```

| Attribute | Type | Default | Notes |
|-----------|------|---------|-------|
| `data` | JSON | `[]` | `DataPoint[]`, `{points}` or `{series}` |
| `graf-type` | `none \| curve \| line` | `none` | KS / ROC overlay |
| `scale` | `compact \| default \| comfortable` | `default` | |
| `show-grid` / `show-legend` / `show-tooltip` | boolean | `true` | |
| `x-label` / `y-label` | string | — | |

## Optimizations vs FuseDash Visx

1. Tree-shakeable modular D3 imports (no Visx axis/group/shape tree)
2. `requestAnimationFrame`-throttled `ResizeObserver` redraw
3. No Redux subscriptions / `ChartWidgetShell`
4. Tooltip built from Lit text nodes — no `innerHTML` for data
5. Compact tick formatting (K/M/B)
6. Metadata JSON Schema for MCP tool authors

## Metadata

See `src/components/step-line-chart/metadata.json`.
