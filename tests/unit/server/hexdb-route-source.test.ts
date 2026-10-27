// @vitest-environment node
// hexdb live route source. Fixtures LHX1HL/DLH400/ZZZZ9Q-404 recorded 2026-10-27 from hexdb.io; error cases are constructed. All tests offline.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { createLogger, silentLogger } from '../../../src/server/logger';
import { HexdbRouteSource } from '../../../src/server/modules/airspace/adapters/hexdb-route-source';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';
import { SourceError, type Route, type RouteSource } from '../../../src/server/modules/airspace/model';
import { RouteService } from '../../../src/server/modules/airspace/route-service';
import { openDatabase } from '../../../src/server/db';
import { SightingRepository } from '../../../src/server/modules/sighting-log/repository';
import { formatRouteStats, routeStats } from '../../../src/server/modules/sighting-log/route-stats';

const FIX = path.resolve(import.meta.dirname, '../../fixtures/hexdb');
const fixture = (n: string): string => fs.readFileSync(path.join(FIX, n + '.json'), 'utf8');
const reply = (status: number, body: string): Fetch => async () => ({ ok: status >= 200 && status < 300, status, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });

beforeEach(() => { vi.stubGlobal('fetch', () => { throw new Error('real network access in a test'); }); });
afterEach(() => { vi.unstubAllGlobals(); });

function mk(f: Fetch, backoffMs = 300_000) {
  const clock = new FakeClock(0);
  const lines: Record<string, unknown>[] = [];
  const log = createLogger(clock, 'debug', (l) => lines.push(JSON.parse(l)));
  return { src: new HexdbRouteSource({ fetch: f, userAgent: 'UA-test', timeoutMs: 1000, backoffMs, clock, log }), clock, lines };
}

describe('HexdbRouteSource', () => {
  it('calls GET /api/v2/routes/{callsign} with the User-Agent and URL-encodes the callsign', async () => {
    const seen: { url: string; ua?: string }[] = [];
    const { src } = mk(async (url, init) => { seen.push({ url, ua: init?.headers?.['User-Agent'] }); return { ok: true, status: 200, text: async () => fixture('LHX1HL'), arrayBuffer: async () => new ArrayBuffer(0) }; });
    await src.lookup('LHX1HL'); await src.lookup('A B/1');
    expect(seen[0]).toEqual({ url: 'https://hexdb.io/api/v2/routes/LHX1HL', ua: 'UA-test' });
    expect(seen[1].url).toBe('https://hexdb.io/api/v2/routes/A%20B%2F1');
  });
  it('recorded LHX1HL: Cologne (EDDK) -> Munich (EDDM), source hexdb, with coordinates', async () => {
    const r = await mk(reply(200, fixture('LHX1HL'))).src.lookup('LHX1HL');
    expect(r).toMatchObject({ source: 'hexdb', from: { city: 'Cologne Bonn' }, to: { city: 'Munich' } });
    expect(r?.from.lat).toBeCloseTo(50.87, 1);
    expect(r?.to.lon).toBeCloseTo(11.79, 1);
  });
  it('recorded DLH400: Frankfurt -> New York (JFK)', async () => {
    const r = await mk(reply(200, fixture('DLH400'))).src.lookup('DLH400');
    expect(r).toMatchObject({ from: { city: 'Frankfurt' }, to: { city: 'John F. Kennedy' } });
  });
  it('constructed: multi-leg airports[] become legs', async () => {
    const ap = (n: string, lat: number) => ({ icao: n, name: `${n} Airport`, latitude: lat, longitude: 8 });
    const body = JSON.stringify({ callsign: 'X', origin: ap('A', 1), destination: ap('C', 3), airports: [ap('A', 1), ap('B', 2), ap('C', 3)] });
    const r = await mk(reply(200, body)).src.lookup('X');
    expect(r?.legs?.map((l) => l.city)).toEqual(['A', 'B', 'C']);
    expect([r?.from.city, r?.to.city]).toEqual(['A', 'C']);
  });
  it('recorded 404 route_not_found is unknown (null)', async () => {
    expect(await mk(reply(404, fixture('ZZZZ9Q-404'))).src.lookup('ZZZZ9Q')).toBeNull();
  });
  it('constructed: 429, 5xx, timeout, broken JSON, missing coordinates/endpoints are unavailable (throw SourceError)', async () => {
    const noCoords = JSON.stringify({ origin: { icao: 'A', name: 'A' }, destination: { icao: 'B', name: 'B', latitude: 1, longitude: 2 } });
    const noEnds = JSON.stringify({ callsign: 'X' });
    const timeout: Fetch = async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); };
    for (const [f, cls] of [[reply(429, ''), 'http-429'], [reply(503, ''), 'http-5xx'], [timeout, 'timeout'], [reply(200, '{nope'), 'parse'], [reply(200, noCoords), 'parse'], [reply(200, noEnds), 'parse']] as const) {
      await expect(mk(f).src.lookup('X')).rejects.toMatchObject({ errorClass: cls });
    }
  });
  it('after 429 hexdb is not called for backoffMinutes (fake clock), then asked again; warn logged once', async () => {
    let calls = 0; let status = 429;
    const { src, clock, lines } = mk(async () => { calls++; return { ok: status === 200, status, text: async () => (status === 200 ? fixture('LHX1HL') : ''), arrayBuffer: async () => new ArrayBuffer(0) }; });
    await expect(src.lookup('A')).rejects.toBeInstanceOf(SourceError);
    expect(lines.filter((l) => l.level === 'warn')).toHaveLength(1);
    await clock.advance(299_000 - clock.now());
    await expect(src.lookup('A')).rejects.toMatchObject({ errorClass: 'unavailable' });
    expect(calls).toBe(1);
    await clock.advance(300_001 - clock.now()); status = 200;
    expect((await src.lookup('A'))?.source).toBe('hexdb');
    expect(calls).toBe(2);
  });
});

