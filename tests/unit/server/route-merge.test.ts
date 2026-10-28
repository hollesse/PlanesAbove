// @vitest-environment node
// hexdb + VRS are always both asked; a VRS multi-leg route whose tail is the hexdb route wins (airspace-w1q3x).
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { SourceError, type Airport, type LookupContext, type Route, type RouteSource } from '../../../src/server/modules/airspace/model';
import { isLegTail, RouteService } from '../../../src/server/modules/airspace/route-service';
import { SightingRepository } from '../../../src/server/modules/sighting-log/repository';
import { routeStats } from '../../../src/server/modules/sighting-log/route-stats';
import { openDatabase } from '../../../src/server/db';
import { defaultTables } from '../../../src/server/modules/airspace/typeclass';

const A: Record<string, Airport> = {
  VHHH: { name: 'HKG', city: 'Hong Kong', icao: 'VHHH', lat: 22.31, lon: 113.91 },
  OMSJ: { name: 'SHJ', city: 'Sharjah', icao: 'OMSJ', lat: 25.33, lon: 55.52 },
  EDDK: { name: 'CGN', city: 'Cologne', icao: 'EDDK', lat: 50.866, lon: 7.143 },
  EGLL: { name: 'LHR', city: 'London', icao: 'EGLL', lat: 51.47, lon: -0.46 },
};
const route = (...codes: string[]): Route => ({ from: A[codes[0]], to: A[codes[codes.length - 1]], legs: codes.map((c) => A[c]) });
const POS = { lat: 51.1, lon: 7.5 };
const CTX = { altitudeM: 3000 } as LookupContext;
/** UPS1 near Cologne in descent (airspace-w1q3x): ~2 850 m, sinking. */
const DESCENT = { altitudeM: 2850, verticalRateMs: -8, trackDeg: 280 } as LookupContext;
const fake = (name: string, r: Route | null | 'throw'): RouteSource & { calls: number } => { const s = { name, calls: 0, async lookup() { s.calls++; if (r === 'throw') throw new SourceError('unavailable'); return r; } }; return s; };
const airports = defaultTables().airports;
const svc = (srcs: RouteSource[], compareAll = false) => new RouteService(srcs, new FakeClock(0), { ttlMs: 3600_000, negativeTtlMs: 600_000, compareAll, airports });

