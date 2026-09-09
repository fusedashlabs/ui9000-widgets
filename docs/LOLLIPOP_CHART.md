# Lollipop — D3 chat port (FUS-3980)

## Source → target

| FuseDash | ui9000-widgets |
|----------|----------------|
| `Widgets/Lollipop/Vertical` (Visx + Redux) | `<ui9000-lollipop orientation="vertical">` |
| `Widgets/Lollipop/Horizontal` | `orientation="horizontal"` |
| Stacked / grouped Visx variants | multi-series offset stems (chat-simple) |

## Folder layout

Same as [port-chart skill](../.cursor/skills/port-chart/SKILL.md) / LineChart.

## Visual parity (plot)

Matches FuseDash Vertical/Horizontal Lollipop:

- Margins `{ top: 10, right: 3, bottom: 21, left: 40 }`
- Stem width 3, `hexWithAlpha(color, 50)`, tip offset `+2`
- Default marker: **rhombus** (diamond path)
- Y domain `calculateScaleLinearDomain` × 1.2
- Grid/baseline `#afb3bb`, labels `#6c7584` / 11px

Tokens: `src/utils/fusedash-visual.ts`.

## API

```html
<ui9000-lollipop
  data='[{"label":"A","value":42},{"label":"B","value":58}]'
  orientation="vertical"
  marker="rhombus"
  show-grid
  show-tooltip
></ui9000-lollipop>
```

## Stack

**D3 only** (`d3-axis`, `d3-scale`, `d3-selection`). Visx removed.
