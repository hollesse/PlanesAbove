import { spawn } from 'node:child_process';
import path from 'node:path';
import type { Plugin } from 'vite';
import { saveLivery } from './save';

export const SAVE_ENDPOINT = '/__livery-editor/save';

/** Vite dev-server plugin: the editor's single write path (ADR 0035). Never part of a client bundle. */
export type Rebuild = (repoRoot: string) => void;
const rebuildAssets: Rebuild = (repoRoot) => { spawn('node', ['scripts/build-assets.mjs'], { cwd: repoRoot, stdio: 'ignore' }); };

export function liveryWritePlugin(repoRoot: string, rebuild: Rebuild = rebuildAssets): Plugin {
  const defaultOut = path.join(repoRoot, 'src/client/ui/assets/liveries');
  return {
    name: 'livery-editor-write',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(SAVE_ENDPOINT, (req, res) => {
        const reply = (status: number, message: string) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ message })); };
        if (req.method !== 'POST') return reply(405, 'Nur POST.');
        let raw = '';
        req.on('data', (c) => { raw += c; if (raw.length > 1_000_000) req.destroy(); });
        req.on('end', () => {
          let body: unknown;
          try { body = JSON.parse(raw); } catch { return reply(400, 'Kein gültiges JSON.'); }
          const outDir = process.env.LIVERY_EDITOR_OUT || defaultOut;
          const r = saveLivery(body, outDir);
          // Rebuild the generated assets only when writing into the repo (a LIVERY_EDITOR_OUT override is a throwaway directory).
          if (r.status === 200 && !process.env.LIVERY_EDITOR_OUT) rebuild(repoRoot);
          reply(r.status, r.message);
        });
      });
    },
  };
}
