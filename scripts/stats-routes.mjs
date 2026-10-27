// Routen-Statistik: npm run stats:routes -- --db data/planesabove.db --days 7 [--json]
// Reads the SQLite file read-only; the evaluation itself lives in src/server/modules/sighting-log/route-stats.ts (loaded via Node's type stripping).
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import Database from 'better-sqlite3';
import { formatRouteStats, routeStats } from '../src/server/modules/sighting-log/route-stats.ts';

const { values } = parseArgs({ options: { db: { type: 'string' }, days: { type: 'string', default: '7' }, json: { type: 'boolean', default: false } } });
const fail = (msg) => { console.error(`stats:routes: ${msg}`); process.exit(1); };
if (!values.db) fail('--db <file> is required');
if (!fs.existsSync(values.db)) fail(`database file not found: ${values.db}`);
const days = Number(values.days);
if (!Number.isFinite(days) || days <= 0) fail('--days must be a positive number');

const db = new Database(values.db, { readonly: true, fileMustExist: true });
try {
  const hasLookups = db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'route_lookups'").get();
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'sightings'").get()) fail('not a PlanesAbove database (no sightings table)');
  const stats = routeStats(hasLookups ? db : { prepare: (sql) => (sql.includes('route_lookups') ? { all: () => [] } : db.prepare(sql)) }, { days, nowMs: Date.now() });
  process.stdout.write(values.json ? JSON.stringify(stats, null, 2) + '\n' : formatRouteStats(stats));
} finally { db.close(); }
