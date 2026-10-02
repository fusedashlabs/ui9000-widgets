# @fusedashlabs/widgets

Props-only chart **and engine-catalog** web components for **UI9000** MCP chat rendering.

Apache-2.0 · Lit · **D3 only** for charts · no Redux · per-component lazy entry points.

## Catalog (Stage 2)

Stage 3 reads **only** the engine catalog:

```ts
import { loadEngineCatalog, ENGINE_TARGET_IDS } from '@fusedashlabs/widgets/catalog';

const engine = loadEngineCatalog(); // 20 beachhead ids
```

| Tier | What |
|------|------|
| `engine` | Cyber beachhead (graph, map, KPI, bar, histogram, table/text/image, timeline, evidence, entity, form controls). Each has eligibility / disqualify reasons and eval cases. |
| `substrate` | The rest of the BI chart pack (pie, sankey, ROC, …). Published, not selected by the engine. |
| `host` | `custom-widget`, `chart-renderer` — shells, not candidates. |

Installable with no other UI9000 package. FuseDash `apps/charts` still renders its own Widgets/ — that consumer bump is outside this package.

Demos: [mcp.ui9000.com/storybook](https://mcp.ui9000.com/storybook/) · `Engine/Playground` (one story per engine id). New surfaces are proven there, not via `mcp-ui` `generate_*` tools. FuseDash consumer (`apps/charts`) stays open.

## Porting charts

Follow the project skill: [`.cursor/skills/port-chart/SKILL.md`](./.cursor/skills/port-chart/SKILL.md).

**Hard rule:** every chart is rewritten in **D3**. Visx/React plot code from FuseDash is never copied in.

## Charts

Lit + D3 chart web components for MCP chat. **Do not maintain a per-chart table here** — ports must not edit this file.

- Entrypoints: `package.json` → `exports`
- Types / tags / engine metadata: `src/components/*/metadata.json`
- Catalog loader: `src/catalog/`
- Demos: `yarn storybook`
- History: `CHANGELOG.md`

Docs: [THEMING.md](./docs/THEMING.md) · [LINE_CHART.md](./docs/LINE_CHART.md) · [LOLLIPOP_CHART.md](./docs/LOLLIPOP_CHART.md) · [STEP_LINE_CHART.md](./docs/STEP_LINE_CHART.md) · [BAR_CHART.md](./docs/BAR_CHART.md) · [DONUT_GROUP_CHART.md](./docs/DONUT_GROUP_CHART.md) · [MAP_DECISION.md](./docs/MAP_DECISION.md) · [HOST_WIRING_AFTER_PORTS.md](./docs/HOST_WIRING_AFTER_PORTS.md)

## Folder layout (per chart)

```
src/components/<name>/
  index.ts / metadata.json
  element/   # Lit WC + styles
  render/    # D3 draw
  lib/       # types, normalize, domain
  tests/
```

## Install

```bash
yarn add @fusedashlabs/widgets
```

## Quick start

```ts
import { applyWidgetContext } from '@fusedashlabs/widgets/context';
import loadLollipop from '@fusedashlabs/widgets/lazy/lollipop';

applyWidgetContext(document.body, { mode: 'light' });
await loadLollipop();

const el = document.createElement('ui9000-lollipop');
el.setAttribute('data', JSON.stringify([
  { label: 'A', value: 42 },
  { label: 'B', value: 58 },
]));
el.setAttribute('orientation', 'vertical');
document.body.appendChild(el);
```

## Theming

Charts follow the host. Pass `mode: 'light' | 'dark' | 'auto'`. `auto` uses `prefers-color-scheme`. There is no `theme` argument on the chart data.

```ts
import { applyWidgetContext } from '@fusedashlabs/widgets/context';

applyWidgetContext(document.documentElement, { mode: 'auto' });
```

`applyWidgetContext` writes the resolved mode (`light` or `dark`, never `auto`) and the `--ui9000-*` variables. A chart paints dark only after `--ui9000-color-surface` is set. `data-theme` alone does not turn the ink light on the white card fallback.

Precedence for the mode a chart reads: inline `--ui9000-mode` on the element or an ancestor, then computed `--ui9000-mode`, then `data-theme="light"|"dark"`, then `prefers-color-scheme`, then light.

| Variable | Light | Dark |
|---|---|---|
| `--ui9000-mode` | `light` | `dark` |
| `--ui9000-color-surface` | `#ffffff` | `#13161D` |
| `--ui9000-color-surface-muted` | `#f3f4f6` | `#282E37` |
| `--ui9000-color-text` | `#111827` | `#EFF0F1` |
| `--ui9000-color-text-muted` | `#6c7584` | `#A4A9B1` |
| `--ui9000-color-border` | `#e5e7eb` | `#444B57` |
| `--ui9000-color-grid` | `#afb3bb` | `#444B57` |
| `--ui9000-color-primary` | `#473DD9` | `#473DD9` |
| `--ui9000-color-secondary` | `#36C4A5` | `#36C4A5` |
| `--ui9000-color-background` | `transparent` | `transparent` |
| `--ui9000-font-family` | system stack | system stack |

Details: [docs/THEMING.md](./docs/THEMING.md).

## Development

From the monorepo root. Yarn Berry 4.x only.

```bash
corepack enable
yarn install
yarn test:widgets
yarn workspace @fusedashlabs/widgets build
yarn storybook   # http://localhost:6006
yarn workspace @fusedashlabs/widgets dev
```

## Repository

https://github.com/fuselab-creative/ui9000-widgets (`packages/widgets`)

## Publish (maintainers)

Secrets stay on **this** repo (`NPM_TOKEN` already set). Tag from repo root after bumping `packages/widgets/package.json`:

```bash
yarn test:widgets && yarn workspace @fusedashlabs/widgets build
git tag v0.5.1
git push origin v0.5.1
```

`.github/workflows/release.yml` publishes from `packages/widgets`.
