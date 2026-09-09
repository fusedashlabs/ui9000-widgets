import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  outputDir: 'storybook-static',
  addons: ['@storybook/addon-essentials', '@storybook/addon-links'],
  staticDirs: [
    { from: '../src/stories/fixtures/geojson', to: '/geojson' },
    { from: '../src/stories/fixtures/pmtiles', to: '/pmtiles' },
  ],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(config) {
    // Root vite.config.ts is library-mode; Storybook needs an app build.
    const plugins = (config.plugins ?? []).flat().filter((plugin) => {
      if (!plugin || typeof plugin !== 'object') return true;
      const name = 'name' in plugin ? String(plugin.name) : '';
      return name !== 'vite:dts' && name !== 'vite:dts:build';
    });

    return {
      ...config,
      plugins,
      // Hosted under https://mcp.ui9000.com/storybook/ — local `yarn storybook` stays `/`.
      base: process.env.STORYBOOK_BASE || config.base || '/',
      build: {
        ...config.build,
        lib: undefined,
        // package.json sideEffects only lists dist/; src CE `index.ts` imports
        // look unused (stories use tag names) and Vite drops them — blank canvas.
        rollupOptions: {
          ...config.build?.rollupOptions,
          treeshake: {
            moduleSideEffects: true,
          },
        },
      },
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [
          ...(config.optimizeDeps?.include ?? []),
          'lit',
          'lit/decorators.js',
          'lit/directives/style-map.js',
          'd3-axis',
          'd3-scale',
          'd3-selection',
          'd3-shape',
          'mapbox-gl',
        ],
      },
    };
  },
};

export default config;
