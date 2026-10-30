// @vitest-environment node
// Own airport table (airspace-b7kx2): uniform "Stadt (IATA)" route text regardless of the source.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { createLogger } from '../../../src/server/logger';
import { AdsbdbRouteSource } from '../../../src/server/modules/airspace/adapters/adsbdb-route-source';
import { HexdbRouteSource } from '../../../src/server/modules/airspace/adapters/hexdb-route-source';
import { flightToRoute, pickFlight } from '../../../src/server/modules/airspace/adapters/flightaware-route-source';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';
import { loadIndex, VrsRouteSource } from '../../../src/server/modules/airspace/adapters/vrs-route-source';
import type { Route, RouteSource } from '../../../src/server/modules/airspace/model';
import { formatRoute, RouteService } from '../../../src/server/modules/airspace/route-service';
import { defaultTables, loadTables, type AirportEntry } from '../../../src/server/modules/airspace/typeclass';
import { parseCsv } from '../../../src/server/modules/airspace/adapters/vrs-csv';

const FIX = path.resolve(import.meta.dirname, '../../fixtures');
const fx = (p: string): string => fs.readFileSync(path.join(FIX, p), 'utf8');
const reply = (body: string): Fetch => async () => ({ ok: true, status: 200, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });
const clock = new FakeClock(0);
const log = createLogger(clock, 'debug', () => {});
const adsbdb = () => new AdsbdbRouteSource({ fetch: reply(fx('adsbdb/DLH400.json')), userAgent: 'UA', timeoutMs: 1000, backoffMs: 1, clock, log });
const hexdb = () => new HexdbRouteSource({ fetch: reply(fx('hexdb/DLH400.json')), userAgent: 'UA', timeoutMs: 1000, backoffMs: 1, clock, log });
const TABLE: Record<string, AirportEntry> = { EDDF: { city: 'Frankfurt', iata: 'FRA' }, KJFK: { city: 'New York', iata: 'JFK' }, LPPT: { city: 'Lissabon' } };

describe('adapters set the ICAO code of each airport', () => {
  it('adsbdb: icao_code and iata_code', async () => {
    const r = (await adsbdb().lookup('DLH400')) as Route;
    expect([r.from.icao, r.to.icao, r.from.iata]).toEqual(['EDDF', 'KJFK', 'FRA']);
  });
  it('hexdb: icao and iata', async () => {
    const r = (await hexdb().lookup('DLH400')) as Route;
    expect([r.from.icao, r.to.icao, r.from.iata]).toEqual(['EDDF', 'KJFK', 'FRA']);
  });
  it('vrs snapshot: ICAO column (and IATA)', async () => {
    const idx = loadIndex(path.join(FIX, 'vrs'))!;
    expect([idx.airports.get('EDDF')?.icao, idx.airports.get('EDDF')?.iata]).toEqual(['EDDF', 'FRA']);
    const src = new VrsRouteSource({ fetch: reply(''), dataDir: path.join(FIX, '..'), userAgent: 'x', timeoutMs: 1, clock, log, refreshMs: 1 });
    expect(src).toBeTruthy();
  });
  it('flightaware: code_icao', () => {
    const r = flightToRoute(pickFlight(JSON.parse(fx('flightaware/flights-LHX1HL.json')).flights)) as Route;
    expect([r.from.icao, r.to.icao]).toEqual(['EDDK', 'EDDM']);
  });
});

