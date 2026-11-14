import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Offline build: one self-contained HTML file (all JS, CSS and data inlined) that opens by double-click (file://).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  publicDir: false,
  build: { outDir: 'dist-offline', emptyOutDir: true, chunkSizeWarningLimit: 5000 },
});
