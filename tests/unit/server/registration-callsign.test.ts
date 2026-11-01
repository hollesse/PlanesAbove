// @vitest-environment node
// Kennzeichen-Callsign rule (airspace-fehby): no route lookup when the callsign is the registration.
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import type { Route, RouteSource } from '../../../src/server/modules/airspace/model';
import { isRegistrationCallsign } from '../../../src/server/modules/airspace/registration-callsign';
import { RouteService } from '../../../src/server/modules/airspace/route-service';

const ap = (c: string, lat: number, lon: number) => ({ name: c, city: c, lat, lon });
const ROUTE: Route = { from: ap('Gelnhausen', 50.2, 9.2), to: ap('Limburg', 50.4, 8.1) };
const fake = (): RouteSource & { calls: number } => { const s = { name: 'adsbdb', calls: 0, async lookup() { s.calls++; return ROUTE; } }; return s; };
const svc = (s: RouteSource) => new RouteService(s, new FakeClock(0), { ttlMs: 1000, negativeTtlMs: 1000 });
const POS = { lat: 50.3, lon: 8.6 };
const ctx = (registration?: string) => ({ typklasse: 'x', airlineKnown: false, registration });

describe('isRegistrationCallsign', () => {
  it('matches the registration without hyphen', () => { expect(isRegistrationCallsign('DEBEC', 'D-EBEC')).toBe(true); expect(isRegistrationCallsign('N123AB', 'N123AB')).toBe(true); });
  it('falls back to D + 4 letters without registration', () => { expect(isRegistrationCallsign('DEBEC')).toBe(true); expect(isRegistrationCallsign('DMABC')).toBe(true); expect(isRegistrationCallsign('N123AB')).toBe(false); });
  it('never matches airline callsigns', () => { expect(isRegistrationCallsign('DLH4AB', 'D-AIXX')).toBe(false); expect(isRegistrationCallsign('EWG1234', 'D-ABCD')).toBe(false); expect(isRegistrationCallsign('DLH4AB')).toBe(false); });
});

describe('RouteService.lookupFor with Kennzeichen-Callsign', () => {
  it('DEBEC with D-EBEC: no source asked, null', async () => { const f = fake(); expect(await svc(f).lookupFor('DEBEC', POS, ctx('D-EBEC'))).toBeNull(); expect(f.calls).toBe(0); });
  it('DEBEC without registration: no source asked', async () => { const f = fake(); expect(await svc(f).lookupFor('DEBEC', POS, ctx())).toBeNull(); expect(f.calls).toBe(0); });
  it('N123AB with registration: no query; without: normal query', async () => {
    const f = fake(); const s = svc(f);
    expect(await s.lookupFor('N123AB', POS, ctx('N123AB'))).toBeNull(); expect(f.calls).toBe(0);
    expect((await s.lookupFor('N123AB', POS, ctx()))?.info).toBeTruthy(); expect(f.calls).toBe(1);
  });
  it('airline callsigns are queried even with registration', async () => {
    const f = fake(); const s = svc(f);
    await s.lookupFor('DLH4AB', POS, ctx('D-AIXX')); await s.lookupFor('EWG1234', POS, ctx('D-ABCD'));
    expect(f.calls).toBe(2);
  });
});