describe('formatRoute with the airport table', () => {
  it('the same route via adsbdb, hexdb and the VRS snapshot yields the identical text', async () => {
    const idx = loadIndex(path.join(FIX, 'vrs'))!;
    const vrs = { from: idx.airports.get('EDDF')!, to: idx.airports.get('KJFK')! };
    const texts = [(await adsbdb().lookup('DLH400')) as Route, (await hexdb().lookup('DLH400')) as Route, vrs].map((r) => formatRoute(r, TABLE));
    expect(new Set(texts)).toEqual(new Set(['Frankfurt (FRA) → New York (JFK)']));
  });
  it('an airport without IATA is shown without parentheses', () => {
    const r: Route = { from: { name: 'x', city: 'x', icao: 'LPPT' }, to: { name: 'y', city: 'y', icao: 'KJFK' } };
    expect(formatRoute(r, TABLE)).toBe('Lissabon → New York (JFK)');
  });
  it('without a table entry the provider name stays and the ICAO is reported', () => {
    const missing: string[] = [];
    const r: Route = { from: { name: 'x', city: 'Fantasia', icao: 'ZZZZ' }, to: { name: 'y', city: 'y', icao: 'KJFK' } };
    expect(formatRoute(r, TABLE, (i) => missing.push(i))).toBe('Fantasia → New York (JFK)');
    expect(missing).toEqual(['ZZZZ']);
  });
  it('without a table at all nothing changes (provider city)', () => {
    expect(formatRoute({ from: { name: 'a', city: 'A', icao: 'EDDF' }, to: { name: 'b', city: 'B' } })).toBe('A → B');
  });
  it('RouteService warns exactly once per ICAO and process', async () => {
    const warns: Record<string, unknown>[] = [];
    const l = createLogger(clock, 'debug', (line) => { const j = JSON.parse(line); if (j.level === 'warn') warns.push(j); });
    const src: RouteSource = { name: 's', lookup: async () => ({ from: { name: 'x', city: 'Fantasia', icao: 'ZZZZ' }, to: { name: 'y', city: 'Paris', icao: 'LFPG' }, legs: [{ name: 'x', city: 'Fantasia', icao: 'ZZZZ' }, { name: 'y', city: 'Paris', icao: 'LFPG' }], source: 'adsbdb' }) };
    const svc = new RouteService(src, clock, { ttlMs: 0, negativeTtlMs: 0, log: l, airports: TABLE });
    for (let i = 0; i < 3; i++) await svc.routeFor('ABC1', { lat: 0, lon: 0 });
    expect(warns.filter((w) => JSON.stringify(w).includes('ZZZZ'))).toHaveLength(1);
  });
});

describe('airports.json', () => {
  it('is reachable through defaultTables() and valid', () => {
    expect(defaultTables().airports.EDDF).toEqual({ city: 'Frankfurt', iata: 'FRA' });
  });
  it('validation rejects bad key, empty city, bad iata', () => {
    const base = { typeClasses: {}, airlines: {}, airlineLiveries: {} };
    expect(() => loadTables({ ...base, airports: { EDD: { city: 'x' } } })).toThrow(/airports\.EDD/);
    expect(() => loadTables({ ...base, airports: { EDDF: { city: '' } } })).toThrow(/airports\.EDDF/);
    expect(() => loadTables({ ...base, airports: { EDDF: { city: 'x', iata: 'FRAA' } } })).toThrow(/airports\.EDDF/);
    expect(() => loadTables({ ...base, airports: { EDDF: { city: 'x' } } })).not.toThrow();
  });
});

const DATA = process.env.PA_DATA_DIR ?? path.resolve(import.meta.dirname, '../../../data');
const hasData = fs.existsSync(path.join(DATA, 'planesabove.db')) && fs.existsSync(path.join(DATA, 'vrs-standing-data/routes/schema-01'));
describe.skipIf(!hasData)('seed coverage (needs data/ with the sightings DB and the VRS snapshot)', () => {
  it('every ICAO on a VRS route of any sighted callsign is in the table (the seed takes the whole VRS airport list)', () => {
    const files = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(d, e.name)) : e.name.endsWith('.csv') ? [path.join(d, e.name)] : []));
    const db = new Database(path.join(DATA, 'planesabove.db'), { readonly: true });
    const calls = new Set((db.prepare('SELECT DISTINCT callsign FROM sightings WHERE callsign IS NOT NULL').all() as { callsign: string }[]).map((r) => r.callsign.trim().toUpperCase()));
    db.close();
    const missing = new Set<string>();
    const table = defaultTables().airports;
    for (const f of files(path.join(DATA, 'vrs-standing-data/routes/schema-01'))) for (const r of parseCsv(fs.readFileSync(f, 'utf8')).slice(1)) if (calls.has(r[0]?.trim().toUpperCase())) for (const c of r[4]?.split('-') ?? []) if (!table[c.trim().toUpperCase()]) missing.add(c.trim());
    expect([...missing]).toEqual([]);
  });
});
