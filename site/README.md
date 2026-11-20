# UI 9000 docs site

The documentation site for the charts: an Introduction page, a Spacing page and one page per chart, each with a live
chart, a Settings panel (presets and options), the code to copy, and its data format. It is ported from the UI9000
repo's `site/` and is meant to replace Storybook as the place every chart is shown, once it covers what Storybook
does. Vite + TypeScript + Lit, all already in the repo.

## Run

From the repo root:

```bash
yarn dev:site        # dev server, http://localhost:5180 (the next free port if taken)
yarn build:site      # production build → site/dist (gitignored)
yarn preview:site    # serve the build, http://localhost:5181
yarn typecheck       # the library and the site
```

## Not here yet

- **Color, Typography and Motion pages, and Customize** (the header's gear in UI9000). They show UI9000's Figma
  palette chain, text styles and motion engine, which this repo's charts don't have yet.
- **Charts UI9000's site has no page for**: KPIs, status gauge, maps, graphs, the agents-management widgets, the
  model charts and the playgrounds. The sidebar doesn't list them yet.
- **The checks.** UI9000 runs Playwright checks over every page (`site:check`); they need Playwright as a dev
  dependency here.

## How it is put together

- `src/styles/tokens.css` is UI9000's generated token file, copied as is. The site's colours and type read it
  through `theme.css` (the only file that names colours) and `typography.css` (the only file that names fonts).
  None of its `--ui9000-*` variables is one the charts read, so it styles the site, never a chart.
- Theme: `data-theme` on `<html>` plus `applyWidgetContext` (`src/lib/theme.ts`), the same steps as
  `.storybook/preview.ts`. The header's switch sets it.
- Charts inherit nothing from the site: the site's text styles are set on its own blocks (`base.css`), never on an
  element that holds a chart, which carries `.chart-well`. Give that class to anything new that holds a chart.
- Routes are hash routes: `#/introduction`, `#/foundations/<id>`, `#/charts/<id>`. A chart page keeps its settings
  in the query (`#/charts/bar?preset=multiple-series&showGrid=false`), so a link reproduces the chart.
- Sample data comes from the same fixtures as the Storybook stories (`src/stories/fixtures/`), and the
  Introduction cards render through the stories themselves (`src/lib/stories.ts`), so nothing is copied.
- The code block imports the element's own package entry, `@fusedashlabs/widgets/<name>` (`src/lib/chart-state.ts`).
- `vite.config.ts` marks the site's modules as having side effects: the package's `sideEffects` field lists only
  the library's registering modules, and without this the build drops the imports that define the site's elements.

## Adding a chart page

One file: `src/charts/configs/<chart>.ts`, a `ChartConfig` (`src/charts/types.ts`; copy the shape of `bar.ts`).
`src/charts/index.ts` collects every file in that folder, so the sidebar, the Introduction card, the route and the
search index pick it up with no registration; the chart must be listed in `src/catalog.ts`.

Settings order: preset, choices, switches, text, Scale, then the Header group. A control that changes nothing is
not shown: either always (move it to `hidden`, with what rendering showed as the reason) or in some states
(`hiddenWhen` for the data, `inertWhen` for another setting). Check each control by rendering it.
