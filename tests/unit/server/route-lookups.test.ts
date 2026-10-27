// @vitest-environment node
// Routen-Befund (route_lookups): findings per source, conflict detection, the stats evaluation and the CLI.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { LATEST_SCHEMA_VERSION, openDatabase } from '../../../src/server/db';
import { SourceError, type Route, type RouteSource } from '../../../src/server/modules/airspace/model';
import { RouteService } from '../../../src/server/modules/airspace/route-service';
import { SightingRepository } from '../../../src/server/modules/sighting-log/repository';
import { formatRouteStats, routeStats } from '../../../src/server/modules/sighting-log/route-stats';

const POS = { lat: 30, lon: 45 };
const ap = (city: string, lat: number, lon: number) => ({ name: city, city, lat, lon });
const DOH_LON: Route = { from: ap('Doha', 25.27, 51.6), to: ap('London', 51.47, -0.45) };
const DOH_PAR: Route = { from: ap('Doha', 25.27, 51.6), to: ap('Paris', 49.0, 2.55) };
const FAR: Route = { from: ap('Sydney', -33.9, 151.2), to: ap('Auckland', -37, 174.8) };
const fake = (name: string, r: Route | null | 'throw'): RouteSource & { calls: number } => { const s = { name, calls: 0, async lookup() { s.calls++; if (r === 'throw') throw new SourceError('unavailable'); return r; } }; return s; };
const svc = (srcs: RouteSource[], compareAll = false) => new RouteService(srcs, new FakeClock(0), { ttlMs: 3600_000, negativeTtlMs: 600_000, compareAll });

describe('RouteService.lookupFor findings', () => {
  it('distinguishes hit / unknown / unavailable / rejected per source and stops at the first plausible hit (no conflict, no extra calls)', async () => {
    const a = fake('adsbdb', 'throw'), b = fake('hexdb', null), c = fake('vrs', FAR), d = fake('vrs2', DOH_LON), e = fake('late', DOH_PAR);
    const r = await svc([a, b, c, d, e]).lookupFor('X1', POS);
    expect(r?.attempts).toEqual([{ source: 'adsbdb', outcome: 'unavailable' }, { source: 'hexdb', outcome: 'unknown' }, { source: 'vrs', outcome: 'rejected' }, { source: 'vrs2', outcome: 'hit' }]);
    expect(r).toMatchObject({ conflict: false, chosen: 'vrs2', fresh: true });
    expect(e.calls).toBe(0);
  });
  it('cache hits are not fresh and carry no attempts', async () => {
    const s = svc([fake('adsbdb', DOH_LON)]);
    await s.lookupFor('X1', POS);
    expect(await s.lookupFor('X1', POS)).toMatchObject({ fresh: false, attempts: [], info: { source: 'adsbdb' } });
  });
  it('compareAll asks every source, flags differing plausible routes, and still chooses the first in order', async () => {
    const a = fake('adsbdb', DOH_LON), b = fake('vrs', DOH_PAR);
    const r = await svc([a, b], true).lookupFor('X1', POS);
    expect(r?.attempts).toEqual([{ source: 'adsbdb', outcome: 'hit' }, { source: 'vrs', outcome: 'hit' }]);
    expect(r).toMatchObject({ conflict: true, chosen: 'adsbdb' });
    expect(r?.info?.text).toBe('Doha → London');
  });
  it('compareAll: agreeing routes are no conflict', async () => {
    expect((await svc([fake('adsbdb', DOH_LON), fake('vrs', DOH_LON)], true).lookupFor('X1', POS))?.conflict).toBe(false);
  });
  it('all sources unavailable: findings reported, nothing cached', async () => {
    const a = fake('adsbdb', 'throw'); const s = svc([a]);
    expect(await s.lookupFor('X1', POS)).toMatchObject({ info: null, attempts: [{ source: 'adsbdb', outcome: 'unavailable' }] });
    await s.lookupFor('X1', POS);
    expect(a.calls).toBe(2);
  });
});

