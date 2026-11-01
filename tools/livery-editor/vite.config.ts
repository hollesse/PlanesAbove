import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { liveryWritePlugin } from './write-plugin';

// Local-only dev server (ADR 0035): 127.0.0.1:5174, no production build, imports format/renderer/assets from src/client/ui.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

/** ADR 0033 §4 / 0035 §6: the editor reaches the home server only through /api -> PLANESABOVE_HOME_URL; unset means no proxy. */
export function proxyFor(env: Record<string, string | undefined>) {
  const target = env.PLANESABOVE_HOME_URL?.trim();
  return target ? { '/api': { target, changeOrigin: true } } : undefined;
}

export default defineConfig(({ mode }) => {
  // process.env wins over the git-ignored tools/livery-editor/.env.local
  const env = { ...loadEnv(mode, here, 'PLANESABOVE_'), ...(process.env.PLANESABOVE_HOME_URL ? { PLANESABOVE_HOME_URL: process.env.PLANESABOVE_HOME_URL } : {}) };
  return {
    root: here,
    plugins: [liveryWritePlugin(repoRoot)],
    server: { host: '127.0.0.1', port: 5174, strictPort: true, fs: { allow: [repoRoot] }, proxy: proxyFor(env) },
  };
});
