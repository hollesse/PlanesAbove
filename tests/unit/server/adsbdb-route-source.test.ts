// @vitest-environment node
// adsbdb live route source (ADR 0016). Fixtures QTR56H/DLH400 recorded 2026-10-27 from api.adsbdb.com; error cases are constructed. All tests offline.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { createLogger } from '../../../src/server/logger';
import { AdsbdbRouteSource } from '../../../src/server/modules/airspace/adapters/adsbdb-route-source';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';
import { SourceError, type Route, type RouteSource } from '../../../src/server/modules/airspace/model';
import { RouteService } from '../../../src/server/modules/airspace/route-service';
import { openDatabase } from '../../../src/server/db';
import { SightingRepository } from '../../../src/server/modules/sighting-log/repository';

const FIX = path.resolve(import.meta.dirname, '../../fixtures/adsbdb');
const fixture = (n: string): string => fs.readFileSync(path.join(FIX, n + '.json'), 'utf8');
const reply = (status: number, body: string): Fetch => async () => ({ ok: status >= 200 && status < 300, status, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });

beforeEach(() => { vi.stubGlobal('fetch', () => { throw new Error('real network access in a test'); }); });
afterEach(() => { vi.unstubAllGlobals(); });

function mk(f: Fetch, backoffMs = 300_000) {
  const clock = new FakeClock(0);
  const lines: Record<string, unknown>[] = [];
  const log = createLogger(clock, 'debug', (l) => lines.push(JSON.parse(l)));
  const src = new AdsbdbRouteSource({ fetch: f, userAgent: 'UA-test', timeoutMs: 1000, backoffMs, clock, log });
  return { src, clock, lines };
}

describe('AdsbdbRouteSource', () => {
  it('calls GET /v0/callsign/{callsign} with the configured User-Agent and URL-encodes the callsign', async () => {
    const seen: { url: string; headers?: Record<string, string>; method?: string }[] = [];
    const { src } = mk(async (url, init) => { seen.push({ url, headers: init?.headers, method: init?.method }); return { ok: true, status: 200, text: async () => fixture('QTR56H'), arrayBuffer: async () => new ArrayBuffer(0) }; });
    await src.lookup('QTR56H');
    await src.lookup('A B/1');
    expect(seen[0].url).toBe('https://api.adsbdb.com/v0/callsign/QTR56H');
    expect(seen[1].url).toBe('https://api.adsbdb.com/v0/callsign/A%20B%2F1');
    expect(seen[0].headers?.['User-Agent']).toBe('UA-test');
    expect(seen[0].method ?? 'GET').toBe('GET');
  });
  it('recorded QTR56H: Doha (OTHH) -> London (EGLL), source adsbdb', async () => {
    const r = await mk(reply(200, fixture('QTR56H'))).src.lookup('QTR56H');
    expect(r).toMatchObject({ source: 'adsbdb', from: { city: 'Doha' }, to: { city: 'London' } });
    expect(r?.from.lat).toBeCloseTo(25.27, 1);
    expect(r?.to.lat).toBeCloseTo(51.47, 0);
  });
  it('recorded DLH400: Frankfurt (EDDF) -> New York (KJFK)', async () => {
    const r = await mk(reply(200, fixture('DLH400'))).src.lookup('DLH400');
    expect(r).toMatchObject({ from: { city: 'Frankfurt am Main' }, to: { city: 'New York' } });
  });
  it('constructed: 404 unknown callsign is unknown (null)', async () => {
    expect(await mk(reply(404, '{"response":"unknown callsign"}')).src.lookup('XYZ1')).toBeNull();
  });
  it('constructed: 429, 5xx, timeout, broken JSON, missing coordinates are unavailable (throw SourceError)', async () => {
    const noCoords = JSON.stringify({ response: { flightroute: { origin: { icao_code: 'A', municipality: 'A' }, destination: { icao_code: 'B', municipality: 'B', latitude: 1, longitude: 2 } } } });
    const timeout: Fetch = async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); };
    for (const [f, cls] of [[reply(429, ''), 'http-429'], [reply(503, ''), 'http-5xx'], [timeout, 'timeout'], [reply(200, '{nope'), 'parse'], [reply(200, noCoords), 'parse']] as const) {
      await expect(mk(f).src.lookup('X')).rejects.toMatchObject({ errorClass: cls });
    }
  });
  it('after 429 adsbdb is not called for backoffMinutes (fake clock), then asked again; warn logged once', async () => {
    let calls = 0; let status = 429;
    const { src, clock, lines } = mk(async () => { calls++; return { ok: status === 200, status, text: async () => (status === 200 ? fixture('QTR56H') : ''), arrayBuffer: async () => new ArrayBuffer(0) }; });
    await expect(src.lookup('A')).rejects.toBeInstanceOf(SourceError);
    expect(lines.filter((l) => l.level === 'warn')).toHaveLength(1);
    await clock.advance(299_000 - clock.now());
    await expect(src.lookup('A')).rejects.toMatchObject({ errorClass: 'unavailable' });
    expect(calls).toBe(1);
    await clock.advance(300_001 - clock.now()); status = 200;
    expect((await src.lookup('A'))?.source).toBe('adsbdb');
    expect(calls).toBe(2);
  });
});

