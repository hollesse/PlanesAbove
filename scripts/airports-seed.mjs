// Seeds src/server/modules/airspace/tables/airports.json (airspace-b7kx2, ADR 0021): every airport of the VRS standing data snapshot.
// city = VRS "Location" (fallback "Name") up to the first comma (region/airport suffixes dropped), iata = VRS "IATA". Existing entries (hand corrections) are never overwritten. Usage: node scripts/airports-seed.mjs [dataDir] [--write]
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../src/server/modules/airspace/adapters/vrs-csv.ts';

const dataDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'data';
const write = process.argv.includes('--write');
const tablePath = new URL('../src/server/modules/airspace/tables/airports.json', import.meta.url);
const table = fs.existsSync(tablePath) ? JSON.parse(fs.readFileSync(tablePath, 'utf8')) : {};
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.csv') ? [path.join(dir, e.name)] : []));
const rows = (f) => parseCsv(fs.readFileSync(f, 'utf8')).slice(1);

let added = 0, kept = 0, skipped = 0;
for (const f of files(path.join(dataDir, 'vrs-standing-data/airports/schema-01'))) for (const r of rows(f)) {
  const icao = r[2]?.trim().toUpperCase();
  if (!icao || !/^[A-Z0-9]{4}$/.test(icao)) { skipped++; continue; }
  if (table[icao]) { kept++; continue; }
  const city = (r[4] || r[1] || '').split(',')[0].trim(), iata = (r[3] || '').trim().toUpperCase();
  if (!city) { skipped++; continue; }
  table[icao] = /^[A-Z0-9]{3}$/.test(iata) ? { city, iata } : { city };
  added++;
}
console.log(`${added} airports added, ${kept} existing entries kept, ${skipped} VRS rows skipped (no usable ICAO or city); table now has ${Object.keys(table).length} entries`);
if (write) fs.writeFileSync(tablePath, JSON.stringify(Object.fromEntries(Object.entries(table).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