describe('route chain [hexdb, adsbdb, vrs]', () => {
  const POS = { lat: 49.5, lon: 9.5 }; // between Cologne and Munich
  const ap = (city: string, lat: number, lon: number) => ({ name: city, city, lat, lon });
  const CGN_MUC = (source: Route['source']): Route => ({ from: ap('Cologne', 50.87, 7.14), to: ap('Munich', 48.35, 11.79), source });
  const FAR: Route = { from: ap('Sydney', -33.9, 151.2), to: ap('Auckland', -37, 174.8), source: 'hexdb' };
  const fake = (name: string, r: Route | null | 'throw') => { const s = { name, calls: 0, async lookup() { s.calls++; if (r === 'throw') throw new SourceError('unavailable'); return r; } }; return s as RouteSource & { calls: number }; };
  const svc = (srcs: RouteSource[], compareAll = false) => new RouteService(srcs, new FakeClock(0), { ttlMs: 3_600_000, negativeTtlMs: 600_000, compareAll });

  it('hexdb plausible hit wins; adsbdb is not asked (no compareAll); source is hexdb', async () => {
    const a = fake('adsbdb', CGN_MUC('adsbdb'));
    const l = await svc([fake('hexdb', CGN_MUC('hexdb')), a]).lookupFor('LHX1HL', POS);
    expect(l).toMatchObject({ info: { text: 'Cologne → Munich', source: 'hexdb' }, chosen: 'hexdb', attempts: [{ source: 'hexdb', outcome: 'hit' }] });
    expect(a.calls).toBe(0);
  });
  it('source name hexdb flows through even when the route carries no source', async () => {
    const r = { ...CGN_MUC(undefined) };
    expect((await svc([fake('hexdb', r)]).routeInfoFor('X1', POS))?.source).toBe('hexdb');
  });
  it('hexdb unknown -> adsbdb hit (chosen adsbdb)', async () => {
    const l = await svc([fake('hexdb', null), fake('adsbdb', CGN_MUC('adsbdb'))]).lookupFor('X1', POS);
    expect(l).toMatchObject({ chosen: 'adsbdb', info: { source: 'adsbdb' }, attempts: [{ source: 'hexdb', outcome: 'unknown' }, { source: 'adsbdb', outcome: 'hit' }] });
  });
  it('hexdb implausible -> rejected, adsbdb asked', async () => {
    const a = fake('adsbdb', CGN_MUC('adsbdb'));
    const l = await svc([fake('hexdb', FAR), a]).lookupFor('X1', POS);
    expect(l?.attempts).toEqual([{ source: 'hexdb', outcome: 'rejected' }, { source: 'adsbdb', outcome: 'hit' }]);
    expect(a.calls).toBe(1);
  });
  it('hexdb unavailable -> adsbdb asked; with all sources down nothing is negatively cached', async () => {
    const l = await svc([fake('hexdb', 'throw'), fake('adsbdb', CGN_MUC('adsbdb'))]).lookupFor('X1', POS);
    expect(l?.attempts).toEqual([{ source: 'hexdb', outcome: 'unavailable' }, { source: 'adsbdb', outcome: 'hit' }]);
    const h = fake('hexdb', 'throw'); const s = svc([h, fake('adsbdb', 'throw')]);
    await s.lookupFor('X1', POS); await s.lookupFor('X1', POS);
    expect(h.calls).toBe(2);
  });
  it('compareAll flags a conflict between hexdb and adsbdb but still chooses hexdb', async () => {
    const other: Route = { from: ap('Cologne', 50.87, 7.14), to: ap('Nuremberg', 49.5, 11.07), source: 'adsbdb' };
    const l = await svc([fake('hexdb', CGN_MUC('hexdb')), fake('adsbdb', other)], true).lookupFor('X1', POS);
    expect(l).toMatchObject({ conflict: true, chosen: 'hexdb', info: { source: 'hexdb' } });
  });
});

