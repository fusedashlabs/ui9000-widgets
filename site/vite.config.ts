import { defineConfig, type Plugin } from 'vite';

const siteRoot = decodeURIComponent(new URL('.', import.meta.url).pathname);

/**
 * package.json `sideEffects` lists only the library's registering modules, and Vite marks every other module in the
 * package side-effect free. Rollup would then drop the site's own `import './site-sidebar.js'`-style imports, which
 * define its elements, and leave the pages blank. A transform hook's verdict wins over the resolver's.
 */
const keepSiteSideEffects: Plugin = {
  name: 'site-keep-side-effects',
  transform(code, id) {
    // The code is returned unchanged; `map: null` keeps the source map of the earlier transforms.
    return id.startsWith(`${siteRoot}src/`) ? { code, map: null, moduleSideEffects: true } : null;
  },
};

// Run from the repo root: yarn dev:site
export default defineConfig({
  root: siteRoot,
  base: './',
  publicDir: false,
  plugins: [keepSiteSideEffects],
  server: { port: 5180, strictPort: false, fs: { allow: ['..'] } },
  preview: { port: 5181 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  esbuild: { target: 'es2022' },
});
