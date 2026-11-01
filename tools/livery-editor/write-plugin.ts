import { spawn } from 'node:child_process';
import path from 'node:path';
import type { Plugin } from 'vite';
import { saveLivery } from './save';
import { saveLogo } from './logo-save';

export const SAVE_ENDPOINT = '/__livery-editor/save';
export const LOGO_ENDPOINT = '/__livery-editor/logo';

/** Vite dev-server plugin: the editor's single write path (ADR 0035). Never part of a client bundle. */
export type Rebuild = (repoRoot: string) => void;
const rebuildAssets: Rebuild = (repoRoot) => { spawn('node', ['scripts/build-assets.mjs'], { cwd: repoRoot, stdio: 'ignore' }); };

export function liveryWritePlugin(repoRoot: string, rebuild: Rebuild = rebuildAssets): Plugin {
  const defaultOut = path.join(repoRoot, 'src/client/ui/assets/liveries');
  const defaultLogos = path.join(repoRoot, 'src/client/ui/assets/svg/logos');
  return {
    name: 'livery-editor-write',
    apply: 'serve',
    configureServer(server) {
      const endpoint = (url: string, limit: number, handle: (body: unknown) => { status: number; message: string }, throwaway: () => string | undefined) => {
        server.middlewares.use(url, (req, res) => {
          const reply = (status: number, payload: object) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(payload)); };
          if (req.method !== 'POST') return reply(405, { message: 'Nur POST.' });
          let raw = '';
          req.on('data', (c) => { raw += c; if (raw.length > limit) req.destroy(); });
          req.on('end', () => {
            let body: unknown;
            try { body = JSON.parse(raw); } catch { return reply(400, { message: 'Kein gültiges JSON.' }); }
            const r = handle(body);
            // Rebuild the generated assets only when writing into the repo (an env override is a throwaway directory).
            if (r.status === 200 && !throwaway()) rebuild(repoRoot);
            reply(r.status, r);
          });
        });
      };
      endpoint(SAVE_ENDPOINT, 1_000_000, (body) => saveLivery(body, process.env.LIVERY_EDITOR_OUT || defaultOut), () => process.env.LIVERY_EDITOR_OUT);
      endpoint(LOGO_ENDPOINT, 1_000_000, (body) => saveLogo(body, process.env.LIVERY_EDITOR_LOGOS_OUT || defaultLogos), () => process.env.LIVERY_EDITOR_LOGOS_OUT);
    },
  };
}
