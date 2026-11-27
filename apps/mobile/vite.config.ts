import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');

// Configuration Vite de l'Application Mobile Native (apps/mobile)
export default defineConfig({
  root: __dirname,
  base: './',
  publicDir: resolve(rootDir, 'public'),
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_TARGET': JSON.stringify('mobile'),
  },
  server: {
    port: 5174,
    fs: { allow: [rootDir] },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
