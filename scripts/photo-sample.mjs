// Launcher: bundles scripts/photo-sample.src.mjs (which imports the TypeScript server modules) with esbuild into node_modules/.cache and runs it.
// Usage: node scripts/photo-sample.mjs [--limit 30] [--db data/planesabove.db] [--config config.yaml] [--pause-ms 1500]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'node_modules', '.cache', 'planesabove');
fs.mkdirSync(outDir, { recursive: true });
const outfile = path.join(outDir, 'photo-sample.bundle.mjs');
await build({ entryPoints: [path.join(here, 'photo-sample.src.mjs')], bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile, packages: 'external', logLevel: 'silent' });
await import(pathToFileURL(outfile).href);