const POS = { lat: 30, lon: 45 }; // on the Doha-London corridor
const airport = (city: string, lat: number, lon: number) => ({ name: city, city, lat, lon });
const DOH_DXB: Route = { from: airport('Doha', 25.27, 51.6), to: airport('Dubai', 25.25, 55.36), source: 'vrs' };
const DOH_LON: Route = { from: airport('Doha', 25.27, 51.6), to: airport('London', 51.47, -0.45), source: 'adsbdb' };
const fake = (name: string, r: Route | null | 'throw') => { const s = { name, calls: 0, async lookup() { s.calls++; if (r === 'throw') throw new SourceError('unavailable'); return r; } }; return s as RouteSource & { calls: number }; };
const H = 3600_000;
const svcOf = (srcs: RouteSource[], clock = new FakeClock(0)) => ({ clock, svc: new RouteService(srcs, clock, { ttlMs: 6 * H, negativeTtlMs: 600_000 }) });

describe('route chain [adsbdb, vrs] (ADR 0016)', () => {
  it('adsbdb wins before VRS (QTR56H regression: Doha-London beats VRS Doha-Dubai)', async () => {
    const vrs = fake('vrs', DOH_DXB);
    const { svc } = svcOf([fake('adsbdb', DOH_LON), vrs]);
    expect(await svc.routeInfoFor('QTR56H', POS)).toMatchObject({ text: 'Doha → London', source: 'adsbdb' });
    expect(vrs.calls).toBe(0);
  });
  it('falls back to VRS on unknown, unavailable and on a corridor-rejected adsbdb route', async () => {
    const FRA_JFK: Route = { from: airport('Frankfurt', 50, 8.5), to: airport('New York', 40.6, -73.8), source: 'adsbdb' };
    for (const first of [null, 'throw', FRA_JFK] as const) {
      const { svc } = svcOf([fake('adsbdb', first), fake('vrs', DOH_LON.source ? { ...DOH_LON, source: 'vrs' } : null)]);
      expect(await svc.routeInfoFor('X1', POS)).toMatchObject({ text: 'Doha → London', source: 'vrs' });
    }
  });
  it('a VRS route outside the corridor means unknown', async () => {
    const { svc } = svcOf([fake('adsbdb', null), fake('vrs', DOH_DXB)]);
    expect(await svc.routeFor('X1', { lat: -33.9, lon: 151.2 })).toBeNull();
  });
  it('does not negatively cache when a source was unavailable; a later lookup succeeds without TTL expiry', async () => {
    let loaded = false;
    const vrs: RouteSource = { name: 'vrs', async lookup() { if (!loaded) throw new SourceError('unavailable'); return { ...DOH_LON, source: 'vrs' }; } };
    const { svc } = svcOf([fake('adsbdb', 'throw'), vrs]);
    expect(await svc.routeFor('X1', POS)).toBeNull();
    loaded = true;
    expect(await svc.routeFor('X1', POS)).toBe('Doha → London');
  });
  it('caches a genuine unknown in all sources for negativeTtl (no source call on the second lookup)', async () => {
    const a = fake('adsbdb', null); const v = fake('vrs', null);
    const { svc, clock } = svcOf([a, v]);
    await svc.routeFor('X1', POS); await svc.routeFor('X1', POS);
    expect([a.calls, v.calls]).toEqual([1, 1]);
    await clock.advance(700_000 - clock.now()); await svc.routeFor('X1', POS);
    expect(a.calls).toBe(2);
  });
  it('caches positive adsbdb hits for the positive TTL', async () => {
    const a = fake('adsbdb', DOH_LON);
    const { svc, clock } = svcOf([a]);
    await svc.routeFor('X1', POS); await clock.advance(5 * H - clock.now()); await svc.routeFor('X1', POS);
    expect(a.calls).toBe(1);
  });
  it('logs one info line per callsign with the answering source (adsbdb/vrs/none)', async () => {
    const clock = new FakeClock(0); const lines: Record<string, unknown>[] = [];
    const log = createLogger(clock, 'debug', (l) => lines.push(JSON.parse(l)));
    const svc = new RouteService([fake('adsbdb', DOH_LON)], clock, { ttlMs: H, negativeTtlMs: H, log });
    const none = new RouteService([fake('adsbdb', null)], clock, { ttlMs: H, negativeTtlMs: H, log });
    await svc.routeFor('A1', POS); await svc.routeFor('A1', POS); await none.routeFor('B1', POS);
    const infos = lines.filter((l) => l.level === 'info').map((l) => [l.callsign, l.source]);
    expect(infos).toEqual([['A1', 'adsbdb'], ['B1', 'none']]);
  });
});

