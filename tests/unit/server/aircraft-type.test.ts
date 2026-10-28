// @vitest-environment node
// Type cross-check (airspace-t4x9k): override table > hexdb > flight source. All offline: a fake AircraftTypeSource / fake fetch.
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { parseConfig } from '../../../src/server/config';
import { openDatabase } from '../../../src/server/db';
import { createLogger, silentLogger } from '../../../src/server/logger';
import { HexdbBackoff } from '../../../src/server/modules/airspace/adapters/hexdb-backoff';
import { HexdbRouteSource } from '../../../src/server/modules/airspace/adapters/hexdb-route-source';
import { HexdbAircraftTypeSource, buildAircraftTypeSource } from '../../../src/server/modules/airspace/adapters/hexdb-aircraft-type-source';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';
import { AircraftTypeResolver } from '../../../src/server/modules/airspace/aircraft-type';
import { SourceError, type AircraftTypeSource } from '../../../src/server/modules/airspace/model';
import { RouteService } from '../../../src/server/modules/airspace/route-service';
import { defaultTables, loadTables, resolveTypeClass } from '../../../src/server/modules/airspace/typeclass';
import { ScenarioDriver, ScenarioFlightSource, ScenarioRouteSource, parseScenario } from '../../../src/server/mock/scenario';
import { SightingRepository } from '../../../src/server/modules/sighting-log/repository';
import { formatTypeStats, typeStats } from '../../../src/server/modules/sighting-log/type-stats';
import { AudioService } from '../../../src/server/modules/sky-scene/audio-service';
import { FakeSpeechSynthesizer } from '../../../src/server/modules/sky-scene/fake-speech';
import { SkyService } from '../../../src/server/modules/sky-scene/sky-service';

const T = defaultTables();
const HEX = '4400fe';
type Step = () => Promise<string | null>;
function fakeSource(...steps: Step[]) {
  const s = { calls: 0, name: 'fake', lookup: async (_hex: string): Promise<string | null> => { const f = steps[Math.min(s.calls, steps.length - 1)]; s.calls++; return f(); } };
  return s as AircraftTypeSource & { calls: number };
}
const answer = (t: string | null): Step => async () => t;
const fail = (cls: string): Step => async () => { throw new SourceError(cls as never); };
function resolver(source?: AircraftTypeSource, overrides: Record<string, string> = {}) {
  const clock = new FakeClock(0);
  const lines: Record<string, unknown>[] = [];
  const log = createLogger(clock, 'info', (l) => lines.push(JSON.parse(l)));
  return { r: new AircraftTypeResolver({ overrides, source, clock, log, ttlMs: 3_600_000 }), clock, lines };
}

describe('type-overrides table', () => {
  it('ships 4400fe -> DA42 and DA42 is light-aircraft', () => {
    expect(T.typeOverrides?.[HEX]).toBe('DA42');
    expect(resolveTypeClass(T, 'DA42', undefined).typklasse).toBe('light-aircraft');
  });
  it('is validated at start and lists all problems', () => {
    expect(() => loadTables({ ...T, typeOverrides: { ABC: 'DA42', '4400ff': 'NOPE', '4400fe': 'DA42' } })).toThrow(/type-overrides\.ABC[\s\S]*type-overrides\.4400ff/);
  });
});