describe('hexdb/VRS merge rule', () => {
  it('UPS1: VRS three-leg route wins over the hexdb tail, no conflict, hexdb hit and vrs chosen', async () => {
    const r = await svc([fake('hexdb', route('OMSJ', 'EDDK')), fake('adsbdb', route('EGLL', 'EDDK')), fake('vrs', route('VHHH', 'OMSJ', 'EDDK'))]).lookupFor('UPS1', POS, DESCENT);
    expect(r).toMatchObject({ chosen: 'vrs', conflict: false, info: { source: 'vrs' } });
    expect(r?.attempts).toEqual([{ source: 'hexdb', outcome: 'hit' }, { source: 'vrs', outcome: 'hit' }]);
    expect(r?.info?.text).toBe('Hong Kong (HKG) → Sharjah (SHJ) → Cologne (CGN)'); // city names as in the own airport table (ADR 0021);
  });
  it('default order [hexdb, adsbdb, vrs]: hexdb unknown/unavailable/rejected -> vrs asked, adsbdb not', async () => {
    const far = route('EGLL', 'VHHH'); // implausible for POS
    for (const h of [null, 'throw', far] as const) {
      const hx = fake('hexdb', h), ad = fake('adsbdb', route('OMSJ', 'EDDK')), v = fake('vrs', route('VHHH', 'OMSJ', 'EDDK'));
      const r = await svc([hx, ad, v]).lookupFor('X1', POS, DESCENT);
      expect([hx.calls, v.calls, ad.calls]).toEqual([1, 1, 0]);
      expect(r).toMatchObject({ chosen: 'vrs', info: { source: 'vrs' } });
    }
  });
  it('default order: vrs nothing -> hexdb asked (adsbdb not); both nothing -> adsbdb asked once', async () => {
    const hx = fake('hexdb', route('OMSJ', 'EDDK')), ad = fake('adsbdb', route('OMSJ', 'EDDK')), v = fake('vrs', null);
    expect((await svc([hx, ad, v]).lookupFor('X1', POS, CTX))?.chosen).toBe('hexdb');
    expect(ad.calls).toBe(0);
    const ad2 = fake('adsbdb', route('OMSJ', 'EDDK'));
    await svc([fake('hexdb', null), ad2, fake('vrs', 'throw')]).lookupFor('X2', POS, CTX);
    expect(ad2.calls).toBe(1);
  });
  it('UPS1 through the persistence path: hexdb hit not chosen, vrs chosen, no conflict; stats count it under vrs', async () => {
    const r = await svc([fake('hexdb', route('OMSJ', 'EDDK')), fake('adsbdb', route('EGLL', 'EDDK')), fake('vrs', route('VHHH', 'OMSJ', 'EDDK'))]).lookupFor('UPS1', POS, DESCENT);
    const db = openDatabase(':memory:');
    const repo = new SightingRepository(db, 30 * 60_000, { lat: 51.1, lon: 7.5, radiusKm: 30, place: 'zuhause' });
    repo.observe({ icao24: 'ae1234', callsign: 'UPS1', typklasse: 'widebody', liveryPresent: true, distanceKm: 5, route: r!.info!.text, routeSource: r!.info!.source, slot: 1 }, 1000);
    repo.recordLookup('ae1234', r!.attempts, r!.conflict, r!.chosen, 1000);
    const rows = db.prepare('SELECT source, outcome, conflict, chosen FROM route_lookups ORDER BY id').all();
    expect(rows).toEqual([{ source: 'hexdb', outcome: 'hit', conflict: 0, chosen: 0 }, { source: 'vrs', outcome: 'hit', conflict: 0, chosen: 1 }]);
    const st = routeStats(db, { days: 1, nowMs: 2000, standort: 'alle' });
    expect(st.days[0]).toMatchObject({ total: 1, vrs: 1, hexdb: 0 });
    expect(st.sources.find((x) => x.source === 'vrs')).toMatchObject({ hit: 1, chosen: 1 });
    expect(st.sources.find((x) => x.source === 'hexdb')).toMatchObject({ hit: 1, chosen: 0 });
    expect(st.conflicts).toEqual([]);
  });
  it('real conflict: hexdb wins, conflict flagged', async () => {
    const r = await svc([fake('hexdb', route('EGLL', 'EDDK')), fake('vrs', route('VHHH', 'OMSJ', 'EDDK'))]).lookupFor('X1', POS, CTX);
    expect(r).toMatchObject({ chosen: 'hexdb', conflict: true });
  });
  it('not a tail (hexdb VHHH->OMSJ vs vrs VHHH->OMSJ->EDDK): conflict rule, hexdb first', async () => {
    const pos = { lat: 25.3, lon: 56 };
    const r = await svc([fake('hexdb', route('VHHH', 'OMSJ')), fake('vrs', route('VHHH', 'OMSJ', 'EDDK'))]).lookupFor('X1', pos, CTX);
    expect(r).toMatchObject({ chosen: 'hexdb', conflict: true });
  });
  it('VRS is asked although hexdb hit and compareAll is false; adsbdb is not', async () => {
    const h = fake('hexdb', route('OMSJ', 'EDDK')), ad = fake('adsbdb', route('OMSJ', 'EDDK')), v = fake('vrs', route('OMSJ', 'EDDK'));
    const r = await svc([h, ad, v]).lookupFor('X1', POS, CTX);
    expect([h.calls, v.calls, ad.calls]).toEqual([1, 1, 0]);
    expect(r).toMatchObject({ chosen: 'hexdb', conflict: false });
  });
  it('hexdb unknown -> vrs; vrs unknown -> hexdb; both unknown -> adsbdb asked', async () => {
    expect((await svc([fake('hexdb', null), fake('vrs', route('OMSJ', 'EDDK'))]).lookupFor('X1', POS, CTX))?.chosen).toBe('vrs');
    expect((await svc([fake('hexdb', route('OMSJ', 'EDDK')), fake('vrs', null)]).lookupFor('X1', POS, CTX))?.chosen).toBe('hexdb');
    const ad = fake('adsbdb', route('OMSJ', 'EDDK'));
    expect((await svc([fake('hexdb', null), ad, fake('vrs', null)]).lookupFor('X1', POS, CTX))?.chosen).toBe('adsbdb');
    expect(ad.calls).toBe(1);
  });
  it('isLegTail compares ICAO legs only', () => {
    expect(isLegTail(route('OMSJ', 'EDDK'), route('VHHH', 'OMSJ', 'EDDK'))).toBe(true);
    expect(isLegTail(route('VHHH', 'OMSJ'), route('VHHH', 'OMSJ', 'EDDK'))).toBe(false);
    expect(isLegTail(route('VHHH', 'EDDK'), route('VHHH', 'EDDK'))).toBe(false);
  });
});
