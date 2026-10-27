// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { ScenarioDriver, ScenarioFlightSource, ScenarioRouteSource, parseScenario } from '../../../src/server/mock/scenario';
import { distanceKm } from '../../../src/server/modules/airspace/selection';

const HOME = { lat: 50.05, lon: 8.57 };
const scenario = parseScenario(JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps: [
  { at: 60, failure: 'http-429' }, { at: 0, planes: [{ icao24: 'a', callsign: 'DLH400', distanceKm: 10, bearingDeg: 90 }], routes: { DLH400: { from: 'Frankfurt', to: 'New York' } } }, { at: 90, failure: null, planes: [] },
] }));

describe('ScenarioDriver + fake sources', () => {
  it('serves the step in effect at the clock reading, steps sorted by time', async () => {
    const clock = new FakeClock(1000);
    const d = new ScenarioDriver(scenario, clock, 1000);
    const src = new ScenarioFlightSource(d);
    const planes = await src.fetchAircraft(HOME);
    expect(planes).toHaveLength(1);
    expect(distanceKm(HOME, planes[0])).toBeCloseTo(10, 1);
    await clock.advance(60_000);
    await expect(src.fetchAircraft(HOME)).rejects.toMatchObject({ errorClass: 'http-429' });
    await clock.advance(30_000);
    expect(await src.fetchAircraft(HOME)).toEqual([]);
  });
  it('route table comes from the scenario', async () => {
    const d = new ScenarioDriver(scenario, new FakeClock(0), 0);
    expect(await new ScenarioRouteSource(d).lookup('DLH400')).toMatchObject({ from: { city: 'Frankfurt' }, to: { city: 'New York' } });
    expect(await new ScenarioRouteSource(d).lookup('XYZ1')).toBeNull();
  });
  it('rejects a malformed scenario', () => { expect(() => parseScenario('{"name":"x"}')).toThrow(/Invalid scenario/); });
});

describe('FakeClock', () => {
  it('runs due timers in order while advancing', async () => {
    const c = new FakeClock(0); const log: number[] = [];
    c.every(30_000, () => { log.push(c.now()); });
    await c.advance(95_000);
    expect(log).toEqual([30_000, 60_000, 90_000]);
    expect(c.now()).toBe(95_000);
  });
});