describe('sighting-log: adsbdb text never persisted (ADR 0016)', () => {
  const base = { icao24: 'abc123', callsign: 'QTR56H', typklasse: 'widebody', liveryPresent: false, distanceKm: 5 };
  it('adsbdb sighting: route NULL, route_source adsbdb; COALESCE never writes adsbdb text; VRS keeps text', () => {
    const repo = new SightingRepository(openDatabase(':memory:'), 30 * 60_000, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
    repo.observe({ ...base, route: 'Doha → London', routeSource: 'adsbdb' }, 0);
    repo.observe({ ...base, route: 'Doha → London', routeSource: 'adsbdb' }, 30_000);
    repo.observe({ ...base, icao24: 'v1', route: 'Frankfurt → New York', routeSource: 'vrs' }, 0);
    const rows = repo.list();
    expect(rows[0]).toMatchObject({ route: null, routeSource: 'adsbdb' });
    expect(rows[1]).toMatchObject({ route: 'Frankfurt → New York', routeSource: 'vrs' });
    expect(repo.routeKnownCount()).toBe(2);
  });
  it('the SQLite file contains no adsbdb route text', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'x.db');
    const db = openDatabase(file);
    const repo = new SightingRepository(db, 30 * 60_000, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
    repo.observe({ ...base, route: 'Doha → Heathrow', routeSource: 'adsbdb' }, 0);
    db.pragma('wal_checkpoint(TRUNCATE)'); db.close();
    expect(fs.readFileSync(file).includes('Heathrow')).toBe(false);
  });
  it('migration 0002 adds route_source and sets existing rows with a route to vrs', async () => {
    const Database = (await import('better-sqlite3')).default;
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'x.db');
    const raw = new Database(file);
    raw.exec((await import('../../../src/server/migrations/0001-sightings')).default);
    raw.pragma('user_version = 1');
    raw.exec("INSERT INTO sightings (icao24, typklasse, livery_present, route, closest_distance_km, first_seen_at, last_seen_at, last_seen_ms) VALUES ('a','x',0,'A → B',1,'t','t',1), ('b','x',0,NULL,1,'t','t',2)");
    raw.close();
    const db = openDatabase(file);
    expect(db.prepare('SELECT icao24, route_source AS s FROM sightings ORDER BY id').all()).toEqual([{ icao24: 'a', s: 'vrs' }, { icao24: 'b', s: null }]);
  });
});

