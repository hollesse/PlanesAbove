// RouteSource over the adsbdb live lookup (ADR 0016): GET /v0/callsign/{callsign}, keyless. Results are never persisted (adsbdb terms).
import type { Clock } from '../../../clock';
import type { Logger } from '../../../logger';
import { SourceError, type Airport, type Route, type RouteSource } from '../model';
import { guardedFetch, type Fetch } from './http';

const BASE = 'https://api.adsbdb.com/v0/callsign/';

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);

function toAirport(v: unknown): Airport {
  const a = obj(v);
  const lat = a?.latitude;
  const lon = a?.longitude;
  if (!a || typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) throw new SourceError('parse', 'airport without coordinates');
  const city = [a.municipality, a.name, a.icao_code].find((x): x is string => typeof x === 'string' && x !== '');
  if (!city) throw new SourceError('parse', 'airport without name');
  return { name: typeof a.name === 'string' && a.name ? a.name : city, city, lat, lon };
}

export class AdsbdbRouteSource implements RouteSource {
  readonly name = 'adsbdb';
  private blockedUntil = 0;
  constructor(private readonly o: { fetch: Fetch; userAgent: string; timeoutMs: number; backoffMs: number; clock: Clock; log: Logger; baseUrl?: string }) {}

  async lookup(callsign: string): Promise<Route | null> {
    const now = this.o.clock.now();
    if (now < this.blockedUntil) throw new SourceError('unavailable', 'adsbdb backoff after HTTP 429');
    let res: Awaited<ReturnType<Fetch>>;
    try {
      res = await guardedFetch(this.o.fetch, (this.o.baseUrl ?? BASE) + encodeURIComponent(callsign.trim()), { headers: { 'User-Agent': this.o.userAgent, Accept: 'application/json' } }, this.o.timeoutMs);
    } catch (e) {
      if (e instanceof SourceError && e.errorClass === 'http-4xx' && e.message === 'HTTP 404') return null; // unknown callsign: HTTP 404 {"response":"unknown callsign"}
      if (e instanceof SourceError && e.errorClass === 'http-429') {
        this.blockedUntil = now + this.o.backoffMs;
        this.o.log.warn('adsbdb rate limited (429), skipping adsbdb for the backoff window', { backoffMinutes: this.o.backoffMs / 60_000 });
      }
      throw e;
    }
    let body: unknown;
    try { body = JSON.parse(await res.text()); } catch { throw new SourceError('parse', 'adsbdb: invalid JSON'); }
    const fr = obj(obj(obj(body)?.response)?.flightroute);
    if (!fr) throw new SourceError('parse', 'adsbdb: no flightroute');
    const from = toAirport(fr.origin);
    const to = toAirport(fr.destination);
    return { from, to, legs: [from, to], source: 'adsbdb' };
  }
}