describe('AircraftTypeResolver', () => {
  it('override wins and hexdb is not asked (call count 0)', async () => {
    const src = fakeSource(answer('C525'));
    const { r, lines } = resolver(src, { [HEX]: 'DA42' });
    const c = await r.resolve(HEX, 'C525');
    expect(c).toEqual({ typeCode: 'DA42', source: 'override' });
    expect(resolveTypeClass(T, c.typeCode, undefined).typklasse).toBe('light-aircraft');
    expect(src.calls).toBe(0);
    expect(lines.filter((l) => l.msg === 'aircraft type corrected')).toEqual([expect.objectContaining({ hex: HEX, flightType: 'C525', correctedType: 'DA42', source: 'override' })]);
  });
  it('hexdb differing from the flight source wins; same type stays flight', async () => {
    const { r, lines } = resolver(fakeSource(answer('DA42')));
    expect(await r.resolve(HEX, 'C525')).toEqual({ typeCode: 'DA42', source: 'hexdb' });
    expect(lines.some((l) => l.msg === 'aircraft type corrected' && l.source === 'hexdb' && l.hex === HEX && l.flightType === 'C525' && l.correctedType === 'DA42')).toBe(true);
    expect(await resolver(fakeSource(answer('C525'))).r.resolve(HEX, 'C525')).toEqual({ typeCode: 'C525', source: 'flight' });
  });
  it('asks hexdb at most once per TTL over several Takte; asks again after the TTL', async () => {
    const src = fakeSource(answer('DA42'));
    const { r, clock } = resolver(src);
    for (let i = 0; i < 5; i++) { await r.resolve(HEX, 'C525'); await clock.advance(30_000); }
    expect(src.calls).toBe(1);
    await clock.advance(3_600_000);
    await r.resolve(HEX, 'C525');
    expect(src.calls).toBe(2);
  });
  it('caches a 404 (unknown) but not timeout, network error or 429; falls back to the flight type', async () => {
    const unknown = fakeSource(answer(null));
    const a = resolver(unknown);
    await a.r.resolve(HEX, 'C525'); await a.r.resolve(HEX, 'C525');
    expect(unknown.calls).toBe(1);
    for (const cls of ['timeout', 'network', 'http-429', 'unavailable']) {
      const src = fakeSource(fail(cls as never), answer('DA42'));
      const b = resolver(src);
      expect(await b.r.resolve(HEX, 'C525')).toEqual({ typeCode: 'C525', source: 'flight' });
      expect(await b.r.resolve(HEX, 'C525')).toEqual({ typeCode: 'DA42', source: 'hexdb' }); // retried next Takt
      expect(src.calls).toBe(2);
    }
  });
  it('without a source (disabled / mock) hexdb is never asked and the flight type stands', async () => {
    expect(await resolver(undefined).r.resolve(HEX, 'C525')).toEqual({ typeCode: 'C525', source: 'flight' });
  });
});

describe('HexdbAircraftTypeSource', () => {
  const ok = (body: string): Fetch => async () => ({ ok: true, status: 200, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });
  const status = (code: number): Fetch => async () => ({ ok: false, status: code, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) });
  const mk = (f: Fetch, timeoutMs = 1000) => { const clock = new FakeClock(0); return { clock, src: new HexdbAircraftTypeSource({ fetch: f, userAgent: 'UA', timeoutMs, backoffMs: 300_000, clock, log: silentLogger }) }; };
  it('GET /api/v1/aircraft/{hex}, reads ICAOTypeCode; 404 and no type are null', async () => {
    const seen: string[] = [];
    const { src } = mk(async (url, init) => { seen.push(url + '|' + init?.headers?.['User-Agent']); return ok('{"ModeS":"4400FE","ICAOTypeCode":"DA42","Type":"Twin Star DA42 NG"}')(url, init); });
    expect(await src.lookup(HEX)).toBe('DA42');
    expect(seen[0]).toBe('https://hexdb.io/api/v1/aircraft/4400fe|UA');
    expect(await mk(status(404)).src.lookup(HEX)).toBeNull();
    expect(await mk(ok('{"ICAOTypeCode":""}')).src.lookup(HEX)).toBeNull();
  });
  it('429 sets the backoff: no request during the window, then asks again', async () => {
    let n = 0;
    const { src, clock } = mk(async () => { n++; return n === 1 ? status(429)('', undefined) : ok('{"ICAOTypeCode":"DA42"}')('', undefined); });
    await expect(src.lookup(HEX)).rejects.toMatchObject({ errorClass: 'http-429' });
    await expect(src.lookup(HEX)).rejects.toMatchObject({ errorClass: 'unavailable' });
    expect(n).toBe(1);
    await clock.advance(300_000);
    expect(await src.lookup(HEX)).toBe('DA42');
  });
  it('a hanging connection ends in a timeout error within the deadline', async () => {
    const { src } = mk(() => new Promise(() => {}), 20);
    await expect(src.lookup(HEX)).rejects.toMatchObject({ errorClass: 'timeout' });
  });
});

