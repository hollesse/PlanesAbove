// FlightSource adapter for adsb.lol (ADR 0005). Vendor fields stop here; the domain gets `Flugzeug`.
import { SourceError, type FlightSource, type Flugzeug, type LatLon } from '../model';
import { guardedFetch, type Fetch } from './http';
import type { DailyRequestBudget } from '../flight-source-budget';

const FT_TO_M = 0.3048;
const KT_TO_KMH = 1.852;
const FPM_TO_MS = 0.00508;
export const kmToNm = (km: number): number => Math.max(1, Math.ceil(km / 1.852));

interface Ac { hex?: string; flight?: string; t?: string; r?: string; category?: string; lat?: number; lon?: number; alt_baro?: number | 'ground'; alt_geom?: number; gs?: number; baro_rate?: number; geom_rate?: number; track?: number }

export function normaliseAircraft(a: Ac): Flugzeug | undefined {
  if (!a.hex || typeof a.lat !== 'number' || typeof a.lon !== 'number') return undefined;
  const onGround = a.alt_baro === 'ground';
  const altFt = typeof a.alt_baro === 'number' ? a.alt_baro : a.alt_geom;
  const rate = a.geom_rate ?? a.baro_rate;
  return {
    icao24: a.hex.toLowerCase(),
    callsign: a.flight?.trim() || undefined,
    typeCode: a.t || undefined,
    registration: a.r || undefined,
    emitterCategory: a.category || undefined,
    lat: a.lat,
    lon: a.lon,
    onGround,
    altitudeM: typeof altFt === 'number' ? altFt * FT_TO_M : undefined,
    speedKmh: typeof a.gs === 'number' ? a.gs * KT_TO_KMH : undefined,
    verticalRateMs: typeof rate === 'number' ? rate * FPM_TO_MS : undefined,
    trackDeg: a.track,
  };
}

export class AdsbLolFlightSource implements FlightSource {
  readonly name = 'adsb-lol';
  constructor(private readonly o: { fetch: Fetch; baseUrl?: string; userAgent: string; timeoutMs: number; budget?: DailyRequestBudget }) {}

  async fetchAircraft(center: LatLon, radiusKm: number): Promise<Flugzeug[]> {
    const base = this.o.baseUrl ?? 'https://api.adsb.lol';
    const url = `${base}/v2/point/${center.lat}/${center.lon}/${kmToNm(radiusKm)}`;
    let res;
    try {
      res = await guardedFetch(this.o.fetch, url, { headers: { 'user-agent': this.o.userAgent, accept: 'application/json' } }, this.o.timeoutMs);
    } catch (e) {
      // Every request counts against adsb.lol's daily limit, failed or not; a 429's `x-ratelimit-reset` rides along as retryAfterMs (http.ts).
      const cls = e instanceof SourceError ? e.errorClass : '';
      this.o.budget?.record(cls === 'http-429' ? 429 : cls === 'http-403' ? 403 : null);
      throw e;
    }
    const remaining = res.headers?.get('x-ratelimit-remaining');
    this.o.budget?.record(res.status, remaining != null && remaining.trim() !== '' ? Number(remaining) : undefined);
    return parseReadsb(await res.text());
  }
}

/** The readsb `{ac: [...]}` body shared by adsb.lol, adsb.fi and airplanes.live. */
export function parseReadsb(text: string): Flugzeug[] {
  let body: { ac?: unknown };
  try { body = JSON.parse(text); } catch { throw new SourceError('parse', 'response is not JSON'); }
  if (!body || !Array.isArray(body.ac)) throw new SourceError('parse', 'response has no "ac" array');
  return (body.ac as Ac[]).map(normaliseAircraft).filter((x): x is Flugzeug => x !== undefined);
}
