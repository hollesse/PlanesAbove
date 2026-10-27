// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { parseConfig } from '../../../src/server/config';
import { openDatabase } from '../../../src/server/db';
import { SkyService } from '../../../src/server/modules/sky-scene/sky-service';
import { AudioService } from '../../../src/server/modules/sky-scene/audio-service';
import { FakeSpeechSynthesizer } from '../../../src/server/modules/sky-scene/fake-speech';
import { RouteService } from '../../../src/server/modules/airspace/route-service';
import { SightingRepository } from '../../../src/server/modules/sighting-log/repository';
import { defaultTables } from '../../../src/server/modules/airspace/typeclass';
import { ScenarioDriver, ScenarioFlightSource, ScenarioRouteSource, parseScenario, type ScenarioStep } from '../../../src/server/mock/scenario';
import { silentLogger } from '../../../src/server/logger';

const HOME = 'location: { lat: 50.05, lon: 8.57 }\nmode: live\n';
function rig(steps: ScenarioStep[], extraConfig = '') {
  const clock = new FakeClock(Date.parse('2026-10-27T10:00:00Z'));
  const config = parseConfig(HOME + extraConfig);
  const driver = new ScenarioDriver(parseScenario(JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps })), clock, clock.now());
  const sightings = new SightingRepository(openDatabase(':memory:'), 30 * 60_000, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
  const svc = new SkyService({
    config, clock, log: silentLogger, flight: new ScenarioFlightSource(driver), tables: defaultTables(), sightings, buildId: 'test', timeZone: 'UTC',
    routes: new RouteService(new ScenarioRouteSource(driver), clock, { ttlMs: 1e9, negativeTtlMs: 1e9 }),
    audio: new AudioService(new FakeSpeechSynthesizer(), { voice: 'v', render: 'lazy', log: silentLogger }),
  });
  return { clock, svc, sightings };
}
const P = (icao24: string, distanceKm: number, extra: object = {}) => ({ icao24, distanceKm, bearingDeg: 0, altitudeFt: 36000, speedKt: 450, ...extra });
const A320 = { callsign: 'DLH400', typeCode: 'A20N', registration: 'D-AIBI' };

describe('SkyService Takt', () => {
  it('empty sky: no planes, no recent', async () => {
    const { svc } = rig([{ at: 0, planes: [] }]);
    await svc.tick();
    expect(svc.state()).toMatchObject({ planes: [], stale: false, recent: undefined });
  });
  it('one plane: Typklasse silhouette in the Standard-Lackierung, flight info and speech URL', async () => {
    const { svc } = rig([{ at: 0, planes: [P('a', 8, A320)], routes: { DLH400: { from: 'Frankfurt', to: 'New York' } } }]);
    await svc.tick();
    const [p] = svc.state().planes;
    expect(p.plane).toEqual({ type: 'narrowbody', livery: 'def' });
    expect(p.flight).toMatchObject({ operator: 'Lufthansa', callsign: 'DLH400', aircraft: 'Airbus A320neo', route: 'Frankfurt → New York', altitudeM: 36000 * 0.3048, phase: 'level' });
    expect(p.speech.text).toContain('Lufthansa');
    expect(p.speech.audioUrl).toMatch(/^\/audio\/[0-9a-f]+\.wav$/);
  });
  it('shows the airline livery only when enabled in config', async () => {
    const { svc } = rig([{ at: 0, planes: [P('a', 8, A320)] }], 'liveries: { enabled: true }');
    await svc.tick();
    expect(svc.state().planes[0].plane.livery).toBe('lh');
  });
  it('three planes: the two nearest are selected', async () => {
    const { svc } = rig([{ at: 0, planes: [P('far', 25), P('near', 3), P('mid', 12)] }]);
    await svc.tick();
    expect(svc.state().planes.map((p) => p.icao24)).toEqual(['near', 'mid']);
  });
  it('a single failed Takt keeps the scene live; stale only once the last success is older than 90 s; next success is live again', async () => {
    const { svc, clock } = rig([{ at: 0, planes: [P('a', 5, A320)] }, { at: 30, failure: 'http-429' }, { at: 150, failure: null, planes: [P('b', 4)] }]);
    await svc.tick();
    await clock.advance(30_000); await svc.tick();
    expect(svc.state().stale).toBe(false);
    expect(svc.state().planes.map((p) => p.icao24)).toEqual(['a']);
    expect(svc.health.consecutiveFailures).toBe(1);
    await clock.advance(60_000); await svc.tick(); // exactly 90 s since last success: not yet stale
    expect(svc.state().stale).toBe(false);
    await clock.advance(30_000); await svc.tick(); // 120 s
    expect(svc.state()).toMatchObject({ stale: true, clock: '10:00', lastSuccessAt: Date.parse('2026-10-27T10:00:00Z') });
    expect(svc.state().planes.map((p) => p.icao24)).toEqual(['a']);
    await clock.advance(30_000); await svc.tick(); // 150 s: source back
    expect(svc.state().stale).toBe(false);
    expect(svc.state().planes.map((p) => p.icao24)).toEqual(['b']);
    expect(svc.health.consecutiveFailures).toBe(0);
  });
  it('health.flightMaxAgeSeconds is the threshold for the scene; default is 3 x pollIntervalSeconds', async () => {
    const steps: ScenarioStep[] = [{ at: 0, planes: [P('a', 5)] }, { at: 10, failure: 'network' }];
    const custom = rig(steps, 'health: { flightMaxAgeSeconds: 20 }');
    await custom.svc.tick(); await custom.clock.advance(20_000); await custom.svc.tick();
    expect(custom.svc.state().stale).toBe(false);
    await custom.clock.advance(1_000); expect(custom.svc.state().stale).toBe(true);
    const dflt = rig(steps, 'pollIntervalSeconds: 10');
    await dflt.svc.tick(); await dflt.clock.advance(30_000); await dflt.svc.tick();
    expect(dflt.svc.state().stale).toBe(false);
    await dflt.clock.advance(1_000); expect(dflt.svc.state().stale).toBe(true);
  });
  it('writes exactly one sighting per distinct flight in the radius, however many Takte', async () => {
    const { svc, sightings, clock } = rig([{ at: 0, planes: [P('a', 5, A320), P('b', 10), P('c', 20), P('out', 45)] }]);
    for (let i = 0; i < 4; i++) { await svc.tick(); await clock.advance(30_000); }
    expect(sightings.list().map((s) => s.icao24).sort()).toEqual(['a', 'b', 'c']);
    expect(sightings.list().map((s) => [s.icao24, s.slot])).toEqual([['a', 1], ['b', 2], ['c', null]]);
    expect(sightings.list().find((s) => s.icao24 === 'a')).toMatchObject({ callsign: 'DLH400', airline: 'Lufthansa', typeCode: 'A20N', typklasse: 'narrowbody', liveryPresent: true });
  });
  it('reports unmapped type codes once', async () => {
    const { svc, sightings } = rig([{ at: 0, planes: [P('a', 5, { typeCode: 'XXXX', callsign: 'QQQ1' })] }]);
    await svc.tick(); await svc.tick();
    expect(sightings.unmapped()).toEqual([{ kind: 'airline', key: 'QQQ', count: 1 }, { kind: 'type', key: 'XXXX', count: 1 }]);
  });
  it('does not report the ZZZZ placeholder as an unmapped type', async () => {
    const { svc, sightings } = rig([{ at: 0, planes: [P('a', 5, { typeCode: 'ZZZZ', callsign: 'DLH1' })] }]);
    await svc.tick();
    expect(sightings.unmapped().filter((u) => u.kind === 'type')).toEqual([]);
  });
  it('after the sky empties, shows "Zuletzt: ... vor N Min"', async () => {
    const { svc, clock } = rig([{ at: 0, planes: [P('a', 5, A320)] }, { at: 30, planes: [] }]);
    await svc.tick();
    await clock.advance(6 * 60_000); await svc.tick();
    expect(svc.state().recent).toBe('Zuletzt: Lufthansa DLH400 · vor 6 Min');
  });
});