const P = (icao24: string, extra: object = {}) => ({ icao24, distanceKm: 5, bearingDeg: 0, altitudeFt: 4000, speedKt: 120, ...extra });
function rig(src: AircraftTypeSource | undefined, planes: object[], overrides?: Record<string, string>, steps?: number) {
  const clock = new FakeClock(Date.parse('2026-10-28T13:35:00Z'));
  const config = parseConfig('location: { lat: 50.05, lon: 8.57 }\nmode: live\n');
  const scenario = { name: 't', startTime: '2026-10-28T13:35:00Z', steps: [{ at: 0, planes }] };
  const driver = new ScenarioDriver(parseScenario(JSON.stringify(scenario)), clock, clock.now());
  const db = openDatabase(':memory:');
  const sightings = new SightingRepository(db, 30 * 60_000, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'x' });
  const lines: Record<string, unknown>[] = [];
  const log = createLogger(clock, 'info', (l) => lines.push(JSON.parse(l)));
  const tables = { ...T, typeOverrides: overrides ?? {} };
  const svc = new SkyService({
    config, clock, log, flight: new ScenarioFlightSource(driver), tables, sightings, buildId: 't', timeZone: 'UTC',
    routes: new RouteService(new ScenarioRouteSource(driver), clock, { ttlMs: 1e9, negativeTtlMs: 1e9 }),
    audio: new AudioService(new FakeSpeechSynthesizer(), { voice: 'v', render: 'lazy', log: silentLogger }),
    types: new AircraftTypeResolver({ overrides: tables.typeOverrides, source: src, clock, log }),
  });
  return { svc, db, sightings, lines, steps };
}

describe('hexdb wiring', () => {
  const base = { fetch: (async () => { throw new Error('no net'); }) as Fetch, userAgent: 'u', timeoutMs: 100, backoffMs: 300_000, clock: new FakeClock(0), log: silentLogger };
  it('factory: enabled live -> source; disabled -> none; mock -> none', () => {
    expect(buildAircraftTypeSource({ ...base, mock: false, enabled: true })).toBeInstanceOf(HexdbAircraftTypeSource);
    expect(buildAircraftTypeSource({ ...base, mock: false, enabled: false })).toBeUndefined();
    expect(buildAircraftTypeSource({ ...base, mock: true, enabled: true })).toBeUndefined();
  });
  it('a 429 on one hexdb adapter stops the other during the window; both resume after it', async () => {
    const clock = new FakeClock(0);
    let calls = 0; let mode: 429 | 200 = 429;
    const f: Fetch = async (url) => { calls++; const body = url.includes('/routes/') ? '{"origin":{"icao":"EDDF","latitude":50,"longitude":8},"destination":{"icao":"EDDM","latitude":48,"longitude":11}}' : '{"ICAOTypeCode":"DA42"}'; return { ok: mode === 200, status: mode, text: async () => body, arrayBuffer: async () => new ArrayBuffer(0) }; };
    const backoff = new HexdbBackoff();
    const o = { fetch: f, userAgent: 'u', timeoutMs: 1000, backoffMs: 300_000, clock, log: silentLogger, backoff };
    const types = new HexdbAircraftTypeSource(o);
    const routes = new HexdbRouteSource(o);
    await expect(types.lookup(HEX)).rejects.toMatchObject({ errorClass: 'http-429' });
    await expect(routes.lookup('DLH400')).rejects.toMatchObject({ errorClass: 'unavailable' });
    expect(calls).toBe(1);
    // and the other way round
    await clock.advance(300_000); mode = 200;
    expect(await types.lookup(HEX)).toBe('DA42');
    mode = 429;
    await expect(routes.lookup('DLH400')).rejects.toMatchObject({ errorClass: 'http-429' });
    await expect(types.lookup(HEX)).rejects.toMatchObject({ errorClass: 'unavailable' });
    await clock.advance(300_000); mode = 200;
    expect(await types.lookup(HEX)).toBe('DA42');
    expect((await routes.lookup('DLH400'))?.source).toBe('hexdb');
  });
});

