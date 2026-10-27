// FlightSource adapter for airplanes.live (ADR 0019). Same readsb schema as adsb.lol; normalisation is shared.
// Terms: non-commercial, no SLA. As measured 2026-10-27 the `point` endpoint answers 403 to non-feeders: the adapter
// then asks for a long pause so the chain does not hammer it, and is ready should access open up again.
import { SourceError, type FlightSource, type Flugzeug, type LatLon } from '../model';
import { guardedFetch, type Fetch } from './http';
import { kmToNm, parseReadsb } from './adsb-lol';

/** Pause after a 403 (feeder-only): re-check hourly at most. */
export const AIRPLANES_LIVE_FORBIDDEN_PAUSE_MS = 3_600_000;

export class AirplanesLiveFlightSource implements FlightSource {
  readonly name = 'airplanes-live';
  constructor(private readonly o: { fetch: Fetch; baseUrl?: string; userAgent: string; timeoutMs: number }) {}

  async fetchAircraft(center: LatLon, radiusKm: number): Promise<Flugzeug[]> {
    const base = this.o.baseUrl ?? 'https://api.airplanes.live';
    const url = `${base}/v2/point/${center.lat}/${center.lon}/${kmToNm(radiusKm)}`;
    let res;
    try {
      res = await guardedFetch(this.o.fetch, url, { headers: { 'user-agent': this.o.userAgent, accept: 'application/json' } }, this.o.timeoutMs);
    } catch (e) {
      if (e instanceof SourceError && e.errorClass === 'http-403') {
        throw new SourceError('unavailable', 'airplanes.live point endpoint is feeder-only (403)', AIRPLANES_LIVE_FORBIDDEN_PAUSE_MS);
      }
      throw e;
    }
    return parseReadsb(await res.text());
  }
}
