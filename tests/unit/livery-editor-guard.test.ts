// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

// ADR 0035 point 5 / ADR 0037 point 5: the editor never reaches the client bundle or the Docker image.
const MARKERS = ['livery-editor', '__livery-editor'];
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

describe('editor delivery boundary', () => {
  it('.dockerignore excludes tools/', () => {
    expect(fs.readFileSync('.dockerignore', 'utf8').split('\n').map((l) => l.trim().replace(/\/$/, ''))).toContain('tools');
  });
  it('the importgraph of the client entry never reaches tools/', async () => {
    const r = await build({ entryPoints: [path.resolve('src/client/app/main.ts')], bundle: true, write: false, metafile: true, logLevel: 'silent', loader: { '.woff2': 'file', '.png': 'file' }, outdir: 'out-unused' });
    const inputs = Object.keys(r.metafile.inputs);
    expect(inputs.length).toBeGreaterThan(10);
    expect(inputs.filter((i) => i.startsWith('tools/') || i.includes('/tools/'))).toEqual([]);
  });
  it.skipIf(!fs.existsSync('dist'))('the built dist/ carries no editor marker (run after npm run build)', () => {
    const hits = walk('dist').filter((f) => { const txt = fs.readFileSync(f); return MARKERS.some((m) => txt.includes(m)); });
    expect(hits).toEqual([]);
  });
});
