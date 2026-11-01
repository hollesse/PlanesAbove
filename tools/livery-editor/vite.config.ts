import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { liveryWritePlugin } from './write-plugin';

// Local-only dev server (ADR 0035): 127.0.0.1:5174, no production build, imports format/renderer/assets from src/client/ui.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

export default defineConfig({
  root: here,
  plugins: [liveryWritePlugin(repoRoot)],
  server: { host: '127.0.0.1', port: 5174, strictPort: true, fs: { allow: [repoRoot] } },
});
