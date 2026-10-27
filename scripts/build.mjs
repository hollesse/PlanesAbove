// Builds the deployable artefacts into dist/: the kiosk client (esbuild, ES2020 / Safari 16, ADR 0004) and the Node service bundle.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });

await build({
  entryPoints: { app: path.join(root, 'src/client/app/main.ts') },
  outdir: path.join(dist, 'client'),
  bundle: true,
  minify: true,
  target: ['es2020', 'safari16'],
  loader: { '.woff2': 'file', '.png': 'file' },
  assetNames: 'assets/[name]-[hash]',
  publicPath: '/',
  logLevel: 'warning',
});

const clientDir = path.join(dist, 'client');
const hash = crypto.createHash('sha256');
for (const f of ['app.js', 'app.css']) hash.update(fs.readFileSync(path.join(clientDir, f)));
const buildId = hash.digest('hex').slice(0, 12);
fs.writeFileSync(path.join(clientDir, 'build-id.txt'), buildId + '\n');
fs.writeFileSync(path.join(clientDir, 'index.html'), fs.readFileSync(path.join(root, 'src/client/app/index.html'), 'utf8').replace('__BUILD_ID__', buildId));

await build({
  entryPoints: { server: path.join(root, 'src/server/main.ts') },
  outdir: path.join(dist, 'server'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['better-sqlite3'],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  outExtension: { '.js': '.mjs' },
  logLevel: 'warning',
});
console.log(`[build] dist/client (build ${buildId}), dist/server/server.mjs`);