describe('route_lookups persistence', () => {
  const base = { typklasse: 'x', liveryPresent: false, distanceKm: 1, route: null };
  it('migration 0003 creates route_lookups and accepts any source name', () => {
    const db = openDatabase(':memory:');
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'route_lookups'").get()).toBeTruthy();
  });
  it('recordLookup writes one row per asked source against the visit sighting; chosen and conflict flagged', () => {
    const db = openDatabase(':memory:'); const repo = new SightingRepository(db, 1800_000);
    repo.observe({ ...base, icao24: 'a', slot: 1 }, 1000);
    repo.recordLookup('a', [{ source: 'hexdb', outcome: 'hit' }, { source: 'vrs', outcome: 'hit' }], true, 'hexdb', 1000);
    expect(db.prepare('SELECT source, outcome, conflict, chosen FROM route_lookups ORDER BY id').all()).toEqual([
      { source: 'hexdb', outcome: 'hit', conflict: 1, chosen: 1 }, { source: 'vrs', outcome: 'hit', conflict: 1, chosen: 0 }]);
  });
  it('ignores a lookup for an unknown icao24', () => {
    const db = openDatabase(':memory:'); new SightingRepository(db, 1).recordLookup('zz', [{ source: 'vrs', outcome: 'unknown' }], false, null, 0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM route_lookups').get()).toEqual({ n: 0 });
  });
});

describe('SkyService Takt writes findings, no route text of adsbdb', () => {
  it('records unknown + hit rows once per actual lookup (cache hit records nothing); DB file has no adsbdb route text', async () => {
    const { parseConfig } = await import('../../../src/server/config');
    const { SkyService } = await import('../../../src/server/modules/sky-scene/sky-service');
    const { AudioService } = await import('../../../src/server/modules/sky-scene/audio-service');
    const { FakeSpeechSynthesizer } = await import('../../../src/server/modules/sky-scene/fake-speech');
    const { defaultTables } = await import('../../../src/server/modules/airspace/typeclass');
    const { ScenarioDriver, ScenarioFlightSource, parseScenario } = await import('../../../src/server/mock/scenario');
    const { silentLogger } = await import('../../../src/server/logger');
    const clock = new FakeClock(Date.parse('2026-10-27T10:00:00Z'));
    const driver = new ScenarioDriver(parseScenario(JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps: [{ at: 0, planes: [{ icao24: 'a', distanceKm: 8, bearingDeg: 0, altitudeFt: 36000, speedKt: 450, callsign: 'DLH400', typeCode: 'A20N' }] }] })), clock, clock.now());
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'x.db');
    const db = openDatabase(file);
    const everywhere: Route = { from: { name: 'Zzyzx', city: 'Zzyzx' }, to: { name: 'Qwertyland', city: 'Qwertyland' }, vendorPlausible: true, source: 'adsbdb' };
    const s = new SkyService({
      config: parseConfig('location: { lat: 50.05, lon: 8.57 }\nmode: live\n'), clock, log: silentLogger, flight: new ScenarioFlightSource(driver), tables: defaultTables(), sightings: new SightingRepository(db, 1800_000), buildId: 't', timeZone: 'UTC',
      routes: new RouteService([fake('hexdb', null), fake('adsbdb', everywhere)], clock, { ttlMs: 3600_000, negativeTtlMs: 3600_000 }),
      audio: new AudioService(new FakeSpeechSynthesizer(), { voice: 'v', render: 'lazy', log: silentLogger }),
    });
    await s.tick(); await s.tick();
    expect(db.prepare('SELECT source, outcome, chosen FROM route_lookups ORDER BY id').all()).toEqual([{ source: 'hexdb', outcome: 'unknown', chosen: 0 }, { source: 'adsbdb', outcome: 'hit', chosen: 1 }]);
    db.pragma('wal_checkpoint(TRUNCATE)'); db.close();
    expect(fs.readFileSync(file).includes('Qwertyland')).toBe(false);
  });
});

