import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const entries = {
  index: resolve(__dirname, 'src/index.ts'),
  'context/index': resolve(__dirname, 'src/context/index.ts'),
  'components/bar-chart/index': resolve(__dirname, 'src/components/bar-chart/index.ts'),
  'components/line-chart/index': resolve(__dirname, 'src/components/line-chart/index.ts'),
  'components/area-chart/index': resolve(__dirname, 'src/components/area-chart/index.ts'),
  'components/area-grouped-bar-chart/index': resolve(
    __dirname,
    'src/components/area-grouped-bar-chart/index.ts',
  ),
  'components/lollipop/index': resolve(__dirname, 'src/components/lollipop/index.ts'),
  'components/step-line-chart/index': resolve(
    __dirname,
    'src/components/step-line-chart/index.ts',
  ),
  'components/spark-line-chart/index': resolve(
    __dirname,
    'src/components/spark-line-chart/index.ts',
  ),
  'components/spark-area-chart/index': resolve(
    __dirname,
    'src/components/spark-area-chart/index.ts',
  ),
  'components/scatter-sparkline-chart/index': resolve(
    __dirname,
    'src/components/scatter-sparkline-chart/index.ts',
  ),
  'components/chart-renderer/index': resolve(
    __dirname,
    'src/components/chart-renderer/index.ts',
  ),
  'components/histogram-chart/index': resolve(
    __dirname,
    'src/components/histogram-chart/index.ts',
  ),
  'components/punchcard-chart/index': resolve(
    __dirname,
    'src/components/punchcard-chart/index.ts',
  ),
  'components/matrix-chart/index': resolve(
    __dirname,
    'src/components/matrix-chart/index.ts',
  ),
  'components/box-plot-chart/index': resolve(
    __dirname,
    'src/components/box-plot-chart/index.ts',
  ),
  'components/violin-chart/index': resolve(
    __dirname,
    'src/components/violin-chart/index.ts',
  ),
  'components/waterfall-chart/index': resolve(
    __dirname,
    'src/components/waterfall-chart/index.ts',
  ),
  'components/sankey-chart/index': resolve(
    __dirname,
    'src/components/sankey-chart/index.ts',
  ),
  'components/flow-sankey-chart/index': resolve(
    __dirname,
    'src/components/flow-sankey-chart/index.ts',
  ),
  'components/parallel-coordinates-chart/index': resolve(
    __dirname,
    'src/components/parallel-coordinates-chart/index.ts',
  ),
  'components/pie-chart/index': resolve(
    __dirname,
    'src/components/pie-chart/index.ts',
  ),
  'components/band-utilization-chart/index': resolve(
    __dirname,
    'src/components/band-utilization-chart/index.ts',
  ),
  'components/donut-chart/index': resolve(
    __dirname,
    'src/components/donut-chart/index.ts',
  ),
  'components/polar-area-chart/index': resolve(
    __dirname,
    'src/components/polar-area-chart/index.ts',
  ),
  'components/scatter-plot-chart/index': resolve(
    __dirname,
    'src/components/scatter-plot-chart/index.ts',
  ),
  'components/network-graph/index': resolve(
    __dirname,
    'src/components/network-graph/index.ts',
  ),
  'components/bias-variance-tradeoff-chart/index': resolve(
    __dirname,
    'src/components/bias-variance-tradeoff-chart/index.ts',
  ),
  'components/bubble-chart/index': resolve(
    __dirname,
    'src/components/bubble-chart/index.ts',
  ),
  'components/radar-chart/index': resolve(
    __dirname,
    'src/components/radar-chart/index.ts',
  ),
  'components/radial-bar-chart/index': resolve(
    __dirname,
    'src/components/radial-bar-chart/index.ts',
  ),
  'components/treemap-chart/index': resolve(
    __dirname,
    'src/components/treemap-chart/index.ts',
  ),
  'components/partial-dependence-chart/index': resolve(
    __dirname,
    'src/components/partial-dependence-chart/index.ts',
  ),
  'components/kpi-widget/index': resolve(__dirname, 'src/components/kpi-widget/index.ts'),
  'components/loss-indicator/index': resolve(
    __dirname,
    'src/components/loss-indicator/index.ts',
  ),
  'components/status-gauge-widget/index': resolve(
    __dirname,
    'src/components/status-gauge-widget/index.ts',
  ),
  'components/power-path-card/index': resolve(
    __dirname,
    'src/components/power-path-card/index.ts',
  ),
  'components/custom-widget/index': resolve(
    __dirname,
    'src/components/custom-widget/index.ts',
  ),
  'components/inspector/index': resolve(__dirname, 'src/components/inspector/index.ts'),
  'components/gini-impurity-entropy-chart/index': resolve(
    __dirname,
    'src/components/gini-impurity-entropy-chart/index.ts',
  ),
  'components/map-chart/index': resolve(__dirname, 'src/components/map-chart/index.ts'),
  'lazy/index': resolve(__dirname, 'src/lazy/index.ts'),
  'lazy/bar-chart': resolve(__dirname, 'src/lazy/bar-chart.ts'),
  'lazy/line-chart': resolve(__dirname, 'src/lazy/line-chart.ts'),
  'lazy/area-chart': resolve(__dirname, 'src/lazy/area-chart.ts'),
  'lazy/area-grouped-bar-chart': resolve(
    __dirname,
    'src/lazy/area-grouped-bar-chart.ts',
  ),
  'lazy/lollipop': resolve(__dirname, 'src/lazy/lollipop.ts'),
  'lazy/step-line-chart': resolve(__dirname, 'src/lazy/step-line-chart.ts'),
  'lazy/spark-line-chart': resolve(__dirname, 'src/lazy/spark-line-chart.ts'),
  'lazy/spark-area-chart': resolve(__dirname, 'src/lazy/spark-area-chart.ts'),
  'lazy/scatter-sparkline-chart': resolve(
    __dirname,
    'src/lazy/scatter-sparkline-chart.ts',
  ),
  'lazy/chart-renderer': resolve(__dirname, 'src/lazy/chart-renderer.ts'),
  'lazy/histogram-chart': resolve(__dirname, 'src/lazy/histogram-chart.ts'),
  'lazy/punchcard-chart': resolve(__dirname, 'src/lazy/punchcard-chart.ts'),
  'lazy/matrix-chart': resolve(__dirname, 'src/lazy/matrix-chart.ts'),
  'lazy/box-plot-chart': resolve(__dirname, 'src/lazy/box-plot-chart.ts'),
  'lazy/violin-chart': resolve(__dirname, 'src/lazy/violin-chart.ts'),
  'lazy/waterfall-chart': resolve(__dirname, 'src/lazy/waterfall-chart.ts'),
  'lazy/sankey-chart': resolve(__dirname, 'src/lazy/sankey-chart.ts'),
  'lazy/flow-sankey-chart': resolve(
    __dirname,
    'src/lazy/flow-sankey-chart.ts',
  ),
  'lazy/parallel-coordinates-chart': resolve(
    __dirname,
    'src/lazy/parallel-coordinates-chart.ts',
  ),
  'lazy/pie-chart': resolve(__dirname, 'src/lazy/pie-chart.ts'),
  'lazy/band-utilization-chart': resolve(
    __dirname,
    'src/lazy/band-utilization-chart.ts',
  ),
  'lazy/donut-chart': resolve(__dirname, 'src/lazy/donut-chart.ts'),
  'lazy/polar-area-chart': resolve(__dirname, 'src/lazy/polar-area-chart.ts'),
  'lazy/scatter-plot-chart': resolve(__dirname, 'src/lazy/scatter-plot-chart.ts'),
  'lazy/network-graph': resolve(__dirname, 'src/lazy/network-graph.ts'),
  'lazy/bias-variance-tradeoff-chart': resolve(
    __dirname,
    'src/lazy/bias-variance-tradeoff-chart.ts',
  ),
  'lazy/bubble-chart': resolve(__dirname, 'src/lazy/bubble-chart.ts'),
  'lazy/radar-chart': resolve(__dirname, 'src/lazy/radar-chart.ts'),
  'lazy/radial-bar-chart': resolve(__dirname, 'src/lazy/radial-bar-chart.ts'),
  'lazy/treemap-chart': resolve(__dirname, 'src/lazy/treemap-chart.ts'),
  'lazy/partial-dependence-chart': resolve(
    __dirname,
    'src/lazy/partial-dependence-chart.ts',
  ),
  'lazy/kpi-widget': resolve(__dirname, 'src/lazy/kpi-widget.ts'),
  'lazy/loss-indicator': resolve(__dirname, 'src/lazy/loss-indicator.ts'),
  'lazy/status-gauge-widget': resolve(__dirname, 'src/lazy/status-gauge-widget.ts'),
  'lazy/power-path-card': resolve(__dirname, 'src/lazy/power-path-card.ts'),
  'lazy/gini-impurity-entropy-chart': resolve(
    __dirname,
    'src/lazy/gini-impurity-entropy-chart.ts',
  ),
  'lazy/map-chart': resolve(__dirname, 'src/lazy/map-chart.ts'),
  'components/table/index': resolve(__dirname, 'src/components/table/index.ts'),
  'components/text/index': resolve(__dirname, 'src/components/text/index.ts'),
  'components/image/index': resolve(__dirname, 'src/components/image/index.ts'),
  'components/event-timeline/index': resolve(__dirname, 'src/components/event-timeline/index.ts'),
  'components/evidence-panel/index': resolve(__dirname, 'src/components/evidence-panel/index.ts'),
  'components/entity-detail/index': resolve(__dirname, 'src/components/entity-detail/index.ts'),
  'components/text-input/index': resolve(__dirname, 'src/components/text-input/index.ts'),
  'components/number-input/index': resolve(__dirname, 'src/components/number-input/index.ts'),
  'components/select/index': resolve(__dirname, 'src/components/select/index.ts'),
  'components/multi-select/index': resolve(__dirname, 'src/components/multi-select/index.ts'),
  'components/checkbox/index': resolve(__dirname, 'src/components/checkbox/index.ts'),
  'components/date-input/index': resolve(__dirname, 'src/components/date-input/index.ts'),
  'components/button/index': resolve(__dirname, 'src/components/button/index.ts'),
  'components/form/index': resolve(__dirname, 'src/components/form/index.ts'),
  'components/approval-bar/index': resolve(__dirname, 'src/components/approval-bar/index.ts'),
  'catalog/index': resolve(__dirname, 'src/catalog/index.ts'),
  'lazy/table': resolve(__dirname, 'src/lazy/table.ts'),
  'lazy/text': resolve(__dirname, 'src/lazy/text.ts'),
  'lazy/image': resolve(__dirname, 'src/lazy/image.ts'),
  'lazy/event-timeline': resolve(__dirname, 'src/lazy/event-timeline.ts'),
  'lazy/evidence-panel': resolve(__dirname, 'src/lazy/evidence-panel.ts'),
  'lazy/entity-detail': resolve(__dirname, 'src/lazy/entity-detail.ts'),
  'lazy/text-input': resolve(__dirname, 'src/lazy/text-input.ts'),
  'lazy/number-input': resolve(__dirname, 'src/lazy/number-input.ts'),
  'lazy/select': resolve(__dirname, 'src/lazy/select.ts'),
  'lazy/multi-select': resolve(__dirname, 'src/lazy/multi-select.ts'),
  'lazy/checkbox': resolve(__dirname, 'src/lazy/checkbox.ts'),
  'lazy/date-input': resolve(__dirname, 'src/lazy/date-input.ts'),
  'lazy/button': resolve(__dirname, 'src/lazy/button.ts'),
  'lazy/form': resolve(__dirname, 'src/lazy/form.ts'),
  'lazy/approval-bar': resolve(__dirname, 'src/lazy/approval-bar.ts'),
  'lazy/custom-widget': resolve(__dirname, 'src/lazy/custom-widget.ts'),
};

export default defineConfig({
  build: {
    lib: {
      entry: entries,
      formats: ['es'],
    },
    rollupOptions: {
      // KPI uses `lit/directives/style-map.js`. A finite list missed that
      // subpath, so Vite rewrote it to `../../../node_modules/lit-html/...`
      // and hosts (FuseDash rspack, pnpm) could not resolve it.
      // Keep `mapbox-gl` external too — the map entry lazy-imports it as an
      // optional peer (added on main after this PR).
      external: (id) =>
        id === 'lit' ||
        id.startsWith('lit/') ||
        id === 'd3' ||
        id.startsWith('d3-') ||
        id === 'mapbox-gl',
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    minify: false,
  },
  plugins: [
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: false,
      exclude: ['**/*.test.ts', '**/vitest.config.ts'],
    }),
  ],
});
