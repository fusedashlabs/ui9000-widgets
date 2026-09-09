# Barchart — D3 chat port

## Folder layout

```
src/components/bar-chart/
  index.ts              # public exports
  metadata.json         # props JSON Schema + MCP metadata
  element/
    ui9000-bar-chart.ts
    styles.ts
  render/
    draw.ts             # D3 renderer (all six variants)
    index.ts
  lib/
    types.ts
    normalize.ts
    domain.ts
    layout.ts            # horizontal min span / grouped padding
    format.ts
    index.ts
  tests/
    fixtures.ts         # agreed mock fixture
    normalize.test.ts
    draw.test.ts
    metadata.test.ts
```

Shared with the other charts: `src/utils/fuse-palette.ts` (formatting colors),
`src/utils/axis-labels.ts` (truncate + hover tooltip), `src/element/ui9000-chart-base.ts`
(MCP shell: header, legend HTML, axis-label tooltip).

## Stack

The migration ticket lists the stack as Visx, carried over from the FuseDash
source. This package is **D3 only** — Visx is a React renderer and cannot ship
inside a framework-free web component, and `.cursor/skills/port-chart/SKILL.md`
makes it a hard rule. `metadata.json` records `"stack": "d3"`.

## Source → target

FuseDash ships the bar chart as six sibling components picked by
`Barchart/index.tsx` from `orientation` + `groupBy` + `stacked`. Here that
dispatch collapses into two attributes on one element.

| FuseDash | ui9000-widgets |
|----------|----------------|
| `Barchart/VerticalBarChart` | default (single series) |
| `Barchart/HorizontalBarChart` | `orientation="horizontal"` |
| `Barchart/GroupedBarChart` | multi-series, `layout="grouped"` |
| `Barchart/HorizontalGroupedBarChart` | multi-series, `orientation="horizontal"` |
| `Barchart/StackedVerticalBarChart` | multi-series, `layout="stacked"` |
| `Barchart/StackedHorizontalBarChart` | multi-series, `orientation="horizontal" layout="stacked"` |
| `Barchart/utils/getKeys.ts` (`groupBy` → keys) | `lib/normalize.ts` (`series[]`) |
| `GroupedBarChart/utils/getBarPosition.ts` | `lib/domain.ts` `groupedBarOffset` |
| Redux: theme, scale, formatting, `showTooltip` | `WidgetContext` CSS vars / attributes |

`groupBy` is gone: a FuseDash group key becomes a series id, so **series count
decides plain vs grouped/stacked**. One series always renders as the plain bar
chart, whatever `layout` says.

## Chart type keys

`metadata.json` declares the keys a gateway dispatches on, plus a `chartTypeMap`
giving the attributes each one sets:

| `chartType` | Attributes |
|-------------|------------|
| `barChart` | `orientation="vertical"` |
| `barGrouped` | `orientation="vertical" layout="grouped"` |
| `barStacked` | `orientation="vertical" layout="stacked"` |
| `cumulativeBar` | `orientation="vertical" cumulative-line` |
| `barHorizontal` | `orientation="horizontal"` |
| `barHorizontalGrouped` | `orientation="horizontal" layout="grouped"` |
| `barHorizontalStacked` | `orientation="horizontal" layout="stacked"` |

## WidgetContext instead of Redux

There are no Redux imports in package code. Each selector FuseDash used maps to
a CSS custom property set by `applyWidgetContext`, or to an attribute:

| FuseDash selector | Replacement |
|-------------------|-------------|
| `getTheme` → `themeMode` | `--ui9000-mode` |
| `formatting` / group colors | `utils/fuse-palette.ts` → `resolveFormattingColor` |
| `getPageSettings` → `showTooltip` | `show-tooltip` attribute |
| `getWidgetScale` → `scaleFactor` | `scale` attribute → frame padding |
| theme colors | `--ui9000-color-*` (first two series when no explicit color) |
| `getCurrentProjectData` → `projectType` | dropped (editor-only) |

Series colors come from widget `formatting` (FuseDash payloads) or chat
`series[].color`. The WidgetContext theme `primary`/`secondary` apply when no
explicit color is set on the first two series.

`scale` stands in for the Redux widget-scale factor: it tightens or loosens the
frame around the plot rather than zooming the SVG, which is what a fixed-size
chat host needs.

## Scope (chat only)

- Display in MCP chat / playground — **not** wired into FuseDash editor
- No `ChartWidgetShell`, WidgetHeader, settings, storytelling or KPI embedding
- Pure D3 (`d3-axis`, `d3-scale`, `d3-selection`) — Visx removed

## Visual parity (plot)

- Margins `{ top: 10, right: 1, bottom: 21, left: 40 }`; both orientations
  use the shared `LEFT_GUTTER_MARGIN` (56) and truncate Y labels into it via
  `applyLeftGutterYAxisLabels` (same as line chart)
- Category axis is `scaleBand`, `padding 0` — except grouped charts, which take
  a gutter of `2 * 16 / (series * 24 + 2 * 16)` so groups don't touch
- Value domain follows each FuseDash variant:
  - plain vertical `calculateScaleLinearDomain * 1.2`
  - horizontal family `* 1.1`
  - grouped vertical **unpadded**
  - stacked: per-category stack totals + a flat 10% pad on the larger side
  - `.nice()` on top, then the baseline is zero if the domain straddles it,
    otherwise whichever end is nearest zero