describe('route_lookups schema, migration and live path (compareAll)', () => {
  it('migration 0003 on a 0002-level DB with sightings: user_version 3, no rows lost, reopen idempotent', async () => {
    const Database = (await import('better-sqlite3')).default;
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'm.db');
    const raw = new Database(file);
    raw.exec((await import('../../../src/server/migrations/0001-sightings')).default);
    raw.exec((await import('../../../src/server/migrations/0002-route-source')).default);
    raw.pragma('user_version = 2');
    raw.exec("INSERT INTO sightings (icao24, typklasse, livery_present, route, closest_distance_km, first_seen_at, last_seen_at, last_seen_ms) VALUES ('a','x',0,'A → B',1,'t','t',1), ('b','x',0,NULL,1,'t','t',2)");
    raw.close();
    const db = openDatabase(file);
    expect(db.pragma('user_version', { simple: true })).toBe(LATEST_SCHEMA_VERSION); // 0003 and every later migration applied
    expect(db.prepare('SELECT icao24, route FROM sightings ORDER BY id').all()).toEqual([{ icao24: 'a', route: 'A → B' }, { icao24: 'b', route: null }]);
    expect(db.prepare('SELECT COUNT(*) AS n FROM route_lookups').get()).toEqual({ n: 0 });
    db.close();
    const again = openDatabase(file);
    expect(again.pragma('user_version', { simple: true })).toBe(LATEST_SCHEMA_VERSION);
    expect(again.prepare('SELECT COUNT(*) AS n FROM sightings').get()).toEqual({ n: 2 });
    again.close();
  });
  it('route_lookups has exactly the whitelisted columns and the lookup indexes', () => {
    const db = openDatabase(':memory:');
    const cols = (db.prepare('PRAGMA table_info(route_lookups)').all() as { name: string }[]).map((c) => c.name);
    expect(cols).toEqual(['id', 'sighting_id', 'source', 'outcome', 'conflict', 'chosen', 'looked_up_at']);
    const idx = (db.prepare('PRAGMA index_list(route_lookups)').all() as { name: string }[]).map((i) => i.name);
    expect(idx).toEqual(expect.arrayContaining(['route_lookups_sighting', 'route_lookups_time']));
  });

  const live = async (chain: RouteSource[], compareAll: boolean, file: string, nowIso = '2026-10-27T10:00:00Z') => {
    const { parseConfig } = await import('../../../src/server/config');
    const { SkyService } = await import('../../../src/server/modules/sky-scene/sky-service');
    const { AudioService } = await import('../../../src/server/modules/sky-scene/audio-service');
    const { FakeSpeechSynthesizer } = await import('../../../src/server/modules/sky-scene/fake-speech');
    const { defaultTables } = await import('../../../src/server/modules/airspace/typeclass');
    const { ScenarioDriver, ScenarioFlightSource, parseScenario } = await import('../../../src/server/mock/scenario');
    const { silentLogger } = await import('../../../src/server/logger');
    const clock = new FakeClock(Date.parse(nowIso));
    const driver = new ScenarioDriver(parseScenario(JSON.stringify({ name: 't', startTime: nowIso, steps: [{ at: 0, planes: [{ icao24: 'a', distanceKm: 8, bearingDeg: 0, altitudeFt: 5000, speedKt: 450, callsign: 'DLH400', typeCode: 'A20N' }] }] })), clock, clock.now());
    const db = openDatabase(file);
    const s = new SkyService({
      config: parseConfig('location: { lat: 50.05, lon: 8.57 }\nmode: live\n'), clock, log: silentLogger, flight: new ScenarioFlightSource(driver), tables: defaultTables(), sightings: new SightingRepository(db, 1800_000), buildId: 't', timeZone: 'UTC',
      routes: new RouteService(chain, clock, { ttlMs: 3600_000, negativeTtlMs: 3600_000, compareAll }),
      audio: new AudioService(new FakeSpeechSynthesizer(), { voice: 'v', render: 'lazy', log: silentLogger }),
    });
    await s.tick();
    return { db, clock };
  };
  const tmpDb = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'l.db');
  const near = (name: string, city: string, lat: number, lon: number) => ({ name, city, lat, lon });
  const ADSB: Route = { from: near('XQZ Zzyzx Intl', 'Zzyzx', 51, 8), to: near('QWE Qwertyland Apt', 'Qwertyland', 49, 9), source: 'adsbdb' };
  const HEX: Route = { from: near('HXA Hexfrom Apt', 'Hexfromville', 50, 7), to: near('HXB Hexto Apt', 'Hextoburg', 50, 10), source: 'adsbdb' };
  const VRS: Route = { from: near('VRA Vrsfrom', 'Vrsfromstadt', 51, 8.5), to: near('VRB Vrsto', 'Vrstostadt', 49, 8.6), source: 'vrs' };

  it('live Takt with compareAll: unavailable, unknown, rejected and two differing hits each get a row; conflict on hits, chosen first, looked_up_at = clock', async () => {
    const { db, clock } = await live([fake('s-down', 'throw'), fake('s-none', null), fake('s-far', FAR), fake('adsbdb', ADSB), fake('hexdb', HEX)], true, ':memory:');
    expect(db.prepare('SELECT source, outcome, conflict, chosen, looked_up_at FROM route_lookups ORDER BY id').all()).toEqual([
      { source: 's-down', outcome: 'unavailable', conflict: 1, chosen: 0, looked_up_at: new Date(clock.now()).toISOString() },
      { source: 's-none', outcome: 'unknown', conflict: 1, chosen: 0, looked_up_at: new Date(clock.now()).toISOString() },
      { source: 's-far', outcome: 'rejected', conflict: 1, chosen: 0, looked_up_at: new Date(clock.now()).toISOString() },
      { source: 'adsbdb', outcome: 'hit', conflict: 1, chosen: 1, looked_up_at: new Date(clock.now()).toISOString() },
      { source: 'hexdb', outcome: 'hit', conflict: 1, chosen: 0, looked_up_at: new Date(clock.now()).toISOString() }]);
  });

  it('licence scan: no adsbdb/hexdb airport code or route text in the DB file; VRS route text only in sightings.route', async () => {
    const file = tmpDb();
    const { db } = await live([fake('vrs', VRS), fake('adsbdb', ADSB), fake('hexdb', HEX)], true, file);
    expect(db.prepare('SELECT route, route_source AS s FROM sightings').get()).toEqual({ route: 'Vrsfromstadt → Vrstostadt', s: 'vrs' });
    const lookups = JSON.stringify(db.prepare('SELECT * FROM route_lookups').all());
    const sightingsNoRoute = JSON.stringify((db.prepare('SELECT * FROM sightings').all() as Record<string, unknown>[]).map(({ route, ...rest }) => rest));
    for (const t of ['Vrsfromstadt', 'Vrstostadt', 'VRA', 'VRB']) { expect(lookups).not.toContain(t); expect(sightingsNoRoute).not.toContain(t); }
    db.pragma('wal_checkpoint(TRUNCATE)'); db.close();
    const bytes = fs.readFileSync(file);
    for (const t of ['XQZ', 'Zzyzx', 'QWE', 'Qwertyland', 'HXA', 'HXB', 'Hexfromville', 'Hextoburg', 'Hexfrom', 'Hexto']) expect(bytes.includes(t), t).toBe(false);
    expect(bytes.includes('Vrsfromstadt → Vrstostadt')).toBe(true);
  });
});

