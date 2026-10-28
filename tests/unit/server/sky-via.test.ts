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
import { ScenarioDriver, ScenarioFlightSource, parseScenario } from '../../../src/server/mock/scenario';
import { silentLogger } from '../../../src/server/logger';
import type { Airport, Route, RouteSource } from '../../../src/server/modules/airspace/model';

const ap = (icao: string, city: string): Airport => ({ name: city, city, icao });
const src = (legs: Airport[]): RouteSource => ({ name: 'vrs', lookup: async () => ({ from: legs[0], to: legs[legs.length - 1], legs, vendorPlausible: true } as Route) });

async function plane(legs: Airport[]) {
  const clock = new FakeClock(Date.parse('2026-10-27T10:00:00Z'));
  const config = parseConfig('location: { lat: 50.05, lon: 8.57 }\nmode: live\n');
  const steps = [{ at: 0, planes: [{ icao24: 'a', distanceKm: 8, bearingDeg: 0, altitudeFt: 36000, speedKt: 450, callsign: 'UPS1', typeCode: 'B744' }] }];
  const driver = new ScenarioDriver(parseScenario(JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps })), clock, clock.now());
  const tables = defaultTables();
  const svc = new SkyService({
    config, clock, log: silentLogger, flight: new ScenarioFlightSource(driver), tables,
    sightings: new SightingRepository(openDatabase(':memory:'), 30 * 60_000, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' }), buildId: 't', timeZone: 'UTC',
    routes: new RouteService(src(legs), clock, { ttlMs: 1e9, negativeTtlMs: 1e9, airports: tables.airports }),
    audio: new AudioService(new FakeSpeechSynthesizer(), { voice: 'v', render: 'lazy', log: silentLogger }),
  });
  await svc.tick();
  return svc.state().planes[0];
}

describe('multi-leg route display', () => {
  it('VHHH -> OMSJ -> EDDK shows start -> end, the stop goes to via; speech text is route-free as before', async () => {
    const p = await plane([ap('VHHH', 'x'), ap('OMSJ', 'y'), ap('EDDK', 'z')]);
    expect(p.flight.route).toBe('Hong Kong (HKG) → Cologne (CGN)');
    expect(p.flight.via).toEqual(['Sharjah']);
    expect(p.speech.text).not.toContain('Sharjah');
  });
  it('two-leg route has no via', async () => {
    const p = await plane([ap('OMSJ', 'y'), ap('EDDK', 'z')]);
    expect(p.flight.route).toBe('Sharjah (SHJ) → Cologne (CGN)');
    expect(p.flight.via).toEqual([]);
  });
});