describe('SkyService Slot-Haltezeit (ADR 0017)', () => {
  const ids = (svc: SkyService) => svc.state().planes.map((p) => p.icao24);
  const takt = async (r: ReturnType<typeof rig>) => { await r.clock.advance(30_000); await r.svc.tick(); };
  const steps: ScenarioStep[] = [
    { at: 0, planes: [P('a', 5), P('b', 8), P('far', 20)] },
    { at: 30, planes: [P('a', 5), P('b', 8), P('c', 2)] },
  ];
  it('holder keeps its slot for 3 Takte against a nearer plane, then the nearer plane takes over at Takt 4', async () => {
    const r = rig(steps);
    await r.svc.tick();
    expect(ids(r.svc)).toEqual(['a', 'b']);
    await takt(r); await takt(r);
    expect(ids(r.svc)).toEqual(['a', 'b']); // Takt 3: c is nearer but both are held
    await takt(r);
    expect(ids(r.svc)).toEqual(['a', 'c']); // Takt 4: b (farther) is displaced by c; a keeps slot 1
  });
  it('no slot swap and a stable slot column when only the distance order flips', async () => {
    const r = rig([{ at: 0, planes: [P('a', 5), P('b', 8)] }, { at: 30, planes: [P('a', 9), P('b', 3)] }]);
    await r.svc.tick(); await takt(r); await takt(r);
    expect(ids(r.svc)).toEqual(['a', 'b']);
    const rows = r.sightings.list();
    expect(rows).toHaveLength(2);
    expect(rows.map((x) => [x.icao24, x.slot])).toEqual(expect.arrayContaining([['a', 1], ['b', 2]]));
  });
  it('a holder leaving the radius is replaced in the same Takt', async () => {
    const r = rig([{ at: 0, planes: [P('a', 5), P('b', 8)] }, { at: 30, planes: [P('a', 40), P('b', 8), P('n', 20)] }]);
    await r.svc.tick(); await takt(r);
    expect(ids(r.svc)).toEqual(['n', 'b']);
  });
  it('a holder vanishing from the data is replaced in the same Takt', async () => {
    const r = rig([{ at: 0, planes: [P('a', 5), P('b', 8), P('x', 12)] }, { at: 30, planes: [P('b', 8), P('x', 12)] }]);
    await r.svc.tick(); await takt(r);
    expect(ids(r.svc)).toEqual(['x', 'b']);
  });
  it('hold counting is server-side: polling state() (e.g. a client blocked by the Vorlese-Sperre) does not delay the swap', async () => {
    const r = rig(steps);
    await r.svc.tick();
    for (let i = 0; i < 3; i++) { await takt(r); r.svc.state(); }
    expect(ids(r.svc)).toEqual(['a', 'c']); // first state the client can apply after narration is already the post-hold state
  });
  it('slotHoldTakte is configurable', async () => {
    const r = rig(steps, 'scene: { slotHoldTakte: 1 }');
    await r.svc.tick(); await takt(r);
    expect(ids(r.svc)).toEqual(['a', 'c']);
  });
});