describe('routeStats + CLI', () => {
  const NOW = Date.parse('2026-10-27T12:00:00Z');
  const seed = () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 's.db');
    const db = openDatabase(file); const repo = new SightingRepository(db, 1800_000);
    const b = { typklasse: 'narrow', liveryPresent: false, distanceKm: 1, route: null };
    repo.observe({ ...b, icao24: 'v', callsign: 'DLH400', airline: 'Lufthansa', slot: 1, route: 'A → B', routeSource: 'vrs' }, NOW - 3600_000);
    repo.recordLookup('v', [{ source: 'adsbdb', outcome: 'unavailable' }, { source: 'vrs', outcome: 'hit' }], false, 'vrs', NOW - 3600_000);
    repo.observe({ ...b, icao24: 'n', callsign: 'RYR12A', airline: 'Ryanair', slot: 2 }, NOW - 7200_000);
    repo.recordLookup('n', [{ source: 'adsbdb', outcome: 'unknown' }, { source: 'vrs', outcome: 'unknown' }], false, null, NOW - 7200_000);
    repo.observe({ ...b, icao24: 'c', callsign: 'DLH9', slot: 1, routeSource: 'adsbdb' }, NOW - 1000);
    repo.recordLookup('c', [{ source: 'adsbdb', outcome: 'hit' }, { source: 'hexdb', outcome: 'hit' }], true, 'adsbdb', NOW - 1000);
    repo.observe({ ...b, icao24: 'noslot', callsign: 'XXX1' }, NOW - 1000);
    repo.observe({ ...b, icao24: 'old', callsign: 'OLD1', slot: 1 }, NOW - 30 * 86_400_000);
    db.pragma('wal_checkpoint(TRUNCATE)');
    return { db, file };
  };
  it('counts per day, per source, unknown list, airline share and conflicts - slot sightings in the window only', () => {
    const { db } = seed();
    const s = routeStats(db, { days: 7, nowMs: NOW });
    expect(s.days).toEqual([{ date: '2026-10-27', total: 3, vrs: 1, adsbdb: 1, other: 0, none: 1, knownShare: 0.667 }]);
    expect(s.sources).toEqual([
      { source: 'adsbdb', hit: 1, unknown: 1, unavailable: 1, rejected: 0, chosen: 1 },
      { source: 'hexdb', hit: 1, unknown: 0, unavailable: 0, rejected: 0, chosen: 0 },
      { source: 'vrs', hit: 1, unknown: 1, unavailable: 0, rejected: 0, chosen: 1 }]);
    expect(s.unknown).toEqual([{ time: new Date(NOW - 7200_000).toISOString(), callsign: 'RYR12A', airline: 'Ryanair', typklasse: 'narrow' }]);
    expect(s.airlines[0]).toEqual({ prefix: 'RYR', total: 1, unknown: 1, unknownShare: 1 });
    expect(s.airlines[1]).toEqual({ prefix: 'DLH', total: 2, unknown: 0, unknownShare: 0 });
    expect(s.conflicts).toEqual([{ time: new Date(NOW - 1000).toISOString(), callsign: 'DLH9', sources: ['adsbdb', 'hexdb'], chosen: 'adsbdb' }]);
    expect(formatRouteStats(s)).toContain('RYR12A');
  });
  const cli = (...args: string[]) => spawnSync(process.execPath, [path.resolve(import.meta.dirname, '../../../scripts/stats-routes.mjs'), ...args], { encoding: 'utf8' });
  it('CLI --json has the stable keys days, sources, unknown, airlines, conflicts', () => {
    const { file } = seed();
    const r = cli('--db', file, '--days', '7', '--json');
    expect(r.status).toBe(0);
    expect(Object.keys(JSON.parse(r.stdout))).toEqual(['days', 'sources', 'unknown', 'airlines', 'conflicts']);
  });
  it('CLI text output works; missing --db or missing file exits non-zero', () => {
    const { file } = seed();
    expect(cli('--db', file).stdout).toContain('Routen je Tag');
    expect(cli().status).not.toBe(0);
    expect(cli('--db', file + '.nope').status).not.toBe(0);
  });
  it('CLI tolerates a database from before migration 0003 (no route_lookups)', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'old.db');
    const db = openDatabase(file); db.exec('DROP TABLE route_lookups'); db.close();
    expect(cli('--db', file, '--json').status).toBe(0);
  });
});
