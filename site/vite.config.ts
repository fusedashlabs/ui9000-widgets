import { cpSync, createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const siteRoot = decodeURIComponent(new URL('.', import.meta.url).pathname);
const repoRoot = join(siteRoot, '..');

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

/** The Map page's files, the same ones Storybook serves: country centroids and the country shapes as vector tiles. */
const MAP_FILES: Record<string, string> = {
  geojson: 'src/stories/fixtures/geojson',
  pmtiles: 'src/stories/fixtures/pmtiles',
};

const TYPES: Record<string, string> = { json: 'application/json', pmtiles: 'application/octet-stream' };

/**
 * Serves the map files at /geojson/ and /pmtiles/ in dev and copies them into the build next to index.html. PMTiles
 * are read in byte ranges, so the dev handler answers Range requests.
 */
const mapFiles: Plugin = {
  name: 'site-map-files',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const match = /^\/(geojson|pmtiles)\/([\w.-]+)$/.exec((req.url ?? '').split('?')[0]);
      const file = match && join(repoRoot, MAP_FILES[match[1]], match[2]);
      if (!file || !existsSync(file)) return next();
      const size = statSync(file).size;
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', TYPES[file.split('.').pop() ?? ''] ?? 'application/octet-stream');
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
      if (!range) {
        res.setHeader('Content-Length', size);
        createReadStream(file).pipe(res);
        return;
      }
      // `bytes=-500` is the last 500 bytes; `bytes=100-` runs to the end.
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', end - start + 1);
      createReadStream(file, { start, end }).pipe(res);
    });
  },
  writeBundle(options) {
    for (const [folder, source] of Object.entries(MAP_FILES)) {
      cpSync(join(repoRoot, source), join(options.dir ?? join(siteRoot, 'dist'), folder), { recursive: true });
    }
  },
};

// Run from the repo root: yarn dev:site
export default defineConfig({
  root: siteRoot,
  base: './',
  publicDir: false,
  // The repo's .env, as for Storybook: the map reads VITE_MAPBOX_TOKEN and VITE_MAPBOX_DARK_TOKEN from it.
  envDir: repoRoot,
  plugins: [keepSiteSideEffects, mapFiles],
  server: { port: 5180, strictPort: false, fs: { allow: ['..'] } },
  preview: { port: 5181 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  esbuild: { target: 'es2022' },
});
