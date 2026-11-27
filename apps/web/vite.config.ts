import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');

// Configuration Vite du Site Web (apps/web)
export default defineConfig({
  root: __dirname,
  base: './',
  publicDir: resolve(rootDir, 'public'),
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_TARGET': JSON.stringify('web'),
  },
  server: {
    port: 5173,
    fs: { allow: [rootDir] },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
