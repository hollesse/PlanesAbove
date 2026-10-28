// Lackierungs-Statistik: npm run stats:liveries -- --db data/planesabove.db --days 7 [--json] [--standort <id|unbekannt|alle>]
// Reads the SQLite file read-only; the evaluation itself lives in src/server/modules/sighting-log/livery-stats.ts (loaded via Node's type stripping).
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import Database from 'better-sqlite3';
import { inspectStatsDb, parseStatsParams } from '../src/server/modules/sighting-log/stats-common.ts';
import { formatLiveryStats, liveryStats } from '../src/server/modules/sighting-log/livery-stats.ts';

const { values } = parseArgs({ options: { db: { type: 'string' }, days: { type: 'string', default: '7' }, json: { type: 'boolean', default: false }, standort: { type: 'string' } } });
const fail = (msg) => { console.error(`stats:liveries: ${msg}`); process.exit(1); };
if (!values.db) fail('--db <file> is required');
if (!fs.existsSync(values.db)) fail(`database file not found: ${values.db}`);
const parsed = parseStatsParams({ days: values.days, standort: values.standort });
if (!parsed.ok) fail(parsed.error.replace(/^(days|standort)/, '--$1'));
const { days, standort } = parsed;

const db = new Database(values.db, { readonly: true, fileMustExist: true });
try {
  const prep = inspectStatsDb(db);
  if (!prep.ok) fail(prep.error);
  const stats = liveryStats(db, { days, nowMs: Date.now(), standort, hasPoints: prep.hasPoints });
  process.stdout.write(values.json ? JSON.stringify(stats, null, 2) + '\n' : formatLiveryStats(stats));
} finally { db.close(); }