describe('licence boundary on the live path and chain behaviour (ADR 0016)', () => {
  it('SkyService Takt with adsbdb answering: row has route NULL + route_source adsbdb; DB file holds no route text', async () => {
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
    const sightings = new SightingRepository(db, 30 * 60_000, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
    const place = parseConfig('location: { lat: 50.05, lon: 8.57 }\nmode: live\n');
    const everywhere: Route = { from: { name: 'Zzyzx', city: 'Zzyzx' }, to: { name: 'Qwertyland', city: 'Qwertyland' }, source: 'adsbdb', vendorPlausible: true };
    const svc = new SkyService({
      config: place, clock, log: silentLogger, flight: new ScenarioFlightSource(driver), tables: defaultTables(), sightings, buildId: 't', timeZone: 'UTC',
      routes: new RouteService([fake('adsbdb', everywhere)], clock, { ttlMs: H, negativeTtlMs: H }),
      audio: new AudioService(new FakeSpeechSynthesizer(), { voice: 'v', render: 'lazy', log: silentLogger }),
    });
    await svc.tick();
    expect(svc.state().planes[0].flight.route).toBe('Zzyzx → Qwertyland');
    const row = db.prepare('SELECT route, route_source AS s FROM sightings').get();
    expect(row).toEqual({ route: null, s: 'adsbdb' });
    db.pragma('wal_checkpoint(TRUNCATE)'); db.close();
    expect(fs.readFileSync(file).includes('Qwertyland')).toBe(false);
  });
  it('repository never stores unlabelled route text', () => {
    const repo = new SightingRepository(openDatabase(':memory:'), 30 * 60_000, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
    repo.observe({ icao24: 'u', typklasse: 'x', liveryPresent: false, distanceKm: 1, route: 'Leak → Text' }, 0);
    expect(repo.list()[0]).toMatchObject({ route: null, routeSource: null });
  });
  it('UPDATE keeps route and route_source consistent: adsbdb first then vrs upgrades both; vrs is never downgraded', () => {
    const repo = new SightingRepository(openDatabase(':memory:'), 30 * 60_000, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
    const b = { icao24: 'k', typklasse: 'x', liveryPresent: false, distanceKm: 1 };
    repo.observe({ ...b, route: 'A → B', routeSource: 'adsbdb' }, 0);
    expect(repo.list()[0]).toMatchObject({ route: null, routeSource: 'adsbdb' });
    repo.observe({ ...b, route: 'A → B', routeSource: 'vrs' }, 30_000);
    expect(repo.list()[0]).toMatchObject({ route: 'A → B', routeSource: 'vrs' });
    repo.observe({ ...b, route: null, routeSource: 'adsbdb' }, 60_000);
    expect(repo.list()[0]).toMatchObject({ route: 'A → B', routeSource: 'vrs' });
  });
  it('real AdsbdbRouteSource 429 in front of VRS: VRS answers during the backoff window with 0 adsbdb calls, adsbdb is asked again after it', async () => {
    let calls = 0; let status = 429;
    const clock = new FakeClock(0);
    const src = new AdsbdbRouteSource({ fetch: async () => { calls++; return { ok: status === 200, status, text: async () => (status === 200 ? fixture('QTR56H') : ''), arrayBuffer: async () => new ArrayBuffer(0) }; }, userAgent: 'UA', timeoutMs: 1000, backoffMs: 300_000, clock, log: createLogger(clock, 'debug', () => {}) });
    const vrs = fake('vrs', { ...DOH_LON, source: 'vrs' });
    const svc = new RouteService([src, vrs], clock, { ttlMs: H, negativeTtlMs: 1000 });
    expect(await svc.routeInfoFor('QTR56H', POS)).toMatchObject({ text: 'Doha → London', source: 'vrs' });
    expect(calls).toBe(1);
    await clock.advance(100_000);
    expect(await svc.routeInfoFor('OTHER1', POS)).toMatchObject({ text: 'Doha → London', source: 'vrs' });
    expect(calls).toBe(1);
    await clock.advance(301_000 - clock.now()); status = 200;
    expect((await svc.routeInfoFor('THIRD1', POS))?.source).toBe('adsbdb');
    expect(calls).toBe(2);
  });
});
