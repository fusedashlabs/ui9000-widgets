import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(__dirname),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        'custom-widget': resolve(__dirname, 'custom-widget.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
