// Lackierungs-Statistik: npm run stats:liveries -- --db data/planesabove.db --days 7 [--json] [--standort <id|unbekannt|alle>]
// Reads the SQLite file read-only; the evaluation itself lives in src/server/modules/sighting-log/livery-stats.ts (loaded via Node's type stripping).
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import Database from 'better-sqlite3';
import { formatLiveryStats, liveryStats } from '../src/server/modules/sighting-log/livery-stats.ts';

const { values } = parseArgs({ options: { db: { type: 'string' }, days: { type: 'string', default: '7' }, json: { type: 'boolean', default: false }, standort: { type: 'string' } } });
const fail = (msg) => { console.error(`stats:liveries: ${msg}`); process.exit(1); };
if (!values.db) fail('--db <file> is required');
if (!fs.existsSync(values.db)) fail(`database file not found: ${values.db}`);
const days = Number(values.days);
if (!Number.isFinite(days) || days <= 0) fail('--days must be a positive number');
let standort;
if (values.standort !== undefined) {
  if (values.standort === 'alle' || values.standort === 'unbekannt') standort = values.standort;
  else if (/^[0-9]+$/.test(values.standort)) standort = Number(values.standort);
  else fail('--standort must be an observation point id, "unbekannt" or "alle"');
}

const db = new Database(values.db, { readonly: true, fileMustExist: true });
try {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'sightings'").get()) fail('not a PlanesAbove database (no sightings table)');
  const hasPoints = Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'observation_points'").get());
  const stats = liveryStats(db, { days, nowMs: Date.now(), standort, hasPoints });
  process.stdout.write(values.json ? JSON.stringify(stats, null, 2) + '\n' : formatLiveryStats(stats));
} finally { db.close(); }
