// Launcher: bundles scripts/route-why.src.mjs (which imports the TypeScript server modules) with esbuild into node_modules/.cache and runs it.
// Usage: node scripts/route-why.mjs <CALLSIGN> [--db data/planesabove.db] [--config config.yaml] [--lat --lon --alt-m --track --rate-ms] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'node_modules', '.cache', 'planesabove');
fs.mkdirSync(outDir, { recursive: true });
const outfile = path.join(outDir, 'route-why.bundle.mjs');
await build({ entryPoints: [path.join(here, 'route-why.src.mjs')], bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile, packages: 'external', logLevel: 'silent' });
await import(pathToFileURL(outfile).href);
