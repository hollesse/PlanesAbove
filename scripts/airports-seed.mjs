// Seeds src/server/modules/airspace/tables/airports.json (airspace-b7kx2): every airport on a VRS route of a callsign in the sightings DB.
// city = VRS "Location", iata = VRS "IATA". Existing entries (hand corrections) are never overwritten. Usage: node scripts/airports-seed.mjs [dataDir] [--write]
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { parseCsv } from '../src/server/modules/airspace/adapters/vrs-csv.ts';

// Fixed cutoff so the seed (and the coverage test) stays reproducible while the live DB keeps growing; raise it together with a re-seed.
const SEED_CUTOFF = '2026-10-27T20:40:00.000Z';
const dataDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'data';
const write = process.argv.includes('--write');
const tablePath = new URL('../src/server/modules/airspace/tables/airports.json', import.meta.url);
const table = fs.existsSync(tablePath) ? JSON.parse(fs.readFileSync(tablePath, 'utf8')) : {};
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.csv') ? [path.join(dir, e.name)] : []));
const rows = (f) => parseCsv(fs.readFileSync(f, 'utf8')).slice(1);

const callsigns = new Set(new Database(path.join(dataDir, 'planesabove.db'), { readonly: true }).prepare('SELECT DISTINCT callsign FROM sightings WHERE callsign IS NOT NULL AND first_seen_at <= ?').all(SEED_CUTOFF).map((r) => r.callsign.trim().toUpperCase()));
const needed = new Set();
for (const f of files(path.join(dataDir, 'vrs-standing-data/routes/schema-01'))) for (const r of rows(f)) if (callsigns.has(r[0]?.trim().toUpperCase())) for (const c of r[4]?.split('-') ?? []) needed.add(c.trim().toUpperCase());
const vrs = new Map();
for (const f of files(path.join(dataDir, 'vrs-standing-data/airports/schema-01'))) for (const r of rows(f)) { const icao = r[2]?.trim().toUpperCase(); if (icao) vrs.set(icao, { city: (r[4] || r[1] || '').trim(), iata: (r[3] || '').trim() }); }
let added = 0; const missing = [];
for (const icao of [...needed].sort()) {
  if (table[icao]) continue;
  const v = vrs.get(icao);
  if (!v?.city) { missing.push(icao); continue; }
  table[icao] = v.iata ? { city: v.city, iata: v.iata } : { city: v.city };
  added++;
}
console.log(`${needed.size} airport codes on routes of ${callsigns.size} callsigns; ${added} added, missing in VRS: ${missing.join(' ') || 'none'}`);
if (write) fs.writeFileSync(tablePath, JSON.stringify(Object.fromEntries(Object.entries(table).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