describe('SkyService with the type cross-check', () => {
  it('OE-FML: flight source says C525, override says DA42 -> light-aircraft silhouette, type_source override, flight type_code stored', async () => {
    const src = fakeSource(answer('C525'));
    const { svc, sightings } = rig(src, [P(HEX, { callsign: 'OEFML', typeCode: 'C525', registration: 'OE-FML' })], { [HEX]: 'DA42' });
    await svc.tick();
    expect(svc.state().planes[0].plane.type).toBe('light-aircraft');
    expect(sightings.list()[0]).toMatchObject({ typeCode: 'C525', typklasse: 'light-aircraft', typeSource: 'override' });
    expect(src.calls).toBe(0);
  });
  it('hexdb correction is shown and only the flight type_code and type_source are persisted: no hexdb value anywhere in SQLite', async () => {
    const { svc, db, sightings } = rig(fakeSource(answer('QWERTY9')), [P('abc123', { callsign: 'N123AB', typeCode: 'C525' })]);
    await svc.tick();
    const fixed = rig(fakeSource(answer('DA42')), [P('abc123', { callsign: 'N123AB', typeCode: 'C525' })]);
    await fixed.svc.tick();
    expect(fixed.svc.state().planes[0].plane.type).toBe('light-aircraft');
    expect(fixed.sightings.list()[0]).toMatchObject({ typeCode: 'C525', typeSource: 'hexdb' });
    for (const d of [db, fixed.db]) {
      const dump = JSON.stringify([d.prepare('SELECT * FROM sightings').all(), d.prepare('SELECT * FROM unmapped_keys').all(), d.prepare('SELECT * FROM route_lookups').all()]);
      expect(dump).not.toMatch(/QWERTY9|DA42/);
    }
    expect(sightings.unmapped()).toEqual([]); // an unmapped hexdb code is not reported to unmapped_keys
  });
  it('a hanging hexdb does not block the Takt: the flight source type is shown', async () => {
    const clock0 = Date.now();
    const bounded: AircraftTypeSource = new HexdbAircraftTypeSource({ fetch: () => new Promise(() => {}), userAgent: 'u', timeoutMs: 30, backoffMs: 1, clock: new FakeClock(0), log: silentLogger });
    const { svc } = rig(bounded, [P('abc123', { callsign: 'N123AB', typeCode: 'C525' })]);
    await svc.tick();
    expect(svc.state().planes[0].plane.type).toBe('business-jet');
    expect(Date.now() - clock0).toBeLessThan(2000);
  });
  it('config: sources.aircraftType.hexdb.enabled defaults to true and can be switched off', () => {
    expect(parseConfig('location: { lat: 1, lon: 2 }\n').sources.aircraftType.hexdb).toMatchObject({ enabled: true });
    expect(parseConfig('location: { lat: 1, lon: 2 }\nsources:\n  aircraftType:\n    hexdb:\n      enabled: false\n').sources.aircraftType.hexdb.enabled).toBe(false);
  });
});

describe('type_source statistics', () => {
  it('migration adds type_source (default flight) and the stats count shown sightings per source and list corrected hexes', async () => {
    const { svc, db } = rig(fakeSource(answer('A20N')), [P(HEX, { callsign: 'OEFML', typeCode: 'C525' }), P('abc123', { callsign: 'DLH400', typeCode: 'A20N', distanceKm: 9 })], { [HEX]: 'DA42' });
    expect((db.prepare('PRAGMA table_info(sightings)').all() as { name: string; dflt_value: string }[]).find((c) => c.name === 'type_source')?.dflt_value).toBe("'flight'");
    await svc.tick();
    const s = typeStats(db, { days: 7, nowMs: Date.parse('2026-10-28T14:00:00Z') });
    expect(s.bySource).toEqual(expect.arrayContaining([{ typeSource: 'override', count: 1 }, { typeSource: 'flight', count: 1 }]));
    expect(s.corrected).toEqual([{ icao24: HEX, typeSource: 'override', flightType: 'C525', typklasse: 'light-aircraft', count: 1 }]);
    expect(formatTypeStats(s)).toContain('4400fe override C525 -> light-aircraft 1');
  });
});
