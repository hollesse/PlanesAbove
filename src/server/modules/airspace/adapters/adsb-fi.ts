// FlightSource adapter for adsb.fi open data (ADR 0019). Same readsb schema as adsb.lol; normalisation is shared.
// Terms: personal, non-commercial use; cite adsb.fi with a link (README). 1 request/s.
import { SourceError, type FlightSource, type Flugzeug, type LatLon } from '../model';
import { guardedFetch, type Fetch } from './http';
import { kmToNm, parseReadsb } from './adsb-lol';

/** adsb.fi counts 400/401/403/404/429 towards a temporary IP restriction: after any 4xx stay away at least this long. */
export const ADSB_FI_MIN_4XX_PAUSE_MS = 60_000;

export class AdsbFiFlightSource implements FlightSource {
  readonly name = 'adsb-fi';
  constructor(private readonly o: { fetch: Fetch; baseUrl?: string; userAgent: string; timeoutMs: number }) {}

  async fetchAircraft(center: LatLon, radiusKm: number): Promise<Flugzeug[]> {
    const base = this.o.baseUrl ?? 'https://opendata.adsb.fi';
    const url = `${base}/api/v3/lat/${center.lat}/lon/${center.lon}/dist/${kmToNm(radiusKm)}`;
    let res;
    try {
      res = await guardedFetch(this.o.fetch, url, { headers: { 'user-agent': this.o.userAgent, accept: 'application/json' } }, this.o.timeoutMs);
    } catch (e) {
      if (e instanceof SourceError && (e.errorClass === 'http-403' || e.errorClass === 'http-429' || e.errorClass === 'http-4xx')) {
        throw new SourceError(e.errorClass, e.message, Math.max(e.retryAfterMs ?? 0, ADSB_FI_MIN_4XX_PAUSE_MS));
      }
      throw e;
    }
    return parseReadsb(await res.text());
  }
}