- Bar thickness:
  - plain vertical `bandwidth * 0.4`, capped at 40, floor height 6px
  - grouped vertical `floor(clamp(plotWidth / categories / series, 4, 24))`,
    laid out around the group centre by `groupedBarOffset` (1px gaps)
  - stacked vertical `clamp(bandwidth * 0.85, 4, 24)`
  - horizontal rows are 24px tall with 16px gutters (`bandwidth * 24/56` when
    they fit; when they do not, the plot grows and `.chart-scroll` overflows,
    same as FuseDash `hasChartYOverflow`). Grouped horizontal uses 24px bars,
    4px inner gaps, and a 32px band gutter.
- Corner radius 4 on the bar's tip only. In a stack, just the outermost segment
  of each half is rounded; the rest are square so segments read as one column
- Fill is a gradient from the series color to a 0.6-opacity stop — diagonal on
  the plain vertical chart, axis-aligned elsewhere, and mirrored for negatives
  so the solid end always sits at the tip
- Grid `#afb3bb` dashed `1 2` (per category + right edge for vertical, per value
  tick for horizontal) plus a **solid baseline**
- Vertical Y axis line kept and dashed `1 2`, tick length 4; labels `#6c7584` / 11px
- Hover: the category's whole column fills with the animated `#CFD2D6` dot
  pattern under a top-fading mask, plus a 2px guide down its centre
- `cumulative-line` draws FuseDash's `#6d6df7` running total, width 2, with
  `r=3` white-ringed dots, and extends the domain so it fits

Tokens live in `src/utils/fusedash-visual.ts` (`FD.bar*`).

## Deliberate deviations from FuseDash

1. **One element, not six.** FuseDash branches on `WidgetItem` fields in
   `Barchart/index.tsx`; the chat port exposes `orientation` + `layout` and picks
   plain vs grouped from the series count.
2. **Horizontal overflow scrolls, value axis stays pinned.** FuseDash sizes
   the SVG from `categories * (24 + 32)` (plain) or
   `categories * (n×24 + (n−1)×4 + 32)` (grouped) and lets the widget scroll.
   The port does the same: `.chart-scroll` overflows, bars keep the 24px row,
   and the value axis is pinned in `.chart-x-axis` (client `hasChartYOverflow`).
3. **Category labels are thinned, not rotated.** `selectTickIndices` (shared with
   the step line chart) drops colliding labels and always keeps the last tick;
   FuseDash rotates and resizes via `useVisxDynamicAxisLabel`, which needs the
   editor's measuring pass. Y labels (values on vertical, categories on
   horizontal) sit in the shared 56px left gutter and truncate with an ellipsis,
   same as line chart.
4. **Bars are paths, not rects.** Per-corner radii are needed for stack segments,
   which `rx`/`ry` cannot express; FuseDash reaches for the same trick in
   `StackedVerticalBarChart`.
5. **Y-unit label is horizontal, top-left** — same rule as the other ports, never
   rotated through the tick column.
6. **`cumulative-line` is single-series only**, matching where FuseDash actually
   offers it (`VerticalBarChart`).

## API

```html
<!-- single series (legacy label/value) -->
<ui9000-bar-chart
  data='[{"label":"Jan","value":30},{"label":"Feb","value":45}]'
  y-label="Units"
></ui9000-bar-chart>

<!-- grouped -->
<ui9000-bar-chart
  data='{"series":[
    {"id":"north","name":"North","points":[{"x":"Q1","y":32},{"x":"Q2","y":45}]},
    {"id":"south","name":"South","points":[{"x":"Q1","y":24},{"x":"Q2","y":31}]}
  ]}'
></ui9000-bar-chart>

<!-- stacked, horizontal -->
<ui9000-bar-chart data="…" orientation="horizontal" layout="stacked"></ui9000-bar-chart>

<!-- running total overlay -->
<ui9000-bar-chart data="…" cumulative-line></ui9000-bar-chart>
```

| Attribute | Type | Default | Notes |
|-----------|------|---------|-------|
| `data` | JSON | `[]` | `DataPoint[]`, `{points}` or `{series}` |
| `orientation` | `vertical \| horizontal` | `vertical` | |
| `layout` | `grouped \| stacked` | `grouped` | Multi-series only |
| `scale` | `compact \| default \| comfortable` | `default` | |
| `show-grid` / `show-legend` / `show-tooltip` | boolean | `true` | |
| `cumulative-line` | boolean | `false` | Vertical single-series only |
| `x-label` / `y-label` | string | — | |

## Visual check

Every variant is a Storybook story — `src/stories/BarChart.stories.ts`:

```bash
yarn storybook     # Charts/BarChart
```

| Story | Variant |
|-------|---------|
| Default | FuseDash mock (`fixtures/bar.fusedash.json`), vertical |
| Horizontal | plain, one series |
| Grouped / Stacked | FuseDash grouped mock (`fixtures/bar-grouped.fusedash.json`) |
| HorizontalGrouped / HorizontalStacked | grouped mock, horizontal |
| CumulativeLine | running-total overlay on Default fixture |
| Divergent | values spanning zero |
| Compact | `scale` |

FuseDash fixtures live under `src/stories/fixtures/`. Chat-shaped mocks for unit
tests remain in `src/components/bar-chart/tests/fixtures.ts`.
`tests/metadata.test.ts` asserts every declared `chartTypeKeys` entry normalizes
to renderable series.

## Optimizations vs FuseDash Visx

1. Tree-shakeable modular D3 imports (no Visx axis/group/shape tree)
2. `requestAnimationFrame`-throttled `ResizeObserver` redraw
3. No Redux subscriptions / `ChartWidgetShell`
4. Tooltip built from Lit text nodes — no `innerHTML` for data
5. One hover target per chart instead of per-bar listeners
6. Compact tick formatting (K/M/B)
7. Metadata JSON Schema for MCP tool authors

## Metadata

See `src/components/bar-chart/metadata.json`.