describe('sighting-log: hexdb text never persisted', () => {
  const base = { icao24: 'abc123', callsign: 'LHX1HL', typklasse: 'narrowbody', liveryPresent: false, distanceKm: 5 };
  it('hexdb sighting: route NULL, route_source hexdb; a later vrs or flightaware hit replaces the finding; hexdb never downgrades', () => {
    const repo = new SightingRepository(openDatabase(':memory:'), 30 * 60_000);
    repo.observe({ ...base, route: 'Cologne Bonn → Munich', routeSource: 'hexdb' }, 0);
    expect(repo.list()[0]).toMatchObject({ route: null, routeSource: 'hexdb' });
    expect(repo.routeKnownCount()).toBe(1);
    repo.observe({ ...base, route: 'Köln → München', routeSource: 'vrs' }, 30_000);
    expect(repo.list()[0]).toMatchObject({ route: 'Köln → München', routeSource: 'vrs' });
    repo.observe({ ...base, route: null, routeSource: 'hexdb' }, 60_000);
    expect(repo.list()[0]).toMatchObject({ route: 'Köln → München', routeSource: 'vrs' });
    repo.observe({ ...base, icao24: 'f1', route: null }, 0); repo.observe({ ...base, icao24: 'f1', route: 'A → B', routeSource: 'hexdb' }, 1000); repo.observe({ ...base, icao24: 'f1', route: 'C → D', routeSource: 'flightaware' }, 2000);
    expect(repo.list().find((r) => r.icao24 === 'f1')).toMatchObject({ route: 'C → D', routeSource: 'flightaware' });
  });
  it('a SkyService Takt with hexdb answering stores only route_source and findings: no route text or airport codes in any column', async () => {
    const { parseConfig } = await import('../../../src/server/config');
    const { SkyService } = await import('../../../src/server/modules/sky-scene/sky-service');
    const { AudioService } = await import('../../../src/server/modules/sky-scene/audio-service');
    const { FakeSpeechSynthesizer } = await import('../../../src/server/modules/sky-scene/fake-speech');
    const { defaultTables } = await import('../../../src/server/modules/airspace/typeclass');
    const { ScenarioDriver, ScenarioFlightSource, parseScenario } = await import('../../../src/server/mock/scenario');
    const clock = new FakeClock(Date.parse('2026-10-27T10:00:00Z'));
    const driver = new ScenarioDriver(parseScenario(JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps: [{ at: 0, planes: [{ icao24: 'a', distanceKm: 8, bearingDeg: 0, altitudeFt: 36000, speedKt: 450, callsign: 'LHX1HL', typeCode: 'A20N' }] }] })), clock, clock.now());
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'x.db');
    const db = openDatabase(file);
    const sightings = new SightingRepository(db, 30 * 60_000);
    const hex = new HexdbRouteSource({ fetch: reply(200, fixture('LHX1HL')), userAgent: 'UA', timeoutMs: 1000, backoffMs: 1000, clock, log: silentLogger });
    const svc = new SkyService({
      config: parseConfig('location: { lat: 50.45, lon: 9.0 }\nmode: live\n'), clock, log: silentLogger, flight: new ScenarioFlightSource(driver), tables: defaultTables(), sightings, buildId: 't', timeZone: 'UTC',
      routes: new RouteService([hex], clock, { ttlMs: 3_600_000, negativeTtlMs: 3_600_000 }),
      audio: new AudioService(new FakeSpeechSynthesizer(), { voice: 'v', render: 'lazy', log: silentLogger }),
    });
    await svc.tick();
    expect(svc.state().planes[0].flight.route).toBe('Cologne Bonn → Munich');
    expect(db.prepare('SELECT route, route_source AS s FROM sightings').get()).toEqual({ route: null, s: 'hexdb' });
    expect(db.prepare('SELECT source, outcome FROM route_lookups').all()).toEqual([{ source: 'hexdb', outcome: 'hit' }]);
    const rows = JSON.stringify([db.prepare('SELECT * FROM sightings').all(), db.prepare('SELECT * FROM route_lookups').all()]);
    for (const needle of ['EDDK', 'EDDM', 'CGN', 'MUC', 'Cologne', 'Munich']) expect(rows).not.toContain(needle);
    db.pragma('wal_checkpoint(TRUNCATE)');
    const bytes = fs.readFileSync(file);
    for (const needle of ['EDDK', 'EDDM', 'Cologne', 'Munich']) expect(bytes.includes(needle)).toBe(false);
    const stats = routeStats(db, { days: 1, nowMs: clock.now() });
    expect(stats.days[0]).toMatchObject({ hexdb: 1, adsbdb: 0, none: 0 });
    expect(formatRouteStats(stats)).toContain('hexdb 1');
    db.close();
  });
});
