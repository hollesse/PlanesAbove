// Fotoquellen-Stichprobe (source; run via scripts/photo-sample.mjs, which bundles this with esbuild):
//   node scripts/photo-sample.mjs [--limit 30] [--db data/planesabove.db] [--config config.yaml] [--pause-ms 1500] [--json]
// Takes up to --limit distinct hexes from the `sightings` table (read-only, mixed over the Typklassen, most recent first), resolves each
// registration via hexdb (the log stores none), asks every PhotoSource once with a pause between requests and the configured
// sources.userAgent, and prints the hit rate per source and per Typklasse. Nothing is persisted (ADR 0029). Real network, real requests: keep --limit small.
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import Database from 'better-sqlite3';
import { loadConfig } from '../src/server/config.ts';
import { AirportDataPhotoSource } from '../src/server/modules/airspace/adapters/airport-data-photo-source.ts';
import { CommonsPhotoSource } from '../src/server/modules/airspace/adapters/commons-photo-source.ts';
import { PlanespottersPhotoSource } from '../src/server/modules/airspace/adapters/planespotters-photo-source.ts';

const { values } = parseArgs({ options: { limit: { type: 'string', default: '30' }, db: { type: 'string' }, config: { type: 'string', default: 'config.yaml' }, 'pause-ms': { type: 'string', default: '1500' }, json: { type: 'boolean', default: false } } });
const fail = (msg) => { console.error(`photo-sample: ${msg}`); process.exit(1); };
const limit = Number(values.limit);
const pauseMs = Number(values['pause-ms']);
if (!Number.isInteger(limit) || limit <= 0) fail('--limit must be a positive integer');
if (!Number.isFinite(pauseMs) || pauseMs < 0) fail('--pause-ms must be >= 0');

let userAgent = 'PlanesAbove/0.1 (self-hosted, single household)';
let timeoutMs = 8000;
let dataDir = './data';
if (fs.existsSync(values.config)) { const c = loadConfig(values.config); userAgent = c.sources.userAgent; timeoutMs = c.sources.photo.timeoutMs; dataDir = c.dataDir; } else console.error(`photo-sample: ${values.config} not found, using the default User-Agent`);
if (!/@|https?:\/\//i.test(userAgent)) console.error('photo-sample: WARNING sources.userAgent has no contact (e-mail or URL); set one before sampling Planespotters regularly');
const dbFile = values.db ?? `${dataDir}/planesabove.db`;
if (!fs.existsSync(dbFile)) fail(`database file not found: ${dbFile}`);

const db = new Database(dbFile, { readonly: true, fileMustExist: true });
let rows;
try {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'sightings'").get()) fail('not a PlanesAbove database (no sightings table)');
  rows = db.prepare('SELECT icao24, typklasse, MAX(last_seen_ms) AS last FROM sightings GROUP BY icao24, typklasse ORDER BY last DESC').all();
} finally { db.close(); }

// Mix: round-robin over the Typklassen so Airliner and small aircraft both appear.
const byClass = new Map();
for (const r of rows) { if (!byClass.has(r.typklasse)) byClass.set(r.typklasse, []); byClass.get(r.typklasse).push(r); }
const sample = [];
while (sample.length < limit && [...byClass.values()].some((l) => l.length)) for (const l of byClass.values()) { const r = l.shift(); if (r && sample.length < limit) sample.push(r); }
if (sample.length === 0) fail('the sightings table is empty');

const fetchFn = (url, init) => fetch(url, init);
const o = { fetch: fetchFn, userAgent, timeoutMs };
const sources = [new PlanespottersPhotoSource(o), new CommonsPhotoSource(o), new AirportDataPhotoSource(o)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function registrationOf(hex) {
  try {
    const res = await fetchFn(`https://hexdb.io/api/v1/aircraft/${hex}`, { headers: { 'User-Agent': userAgent, Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return undefined;
    const reg = JSON.parse(await res.text())?.Registration;
    return typeof reg === 'string' && reg.trim() ? reg.trim().toUpperCase() : undefined;
  } catch { return undefined; }
}

const stats = new Map(); // source -> Map(klasse|'ALL' -> {n, hit, unavailable})
const bump = (src, klass, field) => {
  for (const k of [klass, 'ALL']) {
    const m = stats.get(src) ?? stats.set(src, new Map()).get(src);
    const e = m.get(k) ?? m.set(k, { n: 0, hit: 0, unavailable: 0 }).get(k);
    e[field]++;
  }
};
const perPlane = [];
for (const [i, r] of sample.entries()) {
  const registration = await registrationOf(r.icao24);
  await sleep(pauseMs);
  const row = { icao24: r.icao24, typklasse: r.typklasse, registration: registration ?? null, hits: {} };
  for (const s of sources) {
    const res = await s.lookup({ icao24: r.icao24, registration });
    bump(s.name, r.typklasse, 'n');
    if ('unavailable' in res) { bump(s.name, r.typklasse, 'unavailable'); row.hits[s.name] = `unavailable (${res.errorClass ?? '?'})`; } else { if (res.photos.length) bump(s.name, r.typklasse, 'hit'); row.hits[s.name] = res.photos.length; }
    await sleep(pauseMs);
  }
  if (!values.json) console.error(`[${i + 1}/${sample.length}] ${r.icao24} ${r.typklasse} ${registration ?? '-'} ${JSON.stringify(row.hits)}`);
  perPlane.push(row);
}

const classes = [...new Set(sample.map((r) => r.typklasse))].sort();
const cell = (e) => (e && e.n ? `${e.hit}/${e.n} (${Math.round((100 * e.hit) / e.n)}%)${e.unavailable ? ` [${e.unavailable} unavailable]` : ''}` : '-');
if (values.json) process.stdout.write(JSON.stringify({ sampled: sample.length, userAgent, stats: Object.fromEntries([...stats].map(([k, m]) => [k, Object.fromEntries(m)])), perPlane }, null, 2) + '\n');
else {
  const withReg = perPlane.filter((p) => p.registration).length;
  console.log(`\nFotoquellen-Stichprobe: ${sample.length} Flugzeuge (${withReg} mit Kennzeichen via hexdb; commons braucht ein Kennzeichen)`);
  console.log(['Quelle'.padEnd(14), 'gesamt'.padEnd(26), ...classes.map((c) => c.padEnd(26))].join(' '));
  for (const s of sources) { const m = stats.get(s.name); console.log([s.name.padEnd(14), cell(m.get('ALL')).padEnd(26), ...classes.map((c) => cell(m.get(c)).padEnd(26))].join(' ')); }
  const any = perPlane.filter((p) => Object.values(p.hits).some((h) => typeof h === 'number' && h > 0)).length;
  console.log(`\nirgendein Foto (mind. eine Quelle): ${any}/${sample.length} (${Math.round((100 * any) / sample.length)}%)`);
}
